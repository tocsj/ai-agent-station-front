import { X } from 'lucide-react';
import { STATUS_LABELS, TASK_TYPE_LABELS } from './config';
import type { AuditEventItem, AuditExecutionDetail, AuditLlmCallItem } from './types';

type AuditExecutionDrawerProps = {
  open: boolean;
  event?: AuditEventItem | null;
  detail?: AuditExecutionDetail | null;
  llmCalls: AuditLlmCallItem[];
  selectedStepName: string;
  llmLoading: boolean;
  loading: boolean;
  error?: string;
  llmError?: string;
  onClose: () => void;
  onSelectStep: (stepName: string) => void;
};

const formatJson = (value?: string) => {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const formatStatus = (value?: string) => STATUS_LABELS[value || ''] || value || '-';
const formatMs = (value?: number) => (typeof value === 'number' ? `${(value / 1000).toFixed(1)} 秒` : '-');
const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const AuditExecutionDrawer = ({
  open,
  event,
  detail,
  llmCalls,
  selectedStepName,
  llmLoading,
  loading,
  error,
  llmError,
  onClose,
  onSelectStep,
}: AuditExecutionDrawerProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
      <div className="bg-white h-full border-l shadow-xl flex-col" style={{ width: 620 }}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-bold">执行明细</div>
            <div className="text-xs text-muted">{event?.eventTypeName || event?.eventType || '-'}</div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>
            <X size={14} />
            关闭
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-col gap-4" style={{ flex: 1 }}>
          <div className="card flex-col gap-2">
            <div className="font-semibold">事件信息</div>
            <div className="text-sm text-muted">任务类型：{TASK_TYPE_LABELS[event?.taskType || event?.bizType || ''] || event?.taskType || event?.bizType || '-'}</div>
            <div className="text-sm text-muted">任务 ID：{event?.bizId || '-'}</div>
            <div className="text-sm text-muted">会话 ID：{event?.sessionId || '-'}</div>
            <div className="text-sm text-muted">状态：{formatStatus(event?.status)}</div>
            <div className="text-sm text-muted">错误码：{event?.errorCode || '-'}</div>
            <div className="text-sm text-muted">位置：{event?.location || '-'}</div>
          </div>

          <div className="card flex-col gap-2">
            <div className="font-semibold">Metadata JSON</div>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{formatJson(event?.metadataJson)}</pre>
          </div>

          <div className="card flex-col gap-2">
            <div className="font-semibold">执行摘要</div>
            {loading ? (
              <div className="text-sm text-muted">加载中...</div>
            ) : error ? (
              <div className="text-sm text-danger">加载执行明细失败：{error}</div>
            ) : !detail ? (
              <div className="text-sm text-muted">暂无执行明细</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div className="text-sm text-muted">Trace ID：{detail.traceId || '-'}</div>
                <div className="text-sm text-muted">执行模式：{detail.executionMode || '-'}</div>
                <div className="text-sm text-muted">总耗时：{formatMs(detail.totalDurationMs)}</div>
                <div className="text-sm text-muted">步骤数：{detail.stepCount ?? '-'}</div>
                <div className="text-sm text-muted">模型调用：{detail.modelCalls ?? '-'}</div>
                <div className="text-sm text-muted">成功步骤：{detail.successStepCount ?? '-'}</div>
                <div className="text-sm text-muted">失败步骤：{detail.failedStepCount ?? '-'}</div>
                <div className="text-sm text-muted">超时次数：{detail.timeoutCount ?? '-'}</div>
                <div className="text-sm text-muted">Prompt Tokens：{formatNumber(detail.promptTokens)}</div>
                <div className="text-sm text-muted">Completion Tokens：{formatNumber(detail.completionTokens)}</div>
                <div className="text-sm text-muted">总 Tokens：{formatNumber(detail.totalTokens)}</div>
                <div className="text-sm text-muted">降级次数：{detail.degradedCount ?? '-'}</div>
                <div className="text-sm text-muted">开始时间：{detail.createTime || '-'}</div>
                <div className="text-sm text-muted">结束时间：{detail.finishTime || '-'}</div>
              </div>
            )}
          </div>

          <div className="card flex-col gap-3">
            <div className="font-semibold">步骤时间线</div>
            {loading ? (
              <div className="text-sm text-muted">加载中...</div>
            ) : error ? (
              <div className="text-sm text-danger">{error}</div>
            ) : !detail?.steps || detail.steps.length === 0 ? (
              <div className="text-sm text-muted">暂无步骤时间线</div>
            ) : (
              detail.steps.map((step) => {
                const active = selectedStepName === step.stepName;
                return (
                  <button
                    key={`${step.stepNo}-${step.stepName}`}
                    type="button"
                    className={`border rounded p-3 bg-gray-50 flex-col gap-1 text-left ${active ? 'border-primary bg-primary-bg' : ''}`}
                    onClick={() => onSelectStep(active ? '' : step.stepName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        {step.stepNo}. {step.stepNameLabel || step.stepName}
                      </div>
                      <span className={`badge ${step.status === 'SUCCESS' ? 'badge-green' : step.status === 'FAILED' || step.degradedFlag || step.timeoutFlag ? 'badge-orange' : 'badge-blue'}`}>
                        {formatStatus(step.status)}
                      </span>
                    </div>
                    <div className="text-xs text-muted">阶段：{step.stage}</div>
                    <div className="text-xs text-muted">耗时：{formatMs(step.durationMs)}</div>
                    <div className="text-xs text-muted">模型：{step.modelCode || '-'} / 客户端：{step.clientId || '-'}</div>
                    <div className="text-xs text-muted">
                      重试：{step.retryCount ?? 0} / 超时：{step.timeoutFlag ? '是' : '否'} / 降级：{step.degradedFlag ? '是' : '否'}
                    </div>
                    <div className="text-xs text-muted">Tokens：{formatNumber(step.totalTokens)} / LLM 调用：{step.llmCallTotal ?? '-'}</div>
                    {step.errorMessage && <div className="text-xs text-danger">错误：{step.errorMessage}</div>}
                    {step.location && <div className="text-xs text-muted">位置：{step.location}</div>}
                  </button>
                );
              })
            )}
          </div>

          <div className="card flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">LLM 调用明细</div>
              {selectedStepName && <div className="text-xs text-muted">当前筛选步骤：{selectedStepName}</div>}
            </div>
            {llmLoading ? (
              <div className="text-sm text-muted">加载中...</div>
            ) : llmError ? (
              <div className="text-sm text-danger">加载 LLM 调用失败：{llmError}</div>
            ) : llmCalls.length === 0 ? (
              <div className="text-sm text-muted">暂无 LLM 调用明细</div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f7f8fa', borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-2 text-xs font-semibold">步骤</th>
                      <th className="p-2 text-xs font-semibold">模型</th>
                      <th className="p-2 text-xs font-semibold">状态</th>
                      <th className="p-2 text-xs font-semibold">耗时</th>
                      <th className="p-2 text-xs font-semibold">总 Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {llmCalls.map((call) => (
                      <tr key={call.callId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="p-2 text-xs">{call.stepName || '-'}</td>
                        <td className="p-2 text-xs">
                          {call.modelCode || '-'} / {call.clientId || '-'}
                        </td>
                        <td className="p-2 text-xs">{formatStatus(call.status)}</td>
                        <td className="p-2 text-xs">{formatMs(call.durationMs)}</td>
                        <td className="p-2 text-xs">{formatNumber(call.totalTokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditExecutionDrawer;
