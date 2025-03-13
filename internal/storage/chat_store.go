package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/user/rag-go/internal/processor"
)

// ChatStore 管理聊天记录的存储和检索
type ChatStore struct {
	basePath string
	mutex    sync.RWMutex
}

// ChatInfo 存储聊天记录的基本信息
type ChatInfo struct {
	ID        string    `json:"id"`         // 聊天ID
	Title     string    `json:"title"`      // 聊天标题
	Character string    `json:"character"`  // 角色名称
	CreatedAt time.Time `json:"created_at"` // 创建时间
	UpdatedAt time.Time `json:"updated_at"` // 更新时间
	MessageCount int    `json:"message_count"` // 消息数量
}

// NewChatStore 创建一个新的聊天记录存储
func NewChatStore(basePath string) (*ChatStore, error) {
	// 确保基础目录存在
	chatsPath := filepath.Join(basePath, "chats")
	if err := os.MkdirAll(chatsPath, 0755); err != nil {
		return nil, fmt.Errorf("无法创建聊天记录目录: %w", err)
	}

	return &ChatStore{
		basePath: basePath,
		mutex:    sync.RWMutex{},
	}, nil
}

// getCharacterPath 获取角色目录路径
func (cs *ChatStore) getCharacterPath(character string) string {
	return filepath.Join(cs.basePath, "chats", character)
}

// getChatPath 获取聊天记录文件路径
func (cs *ChatStore) getChatPath(character, chatID string) string {
	return filepath.Join(cs.getCharacterPath(character), chatID+".json")
}

// getCharacterInfoPath 获取角色信息文件路径
func (cs *ChatStore) getCharacterInfoPath(character string) string {
	return filepath.Join(cs.getCharacterPath(character), "_info.json")
}

// SaveChat 保存聊天记录
func (cs *ChatStore) SaveChat(character string, chat processor.ChatHistory) error {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	// 确保角色目录存在
	charPath := cs.getCharacterPath(character)
	if err := os.MkdirAll(charPath, 0755); err != nil {
		return fmt.Errorf("无法创建角色目录: %w", err)
	}

	// 更新聊天记录信息
	chatInfo := ChatInfo{
		ID:           chat.ID,
		Title:        chat.Title,
		Character:    character,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		MessageCount: len(chat.Messages),
	}

	// 检查是否已存在该聊天记录
	chatPath := cs.getChatPath(character, chat.ID)
	if _, err := os.Stat(chatPath); err == nil {
		// 如果存在，读取原有信息保留创建时间
		existingData, err := os.ReadFile(chatPath)
		if err == nil {
			var existingChat struct {
				Info ChatInfo `json:"info"`
			}
			if json.Unmarshal(existingData, &existingChat) == nil {
				chatInfo.CreatedAt = existingChat.Info.CreatedAt
			}
		}
	}

	// 准备保存的数据
	saveData := struct {
		Info     ChatInfo               `json:"info"`
		Messages []processor.ChatMessage `json:"messages"`
	}{
		Info:     chatInfo,
		Messages: chat.Messages,
	}

	// 序列化数据
	data, err := json.MarshalIndent(saveData, "", "  ")
	if err != nil {
		return fmt.Errorf("无法序列化聊天记录: %w", err)
	}

	// 保存聊天记录
	if err := os.WriteFile(chatPath, data, 0644); err != nil {
		return fmt.Errorf("无法保存聊天记录: %w", err)
	}

	// 更新角色信息文件
	return cs.updateCharacterInfo(character, chatInfo)
}

// updateCharacterInfo 更新角色信息文件
func (cs *ChatStore) updateCharacterInfo(character string, chatInfo ChatInfo) error {
	infoPath := cs.getCharacterInfoPath(character)

	// 读取现有角色信息
	var chats []ChatInfo
	if _, err := os.Stat(infoPath); err == nil {
		data, err := os.ReadFile(infoPath)
		if err != nil {
			return fmt.Errorf("无法读取角色信息: %w", err)
		}

		if err := json.Unmarshal(data, &chats); err != nil {
			// 如果解析失败，创建新的列表
			chats = []ChatInfo{}
		}
	} else {
		// 如果文件不存在，创建新的列表
		chats = []ChatInfo{}
	}

	// 更新或添加聊天信息
	updated := false
	for i, info := range chats {
		if info.ID == chatInfo.ID {
			chats[i] = chatInfo
			updated = true
			break
		}
	}

	if !updated {
		chats = append(chats, chatInfo)
	}

	// 保存更新后的角色信息
	data, err := json.MarshalIndent(chats, "", "  ")
	if err != nil {
		return fmt.Errorf("无法序列化角色信息: %w", err)
	}

	return os.WriteFile(infoPath, data, 0644)
}

