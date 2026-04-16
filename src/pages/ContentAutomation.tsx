import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, Check, Clock3, Cpu, ExternalLink, History, PenTool, RefreshCw, X, XCircle } from 'lucide-react';
import { createPollingController, makeSessionId } from '../utils/restore';

type StepName =
  | 'topic_plan'
  | 'outline'
  | 'draft'
  | 'polish'
  | 'compliance'
  | 'publish_plan'
  | 'publish_execute'
  | 'publish_summary';

type KnownStepName = StepName;

type ContentTaskState = {
  taskId?: number;
  taskCode?: string;
  executionMode?: 'STRUCTURED_PLAN_EXECUTE';
  status?: string;
  currentStep?: string;
  title?: string;
  outlineText?: string;
  draftContent?: string;
  finalContent?: string;
  complianceResult?: string;
  publishStatus?: string;
  publishExternalId?: string;
  publishExternalUrl?: string;
  summaryText?: string;
  topic?: string;
  platform?: string;
  style?: string;
  keywords?: string;
  channel?: string;
  createTime?: string;
  updateTime?: string;
};

type ContentStepRecord = {
  stepNo: number;
  stepName: string;
  stepStatus: string;
  outputText: string;
  timestamp?: number;
  createTime?: string;
  metadataJson?: string;
};

type ContentStepMap = Record<string, ContentStepRecord>;

type ContentPageState = {
  task: ContentTaskState;
  steps: ContentStepMap;
  streaming: boolean;
  error?: string;
};

type ContentStepItem = {
  id: number;
  taskId: number;
  stepNo: number;
  stepName: string;
  stepStatus: string;
  outputText: string;
  metadataJson: string;
  createTime: string;
};

type ContentStreamEvent = {
  type?: 'content_step' | 'content_complete' | 'content_error';
  taskId?: number;
  stepNo?: number;
  stepName?: string;
  status?: string;
  content?: string;
  completed?: boolean;
  timestamp?: number;
};

type ContentFormState = {
  topic: string;
  platform: string;
  style: string;
  keywords: string;
  channel: string;
};

type CnblogsConfigForm = {
  channel: 'cnblogs';
  blogApp: string;
  blogId: string;
  username: string;
  token: string;
  endpoint?: string;
};

type DevtoConfigForm = {
  channel: 'devto';
  token: string;
  baseUrl: string;
  username: string;
  defaultTags: string;
  publishMode: 'draft' | 'published';
  organizationId: string;
};

type UnknownLogItem = {
  key: string;
  stepName: string;
  status: string;
  content: string;
  timestamp?: number;
};

type HistoryTaskItem = {
  taskId: number;
  topic?: string;
  title?: string;
  platform?: string;
  status?: string;
  currentStep?: string;
  channel?: string;
  publishStatus?: string;
  createTime?: string;
  updateTime?: string;
};

type ChannelConfigState = {
  channel?: string;
  channelName?: string;
  authType?: string;
  verifyStatus?: string;
  verifyMessage?: string;
  status?: number;
};

type ChannelVerifyResult = {
  channel?: string;
  verified?: boolean;
  verifyStatus?: string;
  message?: string;
};

type PublishRecordItem = {
  id: number;
  taskId: number;
  channelCode?: string;
  action?: string;
  status?: string;
  externalId?: string | null;
  externalUrl?: string | null;
  errorMessage?: string | null;
  createTime?: string;
};

const STORAGE_KEY = 'content-automation-current-task-id';
const ACTIVE_POLL_INTERVAL = 3000;

const DEFAULT_FORM: ContentFormState = {
  topic: '企业级 AI Agent 编排平台',
  platform: '博客园',
  style: '专业',
  keywords: 'AI Agent,Java,DDD',
  channel: 'cnblogs',
};

const DEFAULT_CNBLOGS_FORM: CnblogsConfigForm = {
  channel: 'cnblogs',
  blogApp: '',
  blogId: '',
  username: '',
  token: '',
  endpoint: '',
};

const DEFAULT_DEVTO_FORM: DevtoConfigForm = {
  channel: 'devto',
  token: '',
  baseUrl: 'https://dev.to',
  username: '',
  defaultTags: 'java,ai,agent',
  publishMode: 'draft',
  organizationId: '',
};

const EMPTY_PAGE_STATE: ContentPageState = {
  task: {},
  steps: {},
  streaming: false,
  error: undefined,
};

const STEP_ORDER: KnownStepName[] = [
  'topic_plan',
  'outline',
  'draft',
  'polish',
  'compliance',
  'publish_plan',
  'publish_execute',
  'publish_summary',
];

const STEP_LABELS: Record<KnownStepName, string> = {
  topic_plan: '选题规划',
  outline: '大纲生成',
  draft: '初稿生成',
  polish: '正文润色',
  compliance: '合规审核',
  publish_plan: '发布计划',
  publish_execute: '发布执行',
  publish_summary: '执行总结',
};

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const isKnownStepName = (value?: string): value is KnownStepName => Boolean(value && STEP_ORDER.includes(value as KnownStepName));

