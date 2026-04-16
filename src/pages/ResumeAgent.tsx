import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock3,
  File,
  FileText,
  History,
  Lightbulb,
  Mic,
  PlayCircle,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentTimeline from '../components/AgentTimeline';
import { createPollingController, makeSessionId } from '../utils/restore';

type ResumeHistoryItem = {
  resumeId: number;
  knowledgeSpaceId: number;
  knowledgeTag: string;
  fileName: string;
  chunkCount: number;
  createTime: string;
  updateTime: string;
};

type ResumeEvaluationActive = {
  taskId?: number;
  resumeId?: number;
  knowledgeSpaceId?: number;
  sessionId?: string;
  question?: string;
  status?: string;
  report?: string;
  traceId?: string;
  errorMessage?: string | null;
  createTime?: string;
  updateTime?: string;
};

type ParsedResult = {
  score: number;
  match: string;
  pros: string[];
  cons: string[];
  suggestions: string[];
  deepDive: string[];
};

const ACTIVE_EVAL_POLL_INTERVAL = 3000;

const parseAnalysisResult = (text: string): ParsedResult | null => {
  if (!text) return null;

  const cleanText = text.replace(/[*#`]/g, '').trim();
  const scoreMatch =
    cleanText.match(/鍖归厤搴:锛歕s]+(\d+)/) ||
    cleanText.match(/璇勫垎[:锛歕s]+(\d+)/) ||
    cleanText.match(/(\d+)\s*\/\s*100/) ||
    cleanText.match(/(\d+)\s*%/);

  const score = scoreMatch ? Number(scoreMatch[1]) : 80;

  const extractBlock = (keywords: string[]) => {
    const allKeywords = ['浼樺娍', '椋庨櫓', '涓嶈冻', '寤鸿', '娣辨寲鐐?, '椤圭洰鐪熷疄鎬?, '宀椾綅鍖归厤搴?, '鎶€鏈繁搴?];
    const startKeyword = keywords.find((keyword) => cleanText.includes(keyword));
    if (!startKeyword) return [];

    const start = cleanText.indexOf(startKeyword) + startKeyword.length;
    const rest = cleanText.slice(start);
    let end = rest.length;

    for (const keyword of allKeywords) {
      if (keywords.includes(keyword)) continue;
      const index = rest.indexOf(keyword);
      if (index !== -1 && index < end) end = index;
    }

    return rest
      .slice(0, end)
      .split(/[\n锛?銆俔/)
      .map((item) => item.replace(/^[-\d.\s:锛歖+/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
  };

  return {
    score,
    match: '鍩轰簬鍚庣璇勪及鎶ュ憡鑷姩瑙ｆ瀽',
    pros: extractBlock(['浼樺娍']),
    cons: extractBlock(['椋庨櫓', '涓嶈冻']),
    suggestions: extractBlock(['寤鸿']),
    deepDive: extractBlock(['娣辨寲鐐?, '椤圭洰鐪熷疄鎬?, '鎶€鏈繁搴?]),
  };
};

const ResumeAgent = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeStreamCtrl = useRef<AbortController | null>(null);
  const evalPollerRef = useRef<ReturnType<typeof createPollingController> | null>(null);

  const [profiles, setProfiles] = useState<ResumeHistoryItem[]>([]);
  const [fileContext, setFileContext] = useState<ResumeHistoryItem | null>(null);
  const [activeEvaluation, setActiveEvaluation] = useState<ResumeEvaluationActive | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [events, setEvents] = useState<ResumeEvalStreamEvent[]>([]);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [rawSummary, setRawSummary] = useState('');

  const stopPolling = () => {
    evalPollerRef.current?.stop();
    evalPollerRef.current = null;
  };

  useEffect(() => {
    return () => {
      activeStreamCtrl.current?.abort();
      stopPolling();
    };
  }, []);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const fetchRecentProfiles = async () => {
    const res = await fetch('/api/v1/resume/profile/recent?limit=20');
    if (!res.ok) throw new Error('鏌ヨ鍘嗗彶绠€鍘嗗け璐?);
    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '鏌ヨ鍘嗗彶绠€鍘嗗け璐?);
    return Array.isArray(json.data) ? (json.data as ResumeHistoryItem[]) : [];
  };

  const fetchActiveEvaluation = async () => {
    const res = await fetch('/api/v1/resume/evaluation/active');
    if (!res.ok) throw new Error('鏌ヨ褰撳墠绠€鍘嗚瘎浼板け璐?);
    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '鏌ヨ褰撳墠绠€鍘嗚瘎浼板け璐?);
    return (json.data || null) as ResumeEvaluationActive | null;
  };

  const applyEvaluationState = (evaluation: ResumeEvaluationActive | null) => {
    setActiveEvaluation(evaluation);
    setRawSummary(evaluation?.report || '');
    setResult(evaluation?.report ? parseAnalysisResult(evaluation.report) : null);
    setIsEvaluating(evaluation?.status === 'RUNNING');
  };

  const hydrateResumeContext = (profileList: ResumeHistoryItem[], evaluation: ResumeEvaluationActive | null) => {
    setProfiles(profileList);

    if (evaluation?.resumeId) {
      const matched = profileList.find((item) => item.resumeId === evaluation.resumeId);
      if (matched) {
        setFileContext(matched);
        return;
      }

      setFileContext({
        resumeId: evaluation.resumeId,
        knowledgeSpaceId: evaluation.knowledgeSpaceId || 0,
        knowledgeTag: 'resume_profile',
        fileName: `绠€鍘?${evaluation.resumeId}`,
        chunkCount: 0,
        createTime: '',
        updateTime: '',
      });
      return;
    }

    setFileContext(profileList[0] || null);
  };

  useEffect(() => {
    let cancelled = false;

    const restorePage = async () => {
      setIsRestoring(true);
      try {
        const [profileList, evaluation] = await Promise.all([
          fetchRecentProfiles().catch((err) => {
            console.error(err);
            return [] as ResumeHistoryItem[];
          }),
          fetchActiveEvaluation().catch((err) => {
            console.error(err);
            return null;
          }),
        ]);

        if (cancelled) return;
        hydrateResumeContext(profileList, evaluation);
        applyEvaluationState(evaluation);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    void restorePage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeEvaluation?.status !== 'RUNNING') {
      stopPolling();
      return;
    }

    const poller = createPollingController(async () => {
      try {
        const next = await fetchActiveEvaluation();
        applyEvaluationState(next);
      } catch (err) {
        console.error('poll resume evaluation failed', err);
      }
    }, ACTIVE_EVAL_POLL_INTERVAL);

    evalPollerRef.current = poller;
    poller.start();
    return () => poller.stop();
  }, [activeEvaluation?.status]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/resume/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.code === '0000') {
        const nextContext = data.data as ResumeHistoryItem;
        setFileContext(nextContext);
        setProfiles((current) => [nextContext, ...current.filter((item) => item.resumeId !== nextContext.resumeId)]);
      } else {
        alert(`涓婁紶澶辫触: ${data.info || '鏈煡閿欒'}`);
      }
    } catch (err) {
      console.error(err);
      alert('涓婁紶鍙戠敓缃戠粶閿欒');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openHistoryModal = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const profileList = await fetchRecentProfiles();
      setProfiles(profileList);
    } catch (err) {
      setHistoryError((err as Error).message || '鏌ヨ鍘嗗彶绠€鍘嗗け璐?);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectHistoryResume = (item: ResumeHistoryItem) => {
    setFileContext(item);
    setHistoryOpen(false);
  };

  const startEval = async () => {
    if (!fileContext) return;

    setIsEvaluating(true);
    setEvents([]);
    setResult(null);
    setRawSummary('');
    stopPolling();

    const reqBody = {
      resumeId: fileContext.resumeId,
      knowledgeSpaceId: fileContext.knowledgeSpaceId,
      question: '璇蜂粠宀椾綅鍖归厤搴︺€佹妧鏈繁搴︺€侀」鐩湡瀹炴€с€佷紭鍔裤€侀闄╃偣鍜屼慨鏀瑰缓璁叚涓淮搴﹁瘎浼拌繖浠界畝鍘嗐€?,
      sessionId: makeSessionId('resume-eval', fileContext.resumeId),
      maxStep: 5,
    };

    const ctrl = new AbortController();
    activeStreamCtrl.current = ctrl;

    try {
      const response = await fetch('/api/v1/resume/evaluate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: ctrl.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentRawSummary = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim().startsWith('data:')) continue;
          const dataStr = line.slice(line.indexOf('data:') + 5).trim();
          if (!dataStr) continue;

          try {
            const eventData = JSON.parse(dataStr);
            setEvents((prev) => [...prev, eventData]);

            if (eventData.type === 'summary') {
              currentRawSummary = eventData.content || '';
              setRawSummary(currentRawSummary);
            }

            if (eventData.type === 'complete' || eventData.type === 'error') {
              const active = await fetchActiveEvaluation().catch(() => null);
              applyEvaluationState(active);
            }
          } catch (err) {
            console.error('JSON Parse error', err);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('SSE fetch error:', err);
      }
    } finally {
      activeStreamCtrl.current = null;
      setIsEvaluating(false);
    }
  };

  const canJumpToInterview = Boolean(result || rawSummary) && Boolean(fileContext);
  const statusText = useMemo(() => {
    if (isRestoring) return '鎭㈠涓?..';
    if (isEvaluating || activeEvaluation?.status === 'RUNNING') return '璇勪及杩涜涓?;
    if (activeEvaluation?.status) return activeEvaluation.status;
    return '寰呮墽琛?;
  }, [activeEvaluation?.status, isEvaluating, isRestoring]);

  return (
    <div className="flex gap-6 h-full items-stretch overflow-hidden">
      <div style={{ width: 300 }} className="flex-col gap-4 h-full overflow-y-auto pr-1 shrink-0">
        <div className="card flex-col gap-4">
          <h3 className="font-bold text-lg">绠€鍘嗚В鏋愰厤缃?/h3>

          <input type="file" accept=".pdf,.doc,.docx" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-secondary btn-sm" type="button" onClick={triggerUpload} disabled={isUploading || isEvaluating}>
              <Upload size={14} />
              {fileContext ? '閲嶆柊涓婁紶' : '涓婁紶绠€鍘?}
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => void openHistoryModal()} disabled={isEvaluating}>
              <History size={14} />
              鍘嗗彶绠€鍘?            </button>
          </div>

          {!fileContext ? (
            <div
              className="flex-col items-center justify-center p-6 gap-3 cursor-pointer"
              style={{ border: '1px dashed var(--primary)', borderRadius: '8px', background: 'var(--primary-bg)', opacity: isUploading ? 0.5 : 1 }}
              onClick={triggerUpload}
            >
              <Upload className="text-primary" size={24} />
              <div className="text-sm font-semibold text-primary">{isUploading ? '姝ｅ湪涓婁紶骞跺垏鐗?..' : '鐐瑰嚮涓婁紶绠€鍘嗭紙PDF / DOC / DOCX锛?}</div>
              <div className="text-xs text-muted">涔熷彲浠ヤ粠鍘嗗彶绠€鍘嗕腑鐩存帴閫夋嫨</div>
            </div>
          ) : (
            <div className="card" style={{ background: '#f5f7fa', borderColor: 'var(--primary)' }}>
              <div className="flex items-center gap-3">
                <File className="text-primary" size={24} />
                <div className="flex-col">
                  <div className="font-bold text-sm max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{fileContext.fileName}</div>
                  <div className="text-xs text-muted mt-1">Resume ID: {fileContext.resumeId} 路 Chunks: {fileContext.chunkCount || '-'}</div>
                  <div className="text-xs text-muted truncate max-w-[200px]">Space: {fileContext.knowledgeTag || fileContext.knowledgeSpaceId}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-col gap-2 mt-2">
            <label className="text-sm font-semibold">鐩爣宀椾綅</label>
            <select className="input">
              <option>Java 鍚庣寮€鍙戝伐绋嬪笀</option>
              <option>AI Agent 鐮斿彂宸ョ▼甯?/option>
              <option>鏋舵瀯甯?/option>
            </select>
          </div>

          <button className="btn btn-primary mt-4" style={{ width: '100%', height: 40 }} disabled={!fileContext || isEvaluating} onClick={() => void startEval()}>
            <PlayCircle size={18} />
            {isEvaluating ? '璇勪及鎵ц涓?..' : '寮€濮嬬粨鏋勫寲璇勪及'}
          </button>

          {canJumpToInterview && fileContext && (
            <button
              className="btn btn-outline"
              style={{ width: '100%', height: 40, borderColor: 'var(--warning)', color: 'var(--warning)' }}
              onClick={() => navigate('/interview', { state: { resumeId: fileContext.resumeId, ksId: fileContext.knowledgeSpaceId } })}
            >
              <Mic size={18} /> 杩涘叆妯℃嫙闈㈣瘯鐜妭
            </button>
          )}

          <div className="text-sm text-muted border-t pt-3">
            <div>褰撳墠鐘舵€侊細{statusText}</div>
            <div>褰撳墠浠诲姟锛歿activeEvaluation?.taskId || '-'}</div>
            <div>鍘嗗彶绠€鍘嗘暟锛歿profiles.length}</div>
          </div>
        </div>
      </div>

      <div className="flex-col gap-4 min-w-0 overflow-hidden" style={{ flex: 1 }}>
        <div className="card flex-col h-full overflow-hidden" style={{ minHeight: 0 }}>
          <h2 className="font-bold text-xl mb-4 border-b pb-2 shrink-0">绠€鍘嗗缁磋瘎浼版姤鍛?/h2>

          {!result && !rawSummary ? (
            <div className="flex-col items-center justify-center text-muted min-h-0" style={{ flex: 1 }}>
              <FileText className="mb-2 opacity-50" size={48} />
              <div>{isRestoring ? '姝ｅ湪鎭㈠鏈€杩戣瘎浼扮粨鏋?..' : '绛夊緟璇勪及缁撴灉...'}</div>
            </div>
          ) : (
            <div className="flex-col gap-6 fade-in overflow-y-auto pr-1 min-h-0" style={{ flex: 1 }}>
              {result && (
                <div className="flex gap-4 items-center mb-2">
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: '4px solid var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: 'var(--success)',
                    }}
                  >
                    {result.score}
                  </div>
                  <div className="flex-col gap-1">
                    <div className="font-bold text-lg">{result.match}</div>
                    <div className="text-sm text-secondary">缁撴灉浠ュ悗绔渶杩戜竴娆¤瘎浼版姤鍛婁负鍑嗭紝鍒囬〉鎴栧埛鏂板悗浼氳嚜鍔ㄦ仮澶嶃€?/div>
                  </div>
                </div>
              )}

              {rawSummary && (
                <div className="p-5 bg-white border border-gray-200 shadow-sm rounded text-sm text-secondary leading-relaxed markdown-body">
                  <div className="font-bold text-primary mb-4 pb-2 border-b flex items-center gap-2">
                    <FileText size={18} />
                    鍚庣璇勪及鎶ュ憡
                  </div>
                  <ReactMarkdown>{rawSummary}</ReactMarkdown>
                </div>
              )}

              {result && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="card bg-gray-50 flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-success"><CheckCircle size={16} /> 鏍稿績浼樺娍</div>
                    <ul className="text-sm flex-col gap-1 list-disc pl-4 text-secondary">
                      {(result.pros.length ? result.pros : ['璇风粨鍚堜笂鏂规姤鍛婃煡鐪嬩紭鍔块」']).map((txt, i) => <li key={i}>{txt}</li>)}
                    </ul>
                  </div>
                  <div className="card bg-gray-50 flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-danger"><AlertTriangle size={16} /> 椋庨櫓鐐?/div>
                    <ul className="text-sm flex-col gap-1 list-disc pl-4 text-secondary">
                      {(result.cons.length ? result.cons : ['璇风粨鍚堜笂鏂规姤鍛婃煡鐪嬮闄╅」']).map((txt, i) => <li key={i}>{txt}</li>)}
                    </ul>
                  </div>
                  <div className="card bg-gray-50 flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-primary"><Lightbulb size={16} /> 淇敼寤鸿</div>
                    <ul className="text-sm flex-col gap-1 list-disc pl-4 text-secondary">
                      {(result.suggestions.length ? result.suggestions : ['璇风粨鍚堜笂鏂规姤鍛婃煡鐪嬪缓璁?]).map((txt, i) => <li key={i}>{txt}</li>)}
                    </ul>
                  </div>
                  <div className="card bg-gray-50 flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-warning"><Search size={16} /> 闈㈣瘯娣辨寲鐐?/div>
                    <ul className="text-sm flex-col gap-2 text-secondary">
                      {(result.deepDive.length ? result.deepDive : ['璇风粨鍚堜笂鏂规姤鍛婃煡鐪嬫繁鎸栫偣']).map((txt, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border">
                          <ChevronRight size={14} className="mt-1 flex-shrink-0 text-warning" /> <span>{txt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ width: 350 }} className="h-full shrink-0">
        <div className="card h-full overflow-y-auto">
          <AgentTimeline events={events} isStreaming={isEvaluating} />
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div
            className="bg-white rounded border shadow-xl flex flex-col overflow-hidden"
            style={{ width: 'min(760px, calc(100vw - 48px))', maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 font-bold">
                <History size={18} />
                鍘嗗彶绠€鍘?              </div>
              <button className="btn btn-sm" type="button" onClick={() => setHistoryOpen(false)}>
                <X size={14} />
                鍏抽棴
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-col gap-3" style={{ flex: 1 }}>
              {historyLoading && <div className="text-sm text-muted text-center py-10">鍔犺浇涓?..</div>}

              {!historyLoading && historyError && (
                <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">{historyError}</div>
              )}

              {!historyLoading && !historyError && profiles.length === 0 && (
                <div className="text-sm text-muted text-center py-10">鏆傛棤鍘嗗彶绠€鍘?/div>
              )}

              {!historyLoading && !historyError && profiles.length > 0 && (
                <div className="flex-col gap-3">
                  {profiles.map((item) => (
                    <button
                      key={item.resumeId}
                      type="button"
                      className="w-full text-left border rounded p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => handleSelectHistoryResume(item)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-main break-words">{item.fileName || `绠€鍘?${item.resumeId}`}</div>
                        <div className="text-xs text-muted shrink-0">Resume ID {item.resumeId}</div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
                        <span>鐭ヨ瘑绌洪棿 {item.knowledgeSpaceId}</span>
                        <span>鍒嗙墖 {item.chunkCount ?? '-'}</span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          {item.updateTime || item.createTime || '-'}
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
    </div>
  );
};

export default ResumeAgent;

