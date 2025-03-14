/**
 * 配置控制器
 * 提供配置管理的RESTful API接口
 */

import { Request, Response } from 'express';
import { Config } from '../utils/config';
import * as fs from 'fs';
import * as path from 'path';

// 获取配置实例
const config = Config.getInstance();

export const configController = {
  /**
   * 获取当前配置
   */
  getConfig(req: Request, res: Response): void {
    try {
      const configOptions = config.get();
      
      // 返回配置（隐藏敏感信息）
      const safeConfig = { ...configOptions };
      if (safeConfig.openaiApiKey) {
        safeConfig.openaiApiKey = safeConfig.openaiApiKey.substring(0, 3) + '...' + 
          safeConfig.openaiApiKey.substring(safeConfig.openaiApiKey.length - 4);
      }
      
      res.status(200).json(safeConfig);
    } catch (error: any) {
      console.error('获取配置失败:', error);
      res.status(500).json({ error: `获取配置失败: ${error.message}` });
    }
  },
  
  /**
   * 更新配置
   */
  updateConfig(req: Request, res: Response): void {
    try {
      const newConfig = req.body;
      
      // 验证配置
      if (!newConfig || typeof newConfig !== 'object') {
        res.status(400).json({ error: '无效的配置数据' });
        return;
      }
      
      // 更新配置
      config.update(newConfig);
      
      // 验证更新后的配置
      const validation = config.validate();
      if (!validation.valid) {
        res.status(400).json({ 
          error: '配置验证失败', 
          details: validation.errors 
        });
        return;
      }
      
      // 返回更新后的配置
      const updatedConfig = config.get();
      const safeConfig = { ...updatedConfig };
      if (safeConfig.openaiApiKey) {
        safeConfig.openaiApiKey = safeConfig.openaiApiKey.substring(0, 3) + '...' + 
          safeConfig.openaiApiKey.substring(safeConfig.openaiApiKey.length - 4);
      }
      
      res.status(200).json({
        success: true,
        message: '配置已更新',
        config: safeConfig
      });
    } catch (error: any) {
      console.error('更新配置失败:', error);
      res.status(500).json({ error: `更新配置失败: ${error.message}` });
    }
  },
  
  /**
   * 保存配置到.env文件
   */
  saveConfigToEnv(req: Request, res: Response): void {
    try {
      const configOptions = config.get();
      const envPath = path.join(process.cwd(), '.env');
      
      // 构建.env文件内容
      let envContent = '';
      
      // OpenAI配置
      envContent += `# OpenAI配置\n`;
      envContent += `OPENAI_API_KEY=${configOptions.openaiApiKey || ''}\n`;
      envContent += `EMBEDDING_MODEL=${configOptions.embeddingModel || 'text-embedding-ada-002'}\n`;
      envContent += `COMPLETION_MODEL=${configOptions.completionModel || 'gpt-3.5-turbo'}\n\n`;
      
      // ONNX模型配置
      envContent += `# ONNX模型配置\n`;
      envContent += `USE_ONNX=${configOptions.useOnnx ? 'true' : 'false'}\n`;
      envContent += `ONNX_MODEL_PATH=${configOptions.onnxModelPath || './models/all-MiniLM-L6-v2'}\n\n`;
      
      // 文档处理配置
      envContent += `# 文档处理配置\n`;
      envContent += `CHUNK_SIZE=${configOptions.chunkSize || 1000}\n`;
      envContent += `CHUNK_OVERLAP=${configOptions.chunkOverlap || 200}\n\n`;
      
      // 向量存储配置
      envContent += `# 向量存储配置\n`;
      envContent += `SIMILARITY_THRESHOLD=${configOptions.similarityThreshold || 0.7}\n\n`;
      
      // 服务器配置
      envContent += `# 服务器配置\n`;
      envContent += `PORT=${configOptions.port || 3000}\n`;
      envContent += `CORS_ORIGINS=${Array.isArray(configOptions.corsOrigins) ? configOptions.corsOrigins.join(',') : '*'}\n\n`;
      
      // 文件存储配置
      envContent += `# 文件存储配置\n`;
      envContent += `UPLOAD_DIR=${configOptions.uploadDir || './uploads'}\n`;
      envContent += `MAX_FILE_SIZE=${configOptions.maxFileSize || 10485760}\n`;
      envContent += `ALLOWED_FILE_TYPES=${Array.isArray(configOptions.allowedFileTypes) ? configOptions.allowedFileTypes.join(',') : '.txt,.pdf,.doc,.docx,.md'}\n`;
      
      // 写入.env文件
      fs.writeFileSync(envPath, envContent);
      
      res.status(200).json({
        success: true,
        message: '配置已保存到.env文件'
      });
    } catch (error: any) {
      console.error('保存配置到.env文件失败:', error);
      res.status(500).json({ error: `保存配置到.env文件失败: ${error.message}` });
    }
  },
  
  /**
   * 获取系统状态
   */
  getSystemStatus(req: Request, res: Response): void {
    try {
      // 获取系统状态信息
      const status = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(status);
    } catch (error: any) {
      console.error('获取系统状态失败:', error);
      res.status(500).json({ error: `获取系统状态失败: ${error.message}` });
    }
  }
};