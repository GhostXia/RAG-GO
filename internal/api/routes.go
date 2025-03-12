package api

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/rag-go/internal/model"
	"github.com/user/rag-go/internal/processor"
	"github.com/user/rag-go/internal/storage"
)

// RegisterRoutes 注册所有API路由
func RegisterRoutes(router *gin.Engine, embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) {
	// 静态文件服务
	router.Static("/static", "./web/static")

	// 主页
	router.GET("/", func(c *gin.Context) {
		c.File("./web/index.html")
	})

	// API路由组
	api := router.Group("/api")
	{
		// 健康检查
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		// 文档管理
		api.POST("/documents", handleUploadDocument(embeddingModel, vectorStore))
		api.GET("/documents", handleListDocuments(vectorStore))
		api.GET("/documents/:id", handleGetDocument(vectorStore))
		api.DELETE("/documents/:id", handleDeleteDocument(vectorStore))

		// 向量搜索
		api.POST("/search", handleSearch(embeddingModel, vectorStore))

		// SillyTavern DataBank API
		databank := api.Group("/databank")
		{
			// 上传文档
			databank.POST("/upload", handleDatabankUpload(embeddingModel, vectorStore))
			
			// 搜索文档
			databank.POST("/search", handleDatabankSearch(embeddingModel, vectorStore))
			
			// 获取文档列表
			databank.GET("/list", handleDatabankList(vectorStore))
			
			// 删除文档
			databank.DELETE("/delete/:id", handleDatabankDelete(vectorStore))
		}
	}
}

// 处理文档上传
func handleUploadDocument(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析多部分表单
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无法获取上传文件"})
			return
		}
		defer file.Close()

		// 读取文件内容
		content, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无法读取文件内容"})
			return
		}

		// 获取文件元数据
		filename := header.Filename
		fileExt := filepath.Ext(filename)
		title := strings.TrimSuffix(filename, fileExt)

		// 处理文档内容
		textContent, err := processor.ExtractText(content, fileExt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("文档处理失败: %v", err)})
			return
		}

		// 分块处理
		chunks := processor.ChunkText(textContent, 1000, 200)
		docIDs := make([]string, 0, len(chunks))

		// 处理每个分块
		for i, chunk := range chunks {
			// 生成唯一ID
			docID := uuid.New().String()
			docIDs = append(docIDs, docID)

			// 创建文档对象
			doc := storage.Document{
				ID:      docID,
				Content: chunk,
				Metadata: storage.Metadata{
					Source:   filename,
					Title:    title,
					Tags:     []string{fileExt[1:]}, // 去掉扩展名前面的点
					Custom:   map[string]string{"upload_time": time.Now().Format(time.RFC3339)},
					ChunkID:  i,
					ChunkNum: len(chunks),
				},
			}

			// 获取嵌入向量
			vector, err := embeddingModel.GetEmbedding(chunk)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("生成嵌入向量失败: %v", err)})
				return
			}

			// 存储文档和向量
			if err := vectorStore.AddDocument(doc, vector); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("存储文档失败: %v", err)})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "文档上传成功",
			"document_ids": docIDs,
			"chunks": len(chunks),
		})
	}
}

// 处理文档列表
func handleListDocuments(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		docs, err := vectorStore.ListDocuments()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取文档列表失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, docs)
	}
}

// 处理获取单个文档
func handleGetDocument(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		doc, err := vectorStore.GetDocument(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("文档不存在: %v", err)})
			return
		}

		c.JSON(http.StatusOK, doc)
	}
}

