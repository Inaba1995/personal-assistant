import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loader } from './components/Loader';
import { getAccessToken } from './api/client';
import { useMe } from './api/hooks';
import { AiAssistant } from './pages/AiAssistant';
import { Avito } from './pages/Avito';
import { Comments } from './pages/Comments';
import { Contractors } from './pages/Contractors';
import { Dashboard } from './pages/Dashboard';
import { Deadlines } from './pages/Deadlines';
import { Documents } from './pages/Documents';
import { Login } from './pages/Login';
import { Presentations } from './pages/Presentations';
import { Register } from './pages/Register';
import { SearchAnalyze } from './pages/SearchAnalyze';
import { Settings } from './pages/Settings';
import { Spreadsheets } from './pages/Spreadsheets';
import { Tasks } from './pages/Tasks';
import { VideoSummary } from './pages/VideoSummary';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hasToken = Boolean(getAccessToken());
  const me = useMe();

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (me.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="Загрузка профиля…" />
      </div>
    );
  }
  if (me.isError) {
    // Токен невалиден (refresh не помог) — возвращаем на вход.
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="deadlines" element={<Deadlines />} />
        <Route path="documents" element={<Documents />} />
        <Route path="spreadsheets" element={<Spreadsheets />} />
        <Route path="presentations" element={<Presentations />} />
        <Route path="ai" element={<AiAssistant />} />
        <Route path="search" element={<SearchAnalyze />} />
        <Route path="video" element={<VideoSummary />} />
        <Route path="avito" element={<Avito />} />
        <Route path="comments" element={<Comments />} />
        <Route path="contractors" element={<Contractors />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
