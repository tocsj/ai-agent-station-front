import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BookOpen, FileText, LayoutDashboard, Mic, PenTool, Settings } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: '工作台大盘', icon: <LayoutDashboard size={18} /> },
    { path: '/resume', label: '简历评估 Agent', icon: <FileText size={18} /> },
    { path: '/interview', label: '模拟面试 Agent', icon: <Mic size={18} /> },
    { path: '/knowledge', label: '文档知识助手', icon: <BookOpen size={18} /> },
    { path: '/content', label: '内容自动化 Agent', icon: <PenTool size={18} /> },
    { path: '/monitor', label: '审计监控中心', icon: <Activity size={18} /> },
  ];

  const getPageTitle = () => {
    const item = menuItems.find((menu) => menu.path === location.pathname);
    return item ? item.label : 'AI Agent Station';
  };

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      <aside
        style={{
          width: 240,
          background: '#1c1f2b',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center gap-3 p-4 font-bold text-lg" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: 'var(--primary)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'white' }}>AI</span>
          </div>
          Agent Station
        </div>

        <nav className="flex-col mt-4" style={{ flex: 1, padding: '0 12px' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex items-center gap-3 p-3 mb-2 ${isActive ? 'active-nav' : 'nav-item'}`}
              style={({ isActive }) => ({
                borderRadius: '8px',
                color: isActive ? '#fff' : '#8b949e',
                background: isActive ? 'var(--primary)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontSize: 14,
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3 text-sm" style={{ color: '#8b949e', cursor: 'pointer' }}>
            <Settings size={18} />
            设置中心
          </div>
        </div>
      </aside>

      <main className="flex-col" style={{ flex: 1, height: '100vh', overflow: 'hidden' }}>
        <header className="flex justify-between items-center px-6" style={{ height: 60, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
          <h1 className="font-semibold text-lg">{getPageTitle()}</h1>
          <div className="flex items-center gap-4">
            <span className="badge badge-green">v1.2 Platform API 正常运行</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#ff7d00',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
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
