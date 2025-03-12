package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config 存储应用程序配置
type Config struct {
	// 服务器配置
	Host string `json:"host"`
	Port int    `json:"port"`

	// 模型配置
	ModelPath string `json:"model_path"` // ONNX模型路径

	// 存储配置
	StoragePath string `json:"storage_path"` // 向量存储路径

	// 文档处理配置
	ChunkSize  int `json:"chunk_size"`  // 文档分块大小
	ChunkOverlap int `json:"chunk_overlap"` // 文档分块重叠大小
}

// DefaultConfig 返回默认配置
func DefaultConfig() *Config {
	return &Config{
		Host: "127.0.0.1",
		Port: 8080,
		ModelPath: "./models",
		StoragePath: "./data",
		ChunkSize: 1000,
		ChunkOverlap: 200,
	}
}

// Load 从配置文件加载配置
func Load() (*Config, error) {
	// 首先尝试从配置文件加载
	cfg := DefaultConfig()

	// 检查配置文件是否存在
	configPath := "config.json"
	if _, err := os.Stat(configPath); err == nil {
		// 读取配置文件
		data, err := os.ReadFile(configPath)
		if err != nil {
			return nil, err
		}

		// 解析JSON
		if err := json.Unmarshal(data, cfg); err != nil {
			return nil, err
		}
	}

	// 确保必要的目录存在
	if err := ensureDirectoryExists(cfg.ModelPath); err != nil {
		return nil, err
	}
	if err := ensureDirectoryExists(cfg.StoragePath); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Save 保存配置到文件
func (c *Config) Save() error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("config.json", data, 0644)
}

// 确保目录存在，如果不存在则创建
func ensureDirectoryExists(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return os.MkdirAll(absPath, 0755)
	}

	return nil
}