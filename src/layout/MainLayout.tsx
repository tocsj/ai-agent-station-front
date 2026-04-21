import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BookOpen, FileText, LayoutDashboard, Mic, PenTool, Settings } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: '工作台大盘', description: '全局摘要', icon: <LayoutDashboard size={18} /> },
    { path: '/resume', label: '简历评估 Agent', description: '结构化评估', icon: <FileText size={18} /> },
    { path: '/interview', label: '模拟面试 Agent', description: '多轮追问', icon: <Mic size={18} /> },
    { path: '/knowledge', label: '文档知识助手', description: '检索与问答', icon: <BookOpen size={18} /> },
    { path: '/content', label: '内容自动化 Agent', description: '生成与发布', icon: <PenTool size={18} /> },
    { path: '/monitor', label: '审计监控中心', description: '任务审计', icon: <Activity size={18} /> },
  ];

  const currentItem = menuItems.find((item) => item.path === location.pathname);
  const pageTitle = currentItem?.label || 'AI Agent Station';
  const pageSubtitle = currentItem?.description || '智能工作流控制台';

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      <aside
        style={{
          width: 256,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          background:
            'linear-gradient(180deg, rgba(247, 250, 255, 0.94) 0%, rgba(240, 245, 252, 0.92) 100%)',
          borderRight: '1px solid rgba(196, 212, 232, 0.72)',
          backdropFilter: 'blur(24px)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.55)',
        }}
      >
        <div
          className="card"
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(243,248,255,0.96) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1677ff 0%, #45a0ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                boxShadow: '0 14px 28px rgba(22, 119, 255, 0.24)',
              }}
            >
              AI
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base">Agent Station</div>
              <div className="text-xs text-muted">明亮工作台视图</div>
            </div>
          </div>
        </div>

        <nav className="flex-col gap-2" style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                marginBottom: 8,
                textDecoration: 'none',
                color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                background: isActive ? 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(238,245,255,0.96) 100%)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(22, 119, 255, 0.18)' : 'transparent'}`,
                boxShadow: isActive ? '0 14px 28px rgba(22, 119, 255, 0.12)' : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? 'rgba(22, 119, 255, 0.1)' : 'rgba(255, 255, 255, 0.74)',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      border: `1px solid ${isActive ? 'rgba(22, 119, 255, 0.12)' : 'rgba(196, 212, 232, 0.6)'}`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-muted">{item.description}</div>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="card" style={{ padding: 14 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Settings size={16} />
              <span className="font-semibold">设置中心</span>
            </div>
            <span className="badge badge-blue">v1.2</span>
          </div>
          <div className="text-xs text-muted mt-2">统一视觉样式、弹窗和状态反馈已启用。</div>
        </div>
      </aside>

      <main className="flex-col" style={{ flex: 1, height: '100vh', overflow: 'hidden' }}>
        <header
          className="flex justify-between items-center"
          style={{
            height: 76,
            padding: '0 28px',
            background: 'rgba(255, 255, 255, 0.76)',
            borderBottom: '1px solid rgba(196, 212, 232, 0.72)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div>
            <h1 className="font-bold text-xl">{pageTitle}</h1>
            <div className="text-sm text-muted mt-1">{pageSubtitle}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="badge badge-green">Platform API 正常运行</span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #14b8a6 0%, #1677ff 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 12px 24px rgba(20, 184, 166, 0.24)',
              }}
            >
              A
            </div>
          </div>
        </header>

        <div className="page-viewport">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
