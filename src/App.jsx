import React, { useState, useEffect } from 'react';
import { Activity, Users, Calendar, Database, HeartPulse, Sparkles, Key, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Dashboard from './components/Dashboard.jsx';
import PatientDirectory from './components/PatientDirectory.jsx';
import PatientDetails from './components/PatientDetails.jsx';
import FollowUpTracker from './components/FollowUpTracker.jsx';
import ExcelManager from './components/ExcelManager.jsx';
import Login from './components/Login.jsx';
import AdminPanel from './components/AdminPanel.jsx';

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://iecekupqbcexwiyuoxeq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wvT3hBOG8uhWSlzE7gdFEw_vkrG1gNz';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('[your-')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('doctor'); // 'admin' or 'doctor'
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsToday: 0,
    pendingFollowUps: 0,
    overdueFollowUps: 0,
    recentRegistrations: 0,
    excelPath: '',
    dbEngine: 'Local Microsoft Excel Worksheet'
  });

  // Fetch User Role Profile from Supabase
  const fetchUserProfile = async (currentUser) => {
    if (!supabase || !currentUser) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
      
      if (data) {
        setUserRole(data.role || 'doctor');
      } else if (error) {
        console.error('Error fetching role:', error.message);
        setUserRole('doctor');
      }
    } catch (err) {
      console.error(err);
      setUserRole('doctor');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchUserProfile(session.user);
        }
      });

      // Listen to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          fetchUserProfile(currentSession.user);
        } else {
          setUserRole('doctor');
          setStats(prev => ({ ...prev, dbEngine: 'Local Microsoft Excel Worksheet' }));
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Offline PoC mode default session
      setSession({
        access_token: 'poc-bypass-token',
        user: { email: 'doctor@popms.com', id: 'poc-user-id' }
      });
      setUserRole('admin');
    }
  }, []);

  // Authenticated Fetch wrapper helper
  const authFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    if (session && session.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return fetch(url, {
      ...options,
      headers
    });
  };

  const fetchStats = async () => {
    if (!session) return;
    try {
      const res = await authFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
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

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      setSession(null);
    }
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

  // If no auth session, render Login Portal
  if (!session) {
    return <Login supabase={supabase} onLoginSuccess={(data) => setSession(data)} />;
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: '#94a3b8', padding: '0 8px' }}>
            <span style={{ fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user?.email}>
              {session.user?.email}
            </span>
            <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, color: isAdmin ? 'var(--danger)' : 'var(--secondary)' }}>
              Role: {userRole}
            </span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#94a3b8' }}>
            <LogOut size={14} />
            Log Out
          </button>
        </div>

        <div className="sidebar-footer" style={{ marginTop: '20px' }}>
          <Sparkles size={14} style={{ color: '#fbbf24', marginBottom: '4px' }} />
          <div>Kings Hospital</div>
          <div>v1.1.0 (SQL / Cloud)</div>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