const stepsToMap = (items: ContentStepItem[]): ContentStepMap =>
  items.reduce<ContentStepMap>((acc, item) => {
    acc[item.stepName] = {
      stepNo: item.stepNo,
      stepName: item.stepName,
      stepStatus: item.stepStatus,
      outputText: item.outputText || '',
      createTime: item.createTime,
      metadataJson: item.metadataJson,
      timestamp: item.createTime ? new Date(item.createTime).getTime() : undefined,
    };
    return acc;
  }, {});

const normalizeTask = (value: unknown): ContentTaskState => ((value && typeof value === 'object' ? value : {}) as ContentTaskState);

const normalizeHistoryList = (value: unknown): HistoryTaskItem[] => safeArray<HistoryTaskItem>(value);

const normalizeChannelConfig = (value: unknown): ChannelConfigState =>
  ((value && typeof value === 'object' ? value : {}) as ChannelConfigState);

const normalizeVerifyResult = (value: unknown): ChannelVerifyResult =>
  ((value && typeof value === 'object' ? value : {}) as ChannelVerifyResult);

const normalizePublishRecords = (value: unknown): PublishRecordItem[] => safeArray<PublishRecordItem>(value);

const asText = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const normalizeMarkdown = (value: unknown, fallback = '暂无内容') => {
  const raw = asText(value, fallback).replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  return raw
    .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
    .replace(/\s+(\d+\.\s+)/g, '\n$1')
    .replace(/\s+(-\s+)/g, '\n$1')
    .replace(/([。；;.!?])\s+(?=[\u4e00-\u9fa5A-Za-z#*\d-])/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getPreviewText = (value: unknown, maxLength = 90) => {
  const text = normalizeMarkdown(value, '暂无内容')
    .replace(/[#*_`>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const MarkdownBlock = ({ value, empty = '暂无内容' }: { value: unknown; empty?: string }) => (
  <div className="markdown-body text-secondary break-words">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeMarkdown(value, empty)}</ReactMarkdown>
  </div>
);

const ContentAutomation = () => {
  const [form, setForm] = useState<ContentFormState>(DEFAULT_FORM);
  const [pageState, setPageState] = useState<ContentPageState>(EMPTY_PAGE_STATE);
  const [isRecovering, setIsRecovering] = useState(false);
  const [unknownLogs, setUnknownLogs] = useState<UnknownLogItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyList, setHistoryList] = useState<HistoryTaskItem[]>([]);
  const [expandedStepName, setExpandedStepName] = useState<string | null>(null);
  const [channelConfig, setChannelConfig] = useState<ChannelConfigState>({});
  const [juejinConfig, setJuejinConfig] = useState<ChannelConfigState>({});
  const [devtoConfig, setDevtoConfig] = useState<ChannelConfigState>({});
  const [cnblogsForm, setCnblogsForm] = useState<CnblogsConfigForm>(DEFAULT_CNBLOGS_FORM);
  const [devtoForm, setDevtoForm] = useState<DevtoConfigForm>(DEFAULT_DEVTO_FORM);
  const [juejinToken, setJuejinToken] = useState('');
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelMessage, setChannelMessage] = useState('');
  const [juejinMessage, setJuejinMessage] = useState('');
  const [devtoMessage, setDevtoMessage] = useState('');
  const [publishRecords, setPublishRecords] = useState<PublishRecordItem[]>([]);

  const streamAbortRef = useRef<AbortController | null>(null);
  const contentPollerRef = useRef<ReturnType<typeof createPollingController> | null>(null);

  const task = pageState.task;
  const steps = pageState.steps;

  const sortedSteps = useMemo(
    () =>
      Object.values(steps)
        .filter((item) => isKnownStepName(item.stepName))
        .sort((a, b) => a.stepNo - b.stepNo),
    [steps],
  );

  const activeStepName = useMemo(() => {
    const currentStep = task.currentStep;
    return isKnownStepName(currentStep) ? currentStep : undefined;
  }, [task.currentStep]);

  const clearTransientState = () => {
    stopStreaming();
    setUnknownLogs([]);
    setExpandedStepName(null);
    setPageState((current) => ({
      ...current,
      streaming: false,
      error: undefined,
    }));
  };

  const resetForNewTask = () => {
    stopStreaming();
    setPageState({
      task: {},
      steps: {},
      streaming: false,
      error: undefined,
    });
    setUnknownLogs([]);
    setExpandedStepName(null);
    setPublishRecords([]);
  };

  const applyStepToTask = (currentTask: ContentTaskState, stepName: KnownStepName, content: string) => {
    const nextTask = { ...currentTask };

    if (stepName === 'topic_plan' && !nextTask.title) nextTask.title = content;
    if (stepName === 'outline') nextTask.outlineText = content;
    if (stepName === 'draft') nextTask.draftContent = content;
    if (stepName === 'polish') nextTask.finalContent = content;
    if (stepName === 'compliance') nextTask.complianceResult = content;
    if (stepName === 'publish_summary') nextTask.summaryText = content;

    return nextTask;
  };

  const fetchTaskDetail = async (taskId: number) => {
    const res = await fetch(`/api/v1/content/task/${taskId}`);
    if (!res.ok) throw new Error('查询任务详情失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询任务详情失败');

    return normalizeTask(json.data);
  };

  const fetchTaskSteps = async (taskId: number) => {
    const res = await fetch(`/api/v1/content/task/${taskId}/steps`);
    if (!res.ok) throw new Error('查询任务步骤失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询任务步骤失败');

    return safeArray<ContentStepItem>(json.data);
  };

  const fetchPublishRecords = async (taskId: number) => {
    const res = await fetch(`/api/v1/content/channel/record/${taskId}`);
    if (!res.ok) throw new Error('查询发布记录失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询发布记录失败');

    return normalizePublishRecords(json.data);
  };

  const fetchCnblogsConfig = async () => {
    try {
      const res = await fetch('/api/v1/content/channel/config/cnblogs');
      if (!res.ok) return;

      const json = await res.json();
      if (json.code !== '0000') return;

      setChannelConfig(normalizeChannelConfig(json.data));
      setChannelMessage(asText(json.data?.verifyMessage, ''));
    } catch (err) {
      console.error('fetch cnblogs config failed', err);
    }
  };

  const handleSaveCnblogsConfig = async () => {
    setChannelLoading(true);
    setChannelMessage('');

    try {
      const res = await fetch('/api/v1/content/channel/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'cnblogs',
          blogApp: cnblogsForm.blogApp,
          blogId: cnblogsForm.blogId || cnblogsForm.blogApp,
          username: cnblogsForm.username,
          token: cnblogsForm.token,
          endpoint: cnblogsForm.endpoint || undefined,
        }),
      });

      if (!res.ok) throw new Error('保存博客园配置失败');

      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '保存博客园配置失败');

      setChannelConfig(normalizeChannelConfig(json.data));
      setChannelMessage(asText(json.data?.verifyMessage, '待验证'));
    } catch (err) {
      setChannelMessage((err as Error).message || '保存博客园配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleVerifyCnblogs = async () => {
    setChannelLoading(true);
    setChannelMessage('');

    try {
      const res = await fetch('/api/v1/content/channel/cnblogs/verify', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('验证博客园配置失败');

      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '验证博客园配置失败');

      const result = normalizeVerifyResult(json.data);
      setChannelConfig((current) => ({
        ...current,
        channel: result.channel || 'cnblogs',
        verifyStatus: result.verifyStatus,
        verifyMessage: result.message,
      }));
      setChannelMessage(asText(result.message, result.verified ? '博客园配置可用' : '博客园配置不可用'));
    } catch (err) {
      setChannelMessage((err as Error).message || '验证博客园配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const fetchJuejinConfig = async () => {
    try {
      const res = await fetch('/api/v1/content/channel/config/juejin');
      if (!res.ok) return;
      const json = await res.json();
      if (json.code !== '0000') return;
      setJuejinConfig(normalizeChannelConfig(json.data));
      setJuejinMessage(asText(json.data?.verifyMessage, ''));
    } catch (err) {
      console.error('fetch juejin config failed', err);
    }
  };

  const handleSaveJuejinConfig = async () => {
    setChannelLoading(true);
    setJuejinMessage('');
    try {
      const res = await fetch('/api/v1/content/channel/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'juejin',
          token: juejinToken,
        }),
      });
      if (!res.ok) throw new Error('保存掘金配置失败');
      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '保存掘金配置失败');
      setJuejinConfig(normalizeChannelConfig(json.data));
      setJuejinMessage(asText(json.data?.verifyMessage, '待验证'));
    } catch (err) {
      setJuejinMessage((err as Error).message || '保存掘金配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleVerifyJuejin = async () => {
    setChannelLoading(true);
    setJuejinMessage('');
    try {
      const res = await fetch('/api/v1/content/channel/juejin/verify', { method: 'POST' });
      if (!res.ok) throw new Error('验证掘金配置失败');
      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '验证掘金配置失败');
      const result = normalizeVerifyResult(json.data);
      setJuejinConfig((current) => ({
        ...current,
        channel: result.channel || 'juejin',
        verifyStatus: result.verifyStatus,
        verifyMessage: result.message,
      }));
      setJuejinMessage(asText(result.message, result.verified ? '掘金配置可用' : '掘金配置不可用'));
    } catch (err) {
      setJuejinMessage((err as Error).message || '验证掘金配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const fetchDevtoConfig = async () => {
    try {
      const res = await fetch('/api/v1/content/channel/config/devto');
      if (!res.ok) return;
      const json = await res.json();
      if (json.code !== '0000') return;
      setDevtoConfig(normalizeChannelConfig(json.data));
      setDevtoMessage(asText(json.data?.verifyMessage, ''));
    } catch (err) {
      console.error('fetch devto config failed', err);
    }
  };

  const handleSaveDevtoConfig = async () => {
    setChannelLoading(true);
    setDevtoMessage('');
    try {
      const res = await fetch('/api/v1/content/channel/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'devto',
          token: devtoForm.token,
          baseUrl: devtoForm.baseUrl,
          username: devtoForm.username,
          defaultTags: devtoForm.defaultTags,
          publishMode: devtoForm.publishMode,
          organizationId: devtoForm.organizationId || null,
        }),
      });
      if (!res.ok) throw new Error('保存 Dev.to 配置失败');
      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '保存 Dev.to 配置失败');
      setDevtoConfig(normalizeChannelConfig(json.data));
      setDevtoMessage(asText(json.data?.verifyMessage, '待验证'));
    } catch (err) {
      setDevtoMessage((err as Error).message || '保存 Dev.to 配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleVerifyDevto = async () => {
    setChannelLoading(true);
    setDevtoMessage('');
    try {
      const res = await fetch('/api/v1/content/channel/devto/verify', { method: 'POST' });
      if (!res.ok) throw new Error('验证 Dev.to 配置失败');
      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '验证 Dev.to 配置失败');
      const result = normalizeVerifyResult(json.data);
      setDevtoConfig((current) => ({
        ...current,
        channel: result.channel || 'devto',
        verifyStatus: result.verifyStatus,
        verifyMessage: result.message,
      }));
      setDevtoMessage(asText(result.message, result.verified ? 'Dev.to API Key 可用' : 'Dev.to API Key 不可用'));
    } catch (err) {
      setDevtoMessage((err as Error).message || '验证 Dev.to 配置失败');
    } finally {
      setChannelLoading(false);
    }
  };

  const fetchHistoryList = async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const res = await fetch('/api/v1/content/task/history?limit=20');
      if (!res.ok) throw new Error('查询历史记录失败');

      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '查询历史记录失败');

      setHistoryList(normalizeHistoryList(json.data));
    } catch (err) {
      setHistoryError((err as Error).message || '查询历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchActiveTask = async () => {
    const res = await fetch('/api/v1/content/task/active');
    if (!res.ok) throw new Error('查询当前内容任务失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询当前内容任务失败');

    return normalizeTask(json.data);
  };

  const refreshTaskState = async (taskId: number, nextError?: string) => {
    const [detail, stepItems, records] = await Promise.all([
      fetchTaskDetail(taskId),
      fetchTaskSteps(taskId),
      fetchPublishRecords(taskId).catch((err) => {
        console.error('fetch publish records failed', err);
        return [] as PublishRecordItem[];
      }),
    ]);
    const stepMap = stepsToMap(stepItems);

    setPublishRecords(records);
    setPageState({
      task: detail,
      steps: stepMap,
      streaming: false,
      error: nextError,
    });

    setForm((current) => ({
      topic: detail.topic || current.topic,
      platform: detail.platform || current.platform,
      style: detail.style || current.style,
      keywords: detail.keywords || current.keywords,
      channel: detail.channel || current.channel,
    }));
  };

  const stopStreaming = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setPageState((current) => ({ ...current, streaming: false }));
  };

  const stopContentPolling = () => {
    contentPollerRef.current?.stop();
    contentPollerRef.current = null;
  };

  const mergeStreamStep = (event: ContentStreamEvent) => {
    const stepName = event.stepName;
    const stepNo = event.stepNo;

    if (!stepName || !stepNo) {
      setUnknownLogs((current) => [
        ...current,
        {
          key: `${Date.now()}-missing`,
          stepName: stepName || 'unknown',
          status: event.status || 'UNKNOWN',
          content: event.content || '',
          timestamp: event.timestamp,
        },
      ]);
      return;
    }

    const nextRecord: ContentStepRecord = {
      stepNo,
      stepName,
      stepStatus: event.status || 'UNKNOWN',
      outputText: event.content || '',
      timestamp: event.timestamp,
    };

    if (!isKnownStepName(stepName)) {
      setPageState((current) => ({
        ...current,
        steps: {
          ...current.steps,
          [stepName]: nextRecord,
        },
      }));
      setUnknownLogs((current) => {
        const filtered = current.filter((item) => item.stepName !== stepName);
        return [
          ...filtered,
          {
            key: `${stepName}-${stepNo}`,
            stepName,
            status: nextRecord.stepStatus,
            content: nextRecord.outputText,
            timestamp: nextRecord.timestamp,
          },
        ];
      });
      return;
    }

    setPageState((current) => ({
      ...current,
      task: applyStepToTask(
        {
          ...current.task,
          status: event.status || current.task.status,
          currentStep: stepName,
        },
        stepName,
        event.content || '',
      ),
      steps: {
        ...current.steps,
        [stepName]: nextRecord,
      },
    }));
  };

  const startStream = async (taskId: number) => {
    stopStreaming();
    setPageState((current) => ({
      ...current,
      streaming: true,
      error: undefined,
    }));

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const res = await fetch('/api/v1/content/task/execute/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sessionId: makeSessionId('content', taskId),
          maxStep: 8,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error('执行内容发布失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const payload = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('');

          if (!payload) continue;

          let event: ContentStreamEvent;
          try {
            event = JSON.parse(payload) as ContentStreamEvent;
          } catch (parseErr) {
            console.error('invalid content stream event', parseErr);
            continue;
          }

          if (event.type === 'content_step') {
            mergeStreamStep(event);
            continue;
          }

          if (event.type === 'content_complete') {
            await refreshTaskState(taskId);
            continue;
          }

          if (event.type === 'content_error') {
            await refreshTaskState(taskId, event.content || '执行内容发布失败');
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      const message = (err as Error).message || '执行内容发布失败';
      try {
        await refreshTaskState(taskId, message);
      } catch (refreshErr) {
        setPageState((current) => ({
          ...current,
          streaming: false,
          error: message,
        }));
        console.error('refresh after stream failure failed', refreshErr);
      }
    } finally {
      streamAbortRef.current = null;
      setPageState((current) => ({ ...current, streaming: false }));
    }
  };

  const handleCreateAndRun = async () => {
    const selectedVerifyStatus =
      form.channel === 'cnblogs'
        ? channelConfig.verifyStatus
        : form.channel === 'juejin'
          ? juejinConfig.verifyStatus
          : form.channel === 'devto'
            ? devtoConfig.verifyStatus
            : 'VERIFIED';

    if (form.channel !== 'mock' && selectedVerifyStatus !== 'VERIFIED') {
      setPageState((current) => ({
        ...current,
        error: '当前渠道尚未验证，先完成配置和验证后再执行内容发布',
      }));
      return;
    }

    resetForNewTask();

    try {
      const res = await fetch('/api/v1/content/task/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('查询历史记录失败');

      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '查询历史记录失败');

      const created = normalizeTask(json.data);
      const taskId = created.taskId;
      if (!taskId) throw new Error('创建任务失败：缺少 taskId');

      localStorage.setItem(STORAGE_KEY, String(taskId));
      setPageState({
        task: created,
        steps: {},
        streaming: true,
        error: undefined,
      });

      await startStream(taskId);
    } catch (err) {
      setPageState((current) => ({
        ...current,
        streaming: false,
        error: (err as Error).message || '查询历史记录失败',
      }));
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    await fetchHistoryList();
  };

  const handleSelectHistoryTask = async (taskId: number) => {
    stopContentPolling();
    clearTransientState();
    setHistoryOpen(false);
    localStorage.setItem(STORAGE_KEY, String(taskId));

    try {
      await refreshTaskState(taskId);
    } catch (err) {
      setPageState((current) => ({
        ...current,
        error: (err as Error).message || '恢复历史任务失败',
      }));
    }
  };

  const restorePageState = async () => {
    const activeTask = await fetchActiveTask().catch((err) => {
      console.error('fetch active content task failed', err);
      return null;
    });

    const targetTaskId = activeTask?.taskId || Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (!targetTaskId) return;

    localStorage.setItem(STORAGE_KEY, String(targetTaskId));
    await refreshTaskState(targetTaskId);
  };

  useEffect(() => {
    void Promise.allSettled([fetchCnblogsConfig(), fetchJuejinConfig(), fetchDevtoConfig()]);

    setIsRecovering(true);
    restorePageState()
      .catch((err) => {
        localStorage.removeItem(STORAGE_KEY);
        setPageState((current) => ({
          ...current,
          error: (err as Error).message || '恢复任务状态失败',
        }));
      })
      .finally(() => setIsRecovering(false));
  }, []);

  useEffect(() => {
    const taskId = task.taskId;
    const isRunning = task.status === 'RUNNING';

    if (!taskId || !isRunning || pageState.streaming) {
      stopContentPolling();
      return;
    }

    const poller = createPollingController(async () => {
      try {
        await refreshTaskState(taskId);
      } catch (err) {
        setPageState((current) => ({
          ...current,
          error: (err as Error).message || '轮询内容任务失败',
        }));
      }
    }, ACTIVE_POLL_INTERVAL);

    contentPollerRef.current = poller;
    poller.start();
    void refreshTaskState(taskId);

    return () => poller.stop();
  }, [pageState.streaming, task.status, task.taskId]);

  useEffect(
    () => () => {
      stopStreaming();
      stopContentPolling();
    },
    [],
  );

  const renderStatusBadge = (status?: string) => {
    const text = asText(status, 'IDLE');
    if (text === 'COMPLETED' || text === 'DRAFT_SAVED') {
      return <span className="badge badge-green">{text}</span>;
    }
    if (text === 'ERROR' || text === 'BLOCKED' || text === 'DEGRADED') {
      return <span className="badge badge-orange">{text}</span>;
    }
    return <span className="badge badge-blue">{text}</span>;
  };

  const publishPlanText = steps.publish_plan?.outputText;
  const publishExecuteText = steps.publish_execute?.outputText;
  const parsedPublishExecute = useMemo(() => {
    const source = asText(publishExecuteText, '');
    return source.split('\n').reduce<Record<string, string>>((acc, line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return acc;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
  }, [publishExecuteText]);

  const selectedChannelConfig =
    form.channel === 'cnblogs' ? channelConfig : form.channel === 'juejin' ? juejinConfig : form.channel === 'devto' ? devtoConfig : null;
  const selectedChannelMessage =
    form.channel === 'cnblogs' ? channelMessage : form.channel === 'juejin' ? juejinMessage : form.channel === 'devto' ? devtoMessage : '';

  return (
    <>
      <div className="flex gap-6 h-full items-stretch notranslate overflow-hidden" translate="no">
        <div style={{ width: 300 }} className="card flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold">任务配置</h3>
            {task.taskCode && <span className="badge badge-blue">{asText(task.taskCode)}</span>}
          </div>

          <div className="flex-col gap-2 overflow-y-auto pr-1 min-h-0" style={{ flex: 1 }}>
            <label className="text-sm font-semibold">主题</label>
            <input
              className="input"
              value={form.topic}
              disabled={pageState.streaming}
              onChange={(e) => setForm((current) => ({ ...current, topic: e.target.value }))}
            />

            <label className="text-sm font-semibold mt-2">平台</label>
            <select
              className="input"
              value={form.platform}
              disabled={pageState.streaming}
              onChange={(e) => setForm((current) => ({ ...current, platform: e.target.value }))}
            >
              <option value="博客园">博客园</option>
              <option value="掘金">掘金</option>
              <option value="Dev.to">Dev.to</option>
            </select>

            <label className="text-sm font-semibold mt-2">风格</label>
            <select
              className="input"
              value={form.style}
              disabled={pageState.streaming}
              onChange={(e) => setForm((current) => ({ ...current, style: e.target.value }))}
            >
              <option value="专业">专业</option>
              <option value="轻松">轻松</option>
              <option value="深度">深度</option>
            </select>

            <label className="text-sm font-semibold mt-2">关键词</label>
            <input
              className="input"
              value={form.keywords}
              disabled={pageState.streaming}
              onChange={(e) => setForm((current) => ({ ...current, keywords: e.target.value }))}
            />

            <label className="text-sm font-semibold mt-2">发布渠道</label>
            <select
              className="input"
              value={form.channel}
              disabled={pageState.streaming}
              onChange={(e) => {
                const channel = e.target.value;
                const platform = channel === 'cnblogs' ? '博客园' : channel === 'juejin' ? '掘金' : 'Dev.to';
                setForm((current) => ({
                  ...current,
                  channel,
                  platform,
                }));
              }}
            >
              <option value="cnblogs">博客园</option>
              <option value="juejin">掘金</option>
              <option value="devto">Dev.to</option>
            </select>

            {selectedChannelConfig && (
              <div className="mt-3 p-3 border rounded bg-gray-50 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {form.channel === 'cnblogs' ? '博客园配置' : form.channel === 'juejin' ? '掘金配置' : 'Dev.to 配置'}
                  </div>
                  {renderStatusBadge(selectedChannelConfig.verifyStatus || 'UNCONFIGURED')}
                </div>
                <div className="text-xs text-muted leading-relaxed">
                  {selectedChannelMessage || selectedChannelConfig.verifyMessage || '未配置'}
                </div>
              </div>
            )}

            {form.channel === 'cnblogs' && (
              <div className="mt-3 p-3 border rounded bg-gray-50 flex-col gap-3">
                <input
                  className="input"
                  placeholder="blogApp"
                  value={cnblogsForm.blogApp}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setCnblogsForm((current) => ({ ...current, blogApp: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="blogId"
                  value={cnblogsForm.blogId}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setCnblogsForm((current) => ({ ...current, blogId: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="用户名"
                  value={cnblogsForm.username}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setCnblogsForm((current) => ({ ...current, username: e.target.value }))}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="MetaWeblog Token"
                  value={cnblogsForm.token}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setCnblogsForm((current) => ({ ...current, token: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="endpoint，可选"
                  value={cnblogsForm.endpoint}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setCnblogsForm((current) => ({ ...current, endpoint: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-sm"
                    type="button"
                    disabled={channelLoading || pageState.streaming || !cnblogsForm.blogApp.trim() || !cnblogsForm.username.trim() || !cnblogsForm.token.trim()}
                    onClick={() => void handleSaveCnblogsConfig()}
                  >
                    保存配置
                  </button>
                  <button className="btn btn-sm" type="button" disabled={channelLoading || pageState.streaming} onClick={() => void handleVerifyCnblogs()}>
                    验证配置
                  </button>
                </div>
              </div>
            )}

            {form.channel === 'juejin' && (
              <div className="mt-3 p-3 border rounded bg-gray-50 flex-col gap-3">
                <input
                  className="input"
                  type="password"
                  placeholder="掘金 Token"
                  value={juejinToken}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setJuejinToken(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-sm"
                    type="button"
                    disabled={channelLoading || pageState.streaming || !juejinToken.trim()}
                    onClick={() => void handleSaveJuejinConfig()}
                  >
                    保存配置
                  </button>
                  <button className="btn btn-sm" type="button" disabled={channelLoading || pageState.streaming} onClick={() => void handleVerifyJuejin()}>
                    验证配置
                  </button>
                </div>
              </div>
            )}

            {form.channel === 'devto' && (
              <div className="mt-3 p-3 border rounded bg-gray-50 flex-col gap-3">
                <input
                  className="input"
                  type="password"
                  placeholder="Dev.to API Key"
                  value={devtoForm.token}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, token: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="baseUrl"
                  value={devtoForm.baseUrl}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, baseUrl: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="username"
                  value={devtoForm.username}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, username: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="defaultTags"
                  value={devtoForm.defaultTags}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, defaultTags: e.target.value }))}
                />
                <select
                  className="input"
                  value={devtoForm.publishMode}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, publishMode: e.target.value as 'draft' | 'published' }))}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
                <input
                  className="input"
                  placeholder="organizationId，可选"
                  value={devtoForm.organizationId}
                  disabled={channelLoading || pageState.streaming}
                  onChange={(e) => setDevtoForm((current) => ({ ...current, organizationId: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-sm"
                    type="button"
                    disabled={channelLoading || pageState.streaming || !devtoForm.token.trim() || !devtoForm.username.trim()}
                    onClick={() => void handleSaveDevtoConfig()}
                  >
                    保存配置
                  </button>
                  <button className="btn btn-sm" type="button" disabled={channelLoading || pageState.streaming} onClick={() => void handleVerifyDevto()}>
                    验证配置
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn btn-primary w-full" onClick={() => void handleCreateAndRun()} disabled={pageState.streaming || !form.topic.trim()}>
                <PenTool size={16} />
                {pageState.streaming ? '执行中...' : '执行内容发布'}
              </button>
              <button className="btn w-full" onClick={() => void handleOpenHistory()} disabled={pageState.streaming}>
                <History size={16} />
                历史记录
              </button>
            </div>

            {(task.taskId || pageState.error) && (
              <div className="mt-4 p-3 bg-gray-50 border rounded text-sm flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted">任务状态</span>
                  {renderStatusBadge(task.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">当前步骤</span>
                  <span className="font-semibold">{asText(task.currentStep, '-')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">执行模式</span>
                  <span className="font-semibold">{asText(task.executionMode, '-')}</span>
                </div>
              </div>
            )}

            {pageState.error && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">{pageState.error}</div>
            )}
          </div>
        </div>

        <div className="flex-col gap-4 min-w-0 overflow-hidden" style={{ flex: 1 }}>
          <div className="card flex-col h-full gap-4 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <h3 className="font-bold">内容结果</h3>
              <div className="flex items-center gap-2">
                {isRecovering && (
                  <span className="badge badge-blue">
                    <RefreshCw size={12} className="animate-spin" /> 恢复中...
                  </span>
                )}
                {pageState.streaming ? <span className="badge badge-blue">STREAMING</span> : renderStatusBadge(task.status)}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pb-4 shrink-0" style={{ borderBottom: '2px solid var(--border-color)' }}>
              {STEP_ORDER.map((stepName) => {
                const step = steps[stepName];
                const isActive = activeStepName === stepName && pageState.streaming;
                const isCompleted = step?.stepStatus === 'COMPLETED';
                const isError = step?.stepStatus === 'ERROR';

                return (
                  <span
                    key={stepName}
                    className={`badge flex items-center gap-1 ${
                      isCompleted ? 'badge-green' : isError ? 'badge-orange' : isActive ? 'badge-blue' : ''
                    }`}
                  >
                    {isCompleted ? <Check size={12} /> : isError ? <XCircle size={12} /> : isActive ? <Activity size={12} /> : null}
                    {STEP_LABELS[stepName]}
                  </span>
                );
              })}
            </div>

            <div className="flex-col gap-4 overflow-y-auto pr-1 min-h-0" style={{ flex: 1 }}>
              {!task.taskId && !isRecovering && (
                <div className="text-sm text-muted text-center py-12">先创建并执行一个内容任务，结果会按阶段展示在这里。</div>
              )}

              {(task.taskId || isRecovering) && (
                <>
                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">标题 / 选题</div>
                    <MarkdownBlock value={task.title || steps.topic_plan?.outputText} />
                  </div>

                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">大纲</div>
                    <MarkdownBlock value={task.outlineText || steps.outline?.outputText} />
                  </div>

                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">初稿</div>
                    <MarkdownBlock value={task.draftContent || steps.draft?.outputText} />
                  </div>

                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">最终正文</div>
                    <MarkdownBlock value={task.finalContent || steps.polish?.outputText} />
                  </div>

                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">合规审核</div>
                    <MarkdownBlock value={task.complianceResult || steps.compliance?.outputText} />
                  </div>

                  <div className="border rounded bg-gray-50 p-4 flex-col gap-2">
                    <div className="font-semibold">执行总结</div>
                    <MarkdownBlock value={task.summaryText || steps.publish_summary?.outputText} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ width: 360 }} className="card flex-col gap-4 h-full overflow-hidden shrink-0">
          <div className="flex items-center justify-between border-b pb-2 shrink-0">
            <h3 className="font-bold">步骤时间线</h3>
            <span className="text-xs text-muted">{sortedSteps.length} 步</span>
          </div>

          <div className="flex-col gap-3 text-sm overflow-y-auto pr-1 min-h-0" style={{ flex: 1 }}>
            {sortedSteps.length === 0 ? (
              <div className="text-xs text-muted text-center py-8 bg-gray-50 border border-dashed rounded">还没有步骤记录，执行任务后这里会显示阶段进度。</div>
            ) : (
              sortedSteps.map((step) => {
                const expanded = expandedStepName === step.stepName;
                return (
                  <button
                    key={`${step.stepName}-${step.stepNo}`}
                    type="button"
                    className="w-full text-left p-3 border rounded bg-gray-50 hover:bg-gray-100 transition-colors flex-col gap-2"
                    onClick={() => setExpandedStepName(expanded ? null : step.stepName)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-primary flex items-center gap-2">
                        <Cpu size={14} />
                        {step.stepNo}. {STEP_LABELS[step.stepName as KnownStepName] || asText(step.stepName, '其他步骤')}
                      </div>
                      {renderStatusBadge(step.stepStatus)}
                    </div>
                    <div className="text-[11px] text-muted">{asText(step.createTime || (step.timestamp ? new Date(step.timestamp).toLocaleString() : '-'))}</div>
                    <div className="text-xs text-secondary leading-relaxed line-clamp-2">{getPreviewText(step.outputText)}</div>
                    {expanded && (
                      <div className="mt-2 max-h-56 overflow-y-auto rounded border bg-white p-3">
                        <MarkdownBlock value={step.outputText} empty="暂无内容" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t pt-4 flex-col gap-3 shrink-0">
            <div className="font-bold">发布结果</div>
            <div className="p-3 border rounded bg-gray-50 flex-col gap-2 text-sm max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-muted">发布状态</span>
                {renderStatusBadge(task.publishStatus || parsedPublishExecute.status || steps.publish_execute?.stepStatus || 'NOT_EXECUTED')}
              </div>
              <div className="flex-col gap-1">
                <span className="text-muted">发布计划</span>
                <MarkdownBlock value={publishPlanText} empty="暂无发布计划" />
              </div>
              <div className="flex-col gap-1">
                <span className="text-muted">发布执行结果</span>
                <MarkdownBlock value={parsedPublishExecute.message || publishExecuteText} empty="暂无发布执行结果" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">外部 ID</span>
                <span className="break-all text-right">{asText(task.publishExternalId || parsedPublishExecute.externalId, '-')}</span>
              </div>
              <div className="flex-col gap-1">
                <span className="text-muted">外部链接</span>
                {task.publishExternalUrl ? (
                  <a className="text-primary text-xs break-all flex items-center gap-1" href={asText(task.publishExternalUrl)} target="_blank" rel="noreferrer">
                    <ExternalLink size={12} />
                    {asText(task.publishExternalUrl)}
                  </a>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
              <div className="flex-col gap-2 border-t pt-3 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted">渠道发布记录</span>
                  <span className="text-xs text-muted">{publishRecords.length} 条</span>
                </div>
                {publishRecords.length === 0 ? (
                  <div className="text-xs text-muted bg-white border border-dashed rounded p-2">暂无发布记录</div>
                ) : (
                  <div className="flex-col gap-2">
                    {publishRecords.map((record) => (
                      <div key={record.id} className="bg-white border rounded p-2 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs">{asText(record.channelCode, '-')}</span>
                          {renderStatusBadge(record.status)}
                        </div>
                        <div className="text-[11px] text-muted">
                          {asText(record.action, '-')} · {asText(record.createTime, '-')}
                        </div>
                        {record.errorMessage && (
                          <div className="text-[11px] text-orange-700 bg-orange-50 border border-orange-100 rounded p-2">
                            {record.errorMessage}
                          </div>
                        )}
                        {record.externalUrl && (
                          <a className="text-primary text-xs break-all flex items-center gap-1" href={record.externalUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={12} />
                            {record.externalUrl}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex-col gap-3 shrink-0">
            <div className="font-bold">其他日志</div>
            {unknownLogs.length === 0 ? (
              <div className="text-xs text-muted bg-gray-50 border rounded p-3">暂无其他日志</div>
            ) : (
              <div className="flex-col gap-2 max-h-40 overflow-y-auto">
                {unknownLogs.map((log) => (
                  <div key={log.key} className="border rounded bg-gray-50 p-3 flex-col gap-1">
                    <div className="text-xs font-semibold">{asText(log.stepName, 'unknown')}</div>
                    <div className="text-[11px] text-muted">{asText(log.status, 'UNKNOWN')}</div>
                    <MarkdownBlock value={log.content} empty="暂无内容" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div
            className="bg-white rounded border shadow-xl flex flex-col overflow-hidden"
            style={{ width: 'min(820px, calc(100vw - 48px))', maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 font-bold">
                <History size={18} />
                历史记录
              </div>
              <button className="btn btn-sm" onClick={() => setHistoryOpen(false)}>
                <X size={14} />
                关闭
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-col gap-3" style={{ flex: 1 }}>
              {historyLoading && (
                <div className="text-sm text-muted text-center py-10">
                  <RefreshCw size={16} className="animate-spin inline-block mr-2" />
                  加载中...
                </div>
              )}

              {!historyLoading && historyError && (
                <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">{historyError}</div>
              )}

              {!historyLoading && !historyError && historyList.length === 0 && (
                <div className="text-sm text-muted text-center py-10">暂无历史任务</div>
              )}

              {!historyLoading && !historyError && historyList.length > 0 && (
                <div className="flex-col gap-3">
                  {historyList.map((item) => (
                    <button
                      key={item.taskId}
                      type="button"
                      className="w-full text-left border rounded p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => void handleSelectHistoryTask(item.taskId)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-main break-words">{asText(item.topic, '未命名任务')}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderStatusBadge(item.status)}
                          {renderStatusBadge(item.publishStatus)}
                        </div>
                      </div>
                      <div className="text-sm text-secondary mt-2 break-words">{asText(item.title, '暂无标题')}</div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
                        <span>平台 {asText(item.platform, '-')}</span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          {asText(item.updateTime, '-')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentAutomation;

