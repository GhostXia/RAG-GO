/**
 * 向量存储模块
 * 负责管理文档嵌入和检索
 */

import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Embeddings } from 'langchain/embeddings/base';
import { OnnxEmbeddings } from './onnxEmbeddings';
import { Config } from '../utils/config';

export interface VectorStoreOptions {
  openaiApiKey?: string;
  embeddingModel?: string;
  similarityThreshold?: number;
  useOnnx?: boolean;
  onnxModelPath?: string;
}

export class VectorStore {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: Embeddings;
  private options: VectorStoreOptions;

  constructor(options: VectorStoreOptions = {}) {
    // 获取配置
    const config = Config.getInstance().get();
    
    this.options = {
      embeddingModel: config.embeddingModel || 'text-embedding-ada-002',
      similarityThreshold: config.similarityThreshold || 0.7,
      useOnnx: config.useOnnx || false,
      onnxModelPath: config.onnxModelPath,
      ...options
    };

    // 根据配置选择嵌入模型
    if (this.options.useOnnx && this.options.onnxModelPath) {
      console.log('使用ONNX模型进行嵌入');
      this.embeddings = new OnnxEmbeddings({
        modelPath: this.options.onnxModelPath
      });
    } else {
      console.log('使用OpenAI API进行嵌入');
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: options.openaiApiKey || config.openaiApiKey,
        modelName: this.options.embeddingModel,
      });
    }
  }

  /**
   * 初始化向量存储
   */
  async initialize(): Promise<void> {
    this.vectorStore = await MemoryVectorStore.fromDocuments(
      [], // 初始化时没有文档
      this.embeddings
    );
  }

  /**
   * 添加文档到向量存储
   * @param documents 文档数组
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }
    
    await this.vectorStore!.addDocuments(documents);
    console.log(`已添加 ${documents.length} 个文档到向量存储`);
  }

  /**
   * 根据查询检索相关文档
   * @param query 查询文本
   * @param topK 返回的最大文档数量
   * @returns 相关文档数组
   */
  async similaritySearch(query: string, topK: number = 5): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('向量存储尚未初始化');
    }

    return this.vectorStore.similaritySearch(query, topK);
  }

  /**
   * 根据查询检索相关文档及其相似度分数
   * @param query 查询文本
   * @param topK 返回的最大文档数量
   * @returns 相关文档及其相似度分数
   */
  async similaritySearchWithScore(query: string, topK: number = 5): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      throw new Error('向量存储尚未初始化');
    }

    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    
    // 过滤掉相似度低于阈值的结果
    return results.filter(([_, score]) => score >= this.options.similarityThreshold!);
  }

  /**
   * 清空向量存储
   */
  async clear(): Promise<void> {
    await this.initialize(); // 重新初始化一个空的向量存储
    console.log('向量存储已清空');
  }
}