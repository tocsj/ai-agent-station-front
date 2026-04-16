import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Cpu,
  Database,
  FileText,
  Folder,
  History,
  Layers,
  MessageSquare,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type TaskMode = 'ask' | 'summary' | 'followup' | 'quiz';

type WorkspaceListItem = {
  workspaceId: string;
  workspaceName: string;
  description?: string;
  status?: string;
  documentCount?: number;
  updateTime?: string;
};

type DocumentItem = {
  docId: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  parseStatus?: string;
  chunkCount?: number;
  vectorStatus?: string;
};

type WorkspaceDetail = WorkspaceListItem & {
  documents?: DocumentItem[];
};

type RetrievedChunkDetail = {
  workspaceId?: string;
  docId?: string;
  fileName?: string;
  chunkIndex?: string | number;
  preview?: string;
};

type TaskResult = {
  answer?: string;
  rewrittenQuery?: string;
  retrievalScope?: string;
  finalContext?: string;
  retrievedChunks?: unknown[];
  retrievedChunkDetails?: RetrievedChunkDetail[];
};

type DocumentTaskRecord = TaskResult & {
  taskId: number;
  workspaceId?: string;
  docId?: string;
  mode?: TaskMode;
  question?: string;
  status?: string;
  errorMessage?: string | null;
  createTime?: string;
};

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const sortWorkspaceList = (items: WorkspaceListItem[]) =>
  [...items].sort((a, b) => {
    const left = new Date(a.updateTime || 0).getTime();
    const right = new Date(b.updateTime || 0).getTime();
    return right - left;
  });

