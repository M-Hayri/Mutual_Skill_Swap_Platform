import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SkillWizardPage from './pages/SkillWizardPage';
import MatchPage from './pages/MatchPage';
import SessionPage from './pages/SessionPage';
import ProfilePage from './pages/ProfilePage';
import ReviewPage from './pages/ReviewPage';
import ExplorePage from './pages/ExplorePage';
import Layout from './components/ui/Layout';
import ToastContainer from './components/ui/ToastContainer';
import SessionsPage from './pages/SessionsPage';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={
          <GuestRoute><LoginPage /></GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute><RegisterPage /></GuestRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
        } />
        <Route path="/skills/wizard" element={
          <ProtectedRoute><Layout><SkillWizardPage /></Layout></ProtectedRoute>
        } />
        <Route path="/match/:skillId" element={
          <ProtectedRoute><MatchPage /></ProtectedRoute>
        } />
        <Route path="/sessions/:id" element={
          <ProtectedRoute><SessionPage /></ProtectedRoute>
        } />
        <Route path="/sessions" element={
          <ProtectedRoute><Layout><SessionsPage /></Layout></ProtectedRoute>
        } />
        <Route path="/explore" element={
          <ProtectedRoute><Layout><ExplorePage /></Layout></ProtectedRoute>
        } />
        <Route path="/sessions/:sessionId/review" element={
          <ProtectedRoute><ReviewPage /></ProtectedRoute>
        } />
        <Route path="/profile/:username" element={
          <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
