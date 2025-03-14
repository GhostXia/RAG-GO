import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, Switch, message, Divider, Typography, Radio } from 'antd';

const { Option } = Select;
const { Title, Paragraph } = Typography;

interface ConfigPanelProps {
  language: string;
  onLanguageChange: (lang: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ language, onLanguageChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modelType, setModelType] = useState('openai');
  const [onnxModels, setOnnxModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // 获取ONNX模型列表
  const fetchOnnxModels = async () => {
    try {
      setLoadingModels(true);
      const response = await fetch('/api/config/models');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.models)) {
        setOnnxModels(data.models);
      } else {
        setOnnxModels([]);
        console.error('获取模型列表失败:', data.error || '未知错误');
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      message.error(language === 'zh' ? '获取模型列表失败' : 'Failed to fetch models');
    } finally {
      setLoadingModels(false);
    }
  };
  
  // 组件加载时获取模型列表
  useEffect(() => {
    fetchOnnxModels();
  }, []);
  
  // 处理模型类型变更
  const handleModelTypeChange = (e: any) => {
    setModelType(e.target.value);
    
    // 根据模型类型设置默认值
    if (e.target.value === 'openai') {
      form.setFieldsValue({ model: 'gpt-3.5-turbo', onnxModel: undefined });
    } else {
      // 如果有ONNX模型，选择第一个
      if (onnxModels.length > 0) {
        form.setFieldsValue({ onnxModel: onnxModels[0].name, model: undefined });
      } else {
        form.setFieldsValue({ onnxModel: undefined, model: undefined });
      }
    }
  };
  
