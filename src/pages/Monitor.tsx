import { useEffect, useMemo, useState } from 'react';
import AuditDocumentModePanel from '../components/audit/AuditDocumentModePanel';
import AuditEventTable from '../components/audit/AuditEventTable';
import AuditExecutionDrawer from '../components/audit/AuditExecutionDrawer';
import AuditInterviewMetricsPanel from '../components/audit/AuditInterviewMetricsPanel';
import AuditMetricCards from '../components/audit/AuditMetricCards';
import AuditModelMetricsPanel from '../components/audit/AuditModelMetricsPanel';
import AuditPublishChannelPanel from '../components/audit/AuditPublishChannelPanel';
import AuditStepMetricsPanel from '../components/audit/AuditStepMetricsPanel';
import AuditTrendPanel from '../components/audit/AuditTrendPanel';
import AuditTypePanel from '../components/audit/AuditTypePanel';
import { RANGE_OPTIONS, STATUS_LABELS, STATUS_OPTIONS, TASK_TYPE_OPTIONS } from '../components/audit/config';
import { readStorageJson, writeStorageJson } from '../utils/restore';
import type {
  AuditDocumentModeItem,
  AuditEventItem,
  AuditEventPageData,
  AuditExecutionDetail,
  AuditFilters,
  AuditInterviewMetric,
  AuditLlmCallItem,
  AuditModelMetricItem,
  AuditModelSortKey,
  AuditOverview,
  AuditPublishChannelItem,
  AuditStepMetricItem,
  AuditTaskTrendItem,
  AuditTaskTypeItem,
  AuditTypeViewMode,
} from '../components/audit/types';

type LoadState = {
  loading: boolean;
  error?: string;
};

const DEFAULT_EVENT_PAGE: AuditEventPageData = {
  page: 1,
  pageSize: 20,
  total: 0,
  items: [],
};

const DEFAULT_FILTERS: AuditFilters = {
  range: '7d',
  taskType: 'all',
  status: 'all',
  channel: '',
  page: 1,
  pageSize: 20,
};

const AUDIT_FILTERS_KEY = 'audit-monitor-filters';
const TASK_TYPE_OPTION_VALUES = new Set(TASK_TYPE_OPTIONS.map((item) => item.value));

const fetchApi = async <T,>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`请求失败：${res.status}`);
  }

  const json = await res.json();
  if (json.code !== '0000') {
    throw new Error(json.info || '请求失败');
  }

  return json.data as T;
};

const asNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value || 0));

const normalizeOverview = (value: unknown): AuditOverview => ((value && typeof value === 'object' ? value : {}) as AuditOverview);
const normalizeTrend = (value: unknown) => (Array.isArray(value) ? (value as AuditTaskTrendItem[]) : []);
const normalizeTaskType = (value: unknown) => (Array.isArray(value) ? (value as AuditTaskTypeItem[]) : []);
const normalizeStepMetrics = (value: unknown) => (Array.isArray(value) ? (value as AuditStepMetricItem[]) : []);
const normalizeModelMetrics = (value: unknown) => (Array.isArray(value) ? (value as AuditModelMetricItem[]) : []);
const normalizePublishChannels = (value: unknown) => (Array.isArray(value) ? (value as AuditPublishChannelItem[]) : []);
const normalizeDocumentModes = (value: unknown) => (Array.isArray(value) ? (value as AuditDocumentModeItem[]) : []);
const normalizeInterviewMetric = (value: unknown) => ((value && typeof value === 'object' ? value : null) as AuditInterviewMetric | null);
const normalizeExecutionDetail = (value: unknown) => ((value && typeof value === 'object' ? value : null) as AuditExecutionDetail | null);
const normalizeLlmCalls = (value: unknown) => (Array.isArray(value) ? (value as AuditLlmCallItem[]) : []);

const normalizeEventPage = (value: unknown): AuditEventPageData => {
  const raw = value && typeof value === 'object' ? (value as Partial<AuditEventPageData>) : {};
  return {
    page: asNumber(raw.page) || 1,
    pageSize: asNumber(raw.pageSize) || 20,
    total: asNumber(raw.total),
    items: Array.isArray(raw.items)
      ? (raw.items as AuditEventItem[]).map((item) => ({
          ...item,
          traceId: item.traceId || extractTraceId(item.metadataJson),
          taskType: item.taskType || item.bizType,
        }))
      : [],
  };
};

const extractTraceId = (metadataJson?: string) => {
  if (!metadataJson) return '';
  try {
    const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
    const traceId = parsed.traceId;
    return typeof traceId === 'string' ? traceId : '';
  } catch {
    return '';
  }
};

const includesChannel = (item: AuditEventItem, channel: string) => {
  if (!channel) return true;
  const metadata = item.metadataJson || '';
  return metadata.includes(`"${channel}"`) || metadata.includes(channel);
};

