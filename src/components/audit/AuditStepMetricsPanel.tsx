import { AlertTriangle, Bot, Clock3, Coins } from 'lucide-react';
import type { AuditStepMetricItem } from './types';

type AuditStepMetricsPanelProps = {
  items: AuditStepMetricItem[];
  loading: boolean;
  error?: string;
};

const formatSeconds = (value: number) => `${(value / 1000).toFixed(1)} 秒`;
const formatNumber = (value: number) => value.toLocaleString();

const AuditStepMetricsPanel = ({ items, loading, error }: AuditStepMetricsPanelProps) => {
  return (
    <div className="card flex-col gap-4">
      <div className="font-bold">流程步骤指标</div>
      {error ? (
        <div className="text-sm text-danger">步骤指标加载失败：{error}</div>
      ) : loading ? (
        <div className="text-sm text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted">当前任务类型暂无步骤指标</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
          <div className="flex-col gap-3">
            {items.map((item) => (
              <div key={item.stepName} className="border rounded p-3 bg-gray-50 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{item.stepNameLabel}</div>
                    <div className="text-xs text-muted">{item.stage}</div>
                  </div>
                  <span className={`badge ${item.successRate >= 85 ? 'badge-green' : item.failedTotal > 0 || item.timeoutTotal > 0 ? 'badge-orange' : 'badge-blue'}`}>
                    {item.successRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div style={{ width: `${Math.min(100, Math.max(0, item.successRate))}%`, height: '100%', background: item.successRate >= 85 ? 'var(--success)' : 'var(--warning)' }} />
                  </div>
                  <span className="text-xs text-muted">{item.executeTotal} 次</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                  <span className="flex items-center gap-1"><AlertTriangle size={12} /> 失败 {item.failedTotal}</span>
                  <span className="flex items-center gap-1"><Clock3 size={12} /> 超时 {item.timeoutTotal}</span>
                  <span>降级 {item.degradedTotal}</span>
                  <span className="flex items-center gap-1"><Bot size={12} /> 调用 {item.llmCallTotal}</span>
                  <span className="flex items-center gap-1"><Coins size={12} /> Tokens {formatNumber(item.totalTokens)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border rounded bg-gray-50 p-3 flex-col gap-3">
            <div className="font-semibold">平均耗时排行</div>
            {items
              .slice()
              .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
              .map((item) => (
                <div key={item.stepName} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">{item.stepNameLabel}</span>
                  <span className="text-sm font-semibold">{formatSeconds(item.avgDurationMs)}</span>
                </div>
              ))}
          </div>
          <div className="border rounded bg-gray-50 p-3 flex-col gap-3">
            <div className="font-semibold">步骤 Token 排行</div>
            {items
              .slice()
              .sort((a, b) => b.totalTokens - a.totalTokens)
              .map((item) => (
                <div key={item.stepName} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-col">
                    <span className="text-sm">{item.stepNameLabel}</span>
                    <span className="text-xs text-muted">平均 {formatNumber(item.avgTotalTokens)}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(item.totalTokens)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditStepMetricsPanel;
