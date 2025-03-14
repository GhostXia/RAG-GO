/**
 * RAG-Server 入口文件
 * 负责启动服务器并初始化各个组件
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ragRoutes from './routes/ragRoutes';
import configRoutes from './routes/configRoutes';
import { Config } from './utils/config';
import multer from 'multer';

// 加载环境变量
dotenv.config();

// 获取配置
const config = Config.getInstance();
const configOptions = config.get();

// 验证配置
const validation = config.validate();
if (!validation.valid) {
  console.error('配置验证失败:', validation.errors.join(', '));
  process.exit(1);
}

const app = express();
const port = configOptions.port || 3000;

// 中间件
app.use(cors({
  origin: configOptions.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    // 处理Multer错误
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `文件大小超过限制 (${configOptions.maxFileSize! / 1024 / 1024}MB)` });
    }
    return res.status(400).json({ error: `文件上传错误: ${err.message}` });
  } else if (err) {
    // 处理其他错误
    console.error('服务器错误:', err);
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
  next();
});

// 基本路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'RAG-Server API 运行中',
    version: '0.1.0',
    endpoints: [
      '/api/rag/upload - 上传单个文档',
      '/api/rag/upload/batch - 批量上传文档',
      '/api/rag/query - 查询',
      '/api/rag/query/with-sources - 带来源的查询',
      '/api/rag/clear - 清空向量存储'
    ]
  });
});

// 注册RAG路由
app.use('/api/rag', ragRoutes);

// 注册配置路由
app.use('/api/config', configRoutes);

// 启动服务器
app.listen(port, () => {
  console.log(`RAG-Server 运行在 http://localhost:${port}`);
  console.log(`上传目录: ${configOptions.uploadDir}`);
  console.log(`允许的文件类型: ${configOptions.allowedFileTypes?.join(', ')}`);
});