const isStepMetricAvailable = (taskType: AuditFilters['taskType']) => taskType !== 'all';
const shouldShowPublishChannels = (taskType: AuditFilters['taskType']) => taskType === 'all' || taskType === 'content_automation';
const shouldShowDocumentModes = (taskType: AuditFilters['taskType']) => taskType === 'document_workspace';
const shouldShowInterviewMetrics = (taskType: AuditFilters['taskType']) => taskType === 'resume_interview';

const Monitor = () => {
  const [filters, setFilters] = useState<AuditFilters>(() => {
    const saved = readStorageJson<Partial<AuditFilters>>(AUDIT_FILTERS_KEY);
    if (!saved) return DEFAULT_FILTERS;
    const savedTaskType = saved.taskType && TASK_TYPE_OPTION_VALUES.has(saved.taskType) ? saved.taskType : DEFAULT_FILTERS.taskType;
    return {
      ...DEFAULT_FILTERS,
      range: saved.range || DEFAULT_FILTERS.range,
      taskType: savedTaskType,
      status: saved.status || DEFAULT_FILTERS.status,
    };
  });
  const [typeViewMode, setTypeViewMode] = useState<AuditTypeViewMode>('task');
  const [modelSortKey, setModelSortKey] = useState<AuditModelSortKey>('totalTokens');

  const [overview, setOverview] = useState<AuditOverview>();
  const [trend, setTrend] = useState<AuditTaskTrendItem[]>([]);
  const [taskTypes, setTaskTypes] = useState<AuditTaskTypeItem[]>([]);
  const [stepMetrics, setStepMetrics] = useState<AuditStepMetricItem[]>([]);
  const [modelMetrics, setModelMetrics] = useState<AuditModelMetricItem[]>([]);
  const [publishChannels, setPublishChannels] = useState<AuditPublishChannelItem[]>([]);
  const [documentModes, setDocumentModes] = useState<AuditDocumentModeItem[]>([]);
  const [interviewMetric, setInterviewMetric] = useState<AuditInterviewMetric | null>(null);
  const [events, setEvents] = useState<AuditEventPageData>(DEFAULT_EVENT_PAGE);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [executionDetail, setExecutionDetail] = useState<AuditExecutionDetail | null>(null);
  const [llmCalls, setLlmCalls] = useState<AuditLlmCallItem[]>([]);
  const [selectedStepName, setSelectedStepName] = useState('');

  const [overviewState, setOverviewState] = useState<LoadState>({ loading: true });
  const [trendState, setTrendState] = useState<LoadState>({ loading: true });
  const [taskTypeState, setTaskTypeState] = useState<LoadState>({ loading: true });
  const [stepMetricState, setStepMetricState] = useState<LoadState>({ loading: true });
  const [modelMetricState, setModelMetricState] = useState<LoadState>({ loading: true });
  const [publishChannelState, setPublishChannelState] = useState<LoadState>({ loading: true });
  const [documentModeState, setDocumentModeState] = useState<LoadState>({ loading: false });
  const [interviewMetricState, setInterviewMetricState] = useState<LoadState>({ loading: false });
  const [eventState, setEventState] = useState<LoadState>({ loading: true });
  const [detailState, setDetailState] = useState<LoadState>({ loading: false });
  const [llmState, setLlmState] = useState<LoadState>({ loading: false });

  const currentDays = useMemo(
    () => RANGE_OPTIONS.find((item) => item.value === filters.range)?.days || 7,
    [filters.range],
  );

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setOverviewState({ loading: true });
      setTrendState({ loading: true });
      setTaskTypeState({ loading: true });
      setStepMetricState({ loading: isStepMetricAvailable(filters.taskType) });
      setModelMetricState({ loading: true });
      setPublishChannelState({ loading: shouldShowPublishChannels(filters.taskType) });
      setDocumentModeState({ loading: shouldShowDocumentModes(filters.taskType) });
      setInterviewMetricState({ loading: shouldShowInterviewMetrics(filters.taskType) });

      const requests: Array<Promise<unknown>> = [
        fetchApi<AuditOverview>(`/api/v1/audit/dashboard/overview?range=${filters.range}&taskType=${filters.taskType}`),
        fetchApi<AuditTaskTrendItem[]>(`/api/v1/audit/dashboard/task-trend?days=${currentDays}&taskType=${filters.taskType}`),
        fetchApi<AuditTaskTypeItem[]>(`/api/v1/audit/dashboard/task-type?range=${filters.range}`),
        isStepMetricAvailable(filters.taskType)
          ? fetchApi<AuditStepMetricItem[]>(`/api/v1/audit/dashboard/step-metrics?taskType=${filters.taskType}&range=${filters.range}`)
          : Promise.resolve([]),
        fetchApi<AuditModelMetricItem[]>(`/api/v1/audit/dashboard/model-metrics?range=${filters.range}&taskType=${filters.taskType}`),
        shouldShowPublishChannels(filters.taskType)
          ? fetchApi<AuditPublishChannelItem[]>(`/api/v1/audit/dashboard/publish-channel?range=${filters.range}`)
          : Promise.resolve([]),
        shouldShowDocumentModes(filters.taskType)
          ? fetchApi<AuditDocumentModeItem[]>(`/api/v1/audit/dashboard/document-mode?range=${filters.range}`)
          : Promise.resolve([]),
        shouldShowInterviewMetrics(filters.taskType)
          ? fetchApi<AuditInterviewMetric>(`/api/v1/audit/dashboard/interview-metrics?range=${filters.range}`)
          : Promise.resolve(null),
      ];

      const [
        overviewData,
        trendData,
        typeData,
        stepData,
        modelData,
        channelData,
        documentModeData,
        interviewData,
      ] = await Promise.allSettled(requests);

      if (cancelled) return;

      if (overviewData.status === 'fulfilled') {
        setOverview(normalizeOverview(overviewData.value));
        setOverviewState({ loading: false });
      } else {
        setOverviewState({ loading: false, error: (overviewData.reason as Error).message });
      }

      if (trendData.status === 'fulfilled') {
        setTrend(normalizeTrend(trendData.value));
        setTrendState({ loading: false });
      } else {
        setTrendState({ loading: false, error: (trendData.reason as Error).message });
      }

      if (typeData.status === 'fulfilled') {
        setTaskTypes(normalizeTaskType(typeData.value));
        setTaskTypeState({ loading: false });
      } else {
        setTaskTypeState({ loading: false, error: (typeData.reason as Error).message });
      }

      if (stepData.status === 'fulfilled') {
        setStepMetrics(normalizeStepMetrics(stepData.value));
        setStepMetricState({ loading: false });
      } else {
        setStepMetrics([]);
        setStepMetricState({ loading: false, error: (stepData.reason as Error).message });
      }

      if (modelData.status === 'fulfilled') {
        setModelMetrics(normalizeModelMetrics(modelData.value));
        setModelMetricState({ loading: false });
      } else {
        setModelMetricState({ loading: false, error: (modelData.reason as Error).message });
      }

      if (channelData.status === 'fulfilled') {
        setPublishChannels(normalizePublishChannels(channelData.value));
        setPublishChannelState({ loading: false });
      } else {
        setPublishChannels([]);
        setPublishChannelState({ loading: false, error: (channelData.reason as Error).message });
      }

      if (documentModeData.status === 'fulfilled') {
        setDocumentModes(normalizeDocumentModes(documentModeData.value));
        setDocumentModeState({ loading: false });
      } else {
        setDocumentModes([]);
        setDocumentModeState({ loading: false, error: (documentModeData.reason as Error).message });
      }

      if (interviewData.status === 'fulfilled') {
        setInterviewMetric(normalizeInterviewMetric(interviewData.value));
        setInterviewMetricState({ loading: false });
      } else {
        setInterviewMetric(null);
        setInterviewMetricState({ loading: false, error: (interviewData.reason as Error).message });
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [filters.range, filters.taskType, currentDays]);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setEventState({ loading: true });
      try {
        const params = new URLSearchParams({
          taskType: filters.taskType,
          page: String(filters.page),
          pageSize: String(filters.pageSize),
        });
        if (filters.status !== 'all') params.set('status', filters.status);

        const pageData = normalizeEventPage(await fetchApi(`/api/v1/audit/events?${params.toString()}`));
        if (cancelled) return;
        setEvents(pageData);
        setEventState({ loading: false });
      } catch (err) {
        if (cancelled) return;
        setEvents(DEFAULT_EVENT_PAGE);
        setEventState({ loading: false, error: (err as Error).message });
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [filters.page, filters.pageSize, filters.status, filters.taskType]);

  useEffect(() => {
    if (!selectedEvent) return;
    const traceId = selectedEvent.traceId || extractTraceId(selectedEvent.metadataJson);
    if (!traceId) {
      const timer = window.setTimeout(() => {
        setDetailState({ loading: false, error: '当前事件缺少 traceId，无法加载执行明细' });
        setExecutionDetail(null);
        setLlmCalls([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const resetTimer = window.setTimeout(() => {
      if (cancelled) return;
      setDetailState({ loading: true });
      setExecutionDetail(null);
      setSelectedStepName('');
      setLlmCalls([]);
      setLlmState({ loading: true });
    }, 0);

    fetchApi<AuditExecutionDetail>(`/api/v1/audit/execution/${traceId}`)
      .then((data) => {
        if (cancelled) return;
        setExecutionDetail(normalizeExecutionDetail(data));
        setDetailState({ loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailState({ loading: false, error: (err as Error).message });
      });

    fetchApi<AuditLlmCallItem[]>(`/api/v1/audit/execution/${traceId}/llm-calls`)
      .then((data) => {
        if (cancelled) return;
        setLlmCalls(normalizeLlmCalls(data));
        setLlmState({ loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setLlmState({ loading: false, error: (err as Error).message });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
    };
  }, [selectedEvent]);

  const visibleEvents = useMemo(
    () => ({
      ...events,
      items: events.items.filter((item) => includesChannel(item, filters.channel)),
    }),
    [events, filters.channel],
  );

  const visibleLlmCalls = useMemo(
    () => (selectedStepName ? llmCalls.filter((item) => item.stepName === selectedStepName) : llmCalls),
    [llmCalls, selectedStepName],
  );

  const handleFilterChange = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? (value as number) : 1,
    }));
  };

  useEffect(() => {
    writeStorageJson(AUDIT_FILTERS_KEY, {
      range: filters.range,
      taskType: filters.taskType,
      status: filters.status,
    });
  }, [filters.range, filters.status, filters.taskType]);

  return (
    <>
      <div className="flex-col gap-6 h-full overflow-y-auto pr-1">
        <div className="card flex-col gap-4">
          <div>
            <div className="text-2xl font-bold">审计监控中心</div>
            <div className="text-sm text-muted mt-1">统一查看内容自动化、文档知识助手、简历评估和模拟面试的执行状态、Token 消耗和异常事件。</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 240px))', gap: 16 }}>
            <div className="flex-col gap-2">
              <span className="text-sm font-semibold">时间范围</span>
              <select className="input" value={filters.range} onChange={(e) => handleFilterChange('range', e.target.value as AuditFilters['range'])}>
                {RANGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-col gap-2">
              <span className="text-sm font-semibold">任务类型</span>
              <select className="input" value={filters.taskType} onChange={(e) => handleFilterChange('taskType', e.target.value as AuditFilters['taskType'])}>
                {TASK_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-col gap-2">
              <span className="text-sm font-semibold">状态</span>
              <select className="input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value as AuditFilters['status'])}>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-muted">
            当前渠道筛选：{filters.channel || '未筛选'} | 当前状态筛选：{STATUS_LABELS[filters.status] || '全部'}
          </div>
        </div>

        <AuditMetricCards overview={overview} loading={overviewState.loading} error={overviewState.error} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <AuditTrendPanel items={trend} loading={trendState.loading} error={trendState.error} />
          <AuditTypePanel items={taskTypes} loading={taskTypeState.loading} error={taskTypeState.error} viewMode={typeViewMode} onViewModeChange={setTypeViewMode} />
        </div>

        <AuditStepMetricsPanel items={stepMetrics} loading={stepMetricState.loading} error={stepMetricState.error} />

        <AuditModelMetricsPanel items={modelMetrics} loading={modelMetricState.loading} error={modelMetricState.error} sortKey={modelSortKey} onSortChange={setModelSortKey} />

        {shouldShowPublishChannels(filters.taskType) && (
          <AuditPublishChannelPanel
            items={publishChannels}
            loading={publishChannelState.loading}
            error={publishChannelState.error}
            selectedChannel={filters.channel}
            onSelectChannel={(channel) => handleFilterChange('channel', channel)}
          />
        )}

        {shouldShowDocumentModes(filters.taskType) && (
          <AuditDocumentModePanel items={documentModes} loading={documentModeState.loading} error={documentModeState.error} />
        )}

        {shouldShowInterviewMetrics(filters.taskType) && (
          <AuditInterviewMetricsPanel item={interviewMetric} loading={interviewMetricState.loading} error={interviewMetricState.error} />
        )}

        <AuditEventTable
          data={visibleEvents}
          loading={eventState.loading}
          error={eventState.error}
          onSelect={setSelectedEvent}
          onPageChange={(page) => handleFilterChange('page', page)}
        />
      </div>

      <AuditExecutionDrawer
        open={Boolean(selectedEvent)}
        event={selectedEvent}
        detail={executionDetail}
        llmCalls={visibleLlmCalls}
        selectedStepName={selectedStepName}
        llmLoading={llmState.loading}
        loading={detailState.loading}
        error={detailState.error}
        llmError={llmState.error}
        onSelectStep={setSelectedStepName}
        onClose={() => {
          setSelectedEvent(null);
          setExecutionDetail(null);
          setLlmCalls([]);
          setSelectedStepName('');
          setDetailState({ loading: false });
          setLlmState({ loading: false });
        }}
      />
    </>
  );
};

export default Monitor;

