import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestrictionsProvider, useRestrictions } from './context/RestrictionsContext';
import { ToastProvider } from './context/ToastContext';
import { getAdultToken, getAdultUser, isAdultUser } from './utils/authStorage';
import Navbar from './components/Navbar';
import AdultNavbar from './components/AdultNavbar';
import BlockedAccess from './components/BlockedAccess';
import LoadingScreen from './components/LoadingScreen';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Curriculum from './pages/Curriculum';
import Lesson from './pages/Lesson';
import Playground from './pages/Playground';
import AICoach from './pages/AICoach';
import Journey from './pages/Journey';
import Profile from './pages/Profile';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Quiz from './pages/Quiz';
import CodeHistory from './pages/CodeHistory';
import Social from './pages/Social';
import ProgressDebug from './pages/ProgressDebug';
import AdultAuth from './pages/AdultAuth';
import AdultDashboard from './pages/AdultDashboard';
import AdultCourseView from './pages/AdultCourseView';
import AdultModule from './pages/AdultModule';
import AdultLesson from './pages/AdultLesson';
import AdultPlayground from './pages/AdultPlayground';
import AdultCoach from './pages/AdultCoach';
import AdultProgress from './pages/AdultProgress';
import AdultCertificate from './pages/AdultCertificate';
import AdultProfile from './pages/AdultProfile';
import AdultFriends from './pages/AdultFriends';
import CertificateVerify from './pages/CertificateVerify';
import { trackEvent } from './services/analytics';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return currentUser ? children : <Navigate to="/auth" />;
};

