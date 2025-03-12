package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/rag-go/internal/api"
	"github.com/user/rag-go/internal/config"
	"github.com/user/rag-go/internal/model"
	"github.com/user/rag-go/internal/storage"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("无法加载配置: %v", err)
	}

	// 初始化模型
	embeddingModel, err := model.NewEmbeddingModel(cfg.ModelPath)
	if err != nil {
		log.Fatalf("无法加载嵌入模型: %v", err)
	}
	defer embeddingModel.Close()

	// 初始化存储
	vectorStore, err := storage.NewVectorStore(cfg.StoragePath)
	if err != nil {
		log.Fatalf("无法初始化向量存储: %v", err)
	}
	defer vectorStore.Close()

	// 设置Gin路由
	router := gin.Default()
	
	// 注册API路由
	api.RegisterRoutes(router, embeddingModel, vectorStore)

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("服务器启动在 %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, router); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}