const KnowledgeAssistant = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workspaceList, setWorkspaceList] = useState<WorkspaceListItem[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [taskMode, setTaskMode] = useState<TaskMode>('ask');
  const [question, setQuestion] = useState('');
  const [summaryMode, setSummaryMode] = useState('结构化摘要');
  const [perspective, setPerspective] = useState('技术评审');
  const [quizCount, setQuizCount] = useState(3);
  const [quizType, setQuizType] = useState('混合');

  const [isLoading, setIsLoading] = useState(false);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);

  const retrievedChunks = safeArray<string | Record<string, unknown>>(taskResult?.retrievedChunks);
  const retrievedChunkDetails = safeArray<RetrievedChunkDetail>(taskResult?.retrievedChunkDetails);

  const resetTaskState = () => {
    setIsLoading(false);
    setTaskResult(null);
    setQuestion('');
    setSummaryMode('结构化摘要');
    setPerspective('技术评审');
    setQuizCount(3);
    setQuizType('混合');
  };

  const clearWorkspaceState = () => {
    setWorkspace(null);
    setDocs([]);
    setSelectedDocId(null);
    resetTaskState();
  };

  const applyWorkspaceDetail = (detail: WorkspaceDetail) => {
    const nextDocs = safeArray<DocumentItem>(detail.documents);
    setWorkspace(detail);
    setDocs(nextDocs);
  };

  const applyRecentTask = (task: DocumentTaskRecord | null) => {
    if (!task) {
      resetTaskState();
      return;
    }

    setTaskMode(task.mode || 'ask');
    setQuestion(task.question || '');
    setSelectedDocId(task.docId || null);
    setTaskResult({
      answer: task.answer,
      rewrittenQuery: task.rewrittenQuery,
      retrievalScope: task.retrievalScope,
      finalContext: task.finalContext,
      retrievedChunks: safeArray(task.retrievedChunks),
      retrievedChunkDetails: safeArray(task.retrievedChunkDetails),
    });
  };

  const fetchActiveWorkspace = async () => {
    const res = await fetch('/api/v1/document/workspace/active');
    if (!res.ok) throw new Error('查询当前知识空间失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询当前知识空间失败');

    return (json.data || null) as WorkspaceDetail | null;
  };

  const fetchRecentTasks = async (workspaceId?: string) => {
    const params = new URLSearchParams({ limit: '10' });
    if (workspaceId) params.set('workspaceId', workspaceId);

    const res = await fetch(`/api/v1/document/task/recent?${params.toString()}`);
    if (!res.ok) throw new Error('查询最近文档任务失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询最近文档任务失败');

    return safeArray<DocumentTaskRecord>(json.data);
  };

  const fetchWorkspaceListOnly = async () => {
    const res = await fetch('/api/v1/document/workspace/list');
    if (!res.ok) throw new Error('查询知识空间列表失败');

    const json = await res.json();
    if (json.code !== '0000') throw new Error(json.info || '查询知识空间列表失败');

    return sortWorkspaceList(safeArray<WorkspaceListItem>(json.data));
  };

  const fetchWorkspaceDetail = async (workspaceId: string) => {
    setIsWorkspaceLoading(true);
    try {
      const res = await fetch(`/api/v1/document/workspace/${workspaceId}`);
      if (!res.ok) return;

      const json = await res.json();
      if (json.code !== '0000') return;

      const detail = (json.data || {}) as WorkspaceDetail;
      const nextDocs = safeArray<DocumentItem>(detail.documents);

      setWorkspace(detail);
      setDocs(nextDocs);
      setSelectedDocId(null);
      resetTaskState();
    } catch (err) {
      console.error('workspace detail error', err);
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  const fetchWorkspaceList = async (preferredWorkspaceId?: string) => {
    setIsWorkspaceLoading(true);
    try {
      const res = await fetch('/api/v1/document/workspace/list');
      if (!res.ok) return;

      const json = await res.json();
      if (json.code !== '0000') return;

      const list = sortWorkspaceList(safeArray<WorkspaceListItem>(json.data));
      setWorkspaceList(list);

      if (list.length === 0) {
        setWorkspace(null);
        setDocs([]);
        setSelectedDocId(null);
        resetTaskState();
        return;
      }

      const targetWorkspaceId =
        preferredWorkspaceId && list.some((item) => item.workspaceId === preferredWorkspaceId)
          ? preferredWorkspaceId
          : workspace?.workspaceId && list.some((item) => item.workspaceId === workspace.workspaceId)
            ? workspace.workspaceId
            : list[0].workspaceId;

      await fetchWorkspaceDetail(targetWorkspaceId);
    } catch (err) {
      console.error('workspace list error', err);
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  const fetchWorkspaceHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch('/api/v1/document/workspace/list');
      if (!res.ok) throw new Error('查询历史空间失败');

      const json = await res.json();
      if (json.code !== '0000') throw new Error(json.info || '查询历史空间失败');

      setWorkspaceList(sortWorkspaceList(safeArray<WorkspaceListItem>(json.data)));
    } catch (err) {
      console.error('workspace history error', err);
      setHistoryError((err as Error).message || '查询历史空间失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const restoreWorkspacePage = async () => {
      setIsWorkspaceLoading(true);
      try {
        const [list, activeWorkspace] = await Promise.all([
          fetchWorkspaceListOnly(),
          fetchActiveWorkspace().catch((err) => {
            console.error('active workspace restore failed', err);
            return null;
          }),
        ]);

        setWorkspaceList(list);

        if (!activeWorkspace) {
          if (list.length === 0) {
            clearWorkspaceState();
            return;
          }

          await fetchWorkspaceDetail(list[0].workspaceId);
          return;
        }

        applyWorkspaceDetail(activeWorkspace);
        const recentTasks = await fetchRecentTasks(activeWorkspace.workspaceId).catch((err) => {
          console.error('recent document task restore failed', err);
          return [] as DocumentTaskRecord[];
        });
        applyRecentTask(recentTasks[0] || null);
      } catch (err) {
        console.error('restore knowledge assistant failed', err);
        await fetchWorkspaceList().catch((fallbackErr) => console.error('fallback workspace list failed', fallbackErr));
      } finally {
        setIsWorkspaceLoading(false);
      }
    };

    void restoreWorkspacePage();
  }, []);

  const handleCreateWorkspace = async () => {
    try {
      const res = await fetch('/api/v1/document/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: '知识空间',
          description: '用于文档检索、摘要、追问和问答',
        }),
      });

      const json = await res.json();
      if (json.code === '0000' && json.data?.workspaceId) {
        await fetchWorkspaceList(json.data.workspaceId);
      }
    } catch (err) {
      console.error('create workspace error', err);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    await fetchWorkspaceHistory();
  };

  const handleSelectHistoryWorkspace = async (workspaceId: string) => {
    setHistoryOpen(false);
    clearWorkspaceState();
    await fetchWorkspaceDetail(workspaceId);
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspace?.workspaceId === workspaceId) return;
    resetTaskState();
    await fetchWorkspaceDetail(workspaceId);
  };

  const handleSelectDoc = (docId: string | null) => {
    setSelectedDocId(docId);
    resetTaskState();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !workspace?.workspaceId) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('workspaceId', workspace.workspaceId);
      formData.append('file', file);

      const res = await fetch('/api/v1/document/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.code === '0000') {
        resetTaskState();
        await fetchWorkspaceList(workspace.workspaceId);
      } else {
        alert('上传失败');
      }
    } catch (err) {
      console.error('upload error', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTask = async () => {
    if (!workspace?.workspaceId) return;
    if (taskMode === 'ask' && !question.trim()) return;

    setIsLoading(true);
    setTaskResult(null);

    const body: Record<string, unknown> = {
      workspaceId: workspace.workspaceId,
      docId: selectedDocId,
    };

    if (taskMode === 'ask') body.question = question;
    if (taskMode === 'summary') body.summaryMode = summaryMode;
    if (taskMode === 'followup') body.perspective = perspective;
    if (taskMode === 'quiz') {
      body.questionCount = quizCount;
      body.quizType = quizType;
    }

    try {
      const res = await fetch(`/api/v1/document/${taskMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.code === '0000') {
        setTaskResult({
          ...json.data,
          retrievedChunks: safeArray(json.data?.retrievedChunks),
          retrievedChunkDetails: safeArray(json.data?.retrievedChunkDetails),
        });
      } else {
        alert(`请求失败: ${json.info}`);
      }
    } catch (err) {
      console.error('task error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-col h-full items-stretch w-full overflow-hidden bg-gray-50">
      <div className="flex justify-between items-center p-4 bg-white border-b shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="text-primary" size={24} />
          <div>
            <h1 className="text-base font-bold m-0 leading-none">文档知识助手</h1>
            <div className="text-xs text-muted mt-1 leading-none">
              围绕当前知识空间完成问答、摘要、追问和检索结果查看。
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-center text-sm">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-secondary" />
            检索范围
            <span className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">
              {selectedDocId ? '单文档' : '全部文档'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-success bg-green-50 px-2 py-0.5 rounded border border-green-200">
            <Activity size={14} />
            {isLoading ? '执行中' : isWorkspaceLoading ? '加载空间中' : '空闲'}
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-full p-4 items-stretch overflow-hidden">
        <div style={{ width: 320 }} className="flex-col gap-4 shrink-0 overflow-y-auto pb-4">
          <div className="card flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold flex items-center gap-2 text-sm">
                <Folder size={16} className="text-primary" />
                空间管理
              </div>
              <span className="text-xs text-muted">{workspaceList.length} 个历史空间</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => void handleOpenHistory()}>
                <History size={14} />
                历史记录
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleCreateWorkspace()}>
                新建空间
              </button>
            </div>
          </div>

          <div className="hidden">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="font-bold flex items-center gap-2 text-sm">
                <Folder size={16} className="text-primary" />
                历史空间
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleCreateWorkspace}>
                新建空间
              </button>
            </div>

            {workspaceList.length === 0 ? (
              <div className="flex-col items-center py-6 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-full">
                  <Folder size={28} className="text-muted" />
                </div>
                <div className="text-sm font-bold">暂无历史空间</div>
              </div>
            ) : (
              <div className="flex-col gap-2">
                {workspaceList.map((item) => {
                  const active = workspace?.workspaceId === item.workspaceId;
                  return (
                    <button
                      key={item.workspaceId}
                      type="button"
                      onClick={() => void handleSwitchWorkspace(item.workspaceId)}
                      className={`p-3 rounded border text-left transition-colors ${
                        active ? 'border-primary bg-primary-bg' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold break-all">{item.workspaceName}</div>
                        <span className="text-[10px] text-muted shrink-0">{item.documentCount || 0} 篇</span>
                      </div>
                      <div className="text-xs text-muted mt-1 line-clamp-2">{item.description || '暂无描述'}</div>
                      <div className="text-[10px] text-muted mt-2">{item.updateTime || ''}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {workspace && (
            <div className="card flex-col gap-3 p-4 bg-white">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="font-bold flex items-center gap-2 text-sm">
                  <Folder size={16} className="text-primary" />
                  {workspace.workspaceName}
                </div>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>
                  {workspace.status === 'READY' || workspace.status === '1' ? '就绪' : '处理中'}
                </span>
              </div>

              <div className="text-xs text-muted leading-relaxed">{workspace.description}</div>

              <div className="text-xs text-secondary flex items-center justify-between mt-1">
                <span>
                  文档数: <strong className="text-primary">{workspace.documentCount || 0}</strong>
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-primary cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-xs transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  上传
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleUpload}
              />

              {isUploading && (
                <div className="text-xs text-center p-2 bg-blue-50 text-primary border border-blue-100 rounded flex items-center justify-center gap-2">
                  <Activity size={12} className="animate-pulse" />
                  上传并索引中...
                </div>
              )}

              <div className="flex-col gap-2">
                {docs.length === 0 && !isUploading && (
                  <div className="text-xs text-muted text-center py-6 bg-gray-50 rounded border border-dashed">
                    当前空间还没有文档。
                  </div>
                )}

                {docs.length > 0 && (
                  <div
                    className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                      !selectedDocId ? 'border-primary bg-primary-bg' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectDoc(null)}
                  >
                    <div className="text-sm font-semibold flex items-center gap-2 text-main">
                      <Database size={14} className={!selectedDocId ? 'text-primary' : 'text-secondary'} />
                      全部文档
                    </div>
                    <div className="text-xs text-muted">{docs.length} 篇</div>
                  </div>
                )}

                {docs.map((doc) => (
                  <div
                    key={doc.docId}
                    className={`p-2 rounded border flex-col gap-1.5 cursor-pointer transition-colors ${
                      selectedDocId === doc.docId
                        ? 'border-primary bg-primary-bg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectDoc(doc.docId)}
                  >
                    <div className="text-xs font-semibold flex items-start gap-2 break-all leading-tight">
                      <FileText
                        size={14}
                        className={`flex-shrink-0 mt-0.5 ${
                          doc.parseStatus === 'COMPLETED' ? 'text-success' : 'text-warning'
                        }`}
                      />
                      {doc.fileName || doc.docId}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted pl-5">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">分片: {doc.chunkCount || 0}</span>
                      <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : '已索引'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-col gap-4 overflow-hidden" style={{ flex: 1 }}>
          <div className="card flex-col h-full overflow-hidden p-0">
            <div className="flex gap-6 border-b px-6 pt-4 bg-gray-50">
              {[
                { id: 'ask', label: '文档问答', icon: <MessageSquare size={14} /> },
                { id: 'summary', label: '提炼摘要', icon: <Layers size={14} /> },
                { id: 'followup', label: '生成追问', icon: <Sparkles size={14} /> },
                { id: 'quiz', label: '阅读测验', icon: <Target size={14} /> },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setTaskMode(item.id as TaskMode);
                    setTaskResult(null);
                  }}
                  className={`font-bold text-sm cursor-pointer pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                    taskMode === item.id ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-main'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>

            <div className="p-5 border-b bg-white shrink-0">
              {!workspace ? (
                <div className="text-center text-muted py-6">请先选择或创建知识空间。</div>
              ) : (
                <>
                  {taskMode === 'ask' && (
                    <div className="flex-col gap-3">
                      <div className="flex gap-3 items-start">
                        <textarea
                          className="input flex-1"
                          style={{ resize: 'none', height: 80, fontSize: 14 }}
                          placeholder="输入文档问题、对比分析、实现细节或待确认事项..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleTask();
                            }
                          }}
                        />
                        <button
                          className="btn btn-primary h-full shrink-0 px-6 py-4"
                          style={{ height: 80 }}
                          onClick={() => void handleTask()}
                          disabled={isLoading || !question.trim()}
                        >
                          开始
                        </button>
                      </div>
                    </div>
                  )}

                  {taskMode === 'summary' && (
                    <div className="flex items-center justify-between bg-gray-50 p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">摘要模板</span>
                        <select className="input text-sm w-48 bg-white" value={summaryMode} onChange={(e) => setSummaryMode(e.target.value)}>
                          <option>总览摘要</option>
                          <option>结构化摘要</option>
                          <option>风险与待办</option>
                        </select>
                      </div>
                      <button className="btn btn-primary px-6" onClick={() => void handleTask()} disabled={isLoading}>
                        生成
                      </button>
                    </div>
                  )}

                  {taskMode === 'followup' && (
                    <div className="flex items-center justify-between bg-gray-50 p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">分析视角</span>
                        <select className="input text-sm w-48 bg-white" value={perspective} onChange={(e) => setPerspective(e.target.value)}>
                          <option>技术评审</option>
                          <option>业务逻辑</option>
                          <option>项目规划</option>
                          <option>面试准备</option>
                        </select>
                      </div>
                      <button className="btn btn-primary px-6" onClick={() => void handleTask()} disabled={isLoading}>
                        生成
                      </button>
                    </div>
                  )}

                  {taskMode === 'quiz' && (
                    <div className="flex items-center justify-between bg-gray-50 p-4 border rounded text-sm">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">数量</span>
                          <select
                            className="input text-sm w-24 bg-white"
                            value={quizCount}
                            onChange={(e) => setQuizCount(parseInt(e.target.value, 10))}
                          >
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">题型</span>
                          <select className="input text-sm w-32 bg-white" value={quizType} onChange={(e) => setQuizType(e.target.value)}>
                            <option>混合</option>
                            <option>简答题</option>
                            <option>选择题</option>
                          </select>
                        </div>
                      </div>
                      <button className="btn btn-primary px-6" onClick={() => void handleTask()} disabled={isLoading}>
                        生成
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex-col p-6 overflow-y-auto bg-white" style={{ flex: 1 }}>
              {isLoading && (
                <div className="flex-col items-center justify-center h-full text-muted gap-4">
                  <div className="animate-pulse">
                    <Database size={40} className="text-primary mb-2 opacity-50 mx-auto" />
                  </div>
                  <div className="text-sm">正在检索上下文并生成结果...</div>
                </div>
              )}

              {!isLoading && !taskResult && workspace && (
                <div className="text-center text-muted text-sm mt-10">请选择上方任务并发起请求。</div>
              )}

              {taskResult && !isLoading && (
                <div className="flex-col gap-4 fade-in max-w-full">
                  <h4 className="font-bold flex items-center gap-2 pb-2 border-b text-primary">
                    <Sparkles size={16} />
                    结果
                  </h4>
                  <div className="markdown-body text-[15px] leading-relaxed">
                    <ReactMarkdown>{String(taskResult.answer || '')}</ReactMarkdown>
                  </div>

                  {taskMode === 'followup' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-center gap-2">
                      <ShieldAlert size={14} />
                      可将任意追问切回“文档问答”继续展开。
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ width: 320 }} className="flex-col gap-4 shrink-0 overflow-y-auto pb-4">
          <div className="card flex-col gap-4 h-full p-4">
            <h3 className="font-bold border-b pb-2 flex justify-between items-center text-sm">
              <span className="text-primary">RAG 流程</span>
              <Activity size={16} className="text-muted" />
            </h3>

            {!taskResult ? (
              <div className="text-xs text-muted text-center py-10 leading-relaxed bg-gray-50 rounded border border-dashed border-gray-200">
                发起任务后可查看查询改写、检索范围、命中片段和最终上下文拼装结果。
              </div>
            ) : (
              <div className="flex-col gap-4">
                <div className="flex-col gap-1.5">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-primary">
                    <Search size={14} />
                    1. 查询改写
                  </div>
                  <div className="text-[11px] bg-blue-50 p-2.5 rounded border border-blue-100 text-secondary font-mono leading-relaxed break-all">
                    {String(taskResult.rewrittenQuery || '未返回')}
                  </div>
                </div>

                <div className="flex-col gap-1.5">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-success">
                    <Target size={14} />
                    2. 检索范围
                  </div>
                  <div className="text-[11px] bg-green-50 p-2 rounded border border-green-100 text-secondary font-mono break-all">
                    {String(taskResult.retrievalScope || '全空间 RAG 检索链路')}
                  </div>
                </div>

                <div className="flex-col gap-1.5">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-warning">
                    <Database size={14} />
                    3. 命中片段
                  </div>
                  {retrievedChunkDetails.length > 0 ? (
                    <div className="flex-col gap-2">
                      {retrievedChunkDetails.slice(0, 5).map((chunk, index) => (
                        <div key={`${chunk.docId || 'chunk'}-${index}`} className="bg-orange-50 p-2 rounded border border-orange-100">
                          <div className="text-[10px] font-semibold text-warning">
                            {chunk.fileName || '未知文档'} · Chunk {chunk.chunkIndex ?? '-'}
                          </div>
                          <div className="text-[10px] text-muted mt-1 break-all">
                            DocId: {chunk.docId || '-'}
                          </div>
                          <div className="text-[11px] text-secondary mt-1 leading-relaxed">
                            {chunk.preview || '无预览'}
                          </div>
                        </div>
                      ))}
                      {retrievedChunkDetails.length > 5 && (
                        <div className="text-[10px] text-center text-muted p-1 bg-gray-50 border rounded">
                          其余 {retrievedChunkDetails.length - 5} 条已折叠
                        </div>
                      )}
                    </div>
                  ) : retrievedChunks.length > 0 ? (
                    <div className="flex-col gap-2">
                      {retrievedChunks.slice(0, 5).map((chunk, index) => (
                        <div
                          key={index}
                          className="text-[10px] bg-orange-50 p-2 rounded border border-orange-100 text-secondary line-clamp-4 relative group hover:line-clamp-none transition-all"
                        >
                          <span className="font-semibold text-warning">[{index + 1}]</span>{' '}
                          {typeof chunk === 'object' ? JSON.stringify(chunk) : String(chunk)}
                        </div>
                      ))}
                      {retrievedChunks.length > 5 && (
                        <div className="text-[10px] text-center text-muted p-1 bg-gray-50 border rounded">
                          其余 {retrievedChunks.length - 5} 条已折叠
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted bg-gray-50 p-2 border border-dashed rounded text-center">
                      当前阈值下没有匹配到相关片段。
                    </div>
                  )}
                </div>

                <div className="flex-col gap-1.5">
                  <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#6b21a8' }}>
                    <Cpu size={14} />
                    4. 最终上下文
                  </div>
                  <div className="text-[10px] bg-purple-50 p-2.5 rounded border border-purple-100 text-secondary line-clamp-6 whitespace-pre-wrap font-mono leading-relaxed hover:line-clamp-none transition-all">
                    {taskResult.finalContext ? String(taskResult.finalContext) : '未拼装上下文，直接生成回答'}
                  </div>
                </div>

                <div className="flex-col gap-1.5 mt-2 border-t pt-3">
                  <div className="text-[11px] font-bold flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1">
                      <Activity size={12} />
                      流程状态
                    </span>
                  </div>
                  <div className="text-[10px] flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>
                      任务: <b className="text-main uppercase">{taskMode}</b>
                    </span>
                    <span className="flex items-center gap-1 text-success">
                      <ShieldAlert size={12} />
                      成功
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div
            className="bg-white rounded-lg shadow-xl border flex-col overflow-hidden"
            style={{ width: 'min(720px, calc(100vw - 48px))', maxHeight: '78vh' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div>
                <h2 className="font-bold text-base">历史空间</h2>
                <div className="text-xs text-muted mt-1">选择一个历史知识空间，页面会加载该空间详情和文档列表。</div>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setHistoryOpen(false)}>
                <X size={14} />
                关闭
              </button>
            </div>

            <div className="p-5 overflow-y-auto min-h-0" style={{ flex: 1 }}>
              {historyLoading && (
                <div className="text-sm text-muted text-center py-10 flex items-center justify-center gap-2">
                  <Activity size={14} className="animate-pulse" />
                  加载历史空间中...
                </div>
              )}

              {!historyLoading && historyError && (
                <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">{historyError}</div>
              )}

              {!historyLoading && !historyError && workspaceList.length === 0 && (
                <div className="text-sm text-muted text-center py-10">暂无历史空间。</div>
              )}

              {!historyLoading && !historyError && workspaceList.length > 0 && (
                <div className="flex-col gap-3">
                  {workspaceList.map((item) => {
                    const active = workspace?.workspaceId === item.workspaceId;
                    const ready = item.status === 'READY' || item.status === '1';
                    return (
                      <button
                        key={item.workspaceId}
                        type="button"
                        className={`w-full text-left rounded border p-4 hover:border-primary transition-colors ${
                          active ? 'border-primary bg-primary-bg' : 'border-gray-200 bg-white'
                        }`}
                        onClick={() => void handleSelectHistoryWorkspace(item.workspaceId)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-sm break-all">{item.workspaceName || item.workspaceId}</div>
                            <div className="text-xs text-muted mt-1 line-clamp-2">{item.description || '暂无描述'}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`badge ${ready ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                              {ready ? '就绪' : item.status || '未知'}
                            </div>
                            {active && <div className="text-[10px] text-primary mt-1">当前空间</div>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-[11px] text-muted mt-3">
                          <div>
                            <span className="text-secondary">文档数: </span>
                            {item.documentCount ?? 0}
                          </div>
                          <div>
                            <span className="text-secondary">状态: </span>
                            {item.status || '-'}
                          </div>
                          <div className="text-right">
                            <span className="text-secondary">更新时间: </span>
                            {item.updateTime || '-'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeAssistant;