// Teacher Dashboard - only authenticated teacher accounts may enter.
const TeacherRoute = ({ children }) => {
  const { currentUser, accountType, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return currentUser && accountType === 'teacher'
    ? children
    : <Navigate to="/auth" replace />;
};

// Adult Protected Route — reads ONLY from adult_token/adult_user
// Kids tokens are never accepted here.
const AdultProtectedRoute = ({ children }) => {
  const token = getAdultToken();
  const user  = getAdultUser();

  // Must have a token AND the user must be an adult_learner account
  if (!token || !user || !isAdultUser(user)) {
    return <Navigate to="/adult/auth" replace />;
  }

  return children;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, accountType, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (currentUser) {
    // Redirect based on account type
    if (accountType === 'parent') {
      return <Navigate to="/parent-dashboard" />;
    } else if (accountType === 'teacher') {
      return <Navigate to="/teacher-dashboard" />;
    }
    return <Navigate to="/" />;
  }

  return children;
};

// Parent Route Component (redirect to parent dashboard)
const ParentRoute = ({ children }) => {
  const { currentUser, accountType, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/auth" />;
  }

  // Redirect parents to parent dashboard
  if (accountType === 'parent') {
    return <Navigate to="/parent-dashboard" />;
  }

  return children;
};

function AppContent() {
  const { currentUser, accountType } = useAuth();
  const { isBlocked, blockReason, loading: restrictionsLoading } = useRestrictions();

  // Show blocked screen for children with active restrictions
  if (currentUser && accountType === 'child' && !restrictionsLoading && isBlocked) {
    return <BlockedAccess reason={blockReason} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes currentUser={currentUser} />
    </Router>
  );
}

function AppRoutes({ currentUser }) {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', { path: location.pathname });
  }, [location.pathname]);

  const isAdultPage = location.pathname.startsWith('/adult');
  const adultUser = getAdultUser();
  const showAdultNavbar = isAdultPage && adultUser && location.pathname !== '/adult/auth';

  return (
    <div className={`min-h-screen ${isAdultPage || location.pathname.startsWith('/verify') ? 'bg-slate-50' : ''}`}>
      {currentUser && !isAdultPage && !location.pathname.startsWith('/verify') && <Navbar />}
      {showAdultNavbar && <AdultNavbar />}

      <Routes>
          {/* Public Routes */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          {/* Guest playground: play first, register later. Progress is saved
              locally; server saves simply fail silently for anonymous users. */}
          <Route path="/try" element={<Playground />} />

          {/* Protected Routes - Child Only */}
          <Route
            path="/"
            element={
              <ParentRoute>
                <Dashboard />
              </ParentRoute>
            }
          />

          <Route
            path="/curriculum"
            element={
              <ParentRoute>
                <Curriculum />
              </ParentRoute>
            }
          />

          <Route
            path="/lesson/:moduleId/:lessonId"
            element={
              <ParentRoute>
                <Lesson />
              </ParentRoute>
            }
          />

          <Route
            path="/coach"
            element={
              <ParentRoute>
                <AICoach />
              </ParentRoute>
            }
          />

          <Route
            path="/journey"
            element={
              <ParentRoute>
                <Journey />
              </ParentRoute>
            }
          />

          <Route path="/playground" element={
            <ParentRoute>
              <Playground />
            </ParentRoute>
          } />

          <Route
            path="/profile"
            element={
              <ParentRoute>
                <Profile />
              </ParentRoute>
            }
          />

          <Route
            path="/quiz/:moduleId"
            element={
              <ParentRoute>
                <Quiz />
              </ParentRoute>
            }
          />

          <Route
            path="/code-history"
            element={
              <ParentRoute>
                <CodeHistory />
              </ParentRoute>
            }
          />

          <Route
            path="/social"
            element={
              <ParentRoute>
                <Social />
              </ParentRoute>
            }
          />

          {/* Debug Route - For troubleshooting */}
          <Route
            path="/debug"
            element={
              <ProtectedRoute>
                <ProgressDebug />
              </ProtectedRoute>
            }
          />

          {/* Parent Dashboard - Accessible by parents only */}
          <Route
            path="/parent-dashboard"
            element={
              <ProtectedRoute>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Teacher Dashboard - Accessible by teachers only */}
          <Route
            path="/teacher-dashboard"
            element={
              <TeacherRoute>
                <TeacherDashboard />
              </TeacherRoute>
            }
          />

          {/* Adult Learner Routes */}
          <Route path="/adult/auth" element={<AdultAuth />} />
          <Route
            path="/adult/dashboard"
            element={
              <AdultProtectedRoute>
                <AdultDashboard />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/course/:courseNum/view"
            element={
              <AdultProtectedRoute>
                <AdultCourseView />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/module/:moduleId"
            element={
              <AdultProtectedRoute>
                <AdultModule />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/lesson/:lessonId"
            element={
              <AdultProtectedRoute>
                <AdultLesson />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/coach"
            element={
              <AdultProtectedRoute>
                <AdultCoach />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/playground"
            element={
              <AdultProtectedRoute>
                <AdultPlayground />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/progress"
            element={
              <AdultProtectedRoute>
                <AdultProgress />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/certificate"
            element={
              <AdultProtectedRoute>
                <AdultCertificate />
              </AdultProtectedRoute>
            }
          />

          <Route
            path="/adult/profile"
            element={
              <AdultProtectedRoute>
                <AdultProfile />
              </AdultProtectedRoute>
            }
          />
          <Route
            path="/adult/friends"
            element={
              <AdultProtectedRoute>
                <AdultFriends />
              </AdultProtectedRoute>
            }
          />
          <Route path="/adult/social" element={<Navigate to="/adult/friends" replace />} />
          <Route path="/adult" element={<Navigate to={getAdultToken() ? '/adult/dashboard' : '/adult/auth'} replace />} />

          {/* Public: anyone can check a certificate */}
          <Route path="/verify" element={<CertificateVerify />} />
          <Route path="/verify/:code" element={<CertificateVerify />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    </div>
  );
}

function App() {
  useEffect(() => {
    trackEvent('session_started');
  }, []);

  return (
    <AuthProvider>
      <RestrictionsProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </RestrictionsProvider>
    </AuthProvider>
  );
}

export default App;
