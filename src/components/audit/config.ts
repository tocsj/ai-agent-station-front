import type { AuditRange, AuditStatus, AuditTaskType } from './types';

export const RANGE_OPTIONS: Array<{ value: AuditRange; label: string; days: number }> = [
  { value: 'today', label: '今日', days: 1 },
  { value: '7d', label: '近 7 天', days: 7 },
  { value: '30d', label: '近 30 天', days: 30 },
];

export const TASK_TYPE_OPTIONS: Array<{ value: 'all' | AuditTaskType; label: string }> = [
  { value: 'all', label: '全部任务' },
  { value: 'content_automation', label: '内容自动发布' },
  { value: 'document_workspace', label: '文档知识助手' },
  { value: 'resume_evaluation', label: '简历评估' },
  { value: 'resume_interview', label: '模拟面试' },
];

export const STATUS_OPTIONS: Array<{ value: 'all' | AuditStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAILED', label: '失败' },
  { value: 'RUNNING', label: '运行中' },
  { value: 'DEGRADED', label: '降级' },
];

export const STATUS_LABELS: Record<string, string> = {
  all: '全部',
  SUCCESS: '成功',
  FAILED: '失败',
  RUNNING: '运行中',
  DEGRADED: '降级',
  DRAFT_SAVED: '草稿已保存',
  BLOCKED: '已阻断',
  ERROR: '异常',
  NOT_EXECUTED: '未执行',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  content_automation: '内容自动发布',
  document_workspace: '文档知识助手',
  resume_evaluation: '简历评估',
  resume_interview: '模拟面试',
  legacy_auto_agent: '历史自动化',
};

export const TYPE_VIEW_OPTIONS = [
  { value: 'task', label: '按任务量' },
  { value: 'token', label: '按 Tokens' },
] as const;
