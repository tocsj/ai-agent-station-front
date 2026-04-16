export type AuditRange = 'today' | '7d' | '30d';

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'DEGRADED';

export type AuditTaskType =
  | 'content_automation'
  | 'document_workspace'
  | 'resume_evaluation'
  | 'resume_interview'
  | 'legacy_auto_agent';

export type AuditOverview = {
  range?: AuditRange;
  taskType?: 'all' | AuditTaskType;
  taskTotal?: number;
  successTotal?: number;
  failedTotal?: number;
  runningTotal?: number;
  successRate?: number;
  avgDurationMs?: number;
  timeoutTotal?: number;
  degradedTotal?: number;
  modelCalls?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  publishSuccessTotal?: number;
  publishFailedTotal?: number;
};

export type AuditTaskTrendItem = {
  date: string;
  taskTotal: number;
  successTotal: number;
  failedTotal: number;
  runningTotal: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AuditTaskTypeItem = {
  taskType: string;
  taskTypeName: string;
  taskTotal: number;
  successTotal: number;
  failedTotal: number;
  successRate: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AuditStepMetricItem = {
  stepName: string;
  stepNameLabel: string;
  stage: string;
  executeTotal: number;
  successTotal: number;
  failedTotal: number;
  timeoutTotal: number;
  degradedTotal: number;
  avgDurationMs: number;
  successRate: number;
  llmCallTotal: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgTotalTokens: number;
};

export type AuditModelMetricItem = {
  clientId: string;
  modelCode: string;
  callTotal: number;
  successTotal: number;
  failedTotal: number;
  avgDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgTotalTokens: number;
};

export type AuditPublishChannelItem = {
  channel: string;
  channelName: string;
  attemptTotal: number;
  successTotal: number;
  failedTotal: number;
  successRate: number;
  lastStatus?: string;
  lastMessage?: string;
  lastExternalUrl?: string;
};

export type AuditDocumentModeItem = {
  mode: string;
  modeName: string;
  taskTotal: number;
  successTotal: number;
  failedTotal: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AuditInterviewMetric = {
  sessionTotal: number;
  completedSessionTotal: number;
  abortedSessionTotal: number;
  roundTotal: number;
  avgRoundsPerSession: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AuditEventItem = {
  eventId: string;
  traceId?: string;
  eventType?: string;
  eventTypeName?: string;
  bizType?: string;
  taskType?: string;
  bizId?: string;
  sessionId?: string;
  executionMode?: string;
  operatorId?: string;
  operatorName?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  location?: string;
  metadataJson?: string;
  createTime?: string;
};

export type AuditEventPageData = {
  page: number;
  pageSize: number;
  total: number;
  items: AuditEventItem[];
};

export type AuditExecutionStep = {
  stepNo: number;
  stepName: string;
  stepNameLabel?: string;
  stage: string;
  clientId?: string;
  modelCode?: string;
  status: string;
  durationMs?: number;
  retryCount?: number;
  timeoutFlag?: boolean;
  degradedFlag?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  llmCallTotal?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  location?: string;
};

export type AuditExecutionDetail = {
  traceId: string;
  taskType?: string;
  taskId?: string;
  sessionId?: string;
  executionMode?: string;
  status?: string;
  totalDurationMs?: number;
  stepCount?: number;
  successStepCount?: number;
  failedStepCount?: number;
  timeoutCount?: number;
  retryCount?: number;
  degradedCount?: number;
  modelCalls?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  createTime?: string;
  finishTime?: string;
  steps?: AuditExecutionStep[];
};

export type AuditLlmCallItem = {
  callId: string;
  traceId: string;
  taskType?: string;
  taskId?: string;
  sessionId?: string;
  stepName?: string;
  stage?: string;
  clientId?: string;
  modelCode?: string;
  status?: string;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  location?: string;
  createTime?: string;
};

export type AuditTypeViewMode = 'task' | 'token';

export type AuditModelSortKey = 'totalTokens' | 'avgDurationMs' | 'failedTotal';

export type AuditFilters = {
  range: AuditRange;
  taskType: 'all' | AuditTaskType;
  status: 'all' | AuditStatus;
  channel: string;
  page: number;
  pageSize: number;
};
