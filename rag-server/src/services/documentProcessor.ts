/**
 * 文档处理模块
 * 负责文档加载、分块和预处理
 */

import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'fs';
import * as path from 'path';

export interface DocumentProcessorOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  encoding?: string;
}

export class DocumentProcessor {
  private options: DocumentProcessorOptions;

  constructor(options: DocumentProcessorOptions = {}) {
    this.options = {
      chunkSize: 1000,
      chunkOverlap: 200,
      encoding: 'utf-8',
      ...options
    };
  }

  /**
   * 从文件加载文档内容
   * @param filePath 文件路径
   * @returns 文档内容
   */
  async loadFromFile(filePath: string): Promise<string> {
    try {
      return fs.readFileSync(filePath, { encoding: this.options.encoding as BufferEncoding }).toString();
    } catch (error) {
      console.error(`加载文件失败: ${filePath}`, error);
      throw new Error(`加载文件失败: ${filePath}`);
    }
  }

  /**
   * 将文本分块
   * @param text 文本内容
   * @param metadata 元数据
   * @returns 分块后的文档数组
   */
  async splitText(text: string, metadata: Record<string, any> = {}): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.options.chunkSize,
      chunkOverlap: this.options.chunkOverlap,
    });

    return splitter.createDocuments([text], [metadata]);
  }

  /**
   * 处理文档
   * @param filePath 文件路径
   * @returns 处理后的文档数组
   */
  async processFile(filePath: string): Promise<Document[]> {
    const text = await this.loadFromFile(filePath);
    const metadata = {
      source: filePath,
      filename: path.basename(filePath),
      created: new Date().toISOString(),
    };
    
    return this.splitText(text, metadata);
  }

  /**
   * 批量处理多个文档
   * @param filePaths 文件路径数组
   * @returns 处理后的文档数组
   */
  async processBatch(filePaths: string[]): Promise<Document[]> {
    const results: Document[] = [];
    
    for (const filePath of filePaths) {
      try {
        const docs = await this.processFile(filePath);
        results.push(...docs);
      } catch (error) {
        console.error(`处理文件失败: ${filePath}`, error);
        // 继续处理其他文件
      }
    }
    
    return results;
  }
}