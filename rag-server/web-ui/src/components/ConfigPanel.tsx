import React, { useState } from 'react';
import { Form, Input, Button, Card, Select, Switch, message, Divider, Typography } from 'antd';

const { Option } = Select;
const { Title, Paragraph } = Typography;

interface ConfigPanelProps {
  language: string;
  onLanguageChange: (lang: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ language, onLanguageChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = (values: any) => {
    setLoading(true);
    console.log('提交的配置:', values);
    
    // 处理语言变更
    if (values.language !== language) {
      onLanguageChange(values.language);
    }
    
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
      message.success(language === 'zh' ? '配置已成功保存' : 'Configuration saved successfully');
    }, 1000);
  };

  // 获取文本内容
  const getText = (key: string) => {
    if (language === 'zh') {
      switch (key) {
        case 'title': return '系统配置';
        case 'description': return '在此页面配置RAG系统的各项参数';
        case 'basicSettings': return '基础设置';
        case 'advancedSettings': return '高级设置';
        case 'modelLabel': return '模型选择';
        case 'modelPlaceholder': return '选择使用的模型';
        case 'modelRequired': return '请选择模型';
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
        case 'modelLabel': return 'Model Selection';
        case 'modelPlaceholder': return 'Select a model';
        case 'modelRequired': return 'Please select a model';
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
            name="model"
            label={getText('modelLabel')}
            rules={[{ required: true, message: getText('modelRequired') }]}
          >
            <Select placeholder={getText('modelPlaceholder')}>
              <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
              <Option value="gpt-4">GPT-4</Option>
              <Option value="llama-2">Llama 2</Option>
              <Option value="claude-2">Claude 2</Option>
            </Select>
          </Form.Item>
          
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