// 处理删除文档
func handleDeleteDocument(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		err := vectorStore.DeleteDocument(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("删除文档失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "文档删除成功"})
	}
}

// 处理向量搜索
func handleSearch(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Query string `json:"query"`
			Limit int    `json:"limit"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
			return
		}

		if req.Query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "查询不能为空"})
			return
		}

		if req.Limit <= 0 {
			req.Limit = 5 // 默认限制
		}

		// 获取查询的嵌入向量
		queryVector, err := embeddingModel.GetEmbedding(req.Query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("生成查询向量失败: %v", err)})
			return
		}

		// 搜索相似文档
		docs, scores, err := vectorStore.SearchSimilar(queryVector, req.Limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("搜索失败: %v", err)})
			return
		}

		// 构建结果
		results := make([]map[string]interface{}, len(docs))
		for i, doc := range docs {
			results[i] = map[string]interface{}{
				"document": doc,
				"score":    scores[i],
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"query":   req.Query,
			"results": results,
		})
	}
}

// SillyTavern DataBank API 处理函数

// 处理DataBank上传
func handleDatabankUpload(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析请求
		var req struct {
			Name    string `json:"name"`
			Content string `json:"content"`
			Type    string `json:"type"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
			return
		}

		if req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "内容不能为空"})
			return
		}

		// 分块处理
		chunks := processor.ChunkText(req.Content, 1000, 200)
		docIDs := make([]string, 0, len(chunks))

		// 处理每个分块
		for i, chunk := range chunks {
			// 生成唯一ID
			docID := uuid.New().String()
			docIDs = append(docIDs, docID)

			// 创建文档对象
			doc := storage.Document{
				ID:      docID,
				Content: chunk,
				Metadata: storage.Metadata{
					Source:   req.Type,
					Title:    req.Name,
					Tags:     []string{"databank", req.Type},
					Custom:   map[string]string{"upload_time": time.Now().Format(time.RFC3339)},
					ChunkID:  i,
					ChunkNum: len(chunks),
				},
			}

			// 获取嵌入向量
			vector, err := embeddingModel.GetEmbedding(chunk)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("生成嵌入向量失败: %v", err)})
				return
			}

			// 存储文档和向量
			if err := vectorStore.AddDocument(doc, vector); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("存储文档失败: %v", err)})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "文档上传成功",
			"document_ids": docIDs,
			"chunks": len(chunks),
		})
	}
}

// 处理DataBank搜索
func handleDatabankSearch(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析请求
		var req struct {
			Query string `json:"query"`
			Limit int    `json:"limit"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
			return
		}

		if req.Query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "查询不能为空"})
			return
		}

		if req.Limit <= 0 {
			req.Limit = 5 // 默认限制
		}

		// 获取查询的嵌入向量
		queryVector, err := embeddingModel.GetEmbedding(req.Query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("生成查询向量失败: %v", err)})
			return
		}

		// 搜索相似文档
		docs, scores, err := vectorStore.SearchSimilar(queryVector, req.Limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("搜索失败: %v", err)})
			return
		}

		// 构建SillyTavern DataBank格式的结果
		results := make([]map[string]interface{}, len(docs))
		for i, doc := range docs {
			results[i] = map[string]interface{}{
				"id":      doc.ID,
				"content": doc.Content,
				"name":    doc.Metadata.Title,
				"type":    doc.Metadata.Source,
				"score":   scores[i],
			}
		}

		c.JSON(http.StatusOK, results)
	}
}

// 处理DataBank列表
func handleDatabankList(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取所有文档
		docs, err := vectorStore.ListDocuments()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取文档列表失败: %v", err)})
			return
		}

		// 过滤出DataBank文档并构建结果
		var results []map[string]interface{}
		for _, doc := range docs {
			// 检查是否为DataBank文档
			isDatabank := false
			for _, tag := range doc.Metadata.Tags {
				if tag == "databank" {
					isDatabank = true
					break
				}
			}

			if isDatabank {
				results = append(results, map[string]interface{}{
					"id":   doc.ID,
					"name": doc.Metadata.Title,
					"type": doc.Metadata.Source,
				})
			}
		}

		c.JSON(http.StatusOK, results)
	}
}

// 处理DataBank删除
func handleDatabankDelete(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		err := vectorStore.DeleteDocument(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("删除文档失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "文档删除成功"})
	}
}