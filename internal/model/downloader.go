package model

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"github.com/user/rag-go/internal/config"
)

const (
	// BGE模型相关常量
	BGEBaseZhModelName = "bge-base-zh"
	BGEBaseZhModelURL  = "https://huggingface.co/BAAI/bge-base-zh/resolve/main/onnx/model_quantized.onnx"
	BGEBaseZhTokenizerURL = "https://huggingface.co/BAAI/bge-base-zh/raw/main/tokenizer.json"
	BGEBaseZhDimension = 768 // bge-base-zh的嵌入维度
)

// ModelDownloader 负责下载和管理模型文件
type ModelDownloader struct {
	ModelDir string
}

// NewModelDownloader 创建一个新的模型下载器
func NewModelDownloader(cfg *config.Config) *ModelDownloader {
	return &ModelDownloader{
		ModelDir: cfg.ModelPath,
	}
}

// EnsureBGEBaseZhModel 确保bge-base-zh模型文件存在，如果不存在则下载
func (md *ModelDownloader) EnsureBGEBaseZhModel() (string, error) {
	// 创建模型目录
	modelDir := filepath.Join(md.ModelDir, BGEBaseZhModelName)
	if err := os.MkdirAll(modelDir, 0755); err != nil {
		return "", fmt.Errorf("无法创建模型目录: %v", err)
	}

	// 检查模型文件是否存在
	modelPath := filepath.Join(modelDir, "model.onnx")
	tokenizerPath := filepath.Join(modelDir, "tokenizer.json")

	modelExists := fileExists(modelPath)
	tokenizerExists := fileExists(tokenizerPath)

	// 下载模型文件
	if !modelExists {
		fmt.Println("正在下载BGE-Base-ZH模型文件...")
		if err := downloadFile(BGEBaseZhModelURL, modelPath); err != nil {
			return "", fmt.Errorf("下载模型文件失败: %v", err)
		}
		fmt.Println("模型文件下载完成")
	}

	// 下载tokenizer文件
	if !tokenizerExists {
		fmt.Println("正在下载BGE-Base-ZH分词器文件...")
		if err := downloadFile(BGEBaseZhTokenizerURL, tokenizerPath); err != nil {
			return "", fmt.Errorf("下载分词器文件失败: %v", err)
		}
		fmt.Println("分词器文件下载完成")
	}

	return modelDir, nil
}

// 检查文件是否存在
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// 下载文件
func downloadFile(url, destPath string) error {
	// 创建目标文件
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	// 发送HTTP GET请求
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载失败，HTTP状态码: %d", resp.StatusCode)
	}

	// 显示下载进度
	fmt.Printf("开始下载: %s\n", getFileName(url))

	// 复制响应内容到文件
	_, err = io.Copy(out, resp.Body)
	return err
}

// 从URL中获取文件名
func getFileName(url string) string {
	parts := strings.Split(url, "/")
	return parts[len(parts)-1]
}