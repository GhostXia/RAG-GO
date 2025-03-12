# RAG-GO

这是一个基于Go语言开发的本地RAG（检索增强生成）系统，专门设计用于与SillyTavern集成。该系统使用ONNX运行时进行向量嵌入计算，提供高效的文档检索服务。

## 功能特点

- 支持SillyTavern DataBank API接口
- 使用ONNX运行时进行向量嵌入计算
- 高效的向量存储和检索
- 支持多种文档格式处理
- 简单易用的HTTP API接口

## 系统架构

系统主要由以下组件组成：

1. **文档处理器**：负责解析和预处理各种格式的文档
2. **ONNX模型管理器**：加载和管理ONNX模型，执行向量嵌入计算
3. **向量存储**：管理文档向量的存储和检索
4. **HTTP服务器**：提供与SillyTavern兼容的API接口

## 技术栈

- Go 1.21+
- ONNX Runtime
- Gin Web Framework
- Badger（向量存储）

## 项目结构

```
/
├── cmd/                  # 命令行应用
│   └── server/           # HTTP服务器入口
├── internal/             # 内部包
│   ├── api/              # API处理器
│   ├── config/           # 配置管理
│   ├── model/            # ONNX模型管理
│   ├── processor/        # 文档处理
│   └── storage/          # 向量存储
├── pkg/                  # 可重用的公共包
│   ├── embedding/        # 向量嵌入相关
│   └── utils/            # 通用工具函数
├── web/                  # Web界面资源
├── go.mod                # Go模块定义
└── README.md             # 项目说明
```

## 待开发功能

- [ ] 项目基础结构搭建
- [ ] ONNX模型加载和管理
- [ ] 文档处理和向量化
- [ ] 向量存储实现
- [ ] HTTP API接口实现
- [ ] 与SillyTavern集成测试

## 使用方法

待完善

## SillyTavern DataBank API 集成

本项目将实现SillyTavern DataBank API，主要包括以下接口：

- 文档上传和管理
- 向量检索和相似度搜索
- 上下文生成和优化

详细API规范参考：[SillyTavern DataBank文档](https://docs.sillytavern.app/usage/core-concepts/data-bank/)

## 许可证

MIT License