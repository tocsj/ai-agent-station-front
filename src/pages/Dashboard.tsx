import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle, Clock3, Loader2, PlayCircle, Sparkles, Zap } from 'lucide-react';
import AuditExecutionDrawer from '../components/audit/AuditExecutionDrawer';
import { STATUS_LABELS } from '../components/audit/config';
import type { AuditEventItem, AuditExecutionDetail, AuditLlmCallItem } from '../components/audit/types';

type WorkbenchRange = 'today' | '7d' | '30d';

type PlatformStatus = {
  apiVersion?: string;
  apiStatus?: string;
  statusText?: string;
};

type AgentCard = {
  taskType: string;
  taskTypeName: string;
  description?: string;
  routePath?: string;
  taskTotal?: number;
  successRate?: number;
  lastRunTime?: string;
};

type WorkbenchOverview = {
  taskTotal?: number;
  runningTotal?: number;
  avgDurationMs?: number;
  modelCalls?: number;
  successRate?: number;
  totalTokens?: number;
};

type RecentRunItem = {
  traceId: string;
  displayTaskId?: string;
  taskId?: string;
  taskType?: string;
  taskTypeName?: string;
  taskSubType?: string;
  taskSubTypeName?: string;
  durationMs?: number;
  totalTokens?: number;
  status?: string;
  statusText?: string;
  lastTime?: string;
  detailTraceId?: string;
};

type WorkbenchSnapshot = {
  range?: WorkbenchRange;
  platform?: PlatformStatus;
  agentCards?: AgentCard[];
  overview?: WorkbenchOverview;
  recentRuns?: RecentRunItem[];
};

const ROUTE_MAP: Record<string, string> = {
  '/resume-evaluation': '/resume',
  '/resume-interview': '/interview',
  '/document-workspace': '/knowledge',
  '/content-automation': '/content',
  '/resume': '/resume',
  '/interview': '/interview',
  '/knowledge': '/knowledge',
  '/content': '/content',
};

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

