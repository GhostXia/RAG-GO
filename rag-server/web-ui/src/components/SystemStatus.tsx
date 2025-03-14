import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Divider, Tag } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const SystemStatus: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState(45);
  const [memoryUsage, setMemoryUsage] = useState(60);
  const [diskUsage, setDiskUsage] = useState(30);
  const [services, setServices] = useState([
    { name: '向量数据库', status: 'running', uptime: '3天12小时' },
    { name: '模型服务', status: 'running', uptime: '3天10小时' },
    { name: '文档处理', status: 'warning', uptime: '1天5小时' },
    { name: '用户认证', status: 'stopped', uptime: '0' },
  ]);

  // 模拟数据更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 30) + 30);
      setMemoryUsage(Math.floor(Math.random() * 20) + 50);
      setDiskUsage(Math.floor(Math.random() * 10) + 25);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'running':
        return <Tag color="success" icon={<CheckCircleOutlined />}>运行中</Tag>;
      case 'warning':
        return <Tag color="warning" icon={<ExclamationCircleOutlined />}>警告</Tag>;
      case 'stopped':
        return <Tag color="error" icon={<ClockCircleOutlined />}>已停止</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  return (
    <div>
      <Typography>
        <Title level={4}>系统状态</Title>
        <Paragraph>监控RAG系统的运行状态和资源使用情况</Paragraph>
      </Typography>
      
      <Divider />
      
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card className="status-card">
            <Statistic title="CPU使用率" value={cpuUsage} suffix="%" />
            <Progress percent={cpuUsage} status={cpuUsage > 80 ? 'exception' : 'normal'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="status-card">
            <Statistic title="内存使用率" value={memoryUsage} suffix="%" />
            <Progress percent={memoryUsage} status={memoryUsage > 80 ? 'exception' : 'normal'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="status-card">
            <Statistic title="磁盘使用率" value={diskUsage} suffix="%" />
            <Progress percent={diskUsage} status={diskUsage > 80 ? 'exception' : 'normal'} />
          </Card>
        </Col>
      </Row>
      
      <Divider orientation="left">服务状态</Divider>
      
      <Row gutter={[16, 16]}>
        {services.map((service, index) => (
          <Col span={12} key={index}>
            <Card className="status-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Statistic title={service.name} value={service.uptime} />
                {getStatusTag(service.status)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SystemStatus;