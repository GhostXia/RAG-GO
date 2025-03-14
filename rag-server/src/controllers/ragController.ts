/**
 * RAG控制器
 * 提供RAG系统的RESTful API接口
 */

import { Request, Response } from 'express';
import { DocumentProcessor } from '../services/documentProcessor';
import { VectorStore } from '../services/vectorStore';
import { QueryProcessor } from '../services/queryProcessor';
import * as path from 'path';
import * as fs from 'fs';

// 服务实例
const documentProcessor = new DocumentProcessor();
const vectorStore = new VectorStore();
const queryProcessor = new QueryProcessor(vectorStore);

// 初始化向量存储
vectorStore.initialize().catch(err => {
  console.error('初始化向量存储失败:', err);
});

export const ragController = {
  /**
   * 上传并处理文档
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      // 注意：这里假设使用了multer等中间件处理文件上传
      const filePath = (req.file as any)?.path;
      
      if (!filePath) {
        res.status(400).json({ error: '未提供文件' });
        return;
      }
      
      // 处理文档
      const documents = await documentProcessor.processFile(filePath);
      
      // 添加到向量存储
      await vectorStore.addDocuments(documents);
      
      res.status(200).json({
        success: true,
        message: `成功处理文档: ${path.basename(filePath)}`,
        documentCount: documents.length
      });
    } catch (error: any) {
      console.error('处理文档失败:', error);
      res.status(500).json({ error: `处理文档失败: ${error.message}` });
    }
  },
  
  /**
   * 批量上传并处理文档
   */
  async uploadBatch(req: Request, res: Response): Promise<void> {
    try {
      // 注意：这里假设使用了multer等中间件处理文件上传
      const filePaths = (req.files as any[])?.map(file => file.path) || [];
      
      if (filePaths.length === 0) {
        res.status(400).json({ error: '未提供文件' });
        return;
      }
      
      // 批量处理文档
      const documents = await documentProcessor.processBatch(filePaths);
      
      // 添加到向量存储
      await vectorStore.addDocuments(documents);
      
      res.status(200).json({
        success: true,
        message: `成功处理 ${filePaths.length} 个文档`,
        documentCount: documents.length
      });
    } catch (error: any) {
      console.error('批量处理文档失败:', error);
      res.status(500).json({ error: `批量处理文档失败: ${error.message}` });
    }
  },
  
  /**
   * 查询处理
   */
  async query(req: Request, res: Response): Promise<void> {
    try {
      const { query, topK = 5 } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: '无效的查询' });
        return;
      }
      
      // 处理查询
      const answer = await queryProcessor.processQuery(query, topK);
      
      res.status(200).json({ answer });
    } catch (error: any) {
      console.error('查询处理失败:', error);
      res.status(500).json({ error: `查询处理失败: ${error.message}` });
    }
  },
  
  /**
   * 带来源的查询处理
   */
  async queryWithSources(req: Request, res: Response): Promise<void> {
    try {
      const { query, topK = 5 } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: '无效的查询' });
        return;
      }
      
      // 处理查询并返回来源
      const result = await queryProcessor.processQueryWithSources(query, topK);
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error('查询处理失败:', error);
      res.status(500).json({ error: `查询处理失败: ${error.message}` });
    }
  },
  
  /**
   * 清空向量存储
   */
  async clearVectorStore(req: Request, res: Response): Promise<void> {
    try {
      await vectorStore.clear();
      res.status(200).json({ success: true, message: '向量存储已清空' });
    } catch (error: any) {
      console.error('清空向量存储失败:', error);
      res.status(500).json({ error: `清空向量存储失败: ${error.message}` });
    }
  }
};