const formatPercent = (value?: number) => (typeof value === 'number' ? `${value.toFixed(2)}%` : '-');
const formatSeconds = (value?: number) => (typeof value === 'number' ? `${(value / 1000).toFixed(1)} 秒` : '-');
const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const Dashboard = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<WorkbenchRange>('7d');
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRun, setSelectedRun] = useState<RecentRunItem | null>(null);
  const [detail, setDetail] = useState<AuditExecutionDetail | null>(null);
  const [llmCalls, setLlmCalls] = useState<AuditLlmCallItem[]>([]);
  const [selectedStepName, setSelectedStepName] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchApi<WorkbenchSnapshot>(`/api/v1/workbench/dashboard?range=${range}&recentLimit=10`);
        if (cancelled) return;
        setSnapshot(data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || '加载工作台失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    const traceId = selectedRun?.detailTraceId || selectedRun?.traceId;
    if (!traceId) return;

    let cancelled = false;
    setDetailLoading(true);
    setLlmLoading(true);
    setDetailError('');
    setLlmError('');
    setDetail(null);
    setLlmCalls([]);
    setSelectedStepName('');

    fetchApi<AuditExecutionDetail>(`/api/v1/audit/execution/${traceId}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setDetailError((err as Error).message || '加载执行详情失败');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    fetchApi<AuditLlmCallItem[]>(`/api/v1/audit/execution/${traceId}/llm-calls`)
      .then((data) => {
        if (!cancelled) setLlmCalls(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setLlmError((err as Error).message || '加载 LLM 调用失败');
      })
      .finally(() => {
        if (!cancelled) setLlmLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRun]);

  const visibleLlmCalls = useMemo(
    () => (selectedStepName ? llmCalls.filter((item) => item.stepName === selectedStepName) : llmCalls),
    [llmCalls, selectedStepName],
  );

  const overviewItems = [
    { label: '总任务数', value: formatNumber(snapshot?.overview?.taskTotal), icon: <Sparkles size={18} className="text-primary" /> },
    { label: '运行中任务', value: formatNumber(snapshot?.overview?.runningTotal), icon: <PlayCircle size={18} className="text-warning" /> },
    { label: '平均耗时', value: formatSeconds(snapshot?.overview?.avgDurationMs), icon: <Clock3 size={18} className="text-primary" /> },
    { label: '模型调用数', value: formatNumber(snapshot?.overview?.modelCalls), icon: <Bot size={18} className="text-success" /> },
    { label: '成功率', value: formatPercent(snapshot?.overview?.successRate), icon: <CheckCircle size={18} className="text-success" /> },
    { label: '总 Tokens', value: formatNumber(snapshot?.overview?.totalTokens), icon: <Zap size={18} className="text-warning" /> },
  ];

  const buildDrawerEvent = (item: RecentRunItem | null): AuditEventItem | null => {
    if (!item) return null;
    return {
      eventId: item.traceId,
      traceId: item.detailTraceId || item.traceId,
      eventTypeName: item.taskSubTypeName || item.taskTypeName || '任务执行',
      taskType: item.taskType,
      bizId: item.taskId,
      status: item.status,
      createTime: item.lastTime,
      metadataJson: JSON.stringify({
        displayTaskId: item.displayTaskId,
        taskSubType: item.taskSubType,
      }),
    };
  };

  return (
    <>
      <div className="flex-col gap-6 h-full overflow-y-auto pr-1">
        <div className="card flex-col gap-4" style={{ background: 'linear-gradient(to right, var(--primary-bg), #fff)' }}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold mb-2">工作台大盘</h2>
              <p className="text-muted">首页只展示平台摘要、能力导航和最近运行记录。详细执行监控请进入审计监控中心。</p>
            </div>
            <div className="flex items-center gap-3">
              <select className="input" style={{ width: 120 }} value={range} onChange={(e) => setRange(e.target.value as WorkbenchRange)}>
                <option value="today">今日</option>
                <option value="7d">近7天</option>
                <option value="30d">近30天</option>
              </select>
              <span className={`badge ${snapshot?.platform?.apiStatus === 'RUNNING' ? 'badge-green' : 'badge-orange'}`}>
                {(snapshot?.platform?.apiVersion || 'v1.x')} {snapshot?.platform?.statusText || '平台状态未知'}
              </span>
            </div>
          </div>
        </div>

        {error && <div className="card text-sm text-danger">加载工作台失败：{error}</div>}

        <div>
          <h3 className="font-semibold text-lg mb-4">核心能力</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            {(snapshot?.agentCards || []).map((card) => (
              <button
                key={card.taskType}
                type="button"
                className="card flex-col gap-2 text-left hover:border-primary transition-colors"
                onClick={() => navigate(ROUTE_MAP[card.routePath || ''] || '/dashboard')}
              >
                <div className="font-bold text-base">{card.taskTypeName}</div>
                <p className="text-sm text-secondary leading-relaxed">{card.description || '暂无描述'}</p>
                <div className="text-xs text-muted flex items-center justify-between mt-2">
                  <span>任务 {formatNumber(card.taskTotal)}</span>
                  <span>成功率 {formatPercent(card.successRate)}</span>
                </div>
                <div className="text-xs text-muted">最近运行：{card.lastRunTime || '-'}</div>
              </button>
            ))}

            {!loading && (!snapshot?.agentCards || snapshot.agentCards.length === 0) && (
              <div className="card text-sm text-muted" style={{ gridColumn: '1 / -1' }}>
                暂无能力卡片数据
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-4">平台指标</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16 }}>
            {overviewItems.map((item) => (
              <div key={item.label} className="card flex items-center gap-3 p-4">
                <div>{item.icon}</div>
                <div>
                  <div className="text-muted text-xs mb-1">{item.label}</div>
                  <div className="font-bold text-lg">{loading ? '加载中...' : item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-4">最近运行</h3>
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-8 text-sm text-muted flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                加载中...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f5f7fa', borderBottom: '1px solid var(--border-color)' }}>
                    <th className="p-4 text-sm font-semibold">任务编号</th>
                    <th className="p-4 text-sm font-semibold">任务类型</th>
                    <th className="p-4 text-sm font-semibold">耗时</th>
                    <th className="p-4 text-sm font-semibold">Tokens</th>
                    <th className="p-4 text-sm font-semibold">状态</th>
                    <th className="p-4 text-sm font-semibold">最近时间</th>
                    <th className="p-4 text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(snapshot?.recentRuns || []).map((run) => (
                    <tr key={run.traceId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="p-4 text-sm font-mono">{run.displayTaskId || run.taskId || '-'}</td>
                      <td className="p-4 text-sm">
                        <div className="font-semibold text-primary">{run.taskTypeName || '-'}</div>
                        {run.taskSubTypeName && <div className="text-xs text-muted mt-1">{run.taskSubTypeName}</div>}
                      </td>
                      <td className="p-4 text-sm">{formatSeconds(run.durationMs)}</td>
                      <td className="p-4 text-sm">{formatNumber(run.totalTokens)}</td>
                      <td className="p-4 text-sm">
                        <span className={`badge ${run.status === 'SUCCESS' ? 'badge-green' : run.status === 'RUNNING' ? 'badge-blue' : 'badge-orange'}`}>
                          {run.statusText || STATUS_LABELS[run.status || ''] || run.status || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{run.lastTime || '-'}</td>
                      <td className="p-4 text-sm">
                        <button className="btn btn-sm" type="button" onClick={() => setSelectedRun(run)}>
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}

                  {(!snapshot?.recentRuns || snapshot.recentRuns.length === 0) && (
                    <tr>
                      <td className="p-6 text-sm text-muted text-center" colSpan={7}>
                        暂无最近运行记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AuditExecutionDrawer
        open={Boolean(selectedRun)}
        event={buildDrawerEvent(selectedRun)}
        detail={detail}
        llmCalls={visibleLlmCalls}
        selectedStepName={selectedStepName}
        llmLoading={llmLoading}
        loading={detailLoading}
        error={detailError}
        llmError={llmError}
        onSelectStep={setSelectedStepName}
        onClose={() => {
          setSelectedRun(null);
          setDetail(null);
          setLlmCalls([]);
          setSelectedStepName('');
          setDetailError('');
          setLlmError('');
        }}
      />
    </>
  );
};

export default Dashboard;
