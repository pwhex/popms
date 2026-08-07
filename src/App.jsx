import React, { useState, useEffect } from 'react';
import { Activity, Users, Calendar, Database, HeartPulse, Key, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import PatientDirectory from './components/PatientDirectory.jsx';
import PatientDetails from './components/PatientDetails.jsx';
import FollowUpTracker from './components/FollowUpTracker.jsx';
import ExcelManager from './components/ExcelManager.jsx';
import Login from './components/Login.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import pkg from '../package.json';

const SESSION_STORAGE_KEY = 'popms_session';
const SIDEBAR_COLLAPSED_KEY = 'popms_sidebar_collapsed';

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function App() {
  const [session, setSession] = useState(loadStoredSession);
  const [userRole, setUserRole] = useState(() => loadStoredSession()?.role || 'doctor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadStoredSidebarCollapsed);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [dbStatus, setDbStatus] = useState({ dbEngine: null });
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsToday: 0,
    pendingFollowUps: 0,
    overdueFollowUps: 0,
    recentRegistrations: 0,
    dbEngineLabel: ''
  });

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setDbStatus(data);
        setStats(prev => ({ ...prev, dbEngineLabel: data.dbEngineLabel }));
      })
      .catch(err => {
        console.error('Failed to load DB status:', err);
        setDbStatus({
          dbEngine: 'excel',
          dbEngineLabel: 'Local Microsoft Excel Worksheet',
          storageEngine: 'local',
          storageEngineLabel: 'Local Disk Storage',
          googleSignInEnabled: false,
          googleClientId: null
        });
      });
  }, []);

  const persistSession = (data) => {
    setSession(data);
    setUserRole(data?.role || 'doctor');
    if (data) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  // Authenticated Fetch wrapper helper
  const authFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    if (session && session.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Clear stale session (expired token, or backend restarted with a new secret)
      persistSession(null);
    }
    return res;
  };

  const fetchStats = async () => {
    if (!session) return;
    try {
      const res = await authFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...data, dbEngineLabel: prev.dbEngineLabel || data.dbEngineLabel }));
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [activeTab, session]);

  const viewPatientDetails = (id) => {
    setSelectedPatientId(id);
    setActiveTab('patient-details');
  };

  const handleLogout = () => {
    persistSession(null);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage unavailable — collapsed state just won't persist across reloads
      }
      return next;
    });
  };

  // Render sub-components based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            viewPatientDetails={viewPatientDetails}
            setActiveTab={setActiveTab}
            authFetch={authFetch}
          />
        );
      case 'patients':
        return (
          <PatientDirectory
            viewPatientDetails={viewPatientDetails}
            onStatsChange={fetchStats}
            authFetch={authFetch}
          />
        );
      case 'patient-details':
        return (
          <PatientDetails
            patientId={selectedPatientId}
            onBack={() => setActiveTab('patients')}
            onStatsChange={fetchStats}
            authFetch={authFetch}
          />
        );
      case 'followups':
        return (
          <FollowUpTracker
            viewPatientDetails={viewPatientDetails}
            onStatsChange={fetchStats}
            authFetch={authFetch}
          />
        );
      case 'excel':
        return (
          <ExcelManager
            stats={stats}
            dbStatus={dbStatus}
            onStatsChange={fetchStats}
            session={session}
          />
        );
      case 'users':
        return (
          <AdminPanel
            session={session}
          />
        );
      default:
        return <Dashboard stats={stats} viewPatientDetails={viewPatientDetails} setActiveTab={setActiveTab} authFetch={authFetch} />;
    }
  };

  // Wait for backend status check before rendering login
  if (!session) {
    if (dbStatus.dbEngine === null) {
      // Still loading status from backend
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>Connecting to database...</p>
        </div>
      );
    }

    return (
      <Login
        googleClientId={dbStatus.googleClientId}
        googleSignInEnabled={dbStatus.googleSignInEnabled}
        onLoginSuccess={persistSession}
      />
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="brand-section">
          <div className="brand-logo-icon">
            <HeartPulse size={26} />
          </div>
          <div className="brand-title-wrap">
            <h1>POPMS</h1>
            <span>Pediatric Ortho</span>
          </div>
        </div>

        <nav className="nav-menu">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSelectedPatientId(null); }}
          >
            <Activity size={20} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'patients' || activeTab === 'patient-details' ? 'active' : ''}`}
            onClick={() => { setActiveTab('patients'); setSelectedPatientId(null); }}
          >
            <Users size={20} />
            <span>Patients</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'followups' ? 'active' : ''}`}
            onClick={() => { setActiveTab('followups'); setSelectedPatientId(null); }}
          >
            <Calendar size={20} />
            <span>Follow-Ups</span>
          </div>

          {/* Admin Restricted Database Configuration */}
          {isAdmin && (
            <div
              className={`nav-item ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setSelectedPatientId(null); }}
            >
              <Database size={20} />
              <span>Database Manager</span>
            </div>
          )}

          {/* Admin Restricted Access Control */}
          {isAdmin && (
            <div
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); setSelectedPatientId(null); }}
            >
              <Key size={20} />
              <span>User Accounts</span>
            </div>
          )}
        </nav>

        {/* Logged in User profile & Logout */}
        <div className="sidebar-user-block">
          <div className="sidebar-user-info">
            <span className="sidebar-user-email" title={session.user?.email}>
              {session.user?.email}
            </span>
            <span className={`sidebar-user-role ${isAdmin ? 'admin' : 'doctor'}`}>
              Role: {userRole}
            </span>
          </div>
          <button className="btn btn-outline btn-sm sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>

        <div className="sidebar-footer" style={{ marginTop: '20px' }}>
          <div>Version {pkg.version}</div>
          <div>&copy; {new Date().getFullYear()} PBD</div>
        </div>
      </aside>

      {/* Main workspace */}
      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
