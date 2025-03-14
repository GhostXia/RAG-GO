/**
 * RAG路由模块
 * 定义RAG系统的API路由
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { ragController } from '../controllers/ragController';
import { Config } from '../utils/config';

const router = express.Router();
const config = Config.getInstance().get();

// 配置文件上传中间件
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir!);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.allowedFileTypes?.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}。支持的类型: ${config.allowedFileTypes?.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize
  }
});

// 文档上传路由
router.post('/upload', upload.single('document'), ragController.uploadDocument);
router.post('/upload/batch', upload.array('documents', 10), ragController.uploadBatch);

// 查询路由
router.post('/query', ragController.query);
router.post('/query/with-sources', ragController.queryWithSources);

// 管理路由
router.post('/clear', ragController.clearVectorStore);

export default router;