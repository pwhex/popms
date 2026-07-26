import React, { useState, useEffect } from 'react';
import { Activity, Users, Calendar, Database, HeartPulse, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import PatientDirectory from './components/PatientDirectory.jsx';
import PatientDetails from './components/PatientDetails.jsx';
import FollowUpTracker from './components/FollowUpTracker.jsx';
import ExcelManager from './components/ExcelManager.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsToday: 0,
    pendingFollowUps: 0,
    overdueFollowUps: 0,
    recentRegistrations: 0,
    excelPath: ''
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const viewPatientDetails = (id) => {
    setSelectedPatientId(id);
    setActiveTab('patient-details');
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
          />
        );
      case 'patients':
        return (
          <PatientDirectory 
            viewPatientDetails={viewPatientDetails} 
            onStatsChange={fetchStats}
          />
        );
      case 'patient-details':
        return (
          <PatientDetails 
            patientId={selectedPatientId} 
            onBack={() => setActiveTab('patients')} 
            onStatsChange={fetchStats}
          />
        );
      case 'followups':
        return (
          <FollowUpTracker 
            viewPatientDetails={viewPatientDetails} 
            onStatsChange={fetchStats}
          />
        );
      case 'excel':
        return (
          <ExcelManager 
            stats={stats} 
            onStatsChange={fetchStats}
          />
        );
      default:
        return <Dashboard stats={stats} viewPatientDetails={viewPatientDetails} setActiveTab={setActiveTab} />;
    }
  };

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
          
          <div 
            className={`nav-item ${activeTab === 'excel' ? 'active' : ''}`}
            onClick={() => { setActiveTab('excel'); setSelectedPatientId(null); }}
          >
            <Database size={20} />
            <span>Excel Sheet</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <Sparkles size={14} style={{ color: '#fbbf24', marginBottom: '4px' }} />
          <div>Kings Hospital</div>
          <div>v1.0.0 (Excel DB)</div>
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
