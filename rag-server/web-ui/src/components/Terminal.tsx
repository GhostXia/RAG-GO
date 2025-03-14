import React, { useState, useEffect } from 'react';
import { Card, Typography, Divider, Button, Space } from 'antd';

const { Title, Paragraph, Text } = Typography;

const Terminal: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 模拟获取日志数据
  useEffect(() => {
    const initialLogs = [
      '系统初始化中...',
      '加载配置文件...',
      '连接到数据库...',
      '初始化向量存储...',
      '模型加载完成',
      '系统准备就绪'
    ];
    setLogs(initialLogs);
  }, []);

  // 模拟启动/停止服务
  const toggleService = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      setLogs(prev => [...prev, '服务启动中...', '服务已启动']);
    } else {
      setLogs(prev => [...prev, '服务停止中...', '服务已停止']);
    }
  };

  // 清除日志
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div>
      <Typography>
        <Title level={4}>终端输出</Title>
        <Paragraph>查看系统运行日志和操作终端</Paragraph>
      </Typography>
      
      <Divider />
      
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          danger={isRunning} 
          onClick={toggleService}
        >
          {isRunning ? '停止服务' : '启动服务'}
        </Button>
        <Button onClick={clearLogs}>清除日志</Button>
      </Space>
      
      <Card>
        <div className="terminal-wrapper">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index}>
                <Text style={{ color: '#f0f0f0' }}>
                  [{new Date().toLocaleTimeString()}] {log}
                </Text>
              </div>
            ))
          ) : (
            <Text style={{ color: '#f0f0f0' }}>暂无日志输出</Text>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Terminal;