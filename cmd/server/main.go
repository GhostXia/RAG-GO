package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/user/rag-go/internal/api"
	"github.com/user/rag-go/internal/config"
	"github.com/user/rag-go/internal/model"
	"github.com/user/rag-go/internal/storage"
)

func main() {
	// 检查并初始化数据目录
	initializeDataDirectory()

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

	// 初始化聊天记录存储
	chatStore, err := storage.NewChatStore(cfg.StoragePath)
	if err != nil {
		log.Fatalf("无法初始化聊天记录存储: %v", err)
	}

	// 设置Gin路由
	router := gin.Default()
	
	// 注册API路由
	api.RegisterRoutes(router, embeddingModel, vectorStore, chatStore)

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("服务器启动在 %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, router); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}

// initializeDataDirectory 检查并初始化数据目录
func initializeDataDirectory() {
	// 获取默认配置中的存储路径
	defaultCfg := config.DefaultConfig()
	storePath := defaultCfg.StoragePath

	// 检查数据目录是否存在
	if _, err := os.Stat(storePath); os.IsNotExist(err) {
		// 提示用户数据目录不存在，需要手动创建
		log.Printf("警告：数据目录 %s 不存在", storePath)
		log.Printf("请手动创建以下目录结构以确保应用正常运行：")
		log.Printf("  %s/", storePath)
		log.Printf("  ├── db/        # 用于存储文档数据库")
		log.Printf("  └── vectors/   # 用于存储向量数据")
		log.Printf("这些目录包含私密数据，应由用户在本地自行创建以确保数据安全")
		log.Printf("创建命令示例：")
		log.Printf("  mkdir -p %s/db %s/vectors", storePath, storePath)
		
		// 仅创建空目录结构，不生成任何文件
		log.Printf("正在为首次运行创建空目录结构...")
		if err := os.MkdirAll(storePath, 0755); err != nil {
			log.Printf("无法创建数据目录 %s: %v", storePath, err)
			log.Printf("请确保应用有足够的权限或手动创建上述目录")
			return
		}
		
		// 创建空的子目录结构
		dbPath := filepath.Join(storePath, "db")
		vectorsPath := filepath.Join(storePath, "vectors")
		
		if err := os.MkdirAll(dbPath, 0755); err != nil {
			log.Printf("无法创建数据库目录: %v", err)
			log.Printf("请手动创建目录: %s", dbPath)
		}
		
		if err := os.MkdirAll(vectorsPath, 0755); err != nil {
			log.Printf("无法创建向量存储目录: %v", err)
			log.Printf("请手动创建目录: %s", vectorsPath)
		}
		
		log.Printf("空目录结构初始化完成，准备首次运行")
		
		// 询问用户是否要自动生成相应的内部文件
		fmt.Println("\n是否要自动生成相应的内部文件？(y/n)")
		var response string
		fmt.Scanln(&response)
		
		if response == "y" || response == "Y" {
			log.Printf("开始生成内部文件...")
			generateInitialFiles(dbPath, vectorsPath)
			log.Printf("内部文件生成完成")
		} else {
			log.Printf("注意：请确保在使用前正确配置这些目录，这些目录仅为空结构")
		}
	} else {
		log.Printf("数据目录 %s 已存在，将使用现有数据", storePath)
	}
}

// generateInitialFiles 生成初始化所需的内部文件
func generateInitialFiles(dbPath, vectorsPath string) {
	// 生成示例配置文件
	cfg := config.DefaultConfig()
	if err := cfg.Save(); err != nil {
		log.Printf("无法生成配置文件: %v", err)
	} else {
		log.Printf("已生成配置文件: config.json")
	}
	
	// 创建模型目录并添加说明文件
	modelPath := cfg.ModelPath
	if err := os.MkdirAll(modelPath, 0755); err == nil {
		readmePath := filepath.Join(modelPath, "README.md")
		readmeContent := "# 模型目录\n\n此目录用于存放ONNX模型文件。\n\n## 使用方法\n\n1. 下载支持的ONNX嵌入模型\n2. 将模型文件重命名为 'embedding_model.onnx'\n3. 放置在此目录中\n\n注意：默认支持的模型维度为384，如需使用其他维度的模型，请修改配置文件。"
		
		if err := os.WriteFile(readmePath, []byte(readmeContent), 0644); err != nil {
			log.Printf("无法创建模型目录说明文件: %v", err)
		} else {
			log.Printf("已生成模型目录说明文件: %s", readmePath)
		}
	}
	
	// 在数据库目录中创建说明文件
	dbReadmePath := filepath.Join(dbPath, "README.md")
	dbReadmeContent := "# 数据库目录\n\n此目录用于存储文档数据库文件。\n\n注意：此目录中的文件包含索引数据，请勿手动修改。"
	
	if err := os.WriteFile(dbReadmePath, []byte(dbReadmeContent), 0644); err != nil {
		log.Printf("无法创建数据库目录说明文件: %v", err)
	} else {
		log.Printf("已生成数据库目录说明文件: %s", dbReadmePath)
	}
	
	// 在向量目录中创建说明文件
	vectorReadmePath := filepath.Join(vectorsPath, "README.md")
	vectorReadmeContent := "# 向量存储目录\n\n此目录用于存储文档的向量表示。\n\n注意：此目录中的文件包含向量数据，请勿手动修改。"
	
	if err := os.WriteFile(vectorReadmePath, []byte(vectorReadmeContent), 0644); err != nil {
		log.Printf("无法创建向量存储目录说明文件: %v", err)
	} else {
		log.Printf("已生成向量存储目录说明文件: %s", vectorReadmePath)
	}
}