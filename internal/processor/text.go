package processor

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
)

// ExtractText 从不同格式的文档中提取文本内容
func ExtractText(content []byte, fileExt string) (string, error) {
	// 根据文件扩展名处理不同类型的文档
	switch strings.ToLower(fileExt) {
	case ".txt":
		// 纯文本文件直接返回
		return string(content), nil

	case ".md":
		// Markdown文件直接返回
		return string(content), nil

	case ".html", ".htm":
		// 简单HTML处理，实际应用中可能需要更复杂的HTML解析
		return extractFromHTML(content), nil

	case ".pdf":
		// PDF处理，实际应用中需要使用PDF解析库
		return extractFromPDF(content)

	case ".docx":
		// Word文档处理，实际应用中需要使用DOCX解析库
		return extractFromDOCX(content)

	default:
		return "", fmt.Errorf("不支持的文件类型: %s", fileExt)
	}
}

// ChunkText 将文本分割成指定大小的块
func ChunkText(text string, chunkSize, overlap int) []string {
	if chunkSize <= 0 {
		chunkSize = 1000 // 默认块大小
	}

	if overlap < 0 || overlap >= chunkSize {
		overlap = chunkSize / 5 // 默认重叠大小为块大小的20%
	}

	// 按段落分割文本
	paragraphs := strings.Split(text, "\n\n")
	var chunks []string
	currentChunk := ""

	for _, paragraph := range paragraphs {
		// 如果段落本身超过块大小，则需要进一步分割
		if len(paragraph) > chunkSize {
			// 按句子分割段落
			sentences := splitIntoSentences(paragraph)
			for _, sentence := range sentences {
				if len(currentChunk)+len(sentence)+1 <= chunkSize {
					if currentChunk != "" {
						currentChunk += " "
					}
					currentChunk += sentence
				} else {
					// 当前块已满，保存并创建新块
					if currentChunk != "" {
						chunks = append(chunks, currentChunk)
						
						// 创建新块，包含重叠部分
						words := strings.Split(currentChunk, " ")
						if len(words) > 0 && overlap > 0 {
							overlapStart := len(words) - min(len(words), overlap)
							currentChunk = strings.Join(words[overlapStart:], " ")
						} else {
							currentChunk = ""
						}
					}
					
					// 如果句子本身超过块大小，则直接作为一个块
					if len(sentence) > chunkSize {
						chunks = append(chunks, sentence)
						currentChunk = ""
					} else {
						if currentChunk != "" {
							currentChunk += " "
						}
						currentChunk += sentence
					}
				}
			}
		} else {
			// 检查添加当前段落是否会超出块大小
			if len(currentChunk)+len(paragraph)+2 <= chunkSize { // +2 for "\n\n"
				if currentChunk != "" {
					currentChunk += "\n\n"
				}
				currentChunk += paragraph
			} else {
				// 当前块已满，保存并创建新块
				if currentChunk != "" {
					chunks = append(chunks, currentChunk)
					
					// 创建新块，包含重叠部分
					words := strings.Split(currentChunk, " ")
					if len(words) > 0 && overlap > 0 {
						overlapStart := len(words) - min(len(words), overlap)
						currentChunk = strings.Join(words[overlapStart:], " ")
					} else {
						currentChunk = ""
					}
				}
				
				currentChunk += paragraph
			}
		}
	}

	// 添加最后一个块
	if currentChunk != "" {
		chunks = append(chunks, currentChunk)
	}

	return chunks
}

// 辅助函数：将文本分割成句子
func splitIntoSentences(text string) []string {
	// 简单的句子分割，实际应用中可能需要更复杂的NLP处理
	delimiters := []string{".", "!", "?", "；", "。", "！", "？"}
	sentences := []string{text}
	
	for _, delimiter := range delimiters {
		var newSentences []string
		for _, s := range sentences {
			parts := strings.Split(s, delimiter)
			for i, part := range parts {
				if part == "" {
					continue
				}
				if i < len(parts)-1 {
					newSentences = append(newSentences, part+delimiter)
				} else {
					newSentences = append(newSentences, part)
				}
			}
		}
		sentences = newSentences
	}
	
	return sentences
}

// 辅助函数：从HTML中提取文本
func extractFromHTML(content []byte) string {
	// 简单的HTML文本提取，实际应用中应使用HTML解析库
	text := string(content)
	
	// 移除HTML标签（简化版本）
	var result bytes.Buffer
	var inTag bool
	
	for _, r := range text {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			result.WriteRune(' ') // 标签替换为空格
			continue
		}
		if !inTag {
			result.WriteRune(r)
		}
	}
	
	// 清理多余空白
	cleanText := strings.Join(strings.Fields(result.String()), " ")
	return cleanText
}

// 辅助函数：从PDF中提取文本
func extractFromPDF(content []byte) (string, error) {
	// 实际应用中应使用PDF解析库
	return "", errors.New("PDF解析尚未实现，请使用外部工具转换为文本后再上传")
}

// 辅助函数：从DOCX中提取文本
func extractFromDOCX(content []byte) (string, error) {
	// 实际应用中应使用DOCX解析库
	return "", errors.New("DOCX解析尚未实现，请使用外部工具转换为文本后再上传")
}

// 辅助函数：取两个整数的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}