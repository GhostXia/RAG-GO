package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/dgraph-io/badger/v3"
)

// Document 表示一个存储的文档
type Document struct {
	ID       string   `json:"id"`       // 文档唯一标识符
	Content  string   `json:"content"`  // 文档内容
	Metadata Metadata `json:"metadata"` // 文档元数据
}

// Metadata 存储文档的元数据
type Metadata struct {
	Source   string            `json:"source"`   // 文档来源
	Title    string            `json:"title"`    // 文档标题
	Tags     []string          `json:"tags"`     // 文档标签
	Custom   map[string]string `json:"custom"`   // 自定义元数据
	ChunkID  int               `json:"chunk_id"` // 分块ID
	ChunkNum int               `json:"chunk_num"` // 总分块数
}

// VectorStore 管理文档向量的存储和检索
type VectorStore struct {
	db        *badger.DB
	vectorDir string
	mutex     sync.RWMutex
}

// NewVectorStore 创建一个新的向量存储
func NewVectorStore(storePath string) (*VectorStore, error) {
	// 确保目录存在
	if err := os.MkdirAll(storePath, 0755); err != nil {
		return nil, fmt.Errorf("无法创建存储目录: %w", err)
	}

	// 打开Badger数据库
	dbPath := filepath.Join(storePath, "db")
	options := badger.DefaultOptions(dbPath)
	options.Logger = nil // 禁用日志

	db, err := badger.Open(options)
	if err != nil {
		return nil, fmt.Errorf("无法打开向量数据库: %w", err)
	}

	// 创建向量目录
	vectorDir := filepath.Join(storePath, "vectors")
	if err := os.MkdirAll(vectorDir, 0755); err != nil {
		db.Close()
		return nil, fmt.Errorf("无法创建向量目录: %w", err)
	}

	return &VectorStore{
		db:        db,
		vectorDir: vectorDir,
		mutex:     sync.RWMutex{},
	}, nil
}

// Close 关闭向量存储
func (vs *VectorStore) Close() error {
	if vs.db != nil {
		return vs.db.Close()
	}
	return nil
}

// AddDocument 添加文档及其向量到存储
func (vs *VectorStore) AddDocument(doc Document, vector []float32) error {
	vs.mutex.Lock()
	defer vs.mutex.Unlock()

	// 序列化文档
	docData, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("无法序列化文档: %w", err)
	}

	// 存储文档
	err = vs.db.Update(func(txn *badger.Txn) error {
		key := []byte("doc:" + doc.ID)
		return txn.Set(key, docData)
	})
	if err != nil {
		return fmt.Errorf("无法存储文档: %w", err)
	}

	// 存储向量
	vectorPath := filepath.Join(vs.vectorDir, doc.ID+".vec")
	vectorData := make([]byte, len(vector)*4) // float32 = 4 bytes
	for i, v := range vector {
		// 简单的二进制存储，实际应用中可能需要更高效的方式
		byte0 := byte(uint32(v) >> 0)
		byte1 := byte(uint32(v) >> 8)
		byte2 := byte(uint32(v) >> 16)
		byte3 := byte(uint32(v) >> 24)
		vectorData[i*4+0] = byte0
		vectorData[i*4+1] = byte1
		vectorData[i*4+2] = byte2
		vectorData[i*4+3] = byte3
	}

	if err := os.WriteFile(vectorPath, vectorData, 0644); err != nil {
		return fmt.Errorf("无法存储向量: %w", err)
	}

	return nil
}

// GetDocument 根据ID获取文档
func (vs *VectorStore) GetDocument(id string) (*Document, error) {
	vs.mutex.RLock()
	defer vs.mutex.RUnlock()

	var docData []byte
	err := vs.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("doc:" + id))
		if err != nil {
			return err
		}

		return item.Value(func(val []byte) error {
			docData = append([]byte{}, val...)
			return nil
		})
	})

	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			return nil, fmt.Errorf("文档不存在: %s", id)
		}
		return nil, fmt.Errorf("获取文档失败: %w", err)
	}

	var doc Document
	if err := json.Unmarshal(docData, &doc); err != nil {
		return nil, fmt.Errorf("解析文档失败: %w", err)
	}

	return &doc, nil
}

