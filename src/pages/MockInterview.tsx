import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, BarChart, Bot, Send, Settings2, Target, UserCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AgentTimeline from '../components/AgentTimeline';
import { createPollingController, makeSessionId, readStorageJson, removeStorageValue, writeStorageJson } from '../utils/restore';

type InterviewRound = { roundNo: number; questionContent?: string; answerContent?: string; feedbackContent?: string; strengths?: string; weaknesses?: string; resumeEvidence?: string; followUpIntent?: string; nextQuestion?: string; score?: string; finished?: boolean; status?: string; };
type InterviewSession = { interviewSessionId: number; resumeId?: number; knowledgeSpaceId?: number; currentRound?: number; totalRounds?: number; status?: string; openingQuestions?: string; finalReport?: string | null; rounds?: InterviewRound[]; };
type InterviewAnalysis = { score?: string; feedback?: string; strengths?: string; weaknesses?: string; resumeEvidence?: string; followUpIntent?: string; nextQuestion?: string; finalReport?: string; };
type InterviewMessage = { role: 'interviewer' | 'candidate'; content: string; };
type ResumeProfile = { resumeId: number; knowledgeSpaceId: number; fileName?: string; chunkCount?: number; };
type RestoreState = { activeInterviewSessionId?: number; activeResumeId?: number; activeKnowledgeSpaceId?: number; };
type StreamEvent = { type?: string; subType?: string; step?: number; content?: string; status?: string; };
type RouteState = { resumeId?: number; ksId?: number; interviewSessionId?: number; };

const RESTORE_KEY = 'mock-interview-restore';
const INPUT_KEY = 'mock-interview-input';
const POLL_MS = 2500;
const ROUND_OPTIONS = [3, 5, 8];

