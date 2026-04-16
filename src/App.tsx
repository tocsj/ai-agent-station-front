import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import ContentAutomation from './pages/ContentAutomation';
import Dashboard from './pages/Dashboard';
import KnowledgeAssistant from './pages/KnowledgeAssistant';
import MockInterview from './pages/MockInterview';
import Monitor from './pages/Monitor';
import ResumeAgent from './pages/ResumeAgent';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume" element={<ResumeAgent />} />
          <Route path="/interview" element={<MockInterview />} />
          <Route path="/knowledge" element={<KnowledgeAssistant />} />
          <Route path="/content" element={<ContentAutomation />} />
          <Route path="/monitor" element={<Monitor />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
