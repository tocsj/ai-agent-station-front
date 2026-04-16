import type { AuditTaskTrendItem } from './types';

type AuditTrendPanelProps = {
  items: AuditTaskTrendItem[];
  loading: boolean;
  error?: string;
};

const TASK_SERIES = [
  { key: 'taskTotal', label: '总量', color: '#1677ff' },
  { key: 'successTotal', label: '成功', color: '#00b42a' },
  { key: 'failedTotal', label: '失败', color: '#f53f3f' },
] as const;

const TOKEN_SERIES = [
  { key: 'promptTokens', label: 'Prompt', color: '#7c3aed' },
  { key: 'completionTokens', label: 'Completion', color: '#f59e0b' },
  { key: 'totalTokens', label: '总 Tokens', color: '#14b8a6' },
] as const;

const buildPath = (values: number[], width: number, height: number, maxValue: number) => {
  if (values.length === 0) return '';
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / Math.max(maxValue, 1)) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const TrendChart = ({
  title,
  items,
  series,
  maxValue,
}: {
  title: string;
  items: AuditTaskTrendItem[];
  series: Array<{ key: keyof AuditTaskTrendItem; label: string; color: string }>;
  maxValue: number;
}) => (
  <div className="flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold">{title}</div>
      <div className="flex items-center gap-3 text-xs text-muted">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 999, background: item.color, display: 'inline-block' }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
    <svg viewBox="0 0 420 140" style={{ width: '100%', height: 140 }}>
      <line x1="0" y1="140" x2="420" y2="140" stroke="#d9dde5" strokeWidth="1" />
      {series.map((item) => {
        const values = items.map((row) => Number(row[item.key] || 0));
        return <path key={item.key} d={buildPath(values, 420, 130, maxValue)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" />;
      })}
    </svg>
  </div>
);

const AuditTrendPanel = ({ items, loading, error }: AuditTrendPanelProps) => {
  const chartItems = items.slice(-Math.min(items.length, 30));
  const taskMax = Math.max(1, ...chartItems.flatMap((item) => [item.taskTotal, item.successTotal, item.failedTotal]));
  const tokenMax = Math.max(1, ...chartItems.flatMap((item) => [item.promptTokens, item.completionTokens, item.totalTokens]));

  return (
    <div className="card flex-col gap-4">
      <div className="font-bold">任务趋势</div>
      {error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-danger">趋势数据加载失败：{error}</div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">加载中...</div>
      ) : chartItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">暂无趋势数据</div>
      ) : (
        <div className="flex-col gap-4">
          <TrendChart title="任务量趋势" items={chartItems} series={TASK_SERIES as unknown as Array<{ key: keyof AuditTaskTrendItem; label: string; color: string }>} maxValue={taskMax} />
          <TrendChart title="Token 趋势" items={chartItems} series={TOKEN_SERIES as unknown as Array<{ key: keyof AuditTaskTrendItem; label: string; color: string }>} maxValue={tokenMax} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartItems.length}, minmax(0, 1fr))`, gap: 8 }}>
            {chartItems.map((item) => (
              <div key={item.date} className="text-xs text-muted text-center">
                {item.date.slice(5)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrendPanel;
