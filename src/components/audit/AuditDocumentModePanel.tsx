import type { AuditDocumentModeItem } from './types';

type AuditDocumentModePanelProps = {
  items: AuditDocumentModeItem[];
  loading: boolean;
  error?: string;
};

const formatNumber = (value: number) => value.toLocaleString();

const AuditDocumentModePanel = ({ items, loading, error }: AuditDocumentModePanelProps) => {
  return (
    <div className="card flex-col gap-4">
      <div className="font-bold">文档模式指标</div>
      {error ? (
        <div className="text-sm text-danger">文档模式指标加载失败：{error}</div>
      ) : loading ? (
        <div className="text-sm text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted">暂无文档模式指标</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {items.map((item) => (
            <div key={item.mode} className="border rounded p-4 bg-gray-50 flex-col gap-2">
              <div className="font-semibold">{item.modeName}</div>
              <div className="text-sm text-muted">任务 {formatNumber(item.taskTotal)} / 成功 {formatNumber(item.successTotal)} / 失败 {formatNumber(item.failedTotal)}</div>
              <div className="text-sm text-muted">Prompt Tokens：{formatNumber(item.promptTokens)}</div>
              <div className="text-sm text-muted">Completion Tokens：{formatNumber(item.completionTokens)}</div>
              <div className="text-sm text-muted">总 Tokens：{formatNumber(item.totalTokens)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditDocumentModePanel;
