import { STATUS_LABELS, TASK_TYPE_LABELS } from './config';
import type { AuditEventItem, AuditEventPageData } from './types';

type AuditEventTableProps = {
  data?: AuditEventPageData;
  loading: boolean;
  error?: string;
  onSelect: (item: AuditEventItem) => void;
  onPageChange: (page: number) => void;
};

const renderStatusBadge = (status?: string) => {
  const text = STATUS_LABELS[status || ''] || status || '-';
  const className = status === 'SUCCESS' ? 'badge-green' : status === 'FAILED' || status === 'DEGRADED' ? 'badge-orange' : 'badge-blue';
  return <span className={`badge ${className}`}>{text}</span>;
};

const AuditEventTable = ({ data, loading, error, onSelect, onPageChange }: AuditEventTableProps) => {
  const page = data?.page || 1;
  const pageSize = data?.pageSize || 20;
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="card p-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-bold">审计事件列表</div>
        <div className="text-xs text-muted">共 {total} 条</div>
      </div>
      {error ? (
        <div className="p-4 text-sm text-danger">事件列表加载失败：{error}</div>
      ) : loading ? (
        <div className="p-4 text-sm text-muted">加载中...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-4 text-sm text-muted">暂无事件数据</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f7f8fa', borderBottom: '1px solid var(--border-color)' }}>
                  <th className="p-3 text-xs font-semibold">事件类型</th>
                  <th className="p-3 text-xs font-semibold">任务类型</th>
                  <th className="p-3 text-xs font-semibold">任务 ID</th>
                  <th className="p-3 text-xs font-semibold">状态</th>
                  <th className="p-3 text-xs font-semibold">错误信息</th>
                  <th className="p-3 text-xs font-semibold">时间</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const taskType = item.taskType || item.bizType || '';
                  return (
                    <tr key={item.eventId} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => onSelect(item)}>
                      <td className="p-3 text-sm font-semibold">{item.eventTypeName || item.eventType || '-'}</td>
                      <td className="p-3 text-sm">{TASK_TYPE_LABELS[taskType] || taskType || '-'}</td>
                      <td className="p-3 text-sm font-mono">{item.bizId || '-'}</td>
                      <td className="p-3 text-sm">{renderStatusBadge(item.status)}</td>
                      <td className="p-3 text-sm text-muted line-clamp-2">{item.errorMessage || '-'}</td>
                      <td className="p-3 text-sm text-muted">{item.createTime || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t">
            <button className="btn btn-sm" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              上一页
            </button>
            <div className="text-xs text-muted">
              第 {page} / {totalPages} 页
            </div>
            <button className="btn btn-sm" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditEventTable;
