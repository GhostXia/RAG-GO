/**
 * 配置路由模块
 * 定义配置管理的API路由
 */

import express from 'express';
import { configController } from '../controllers/configController';

const router = express.Router();

// 配置管理路由
router.get('/', configController.getConfig);
router.put('/', configController.updateConfig);
router.post('/save', configController.saveConfigToEnv);
router.get('/status', configController.getSystemStatus);
router.get('/models', configController.getModels);

export default router;