import { Activity, Bot, Clock3, Coins, FileStack, MessageSquareText, PlayCircle, ShieldAlert, Target, TimerReset } from 'lucide-react';
import type { AuditOverview } from './types';

type AuditMetricCardsProps = {
  overview?: AuditOverview;
  loading: boolean;
  error?: string;
};

const formatPercent = (value?: number) => (typeof value === 'number' ? `${value.toFixed(2)}%` : '-');
const formatSeconds = (value?: number) => (typeof value === 'number' ? `${(value / 1000).toFixed(1)} 秒` : '-');
const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const AuditMetricCards = ({ overview, loading, error }: AuditMetricCardsProps) => {
  if (error) {
    return <div className="card text-sm text-danger">概览指标加载失败：{error}</div>;
  }

  const items = [
    { label: '任务总量', value: formatNumber(overview?.taskTotal), icon: <Target className="text-primary" size={18} /> },
    { label: '成功率', value: formatPercent(overview?.successRate), icon: <Activity className="text-success" size={18} /> },
    { label: '平均耗时', value: formatSeconds(overview?.avgDurationMs), icon: <Clock3 className="text-warning" size={18} /> },
    { label: '运行中', value: formatNumber(overview?.runningTotal), icon: <PlayCircle className="text-primary" size={18} /> },
    { label: '超时次数', value: formatNumber(overview?.timeoutTotal), icon: <TimerReset className="text-warning" size={18} /> },
    { label: '降级次数', value: formatNumber(overview?.degradedTotal), icon: <ShieldAlert className="text-danger" size={18} /> },
    { label: '模型调用', value: formatNumber(overview?.modelCalls), icon: <Bot className="text-primary" size={18} /> },
    { label: 'Prompt Tokens', value: formatNumber(overview?.promptTokens), icon: <MessageSquareText className="text-primary" size={18} /> },
    { label: 'Completion Tokens', value: formatNumber(overview?.completionTokens), icon: <Coins className="text-warning" size={18} /> },
    { label: '总 Tokens', value: formatNumber(overview?.totalTokens), icon: <FileStack className="text-success" size={18} /> },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16 }}>
      {items.map((item) => (
        <div key={item.label} className="card flex items-center justify-between p-5">
          <div className="flex-col gap-1">
            <span className="text-sm text-muted">{item.label}</span>
            <span className="text-2xl font-bold">{loading ? '加载中...' : item.value}</span>
          </div>
          <div>{item.icon}</div>
        </div>
      ))}
    </div>
  );
};

export default AuditMetricCards;