// GetChat 获取聊天记录
func (cs *ChatStore) GetChat(character, chatID string) (*processor.ChatHistory, error) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	// 获取聊天记录文件路径
	chatPath := cs.getChatPath(character, chatID)

	// 检查文件是否存在
	if _, err := os.Stat(chatPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("聊天记录不存在: %s", chatID)
	}

	// 读取聊天记录
	data, err := os.ReadFile(chatPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取聊天记录: %w", err)
	}

	// 解析聊天记录
	var savedData struct {
		Info     ChatInfo               `json:"info"`
		Messages []processor.ChatMessage `json:"messages"`
	}

	if err := json.Unmarshal(data, &savedData); err != nil {
		return nil, fmt.Errorf("无法解析聊天记录: %w", err)
	}

	// 创建聊天历史对象
	chat := &processor.ChatHistory{
		ID:       savedData.Info.ID,
		Title:    savedData.Info.Title,
		Messages: savedData.Messages,
	}

	return chat, nil
}

// DeleteChat 删除聊天记录
func (cs *ChatStore) DeleteChat(character, chatID string) error {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	// 获取聊天记录文件路径
	chatPath := cs.getChatPath(character, chatID)

	// 检查文件是否存在
	if _, err := os.Stat(chatPath); os.IsNotExist(err) {
		return fmt.Errorf("聊天记录不存在: %s", chatID)
	}

	// 删除聊天记录文件
	if err := os.Remove(chatPath); err != nil {
		return fmt.Errorf("无法删除聊天记录: %w", err)
	}

	// 更新角色信息文件
	infoPath := cs.getCharacterInfoPath(character)
	if _, err := os.Stat(infoPath); err == nil {
		// 读取角色信息
		data, err := os.ReadFile(infoPath)
		if err != nil {
			return fmt.Errorf("无法读取角色信息: %w", err)
		}

		var chats []ChatInfo
		if err := json.Unmarshal(data, &chats); err != nil {
			return fmt.Errorf("无法解析角色信息: %w", err)
		}

		// 移除已删除的聊天记录信息
		updatedChats := make([]ChatInfo, 0, len(chats))
		for _, info := range chats {
			if info.ID != chatID {
				updatedChats = append(updatedChats, info)
			}
		}

		// 保存更新后的角色信息
		data, err = json.MarshalIndent(updatedChats, "", "  ")
		if err != nil {
			return fmt.Errorf("无法序列化角色信息: %w", err)
		}

		if err := os.WriteFile(infoPath, data, 0644); err != nil {
			return fmt.Errorf("无法保存角色信息: %w", err)
		}
	}

	return nil
}

// ListCharacters 获取所有角色列表
func (cs *ChatStore) ListCharacters() ([]string, error) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	// 获取聊天记录目录
	chatsPath := filepath.Join(cs.basePath, "chats")

	// 读取目录
	entries, err := os.ReadDir(chatsPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("无法读取聊天记录目录: %w", err)
	}

	// 提取角色名称
	characters := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			characters = append(characters, entry.Name())
		}
	}

	return characters, nil
}

// ListChats 获取指定角色的所有聊天记录
func (cs *ChatStore) ListChats(character string) ([]ChatInfo, error) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	// 获取角色信息文件路径
	infoPath := cs.getCharacterInfoPath(character)

	// 检查文件是否存在
	if _, err := os.Stat(infoPath); os.IsNotExist(err) {
		return []ChatInfo{}, nil
	}

	// 读取角色信息
	data, err := os.ReadFile(infoPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取角色信息: %w", err)
	}

	var chats []ChatInfo
	if err := json.Unmarshal(data, &chats); err != nil {
		return nil, fmt.Errorf("无法解析角色信息: %w", err)
	}

	return chats, nil
}