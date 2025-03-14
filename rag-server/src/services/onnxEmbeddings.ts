/**
 * ONNX嵌入服务
 * 使用ONNX运行时加载和运行Transformer模型进行文本嵌入
 */

import * as fs from 'fs';
import * as path from 'path';
import { Embeddings } from 'langchain/embeddings/base';

// 这些类型声明将在安装onnxruntime后使用
interface OnnxSession {
  run(feeds: Record<string, any>): Promise<Record<string, any>>;
}

interface OnnxInferenceSession {
  create(modelPath: string): Promise<OnnxSession>;
}

export interface OnnxEmbeddingsOptions {
  modelPath: string;
  dimension?: number;
  batchSize?: number;
}

export class OnnxEmbeddings implements Embeddings {
  private modelPath: string;
  private dimension: number;
  private batchSize: number;
  private tokenizer: any;
  private session: OnnxSession | null = null;
  
  constructor(options: OnnxEmbeddingsOptions) {
    this.modelPath = options.modelPath;
    this.dimension = options.dimension || 384; // 默认维度，适用于all-MiniLM-L6-v2
    this.batchSize = options.batchSize || 32;
    
    // 验证模型路径
    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`ONNX模型路径不存在: ${this.modelPath}`);
    }
  }
  
  /**
   * 初始化ONNX会话和分词器
   */
  async initialize(): Promise<void> {
    try {
      // 动态导入onnxruntime和tokenizers
      // 这些模块将在安装依赖后可用
      const ort = await import('onnxruntime-node');
      const { Tokenizer } = await import('@xenova/transformers');
      
      // 加载模型
      this.session = await ort.InferenceSession.create(
        path.join(this.modelPath, 'model.onnx')
      );
      
      // 加载分词器
      this.tokenizer = await Tokenizer.from_pretrained(this.modelPath);
      
      console.log('ONNX嵌入模型初始化成功');
    } catch (error) {
      console.error('初始化ONNX模型失败:', error);
      throw new Error(`初始化ONNX模型失败: ${error.message}`);
    }
  }
  
  /**
   * 对文本进行分词处理
   * @param text 输入文本
   * @returns 分词结果
   */
  private async tokenize(text: string): Promise<Record<string, any>> {
    if (!this.tokenizer) {
      throw new Error('分词器尚未初始化');
    }
    
    return this.tokenizer.encode(text);
  }
  
  /**
   * 对单个文本进行嵌入
   * @param text 输入文本
   * @returns 嵌入向量
   */
  private async embedText(text: string): Promise<number[]> {
    if (!this.session) {
      await this.initialize();
    }
    
    // 分词
    const tokenized = await this.tokenize(text);
    
    // 运行推理
    const result = await this.session!.run({
      input_ids: [tokenized.input_ids],
      attention_mask: [tokenized.attention_mask],
      token_type_ids: [tokenized.token_type_ids]
    });
    
    // 获取输出嵌入
    const embedding = Array.from(result.last_hidden_state.data);
    
    // 对嵌入进行平均池化
    const pooled = this.meanPooling(embedding, this.dimension);
    
    // 归一化
    return this.normalize(pooled);
  }
  
  /**
   * 对嵌入进行平均池化
   * @param embedding 嵌入向量
   * @param dimension 维度
   * @returns 池化后的向量
   */
  private meanPooling(embedding: number[], dimension: number): number[] {
    const result = new Array(dimension).fill(0);
    const numTokens = embedding.length / dimension;
    
    for (let i = 0; i < embedding.length; i++) {
      const dim = i % dimension;
      result[dim] += embedding[i] / numTokens;
    }
    
    return result;
  }
  
  /**
   * 对向量进行L2归一化
   * @param vector 输入向量
   * @returns 归一化后的向量
   */
  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    
    return vector.map(val => val / norm);
  }
  
  /**
   * 对文本批量进行嵌入
   * @param texts 文本数组
   * @returns 嵌入向量数组
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.session) {
      await this.initialize();
    }
    
    const embeddings: number[][] = [];
    
    // 批量处理
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.embedText(text))
      );
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  }
  
  /**
   * 对单个查询文本进行嵌入
   * @param text 查询文本
   * @returns 嵌入向量
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.embedText(text);
  }
}