  const onFinish = async (values: any) => {
    setLoading(true);
    console.log('提交的配置:', values);
    
    // 处理语言变更
    if (values.language !== language) {
      onLanguageChange(values.language);
    }
    
    try {
      // 构建配置对象
      const config = {
        ...values,
        useOnnx: modelType === 'onnx',
        // 如果使用ONNX，设置模型路径
        onnxModelPath: modelType === 'onnx' && values.onnxModel ? 
          `./models/${values.onnxModel}` : undefined
      };
      
      // 发送到后端API
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success(language === 'zh' ? '配置已成功保存' : 'Configuration saved successfully');
      } else {
        message.error(language === 'zh' ? `保存失败: ${result.error}` : `Save failed: ${result.error}`);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error(language === 'zh' ? '保存配置失败' : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  // 获取文本内容
  const getText = (key: string) => {
    if (language === 'zh') {
      switch (key) {
        case 'title': return '系统配置';
        case 'description': return '在此页面配置RAG系统的各项参数';
        case 'basicSettings': return '基础设置';
        case 'advancedSettings': return '高级设置';
        case 'modelTypeLabel': return '模型类型';
        case 'openaiModelType': return 'OpenAI API';
        case 'onnxModelType': return '本地ONNX模型';
        case 'modelLabel': return '模型选择';
        case 'modelPlaceholder': return '选择使用的模型';
        case 'modelRequired': return '请选择模型';
        case 'onnxModelLabel': return 'ONNX模型';
        case 'onnxModelPlaceholder': return '选择本地ONNX模型';
        case 'onnxModelRequired': return '请选择ONNX模型';
        case 'refreshModels': return '刷新模型列表';
        case 'languageLabel': return '界面语言';
        case 'languagePlaceholder': return '选择界面语言';
        case 'languageRequired': return '请选择语言';
        case 'maxTokensLabel': return '最大Token数';
        case 'maxTokensPlaceholder': return '输入最大Token数';
        case 'maxTokensRequired': return '请输入最大Token数';
        case 'temperatureLabel': return '温度参数';
        case 'temperaturePlaceholder': return '输入温度参数';
        case 'temperatureRequired': return '请输入温度参数';
        case 'loggingLabel': return '启用日志记录';
        case 'saveButton': return '保存配置';
        case 'resetButton': return '重置';
        default: return '';
      }
    } else {
      switch (key) {
        case 'title': return 'System Configuration';
        case 'description': return 'Configure RAG system parameters on this page';
        case 'basicSettings': return 'Basic Settings';
        case 'advancedSettings': return 'Advanced Settings';
        case 'modelTypeLabel': return 'Model Type';
        case 'openaiModelType': return 'OpenAI API';
        case 'onnxModelType': return 'Local ONNX Model';
        case 'modelLabel': return 'Model Selection';
        case 'modelPlaceholder': return 'Select a model';
        case 'modelRequired': return 'Please select a model';
        case 'onnxModelLabel': return 'ONNX Model';
        case 'onnxModelPlaceholder': return 'Select local ONNX model';
        case 'onnxModelRequired': return 'Please select an ONNX model';
        case 'refreshModels': return 'Refresh Models';
        case 'languageLabel': return 'Interface Language';
        case 'languagePlaceholder': return 'Select interface language';
        case 'languageRequired': return 'Please select a language';
        case 'maxTokensLabel': return 'Max Tokens';
        case 'maxTokensPlaceholder': return 'Enter max tokens';
        case 'maxTokensRequired': return 'Please enter max tokens';
        case 'temperatureLabel': return 'Temperature';
        case 'temperaturePlaceholder': return 'Enter temperature';
        case 'temperatureRequired': return 'Please enter temperature';
        case 'loggingLabel': return 'Enable Logging';
        case 'saveButton': return 'Save Configuration';
        case 'resetButton': return 'Reset';
        default: return '';
      }
    }
  };

  return (
    <div className="config-panel">
      <Typography>
        <Title level={4}>{getText('title')}</Title>
        <Paragraph>{getText('description')}</Paragraph>
      </Typography>
      
      <Divider />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          model: 'gpt-3.5-turbo',
          language: language,
          maxTokens: 2048,
          temperature: 0.7,
          enableLogging: true
        }}
      >
        <Card title={getText('basicSettings')} style={{ marginBottom: 16 }}>
          <Form.Item
            name="modelType"
            label={getText('modelTypeLabel')}
          >
            <Radio.Group onChange={handleModelTypeChange} value={modelType}>
              <Radio value="openai">{getText('openaiModelType')}</Radio>
              <Radio value="onnx">{getText('onnxModelType')}</Radio>
            </Radio.Group>
          </Form.Item>
          
          {modelType === 'openai' && (
            <Form.Item
              name="model"
              label={getText('modelLabel')}
              rules={[{ required: modelType === 'openai', message: getText('modelRequired') }]}
            >
              <Select placeholder={getText('modelPlaceholder')}>
                <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
                <Option value="gpt-4">GPT-4</Option>
                <Option value="text-embedding-ada-002">text-embedding-ada-002</Option>
              </Select>
            </Form.Item>
          )}
          
          {modelType === 'onnx' && (
            <Form.Item
              name="onnxModel"
              label={getText('onnxModelLabel')}
              rules={[{ required: modelType === 'onnx', message: getText('onnxModelRequired') }]}
              extra={(
                <Button 
                  type="link" 
                  onClick={fetchOnnxModels} 
                  loading={loadingModels}
                  style={{ padding: 0 }}
                >
                  {getText('refreshModels')}
                </Button>
              )}
            >
              <Select placeholder={getText('onnxModelPlaceholder')} loading={loadingModels}>
                {onnxModels.map(model => (
                  <Option key={model.name} value={model.name}>
                    {model.name} {model.description ? `(${model.description})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          
          <Form.Item
            name="language"
            label={getText('languageLabel')}
            rules={[{ required: true, message: getText('languageRequired') }]}
          >
            <Select placeholder={getText('languagePlaceholder')}>
              <Option value="zh">中文</Option>
              <Option value="en">English</Option>
            </Select>
          </Form.Item>
        </Card>
        
        <Card title={getText('advancedSettings')} style={{ marginBottom: 16 }}>
          <Form.Item
            name="maxTokens"
            label={getText('maxTokensLabel')}
            rules={[{ required: true, message: getText('maxTokensRequired') }]}
          >
            <Input type="number" placeholder={getText('maxTokensPlaceholder')} />
          </Form.Item>
          
          <Form.Item
            name="temperature"
            label={getText('temperatureLabel')}
            rules={[{ required: true, message: getText('temperatureRequired') }]}
          >
            <Input type="number" step="0.1" placeholder={getText('temperaturePlaceholder')} />
          </Form.Item>
          
          <Form.Item
            name="enableLogging"
            label={getText('loggingLabel')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {getText('saveButton')}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => form.resetFields()}>
            {getText('resetButton')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ConfigPanel;