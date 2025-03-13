package processor

import (
	"fmt"
	"strings"
	"time"
)

// ChatMessage 表示一条聊天消息
type ChatMessage struct {
	Role    string `json:"role"`    // 消息角色：user, assistant, system
	Content string `json:"content"` // 消息内容
	Time    string `json:"time"`    // 消息时间
}

// ChatHistory 表示一段聊天历史
type ChatHistory struct {
	Messages []ChatMessage `json:"messages"` // 消息列表
	Title    string        `json:"title"`    // 聊天标题
	ID       string        `json:"id"`       // 聊天ID
}

// ProcessChatHistory 处理聊天历史，将其转换为可检索的文档
func ProcessChatHistory(chat ChatHistory) ([]string, error) {
	if len(chat.Messages) == 0 {
		return nil, fmt.Errorf("聊天历史为空")
	}

	// 将聊天消息合并为文本
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("聊天标题: %s\n\n", chat.Title))

	// 按照时间顺序处理消息
	for _, msg := range chat.Messages {
		// 添加角色前缀
		var rolePrefix string
		switch msg.Role {
		case "user":
			rolePrefix = "用户: "
		case "assistant":
			rolePrefix = "助手: "
		case "system":
			rolePrefix = "系统: "
		default:
			rolePrefix = fmt.Sprintf("%s: ", msg.Role)
		}

		// 添加时间信息（如果有）
		timeInfo := ""
		if msg.Time != "" {
			timeInfo = fmt.Sprintf(" [%s]", msg.Time)
		}

		// 写入消息
		builder.WriteString(fmt.Sprintf("%s%s\n%s\n\n", rolePrefix, timeInfo, msg.Content))
	}

	// 获取完整的聊天文本
	chatText := builder.String()

	// 分块处理
	return ChunkText(chatText, 1000, 200), nil
}

// ExtractRecentChat 从聊天历史中提取最近的N条消息
func ExtractRecentChat(chat ChatHistory, n int) ChatHistory {
	if n <= 0 || len(chat.Messages) <= n {
		return chat
	}

	// 创建新的聊天历史，只包含最近的n条消息
	recentChat := ChatHistory{
		Title:    chat.Title,
		ID:       chat.ID,
		Messages: chat.Messages[len(chat.Messages)-n:],
	}

	return recentChat
}

// FormatChatForContext 将聊天历史格式化为上下文增强信息
func FormatChatForContext(docs []string, source string) string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("\n\n[来自%s的相关信息]\n", source))

	for i, doc := range docs {
		builder.WriteString(fmt.Sprintf("%d. %s\n\n", i+1, doc))
	}

	return builder.String()
}

// CreateChatMetadata 创建聊天记录的元数据
func CreateChatMetadata(chat ChatHistory) map[string]string {
	// 创建基本元数据
	metadata := map[string]string{
		"title":       chat.Title,
		"chat_id":     chat.ID,
		"message_count": fmt.Sprintf("%d", len(chat.Messages)),
		"upload_time": time.Now().Format(time.RFC3339),
	}

	// 如果有消息，添加时间范围
	if len(chat.Messages) > 0 {
		firstMsg := chat.Messages[0]
		lastMsg := chat.Messages[len(chat.Messages)-1]
		
		if firstMsg.Time != "" {
			metadata["start_time"] = firstMsg.Time
		}
		
		if lastMsg.Time != "" {
			metadata["end_time"] = lastMsg.Time
		}
	}

	return metadata
}