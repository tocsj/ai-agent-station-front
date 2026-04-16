import type { AuditInterviewMetric } from './types';

type AuditInterviewMetricsPanelProps = {
  item?: AuditInterviewMetric | null;
  loading: boolean;
  error?: string;
};

const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const AuditInterviewMetricsPanel = ({ item, loading, error }: AuditInterviewMetricsPanelProps) => {
  return (
    <div className="card flex-col gap-4">
      <div className="font-bold">面试会话指标</div>
      {error ? (
        <div className="text-sm text-danger">面试会话指标加载失败：{error}</div>
      ) : loading ? (
        <div className="text-sm text-muted">加载中...</div>
      ) : !item ? (
        <div className="text-sm text-muted">暂无面试会话指标</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">会话总数</div>
            <div className="text-xl font-bold">{formatNumber(item.sessionTotal)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">已完成</div>
            <div className="text-xl font-bold">{formatNumber(item.completedSessionTotal)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">中止会话</div>
            <div className="text-xl font-bold">{formatNumber(item.abortedSessionTotal)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">平均轮次</div>
            <div className="text-xl font-bold">{typeof item.avgRoundsPerSession === 'number' ? item.avgRoundsPerSession.toFixed(2) : '-'}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">总轮次</div>
            <div className="text-xl font-bold">{formatNumber(item.roundTotal)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">Prompt Tokens</div>
            <div className="text-xl font-bold">{formatNumber(item.promptTokens)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">Completion Tokens</div>
            <div className="text-xl font-bold">{formatNumber(item.completionTokens)}</div>
          </div>
          <div className="border rounded p-4 bg-gray-50 flex-col gap-1">
            <div className="text-sm text-muted">总 Tokens</div>
            <div className="text-xl font-bold">{formatNumber(item.totalTokens)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditInterviewMetricsPanel;
