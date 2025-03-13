package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/rag-go/internal/model"
	"github.com/user/rag-go/internal/processor"
	"github.com/user/rag-go/internal/storage"
)

// 注册聊天相关的API路由
func RegisterChatRoutes(router *gin.Engine, embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) {
	// 聊天API路由组
	chatAPI := router.Group("/api/chat")
	{
		// 上传聊天记录
		chatAPI.POST("/upload", handleChatUpload(embeddingModel, vectorStore))
		
		// 搜索聊天记录
		chatAPI.POST("/search", handleChatSearch(embeddingModel, vectorStore))
		
		// 获取聊天记录列表
		chatAPI.GET("/list", handleChatList(vectorStore))
		
		// 删除聊天记录
		chatAPI.DELETE("/delete/:id", handleChatDelete(vectorStore))
	}
}

// 处理聊天记录上传
func handleChatUpload(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析请求
		var chatHistory processor.ChatHistory
		if err := c.ShouldBindJSON(&chatHistory); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的聊天记录格式"})
			return
		}

		// 验证聊天记录
		if len(chatHistory.Messages) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "聊天记录为空"})
			return
		}

		// 如果没有提供ID，生成一个
		if chatHistory.ID == "" {
			chatHistory.ID = uuid.New().String()
		}

		// 如果没有提供标题，使用默认标题
		if chatHistory.Title == "" {
			chatHistory.Title = fmt.Sprintf("聊天记录 %s", time.Now().Format("2006-01-02 15:04:05"))
		}

		// 处理聊天记录，转换为可检索的文档
		chunks, err := processor.ProcessChatHistory(chatHistory)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("处理聊天记录失败: %v", err)})
			return
		}

		// 创建元数据
		metadata := processor.CreateChatMetadata(chatHistory)
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
					Source:   "chat",
					Title:    chatHistory.Title,
					Tags:     []string{"chat", "conversation"},
					Custom:   metadata,
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
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("存储聊天记录失败: %v", err)})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "聊天记录上传成功",
			"chat_id": chatHistory.ID,
			"document_ids": docIDs,
			"chunks": len(chunks),
		})
	}
}

// 处理聊天记录搜索
func handleChatSearch(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore) gin.HandlerFunc {
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

		// 搜索相似文档，只搜索聊天记录
		docs, scores, err := vectorStore.SearchSimilarWithFilter(queryVector, req.Limit, func(doc storage.Document) bool {
			// 检查是否为聊天记录
			for _, tag := range doc.Metadata.Tags {
				if tag == "chat" {
					return true
				}
			}
			return false
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("搜索失败: %v", err)})
			return
		}

		// 构建结果
		results := make([]map[string]interface{}, len(docs))
		for i, doc := range docs {
			results[i] = map[string]interface{}{
				"id":      doc.ID,
				"content": doc.Content,
				"title":   doc.Metadata.Title,
				"chat_id": doc.Metadata.Custom["chat_id"],
				"score":   scores[i],
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"query":   req.Query,
			"results": results,
		})
	}
}

// 处理聊天记录列表
func handleChatList(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取所有文档
		docs, err := vectorStore.ListDocuments()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取文档列表失败: %v", err)})
			return
		}

		// 过滤出聊天记录并按聊天ID分组
		chatMap := make(map[string]map[string]interface{})
		for _, doc := range docs {
			// 检查是否为聊天记录
			isChatRecord := false
			for _, tag := range doc.Metadata.Tags {
				if tag == "chat" {
					isChatRecord = true
					break
				}
			}

			if isChatRecord && doc.Metadata.ChunkID == 0 { // 只取每个聊天的第一个分块
				chatID := doc.Metadata.Custom["chat_id"]
				chatMap[chatID] = map[string]interface{}{
					"id":           chatID,
					"title":        doc.Metadata.Title,
					"message_count": doc.Metadata.Custom["message_count"],
					"upload_time":  doc.Metadata.Custom["upload_time"],
				}
			}
		}

		// 转换为数组
		results := make([]map[string]interface{}, 0, len(chatMap))
		for _, chat := range chatMap {
			results = append(results, chat)
		}

		c.JSON(http.StatusOK, results)
	}
}

// 处理聊天记录删除
func handleChatDelete(vectorStore *storage.VectorStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		chatID := c.Param("id")
		if chatID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "聊天ID不能为空"})
			return
		}

		// 获取所有文档
		docs, err := vectorStore.ListDocuments()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取文档列表失败: %v", err)})
			return
		}

		// 找出属于该聊天的所有文档
		var docsToDelete []string
		for _, doc := range docs {
			// 检查是否为聊天记录且属于指定聊天
			isChatRecord := false
			for _, tag := range doc.Metadata.Tags {
				if tag == "chat" {
					isChatRecord = true
					break
				}
			}

			if isChatRecord && doc.Metadata.Custom["chat_id"] == chatID {
				docsToDelete = append(docsToDelete, doc.ID)
			}
		}

		// 删除所有相关文档
		deleteCount := 0
		for _, docID := range docsToDelete {
			if err := vectorStore.DeleteDocument(docID); err != nil {
				// 记录错误但继续删除其他文档
				fmt.Printf("删除文档 %s 失败: %v\n", docID, err)
			} else {
				deleteCount++
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("聊天记录删除成功，共删除 %d 个文档", deleteCount),
			"deleted_count": deleteCount,
		})