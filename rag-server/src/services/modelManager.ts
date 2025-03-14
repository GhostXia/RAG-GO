/**
 * 模型管理服务
 * 负责扫描和管理本地ONNX模型
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ModelInfo {
  name: string;
  path: string;
  dimension?: number;
  description?: string;
  isValid: boolean;
}

export class ModelManager {
  private static instance: ModelManager;
  private modelsDir: string;
  
  private constructor(modelsDir: string) {
    this.modelsDir = modelsDir;
    
    // 确保模型目录存在
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
      console.log(`创建模型目录: ${this.modelsDir}`);
    }
  }
  
  /**
   * 获取模型管理器实例（单例模式）
   */
  public static getInstance(modelsDir?: string): ModelManager {
    if (!ModelManager.instance) {
      const defaultDir = path.join(process.cwd(), 'models');
      ModelManager.instance = new ModelManager(modelsDir || defaultDir);
    }
    return ModelManager.instance;
  }
  
  /**
   * 获取所有可用的模型列表
   */
  public async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      // 如果目录不存在，返回空数组
      if (!fs.existsSync(this.modelsDir)) {
        return [];
      }
      
      const modelDirs = fs.readdirSync(this.modelsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      const models: ModelInfo[] = [];
      
      for (const modelName of modelDirs) {
        const modelPath = path.join(this.modelsDir, modelName);
        const isValid = this.validateModelDirectory(modelPath);
        
        // 尝试读取模型信息文件
        let dimension = 384; // 默认维度
        let description = '';
        
        const infoPath = path.join(modelPath, 'model_info.json');
        if (fs.existsSync(infoPath)) {
          try {
            const infoData = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            dimension = infoData.dimension || dimension;
            description = infoData.description || '';
          } catch (error) {
            console.warn(`读取模型信息文件失败: ${infoPath}`, error);
          }
        }
        
        models.push({
          name: modelName,
          path: modelPath,
          dimension,
          description,
          isValid
        });
      }
      
      return models;
    } catch (error) {
      console.error('获取可用模型列表失败:', error);
      return [];
    }
  }
  
  /**
   * 验证模型目录是否包含有效的ONNX模型
   * @param modelPath 模型目录路径
   * @returns 是否为有效模型
   */
  private validateModelDirectory(modelPath: string): boolean {
    try {
      // 检查模型文件是否存在
      const modelFile = path.join(modelPath, 'model.onnx');
      const tokenizerFile = path.join(modelPath, 'tokenizer.json');
      
      return fs.existsSync(modelFile) && fs.existsSync(tokenizerFile);
    } catch (error) {
      console.error(`验证模型目录失败: ${modelPath}`, error);
      return false;
    }
  }
  
  /**
   * 获取模型详细信息
   * @param modelName 模型名称
   * @returns 模型信息
   */
  public async getModelInfo(modelName: string): Promise<ModelInfo | null> {
    try {
      const modelPath = path.join(this.modelsDir, modelName);
      
      if (!fs.existsSync(modelPath)) {
        return null;
      }
      
      const isValid = this.validateModelDirectory(modelPath);
      
      // 尝试读取模型信息文件
      let dimension = 384; // 默认维度
      let description = '';
      
      const infoPath = path.join(modelPath, 'model_info.json');
      if (fs.existsSync(infoPath)) {
        try {
          const infoData = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
          dimension = infoData.dimension || dimension;
          description = infoData.description || '';
        } catch (error) {
          console.warn(`读取模型信息文件失败: ${infoPath}`, error);
        }
      }
      
      return {
        name: modelName,
        path: modelPath,
        dimension,
        description,
        isValid
      };
    } catch (error) {
      console.error(`获取模型信息失败: ${modelName}`, error);
      return null;
    }
  }
}