import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, message } from 'antd';
import { SettingOutlined, CodeOutlined, DashboardOutlined } from '@ant-design/icons';
import ConfigPanel from './components/ConfigPanel';
import Terminal from './components/Terminal';
import SystemStatus from './components/SystemStatus';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('config');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('zh'); // 添加语言状态，默认为中文
  
  // 处理菜单选择
  const handleMenuSelect = ({ key }: { key: string }) => {
    setSelectedKey(key);
  };
  
  // 处理语言切换
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    message.success(`界面语言已切换为${lang === 'zh' ? '中文' : 'English'}`);
  };
  
  // 渲染内容区域
  const renderContent = () => {
    switch (selectedKey) {
      case 'config':
        return <ConfigPanel language={language} onLanguageChange={handleLanguageChange} />;
      case 'terminal':
        return <Terminal />;
      case 'status':
        return <SystemStatus />;
      default:
        return <ConfigPanel language={language} onLanguageChange={handleLanguageChange} />;
    }
  };
  
  // 获取菜单项文本
  const getMenuText = (key: string) => {
    if (language === 'zh') {
      switch (key) {
        case 'config': return '配置管理';
        case 'terminal': return '终端输出';
        case 'status': return '系统状态';
        default: return '';
      }
    } else {
      switch (key) {
        case 'config': return 'Configuration';
        case 'terminal': return 'Terminal';
        case 'status': return 'System Status';
        default: return '';
      }
    }
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="header">
        <div className="logo" />
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          {language === 'zh' ? 'RAG系统管理界面' : 'RAG System Management'}
        </Title>
      </Header>
      <Layout>
        <Sider width={200} collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onSelect={handleMenuSelect}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="config" icon={<SettingOutlined />}>
              {getMenuText('config')}
            </Menu.Item>
            <Menu.Item key="terminal" icon={<CodeOutlined />}>
              {getMenuText('terminal')}
            </Menu.Item>
            <Menu.Item key="status" icon={<DashboardOutlined />}>
              {getMenuText('status')}
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            className="site-layout-background"
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
            }}
          >
            {loading ? <Spin size="large" /> : renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;