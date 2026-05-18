import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

// Layouts & Guards — always needed, keep eager
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Landing page eager (first paint)
import LandingPage from './pages/LandingPage';

// Spinner shown while lazy chunks download
function PageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  );
}

// Lazy-load every page so each gets its own JS chunk.
// Leaflet (~250KB) is only pulled when the user visits /map or /hostel/:id
const SearchPage       = lazy(() => import('./pages/SearchPage'));
const HostelDetailsPage= lazy(() => import('./pages/HostelDetailsPage'));
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const SignupPage       = lazy(() => import('./pages/SignupPage'));
const OwnerDashboard   = lazy(() => import('./pages/OwnerDashboard'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));
const ShortlistPage    = lazy(() => import('./pages/ShortlistPage'));
const ComparePage      = lazy(() => import('./pages/ComparePage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const MapSearchPage    = lazy(() => import('./pages/MapSearchPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* Standalone auth pages */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Public pages with shared Navbar + Footer */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="search"       element={<SearchPage />} />
            <Route path="map"          element={<ProtectedRoute><StudentDashboard defaultTab="map" /></ProtectedRoute>} />
            <Route path="hostel/:id"   element={<HostelDetailsPage />} />
            <Route path="compare"      element={<ComparePage />} />
            <Route path="roommate"     element={<ProtectedRoute><StudentDashboard defaultTab="roommates" /></ProtectedRoute>} />

            {/* Protected: any logged-in user */}
            <Route path="shortlist" element={
              <ProtectedRoute><ShortlistPage /></ProtectedRoute>
            } />
            <Route path="student" element={
              <ProtectedRoute><StudentDashboard /></ProtectedRoute>
            } />
          </Route>

          {/* Protected dashboards */}
          <Route path="/owner/*" element={
            <ProtectedRoute roles={['owner', 'admin']}><OwnerDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
