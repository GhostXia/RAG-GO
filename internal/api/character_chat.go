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

// RegisterCharacterChatRoutes 注册角色聊天相关的API路由
func RegisterCharacterChatRoutes(router *gin.Engine, embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore, chatStore *storage.ChatStore) {
	// 角色聊天API路由组
	characterAPI := router.Group("/api/character")
	{
		// 获取所有角色列表
		characterAPI.GET("/list", handleCharacterList(chatStore))

		// 角色聊天管理
		chatAPI := characterAPI.Group("/:character/chat")
		{
			// 上传聊天记录
			chatAPI.POST("/upload", handleCharacterChatUpload(embeddingModel, vectorStore, chatStore))
			
			// 获取聊天记录列表
			chatAPI.GET("/list", handleCharacterChatList(chatStore))
			
			// 获取特定聊天记录
			chatAPI.GET("/:id", handleCharacterChatGet(chatStore))
			
			// 删除聊天记录
			chatAPI.DELETE("/:id", handleCharacterChatDelete(chatStore))
			
			// 搜索聊天记录
			chatAPI.POST("/search", handleCharacterChatSearch(embeddingModel, vectorStore, chatStore))
		}
	}
}

// 处理获取所有角色列表
func handleCharacterList(chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取所有角色
		characters, err := chatStore.ListCharacters()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取角色列表失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"characters": characters,
			"count":     len(characters),
		})
	}
}

// 处理角色聊天记录上传
func handleCharacterChatUpload(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore, chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取角色名称
		character := c.Param("character")
		if character == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未指定角色名称"})
			return
		}

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
			chatHistory.Title = fmt.Sprintf("%s的聊天记录 %s", character, time.Now().Format("2006-01-02 15:04:05"))
		}

		// 保存聊天记录到ChatStore
		if err := chatStore.SaveChat(character, chatHistory); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("保存聊天记录失败: %v", err)})
			return
		}

		// 处理聊天记录，转换为可检索的文档
		chunks, err := processor.ProcessChatHistory(chatHistory)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("处理聊天记录失败: %v", err)})
			return
		}

		// 创建元数据
		metadata := processor.CreateChatMetadata(chatHistory)
		// 添加角色信息到元数据
		metadata["character"] = character
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
					Source:   "character_chat",
					Title:    chatHistory.Title,
					Tags:     []string{"chat", "character", character},
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
			"message":      "聊天记录上传成功",
			"character":    character,
			"chat_id":      chatHistory.ID,
			"document_ids": docIDs,
			"chunks":       len(chunks),
		})
	}
}

// 处理获取角色聊天记录列表
func handleCharacterChatList(chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取角色名称
		character := c.Param("character")
		if character == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未指定角色名称"})
			return
		}

		// 获取角色的聊天记录列表
		chats, err := chatStore.ListChats(character)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("获取聊天记录列表失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"character": character,
			"chats":     chats,
			"count":     len(chats),
		})
	}
}

// 处理获取特定聊天记录
func handleCharacterChatGet(chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取角色名称和聊天ID
		character := c.Param("character")
		chatID := c.Param("id")

		if character == "" || chatID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未指定角色名称或聊天ID"})
			return
		}

		// 获取聊天记录
		chat, err := chatStore.GetChat(character, chatID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("获取聊天记录失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, chat)
	}
}

// 处理删除聊天记录
func handleCharacterChatDelete(chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取角色名称和聊天ID
		character := c.Param("character")
		chatID := c.Param("id")

		if character == "" || chatID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未指定角色名称或聊天ID"})
			return
		}

		// 删除聊天记录
		if err := chatStore.DeleteChat(character, chatID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("删除聊天记录失败: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "聊天记录删除成功",
			"character": character,
			"chat_id":   chatID,
		})
	}
}

// 处理角色聊天记录搜索
func handleCharacterChatSearch(embeddingModel *model.EmbeddingModel, vectorStore *storage.VectorStore, chatStore *storage.ChatStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取角色名称
		character := c.Param("character")
		if character == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未指定角色名称"})
			return
		}

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

		// 设置搜索过滤条件，只搜索指定角色的聊天记录
		filter := map[string]string{
			"character": character,
		}

		// 执行向量搜索
		results, err := vectorStore.Search(queryVector, req.Limit, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("搜索聊天记录失败: %v", err)})
			return
		}

		// 返回搜索结果
		c.JSON(http.StatusOK, gin.H{
			"character": character,
			"query":     req.Query,
			"results":   results,
			"count":     len(results),
		})
	}
}