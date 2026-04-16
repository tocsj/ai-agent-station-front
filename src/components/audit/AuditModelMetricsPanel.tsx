import type { AuditModelMetricItem, AuditModelSortKey } from './types';

type AuditModelMetricsPanelProps = {
  items: AuditModelMetricItem[];
  loading: boolean;
  error?: string;
  sortKey: AuditModelSortKey;
  onSortChange: (key: AuditModelSortKey) => void;
};

const SORT_OPTIONS: Array<{ value: AuditModelSortKey; label: string }> = [
  { value: 'totalTokens', label: '按总 Tokens' },
  { value: 'avgDurationMs', label: '按平均耗时' },
  { value: 'failedTotal', label: '按失败次数' },
];

const formatNumber = (value: number) => value.toLocaleString();
const formatSeconds = (value: number) => `${(value / 1000).toFixed(1)} 秒`;

const AuditModelMetricsPanel = ({ items, loading, error, sortKey, onSortChange }: AuditModelMetricsPanelProps) => {
  const sortedItems = items.slice().sort((a, b) => Number(b[sortKey] || 0) - Number(a[sortKey] || 0));

  return (
    <div className="card flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">模型指标</div>
        <select className="input" style={{ width: 150 }} value={sortKey} onChange={(e) => onSortChange(e.target.value as AuditModelSortKey)}>
          {SORT_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <div className="text-sm text-danger">模型指标加载失败：{error}</div>
      ) : loading ? (
        <div className="text-sm text-muted">加载中...</div>
      ) : sortedItems.length === 0 ? (
        <div className="text-sm text-muted">暂无模型指标</div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f7f8fa', borderBottom: '1px solid var(--border-color)' }}>
                <th className="p-3 text-xs font-semibold">模型</th>
                <th className="p-3 text-xs font-semibold">调用次数</th>
                <th className="p-3 text-xs font-semibold">失败次数</th>
                <th className="p-3 text-xs font-semibold">平均耗时</th>
                <th className="p-3 text-xs font-semibold">总 Tokens</th>
                <th className="p-3 text-xs font-semibold">平均 Tokens</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={`${item.clientId}-${item.modelCode}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="p-3 text-sm">
                    <div className="font-semibold">{item.modelCode}</div>
                    <div className="text-xs text-muted">客户端 {item.clientId}</div>
                  </td>
                  <td className="p-3 text-sm">{formatNumber(item.callTotal)}</td>
                  <td className="p-3 text-sm">{formatNumber(item.failedTotal)}</td>
                  <td className="p-3 text-sm">{formatSeconds(item.avgDurationMs)}</td>
                  <td className="p-3 text-sm">{formatNumber(item.totalTokens)}</td>
                  <td className="p-3 text-sm">{formatNumber(item.avgTotalTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditModelMetricsPanel;
