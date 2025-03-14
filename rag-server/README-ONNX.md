# RAG系统ONNX模型集成指南

## 简介

本指南介绍如何在RAG系统中集成ONNX模型以提高文本嵌入和检索的性能。使用ONNX模型可以在不依赖OpenAI API的情况下进行文本嵌入，特别适合在本地环境或离线场景中使用。

## 优势

- **降低API成本**：无需调用OpenAI API进行文本嵌入
- **提高响应速度**：本地推理减少网络延迟
- **离线工作**：不依赖网络连接
- **隐私保护**：敏感数据不会发送到外部服务

## 安装依赖

```bash
npm install onnxruntime-node @xenova/transformers
```

## 下载模型

系统默认使用`all-MiniLM-L6-v2`模型，这是一个轻量级的文本嵌入模型，可以生成384维的文本向量。您可以从Hugging Face下载模型：

1. 访问 [Hugging Face模型库](https://huggingface.co/Xenova/all-MiniLM-L6-v2)
2. 下载模型文件
3. 将模型文件放置在`models/all-MiniLM-L6-v2`目录下

或者使用脚本自动下载：

```javascript
const { pipeline } = require('@xenova/transformers');

// 这将自动下载并缓存模型
async function downloadModel() {
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('模型下载完成');
}

downloadModel();
```

## 配置

在`.env`文件中设置以下配置：

```
# ONNX模型配置
USE_ONNX=true
ONNX_MODEL_PATH=./models/all-MiniLM-L6-v2
```

## 使用方法

启用ONNX模型后，系统将自动使用本地模型进行文本嵌入，而不是调用OpenAI API。您可以像往常一样使用RAG系统的所有功能，包括文档上传、查询和检索。

### 示例代码

```typescript
import { VectorStore } from './services/vectorStore';
import { DocumentProcessor } from './services/documentProcessor';

// 初始化向量存储（将自动使用ONNX模型）
const vectorStore = new VectorStore();

// 处理文档
const docProcessor = new DocumentProcessor();
const documents = await docProcessor.processFile('path/to/document.txt');

// 添加文档到向量存储
await vectorStore.addDocuments(documents);

// 查询
const results = await vectorStore.similaritySearch('你的查询', 5);
console.log(results);
```

## 性能调优

### 批处理大小

如果您处理大量文档，可以调整批处理大小以优化性能：

```typescript
import { OnnxEmbeddings } from './services/onnxEmbeddings';

const embeddings = new OnnxEmbeddings({
  modelPath: './models/all-MiniLM-L6-v2',
  batchSize: 64  // 默认为32
});
```

### 使用其他模型

您可以使用其他ONNX兼容的嵌入模型，只需更改模型路径和维度：

```typescript
const embeddings = new OnnxEmbeddings({
  modelPath: './models/other-model',
  dimension: 768  // 根据模型调整维度
});
```

## 故障排除

### 常见问题

1. **模型加载失败**
   - 确保模型文件夹包含完整的模型文件
   - 检查路径是否正确

2. **内存使用过高**
   - 减小批处理大小
   - 使用更小的模型

3. **嵌入质量不佳**
   - 尝试使用更大、更高质量的模型
   - 调整相似度阈值

## 支持的模型

以下是一些推荐的ONNX兼容嵌入模型：

- all-MiniLM-L6-v2 (384维，推荐用于一般用途)
- all-mpnet-base-v2 (768维，更高质量但更慢)
- paraphrase-multilingual-MiniLM-L12-v2 (多语言支持)

## 注意事项

- ONNX模型在首次加载时可能需要较长时间
- CPU推理可能比GPU推理慢，但仍比API调用快
- 确保为模型分配足够的内存