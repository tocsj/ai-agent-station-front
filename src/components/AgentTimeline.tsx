import React, { useState } from 'react';
import { PlayCircle, Database, Search, Cpu, CheckCircle, Activity, FileWarning, TerminalSquare } from 'lucide-react';

interface TimelineEvent {
  type: string;
  subType: string;
  step: number;
  content: string;
}

interface Props {
  events: TimelineEvent[];
  isStreaming: boolean;
}

const AgentTimeline: React.FC<Props> = ({ events, isStreaming }) => {
  const getIcon = (type: string, subType: string) => {
    if (type === 'analysis') return <Search size={16} className="text-primary" />;
    if (type === 'execution') {
       if(subType.includes('retrieval')) return <Database size={16} className="text-warning" />;
       return <Cpu size={16} className="text-success" />;
    }
    if (type === 'supervision') return <Activity size={16} className="text-danger" />;
    if (type === 'summary' || type === 'complete') return <CheckCircle size={16} className="text-primary" />;
    if (type === 'error') return <FileWarning size={16} className="text-danger"/>;
    return <TerminalSquare size={16} className="text-muted" />;
  };

  const getLabel = (type: string, subType: string) => {
    const map: Record<string, string> = {
      'analysis_strategy': '制定解析策略',
      'execution_process': '执行核心业务逻辑',
      'execution_target': '结构化目标生成',
      'retrieval_chunk': '知识库切片检索',
      'supervision_score': '复核总评结果',
      'summary_assessment': '汇总最终报告'
    };
    return map[subType] || (type + '/' + subType);
  };

  const TimelineItem = ({ ev, isLast }: { ev: TimelineEvent, isLast: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    
    // Check if content looks long enough to hide
    const isLong = ev.content && ev.content.length > 60;
    
    return (
      <div className="flex gap-4 relative pb-6" style={{ minHeight: 60 }}>
        {/* Timeline Line */}
        {!isLast && (
          <div style={{ position: 'absolute', left: 15, top: 24, bottom: 0, width: 2, background: 'var(--border-color)' }}></div>
        )}
        
        <div style={{ 
          width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-panel)', 
          border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1 
        }}>
          {getIcon(ev.type, ev.subType)}
        </div>
        
        <div className="card" style={{ flex: 1, padding: '12px 16px', background: '#fafbfc', border: '1px dashed var(--border-color)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-primary">步骤 {ev.step}: {getLabel(ev.type, ev.subType)}</span>
            <span className="badge" style={{ fontSize: 10 }}>{ev.type}</span>
          </div>
          
          <div 
            className="text-xs text-secondary" 
            style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              lineHeight: '1.6',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {ev.content}
          </div>
          
          {isLong && (
            <div 
              className="mt-2 text-xs font-semibold text-primary cursor-pointer inline-flex items-center" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起详情 ▲' : '查看全部 ▼'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Agent 运行链路</h3>
        {isStreaming && <span className="badge badge-blue flex items-center gap-1"><PlayCircle size={12}/> Running...</span>}
      </div>
      
      <div className="flex-col gap-0 relative">
        {events.length === 0 && <div className="text-sm text-muted text-center py-8">等待调度...</div>}
        
        {events.map((ev, idx) => (
          <TimelineItem key={idx} ev={ev} isLast={idx === events.length - 1} />
        ))}
      </div>
    </div>
  );
};

export default AgentTimeline;
