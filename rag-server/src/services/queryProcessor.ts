/**
 * 查询处理模块
 * 负责处理用户查询并生成回答
 */

import { Document } from 'langchain/document';
import { OpenAI } from '@langchain/openai';
import { VectorStore } from './vectorStore';

export interface QueryProcessorOptions {
  openaiApiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

export class QueryProcessor {
  private vectorStore: VectorStore;
  private llm: OpenAI;
  private options: QueryProcessorOptions;

  constructor(vectorStore: VectorStore, options: QueryProcessorOptions = {}) {
    this.vectorStore = vectorStore;
    this.options = {
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 500,
      ...options
    };

    this.llm = new OpenAI({
      openAIApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      modelName: this.options.modelName,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
    });
  }

  /**
   * 从文档构建上下文
   * @param documents 相关文档数组
   * @returns 上下文文本
   */
  private buildContext(documents: Document[]): string {
    return documents.map((doc, index) => {
      return `[文档 ${index + 1}] ${doc.pageContent}`;
    }).join('\n\n');
  }

  /**
   * 构建提示模板
   * @param query 用户查询
   * @param context 上下文文本
   * @returns 完整提示
   */
  private buildPrompt(query: string, context: string): string {
    return `请基于以下信息回答问题。如果无法从提供的信息中找到答案，请说明你不知道，不要编造信息。

上下文信息：
${context}

问题：${query}

回答：`;
  }

  /**
   * 处理查询并生成回答
   * @param query 用户查询
   * @param topK 检索的文档数量
   * @returns 生成的回答
   */
  async processQuery(query: string, topK: number = 5): Promise<string> {
    // 检索相关文档
    const relevantDocs = await this.vectorStore.similaritySearch(query, topK);
    
    if (relevantDocs.length === 0) {
      return '抱歉，我无法找到与您问题相关的信息。';
    }
    
    // 构建上下文和提示
    const context = this.buildContext(relevantDocs);
    const prompt = this.buildPrompt(query, context);
    
    // 生成回答
    const response = await this.llm.call(prompt);
    
    return response;
  }

  /**
   * 处理查询并返回带有来源的回答
   * @param query 用户查询
   * @param topK 检索的文档数量
   * @returns 生成的回答和来源
   */
  async processQueryWithSources(query: string, topK: number = 5): Promise<{ answer: string; sources: string[] }> {
    // 检索相关文档及其相似度分数
    const relevantDocsWithScores = await this.vectorStore.similaritySearchWithScore(query, topK);
    
    if (relevantDocsWithScores.length === 0) {
      return {
        answer: '抱歉，我无法找到与您问题相关的信息。',
        sources: []
      };
    }
    
    // 提取文档和来源
    const relevantDocs = relevantDocsWithScores.map(([doc, _]) => doc);
    const sources = relevantDocsWithScores.map(([doc, score]) => {
      const source = doc.metadata.source || '未知来源';
      return `${source} (相似度: ${score.toFixed(2)})`;
    });
    
    // 构建上下文和提示
    const context = this.buildContext(relevantDocs);
    const prompt = this.buildPrompt(query, context);
    
    // 生成回答
    const answer = await this.llm.call(prompt);
    
    return { answer, sources };
  }
}