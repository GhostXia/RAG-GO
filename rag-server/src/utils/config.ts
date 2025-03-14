/**
 * 配置管理模块
 * 负责管理API密钥和系统参数
 */

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
dotenv.config();

export interface ConfigOptions {
  // OpenAI配置
  openaiApiKey?: string;
  embeddingModel?: string;
  completionModel?: string;
  
  // ONNX模型配置
  useOnnx?: boolean;
  onnxModelPath?: string;
  
  // 文档处理配置
  chunkSize?: number;
  chunkOverlap?: number;
  
  // 向量存储配置
  similarityThreshold?: number;
  
  // 服务器配置
  port?: number;
  corsOrigins?: string[];
  
  // 文件存储配置
  uploadDir?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export class Config {
  private static instance: Config;
  private config: ConfigOptions;
  
  private constructor() {
    // 默认配置
    this.config = {
      // OpenAI配置
      openaiApiKey: process.env.OPENAI_API_KEY,
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
      completionModel: process.env.COMPLETION_MODEL || 'gpt-3.5-turbo',
      
      // ONNX模型配置
      useOnnx: process.env.USE_ONNX === 'true',
      onnxModelPath: process.env.ONNX_MODEL_PATH || path.join(process.cwd(), 'models/all-MiniLM-L6-v2'),
      
      // 文档处理配置
      chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
      
      // 向量存储配置
      similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
      
      // 服务器配置
      port: parseInt(process.env.PORT || '3000'),
      corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
      
      // 文件存储配置
      uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 默认10MB
      allowedFileTypes: process.env.ALLOWED_FILE_TYPES ? 
        process.env.ALLOWED_FILE_TYPES.split(',') : 
        ['.txt', '.pdf', '.doc', '.docx', '.md']
    };
    
    // 确保上传目录存在
    this.ensureUploadDir();
    
    // 确保ONNX模型目录存在
    if (this.config.useOnnx) {
      this.ensureOnnxModelDir();
    }
  }
  
  /**
   * 获取配置实例（单例模式）
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
  
  /**
   * 获取配置项
   */
  public get(): ConfigOptions {
    return this.config;
  }
  
  /**
   * 更新配置项
   * @param options 新的配置选项
   */
  public update(options: Partial<ConfigOptions>): void {
    this.config = {
      ...this.config,
      ...options
    };
  }
  
  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    const uploadDir = this.config.uploadDir!;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`创建上传目录: ${uploadDir}`);
    }
  }
  
  /**
   * 确保ONNX模型目录存在
   */
  private ensureOnnxModelDir(): void {
    const modelDir = path.dirname(this.config.onnxModelPath!);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
      console.log(`创建ONNX模型目录: ${modelDir}`);
    }
  }
  
  /**
   * 验证配置是否有效
   * @returns 配置是否有效
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 验证必要的API密钥
    if (!this.config.useOnnx && !this.config.openaiApiKey) {
      errors.push('缺少OpenAI API密钥');
    }
    
    // 验证ONNX模型路径
    if (this.config.useOnnx && !this.config.onnxModelPath) {
      errors.push('启用ONNX模式但未指定模型路径');
    }
    
    // 验证端口范围
    if (this.config.port && (this.config.port < 1 || this.config.port > 65535)) {
      errors.push('端口号必须在1-65535范围内');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}