// GetVector 根据文档ID获取向量
func (vs *VectorStore) GetVector(id string) ([]float32, error) {
	vs.mutex.RLock()
	defer vs.mutex.RUnlock()

	vectorPath := filepath.Join(vs.vectorDir, id+".vec")
	vectorData, err := os.ReadFile(vectorPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取向量: %w", err)
	}

	// 解析向量数据
	vectorLen := len(vectorData) / 4 // float32 = 4 bytes
	vector := make([]float32, vectorLen)

	for i := 0; i < vectorLen; i++ {
		// 从二进制数据重建float32
		byte0 := uint32(vectorData[i*4+0])
		byte1 := uint32(vectorData[i*4+1])
		byte2 := uint32(vectorData[i*4+2])
		byte3 := uint32(vectorData[i*4+3])
		bits := byte0 | (byte1 << 8) | (byte2 << 16) | (byte3 << 24)
		vector[i] = float32(bits)
	}

	return vector, nil
}

// SearchSimilar 搜索与查询向量最相似的文档
func (vs *VectorStore) SearchSimilar(queryVector []float32, limit int) ([]Document, []float32, error) {
	return vs.SearchSimilarWithFilter(queryVector, limit, nil)
}

// SearchSimilarWithFilter 搜索与查询向量最相似的文档，并应用过滤器
func (vs *VectorStore) SearchSimilarWithFilter(queryVector []float32, limit int, filter func(Document) bool) ([]Document, []float32, error) {
	vs.mutex.RLock()
	defer vs.mutex.RUnlock()

	// 获取所有文档ID
	var docIDs []string
	err := vs.db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchSize = 10
		it := txn.NewIterator(opts)
		defer it.Close()

		prefix := []byte("doc:")
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			item := it.Item()
			k := item.Key()
			id := string(k[len(prefix):])
			docIDs = append(docIDs, id)
		}
		return nil
	})

	if err != nil {
		return nil, nil, fmt.Errorf("获取文档列表失败: %w", err)
	}

	// 计算相似度并排序
	type docSimilarity struct {
		id         string
		similarity float32
	}

	var similarities []docSimilarity

	for _, id := range docIDs {
		vector, err := vs.GetVector(id)
		if err != nil {
			continue // 跳过无法获取向量的文档
		}

		// 计算余弦相似度
		sim := cosineSimilarity(queryVector, vector)
		similarities = append(similarities, docSimilarity{id: id, similarity: sim})
	}

	// 按相似度降序排序
	sort.Slice(similarities, func(i, j int) bool {
		return similarities[i].similarity > similarities[j].similarity
	})

	// 限制结果数量
	if limit > 0 && len(similarities) > limit {
		similarities = similarities[:limit]
	}

	// 获取文档详情
	resultDocs := make([]Document, 0, len(similarities))
	resultScores := make([]float32, 0, len(similarities))

	for _, sim := range similarities {
		doc, err := vs.GetDocument(sim.id)
		if err != nil {
			continue // 跳过无法获取的文档
		}

		resultDocs = append(resultDocs, *doc)
		resultScores = append(resultScores, sim.similarity)
	}

	return resultDocs, resultScores, nil
}

// DeleteDocument 删除文档及其向量
func (vs *VectorStore) DeleteDocument(id string) error {
	vs.mutex.Lock()
	defer vs.mutex.Unlock()

	// 删除文档
	err := vs.db.Update(func(txn *badger.Txn) error {
		return txn.Delete([]byte("doc:" + id))
	})

	if err != nil {
		return fmt.Errorf("删除文档失败: %w", err)
	}

	// 删除向量
	vectorPath := filepath.Join(vs.vectorDir, id+".vec")
	if err := os.Remove(vectorPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("删除向量失败: %w", err)
	}

	return nil
}

// 计算两个向量的余弦相似度
func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct float32
	var normA float32
	var normB float32

	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

// ListDocuments 获取所有文档列表
func (vs *VectorStore) ListDocuments() ([]Document, error) {
	vs.mutex.RLock()
	defer vs.mutex.RUnlock()

	var docs []Document

	// 获取所有文档ID
	err := vs.db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchSize = 10
		it := txn.NewIterator(opts)
		defer it.Close()

		prefix := []byte("doc:")
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			item := it.Item()
			
			// 获取文档内容
			err := item.Value(func(val []byte) error {
				var doc Document
				if err := json.Unmarshal(val, &doc); err != nil {
					return fmt.Errorf("解析文档失败: %w", err)
				}
				docs = append(docs, doc)
				return nil
			})
			
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("获取文档列表失败: %w", err)
	}

	return docs, nil
}