const fetchJson = async <T,>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`请求失败: HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== '0000') throw new Error(json.info || '请求失败');
  return json.data as T;
};

const sanitizeQuestionText = (text?: string) => (text || '').replace(/\r\n/g, '\n').replace(/\n?面试状态[:：]\s*[A-Z_]+\s*$/i, '').trim();
const extractFirstOpeningQuestion = (openingQuestions?: string) => {
  const normalized = (openingQuestions || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines.find((line) => /^(\d+[.)、]|[-*])\s*/.test(line)) || lines[0] || normalized;
  return sanitizeQuestionText(firstLine.replace(/^(\d+[.)、]|[-*])\s*/, '').trim());
};
const getSessionStatusLabel = (status?: string) => status === 'STARTED' ? '待回答' : status === 'IN_PROGRESS' ? '进行中' : status === 'FINISHED' ? '已完成' : status || '未开始';
const getRoundStatusLabel = (status?: string) => status === 'ASKED' ? '待回答' : status === 'ANSWERED' ? '处理中' : status === 'EVALUATED' ? '已评估' : status || '--';

const MockInterview = () => {
  const location = useLocation();
  const routeState = ((location.state as RouteState | null) || {});
  const [profiles, setProfiles] = useState<ResumeProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>(undefined);
  const [selectedKnowledgeSpaceId, setSelectedKnowledgeSpaceId] = useState<number | undefined>(undefined);
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [sessionInfo, setSessionInfo] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState(() => sessionStorage.getItem(INPUT_KEY) || '');
  const [isStarting, setIsStarting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [analysis, setAnalysis] = useState<InterviewAnalysis>({});

  const streamCtrlRef = useRef<AbortController | null>(null);
  const streamActiveRef = useRef(false);
  const ignoreStreamErrorRef = useRef(false);
  const pollerRef = useRef<ReturnType<typeof createPollingController> | null>(null);
  const activeEndpointAvailableRef = useRef(true);

  const persistSelectionOnly = (resumeId?: number, knowledgeSpaceId?: number) => {
    writeStorageJson(RESTORE_KEY, { activeResumeId: resumeId, activeKnowledgeSpaceId: knowledgeSpaceId });
  };
  const persistSessionState = (session: InterviewSession | null) => {
    if (!session?.interviewSessionId || session.status === 'FINISHED') {
      persistSelectionOnly(session?.resumeId || selectedResumeId, session?.knowledgeSpaceId || selectedKnowledgeSpaceId);
      return;
    }
    writeStorageJson(RESTORE_KEY, { activeInterviewSessionId: session.interviewSessionId, activeResumeId: session.resumeId, activeKnowledgeSpaceId: session.knowledgeSpaceId });
  };
  const stopPolling = () => { pollerRef.current?.stop(); pollerRef.current = null; };
  const stopStream = () => { ignoreStreamErrorRef.current = true; streamCtrlRef.current?.abort(); streamCtrlRef.current = null; streamActiveRef.current = false; };

  useEffect(() => () => { stopStream(); stopPolling(); }, []);
  useEffect(() => { sessionStorage.setItem(INPUT_KEY, input); }, [input]);
  useEffect(() => { persistSelectionOnly(selectedResumeId, selectedKnowledgeSpaceId); }, [selectedResumeId, selectedKnowledgeSpaceId]);

  const upsertProfile = (resumeId?: number, knowledgeSpaceId?: number) => {
    if (!resumeId || !knowledgeSpaceId) return;
    setProfiles((current) => current.some((item) => item.resumeId === resumeId) ? current : [{ resumeId, knowledgeSpaceId, fileName: `简历 ${resumeId}` }, ...current]);
  };

  const buildSessionView = (data: InterviewSession) => {
    const rounds = data.rounds || [];
    const nextMessages: InterviewMessage[] = [];
    if (rounds.length === 0) {
      const openingQuestion = extractFirstOpeningQuestion(data.openingQuestions);
      if (openingQuestion) nextMessages.push({ role: 'interviewer', content: openingQuestion });
    } else {
      rounds.forEach((item, index) => {
        if (item.questionContent) nextMessages.push({ role: 'interviewer', content: sanitizeQuestionText(item.questionContent) });
        if (item.answerContent) nextMessages.push({ role: 'candidate', content: item.answerContent });
        if (index === rounds.length - 1 && item.nextQuestion && data.status !== 'FINISHED') nextMessages.push({ role: 'interviewer', content: sanitizeQuestionText(item.nextQuestion) });
      });
    }
    const lastRound = rounds[rounds.length - 1];
    setSessionInfo(data);
    setMessages(nextMessages);
    setAnalysis({ score: lastRound?.score || '', feedback: lastRound?.feedbackContent || '', strengths: lastRound?.strengths || '', weaknesses: lastRound?.weaknesses || '', resumeEvidence: lastRound?.resumeEvidence || '', followUpIntent: lastRound?.followUpIntent || '', nextQuestion: sanitizeQuestionText(lastRound?.nextQuestion), finalReport: data.finalReport || '' });
    setSelectedResumeId(data.resumeId);
    setSelectedKnowledgeSpaceId(data.knowledgeSpaceId);
    setSelectedRounds(data.totalRounds || 5);
    upsertProfile(data.resumeId, data.knowledgeSpaceId);
    persistSessionState(data);
  };

  const clearInterviewView = (resumeId?: number, knowledgeSpaceId?: number) => {
    setSessionInfo(null); setMessages([]); setEvents([]); setAnalysis({});
    setSelectedResumeId(resumeId); setSelectedKnowledgeSpaceId(knowledgeSpaceId);
    persistSelectionOnly(resumeId, knowledgeSpaceId);
  };

  const fetchSessionDetail = async (id: number) => { const data = await fetchJson<InterviewSession>(`/api/v1/resume/interview/${id}`); buildSessionView(data); return data; };
  const fetchActiveInterview = async () => {
    if (!activeEndpointAvailableRef.current) return null;
    try { return await fetchJson<InterviewSession | null>('/api/v1/resume/interview/active'); }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('HTTP 400') || message.includes('HTTP 404')) { activeEndpointAvailableRef.current = false; return null; }
      throw err;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadProfiles = async () => {
      setProfilesLoading(true); setProfilesError('');
      try {
        const data = await fetchJson<ResumeProfile[]>('/api/v1/resume/profile/recent?limit=20');
        if (cancelled) return;
        const routeResumeId = Number(routeState.resumeId || 0) || undefined;
        const routeKnowledgeSpaceId = Number(routeState.ksId || 0) || undefined;
        const next = [...(data || [])];
        if (routeResumeId && routeKnowledgeSpaceId && !next.some((item) => item.resumeId === routeResumeId)) next.unshift({ resumeId: routeResumeId, knowledgeSpaceId: routeKnowledgeSpaceId, fileName: `简历 ${routeResumeId}` });
        setProfiles(next);
      } catch (err) {
        if (!cancelled) setProfilesError(err instanceof Error ? err.message : '加载历史简历失败');
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    };
    void loadProfiles();
    return () => { cancelled = true; };
  }, [routeState.resumeId, routeState.ksId]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      setIsRestoring(true);
      try {
        const saved = readStorageJson<RestoreState>(RESTORE_KEY);
        const explicitInterviewId = Number(routeState.interviewSessionId || 0) || undefined;
        const routeResumeId = Number(routeState.resumeId || 0) || undefined;
        const routeKnowledgeSpaceId = Number(routeState.ksId || 0) || undefined;
        if (routeResumeId && routeKnowledgeSpaceId) { clearInterviewView(routeResumeId, routeKnowledgeSpaceId); return; }
        if (explicitInterviewId) {
          const detail = await fetchSessionDetail(explicitInterviewId);
          if (!cancelled && detail.status === 'FINISHED') persistSelectionOnly(detail.resumeId, detail.knowledgeSpaceId);
          return;
        }
        if (saved?.activeInterviewSessionId) {
          try {
            const detail = await fetchSessionDetail(saved.activeInterviewSessionId);
            if (!cancelled && detail.status === 'FINISHED') clearInterviewView(detail.resumeId, detail.knowledgeSpaceId);
            return;
          } catch { removeStorageValue(RESTORE_KEY); }
        }
        const active = await fetchActiveInterview();
        if (cancelled) return;
        if (active?.interviewSessionId) { buildSessionView(active); return; }
        clearInterviewView(saved?.activeResumeId, saved?.activeKnowledgeSpaceId);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, [routeState.interviewSessionId, routeState.resumeId, routeState.ksId]);

  const currentRoundRecord = useMemo(() => {
    if (!sessionInfo?.rounds?.length) return null;
    return sessionInfo.currentRound ? sessionInfo.rounds.find((item) => item.roundNo === sessionInfo.currentRound) || sessionInfo.rounds[sessionInfo.rounds.length - 1] : sessionInfo.rounds[sessionInfo.rounds.length - 1];
  }, [sessionInfo]);
  const isSessionRunning = sessionInfo?.status === 'STARTED' || sessionInfo?.status === 'IN_PROGRESS';
  const roundLocked = currentRoundRecord?.status === 'ANSWERED' || currentRoundRecord?.status === 'EVALUATED';

  useEffect(() => {
    if (!sessionInfo?.interviewSessionId || !isSessionRunning || streamActiveRef.current) { stopPolling(); return; }
    const poller = createPollingController(async () => {
      try {
        const detail = await fetchSessionDetail(sessionInfo.interviewSessionId);
        if (detail.status === 'FINISHED') stopPolling();
      } catch (err) { console.error('poll interview detail failed', err); }
    }, POLL_MS);
    pollerRef.current = poller; poller.start();
    return () => { poller.stop(); if (pollerRef.current === poller) pollerRef.current = null; };
  }, [sessionInfo?.interviewSessionId, isSessionRunning]);

  const handleProfileChange = (resumeIdValue: string) => {
    const nextResumeId = Number(resumeIdValue || 0) || undefined;
    const profile = profiles.find((item) => item.resumeId === nextResumeId);
    setSelectedResumeId(profile?.resumeId);
    setSelectedKnowledgeSpaceId(profile?.knowledgeSpaceId);
  };

  const handleStartInterview = async () => {
    if (isStarting || isAnswering || isSessionRunning) return;
    if (!selectedResumeId || !selectedKnowledgeSpaceId) { alert('请先选择要模拟面试的简历'); return; }
    setIsStarting(true);
    try {
      const res = await fetch('/api/v1/resume/interview/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeId: selectedResumeId, knowledgeSpaceId: selectedKnowledgeSpaceId, totalRounds: selectedRounds }) });
      if (!res.ok) throw new Error(`初始化面试失败: HTTP ${res.status}`);
      const json = await res.json();
      if (json.code !== '0000' || !json.data?.interviewSessionId) throw new Error(json.info || '初始化面试失败');
      removeStorageValue(INPUT_KEY); setInput(''); setEvents([]);
      await fetchSessionDetail(json.data.interviewSessionId as number);
    } catch (err) {
      console.error(err); alert(err instanceof Error ? err.message : '初始化面试失败');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSend = async () => {
    const answerText = input.trim();
    if (!answerText || !sessionInfo?.interviewSessionId || !sessionInfo.currentRound || streamActiveRef.current || isAnswering || roundLocked) return;
    setMessages((prev) => [...prev, { role: 'candidate', content: answerText }]); setInput(''); setIsAnswering(true); setEvents([]);
    setAnalysis((prev) => ({ ...prev, feedback: '', strengths: '', weaknesses: '', resumeEvidence: '', followUpIntent: '', nextQuestion: '' }));
    stopPolling();
    const ctrl = new AbortController(); streamCtrlRef.current = ctrl; streamActiveRef.current = true; ignoreStreamErrorRef.current = false;
    try {
      const response = await fetch('/api/v1/resume/interview/answer/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewSessionId: sessionInfo.interviewSessionId, roundNo: sessionInfo.currentRound, answer: answerText, sessionId: makeSessionId('resume-interview', sessionInfo.interviewSessionId), maxStep: 5 }), signal: ctrl.signal });
      if (!response.ok || !response.body) throw new Error(`答题流启动失败: HTTP ${response.status}`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim().startsWith('data:')) continue;
          const raw = line.slice(line.indexOf('data:') + 5).trim(); if (!raw) continue;
          try {
            const eventData = JSON.parse(raw) as StreamEvent; setEvents((prev) => [...prev, eventData]);
            if (eventData.type === 'summary') {
              const map: Record<string, keyof InterviewAnalysis> = { score: 'score', feedback: 'feedback', strengths: 'strengths', weaknesses: 'weaknesses', resume_evidence: 'resumeEvidence', follow_up_intent: 'followUpIntent', next_question: 'nextQuestion', final_report: 'finalReport' };
              const key = eventData.subType ? map[eventData.subType] : undefined;
              if (key) setAnalysis((prev) => ({ ...prev, [key]: eventData.content || '' }));
            }
            if (eventData.type === 'complete' || eventData.type === 'error') await fetchSessionDetail(sessionInfo.interviewSessionId);
          } catch (err) { console.error('parse interview stream event failed', err); }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const abortLike = ignoreStreamErrorRef.current || ctrl.signal.aborted || (err as { name?: string })?.name === 'AbortError' || (err instanceof TypeError && message.includes('Failed to fetch'));
      if (!abortLike) console.error('interview stream error', err);
    } finally {
      streamCtrlRef.current = null; streamActiveRef.current = false; ignoreStreamErrorRef.current = false; setIsAnswering(false);
      void fetchSessionDetail(sessionInfo.interviewSessionId).catch((err) => console.error('refresh interview detail failed', err));
    }
  };

  const timelineEvents = useMemo(() => events.map((event, index) => ({ type: event.type || 'event', subType: event.subType || 'default', step: event.step || index + 1, content: event.content || event.status || '' })), [events]);
  const statusText = useMemo(() => isRestoring ? '恢复中...' : isStarting ? '创建中...' : isAnswering ? '处理中...' : currentRoundRecord?.status === 'ANSWERED' && isSessionRunning ? '处理中...' : getSessionStatusLabel(sessionInfo?.status), [currentRoundRecord?.status, isAnswering, isRestoring, isSessionRunning, isStarting, sessionInfo?.status]);
  const selectedProfile = useMemo(() => profiles.find((item) => item.resumeId === selectedResumeId) || null, [profiles, selectedResumeId]);

  return (
    <div className="flex h-full items-stretch gap-6 overflow-hidden">
      <div style={{ width: 300 }} className="h-full shrink-0 overflow-y-auto pr-1">
        <div className="card sticky top-0 flex-col gap-4">
          <div className="mb-2 flex items-center gap-2 border-b pb-2 font-bold"><Settings2 size={18} />面试参数配置</div>
          <div className="flex-col gap-2">
            <label className="text-sm font-semibold">选择简历</label>
            <select className="input text-sm" value={selectedResumeId || ''} onChange={(e) => handleProfileChange(e.target.value)} disabled={isSessionRunning}>
              <option value="">请选择历史简历</option>
              {profiles.map((item) => <option key={item.resumeId} value={item.resumeId}>{`${item.fileName || `简历 ${item.resumeId}`} · Resume ID ${item.resumeId}`}</option>)}
            </select>
            {profilesLoading && <div className="text-xs text-muted">正在加载历史简历...</div>}
            {profilesError && <div className="text-xs text-danger">{profilesError}</div>}
            {selectedProfile && <div className="text-xs text-muted">{`Knowledge Space ID: ${selectedProfile.knowledgeSpaceId} · Chunks: ${selectedProfile.chunkCount || '-'}`}</div>}
          </div>
          <div className="flex-col gap-2">
            <label className="text-sm font-semibold">面试轮数</label>
            <select className="input text-sm" value={selectedRounds} onChange={(e) => setSelectedRounds(Number(e.target.value))} disabled={isSessionRunning}>
              {ROUND_OPTIONS.map((rounds) => <option key={rounds} value={rounds}>{`${rounds} 轮`}</option>)}
            </select>
          </div>
          <div className="mt-4 flex-col gap-2 text-sm text-muted">
            <div>{`当前会话：INT-${sessionInfo?.interviewSessionId || '未启动'}`}</div>
            <div>{`简历 ID：${sessionInfo?.resumeId || selectedResumeId || '-'}`}</div>
            <div>{`当前轮次：${sessionInfo?.currentRound || '-'}`}</div>
            <div>{`总轮数：${sessionInfo?.totalRounds || selectedRounds}`}</div>
            <div>{`会话状态：${statusText}`}</div>
            <div>{`本轮状态：${getRoundStatusLabel(currentRoundRecord?.status)}`}</div>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => void handleStartInterview()} disabled={!selectedResumeId || !selectedKnowledgeSpaceId || isStarting || isAnswering || isSessionRunning}>
            <Target size={16} />{isStarting ? '正在创建...' : sessionInfo?.status === 'FINISHED' ? '开始新的模拟' : '开始模拟面试'}
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="card flex h-full flex-col overflow-hidden" style={{ padding: 0 }}>
          <div className="shrink-0 border-b bg-gray-50 p-4"><div className="flex items-center justify-between font-bold"><span>{`动态面试工作台${sessionInfo?.currentRound ? ` - 第 ${sessionInfo.currentRound} 轮` : ''}`}</span><span className="badge badge-blue">{statusText}</span></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex-col gap-6">
              {messages.length === 0 && <div className="py-8 text-center text-sm text-muted">{isRestoring ? '正在恢复面试会话...' : isStarting ? '正在生成首个问题...' : '请选择简历和轮数，然后点击“开始模拟面试”'}</div>}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: message.role === 'candidate' ? 'var(--primary)' : '#ffb400', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>{message.role === 'candidate' ? <UserCircle size={20} /> : <Bot size={20} />}</div>
                  <div className={message.role === 'candidate' ? '' : 'markdown-body border border-gray-100 bg-gray-50'} style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: 8, background: message.role === 'candidate' ? 'var(--primary)' : '#fff', color: message.role === 'candidate' ? '#fff' : 'var(--text-main)', boxShadow: 'var(--shadow-sm)', lineHeight: 1.6 }}>
                    {message.role === 'candidate' ? message.content : <ReactMarkdown>{message.content}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {(isAnswering || (currentRoundRecord?.status === 'ANSWERED' && isSessionRunning)) && <div className="flex items-center justify-center py-4 text-sm italic text-muted">后端正在处理当前轮回答，页面会自动同步最新状态...</div>}
            </div>
          </div>
          <div className="shrink-0 border-t bg-white p-4">
            <div className="flex items-end gap-3">
              <textarea className="input" style={{ minHeight: 60, resize: 'none' }} placeholder={sessionInfo?.status === 'FINISHED' ? '本次面试已结束，可以重新开始新的模拟' : roundLocked ? '当前轮已提交，等待处理完成...' : '作为候选人输入你的回答...'} value={input} onChange={(e) => setInput(e.target.value)} disabled={sessionInfo?.status === 'FINISHED' || isAnswering || !sessionInfo || roundLocked} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }} />
              <button className="btn btn-primary" style={{ height: 60 }} type="button" onClick={() => void handleSend()} disabled={isAnswering || !sessionInfo || sessionInfo.status === 'FINISHED' || roundLocked || !input.trim()}>
                <Send size={18} />{isAnswering ? '处理中...' : roundLocked ? '已提交' : '提交回答'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: 350 }} className="h-full shrink-0">
        <div className="card flex h-full flex-col overflow-hidden">
          <div className="shrink-0 border-b pb-2 font-bold"><div className="flex items-center justify-between"><span>实时多维分析面板</span><Activity className="text-primary" size={18} /></div></div>
          {!Object.keys(analysis).some((key) => Boolean(analysis[key as keyof InterviewAnalysis])) && !isAnswering ? (
            <div className="py-8 text-center text-sm text-muted">等待后端恢复或生成分析结果...</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex-col gap-4">
                {analysis.score && <div className="flex items-center gap-3"><div className="text-3xl font-bold text-success">{analysis.score}</div><div className="text-sm text-secondary">综合评分</div></div>}
                <div className="mt-2 flex-col gap-3 text-sm leading-relaxed">
                  {analysis.strengths && <div><strong className="mb-1 block text-xs text-success">表现优势：</strong>{analysis.strengths}</div>}
                  {analysis.weaknesses && <div><strong className="mb-1 block text-xs text-danger">薄弱环节：</strong>{analysis.weaknesses}</div>}
                  {analysis.resumeEvidence && <div><strong className="mb-1 block text-xs text-primary">简历依据：</strong>{analysis.resumeEvidence}</div>}
                  {analysis.followUpIntent && <div><strong className="mb-1 block text-xs text-warning">追问意图：</strong>{analysis.followUpIntent}</div>}
                  {analysis.feedback && <div className="mt-2"><strong className="mb-1 block text-xs text-secondary">深度点评：</strong><div className="markdown-body rounded border border-gray-100 bg-gray-50 p-3 text-xs"><ReactMarkdown>{analysis.feedback}</ReactMarkdown></div></div>}
                  {analysis.finalReport && <div className="mt-2"><strong className="mb-1 block text-xs text-primary">最终面试报告：</strong><div className="markdown-body rounded border border-blue-200 bg-blue-50 p-3 text-xs"><ReactMarkdown>{analysis.finalReport}</ReactMarkdown></div></div>}
                </div>
                <div className="mt-4 border-t pt-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold"><BarChart size={14} className="text-muted" />过程事件流</div><AgentTimeline events={timelineEvents} isStreaming={isAnswering} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
