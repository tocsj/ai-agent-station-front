import { useState } from 'react';
import { Shield, AlertTriangle, Cpu } from 'lucide-react';

const AgentDetails = () => {
  const [tab, setTab] = useState('chain');
  return (
    <div className="flex-col gap-6 h-full overflow-y-auto pr-1">
      <div className="card flex justify-between items-center bg-gray-50">
         <div className="flex-col">
           <h2 className="font-bold text-lg">执行详情 - Task ID: TSK-94812</h2>
           <span className="text-secondary text-sm">Resume Agent Evaluation / Model: GPT-4o / Time: 4.2s / Token: 2,130</span>
         </div>
         <span className="badge badge-green text-lg px-4 py-2">Status: SUCCESS</span>
      </div>

      <div className="card" style={{ padding: 0, minHeight: 500 }}>
        <div className="flex border-b">
           {['执行链路(Chain)', '知识检索明细', 'Plugin/MCP 调用', '审计与风控'].map((t, i) => {
             const key = ['chain', 'rag', 'tool', 'audit'][i];
             return (
               <div 
                 key={key} 
                 onClick={() => setTab(key)}
                 className={"px-6 py-4 cursor-pointer text-sm font-semibold " + (tab === key ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary')}
               >
                 {t}
               </div>
             )
           })}
        </div>
        
        <div className="p-6">
           {tab === 'chain' && (
             <div className="flex-col gap-4 font-mono text-sm">
               <div className="p-3 border rounded"><span className="text-primary font-bold">▶ Router:</span> 分发至 Resume Eval Workflow</div>
               <div className="p-3 border rounded"><span className="text-primary font-bold">▶ Planner:</span> 生成 6 个维度的并行评估任务计划</div>
               <div className="p-3 border rounded"><span className="text-success font-bold">▶ Executor:</span> [Task 1 - 岗位匹配度] 返回结果</div>
               <div className="p-3 border rounded"><span className="text-success font-bold">▶ Executor:</span> [Task 2 - 优势分析] 返回结果 ...</div>
             </div>
           )}
           {tab === 'rag' && (
             <div className="flex-col gap-4">
               <h4 className="font-bold border-b pb-2">召回 Chunk (Top 3)</h4>
               <div className="p-3 bg-gray-50 rounded text-xs">【简历切片 #4】主导交易服务微服务化重构，拆分出订单、支付独立服务。</div>
               <div className="p-3 bg-gray-50 rounded text-xs">【岗位知识库 #1】高级 Java 要求熟练掌握高并发及分布式锁。</div>
             </div>
           )}
           {tab === 'tool' && (
             <div className="flex-col gap-4">
               <div className="flex items-center gap-2 font-mono text-sm"><Cpu size={16}/> Tool: <span className="text-primary font-bold">PDF_Extractor</span> - Duration: 120ms</div>
               <pre className="p-4 bg-gray-900 text-green-400 rounded text-xs overflow-auto">
                 {JSON.stringify({ input: { fileUrl: "test_resume.pdf" }, output: { text: "...", pages: 2 }}, null, 2)}
               </pre>
             </div>
           )}
           {tab === 'audit' && (
             <div className="flex-col gap-4">
               <div className="flex items-center gap-2 border-l-4 border-success pl-2 text-sm">
                 <Shield size={16} className="text-success"/> 安全审计：未发现 SQL 注入或恶意 Prompt 注入尝试。
               </div>
               <div className="flex items-center gap-2 border-l-4 border-warning pl-2 text-sm">
                 <AlertTriangle size={16} className="text-warning"/> 风险标记：简历中提及的开源项目地址 404 (失效)，可能有伪造风险。
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetails;
