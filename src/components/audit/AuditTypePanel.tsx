import { TYPE_VIEW_OPTIONS } from './config';
import type { AuditTaskTypeItem, AuditTypeViewMode } from './types';

type AuditTypePanelProps = {
  items: AuditTaskTypeItem[];
  loading: boolean;
  error?: string;
  viewMode: AuditTypeViewMode;
  onViewModeChange: (mode: AuditTypeViewMode) => void;
};

const formatNumber = (value: number) => value.toLocaleString();

const AuditTypePanel = ({ items, loading, error, viewMode, onViewModeChange }: AuditTypePanelProps) => {
  const maxTotal = Math.max(
    1,
    ...items.map((item) => (viewMode === 'task' ? item.taskTotal || 0 : item.totalTokens || 0)),
  );

  return (
    <div className="card flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">任务类型分布</div>
        <div className="flex items-center gap-2">
          {TYPE_VIEW_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`btn btn-sm ${viewMode === item.value ? 'btn-primary' : ''}`}
              onClick={() => onViewModeChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-danger">任务类型数据加载失败：{error}</div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">暂无任务类型数据</div>
      ) : (
        <div className="flex-col gap-3 overflow-y-auto pr-1" style={{ flex: 1, maxHeight: 360 }}>
          {items.map((item) => {
            const currentValue = viewMode === 'task' ? item.taskTotal : item.totalTokens;
            return (
              <div key={item.taskType} className="flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{item.taskTypeName}</span>
                  <span className="text-muted">{item.successRate.toFixed(2)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div style={{ width: `${(currentValue / maxTotal) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                  </div>
                  <span className="text-xs text-muted w-20 text-right">{formatNumber(currentValue)}</span>
                </div>
                <div className="text-xs text-muted">
                  任务 {formatNumber(item.taskTotal)} · Tokens {formatNumber(item.totalTokens)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditTypePanel;
