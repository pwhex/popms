import React, { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, Clock, ChevronRight, UserPlus, FileSpreadsheet } from 'lucide-react';

function Dashboard({ stats, viewPatientDetails, setActiveTab, authFetch }) {
  const [recentPatients, setRecentPatients] = useState([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState([]);
  const apiFetch = authFetch || fetch;

  useEffect(() => {
    // Fetch recent patient list
    const loadDashboardData = async () => {
      try {
        const resPatients = await apiFetch('/api/patients');
        if (resPatients.ok) {
          const patients = await resPatients.json();
          // Sort by registration date decending
          const sorted = [...patients].sort((a, b) => new Date(b.registered_date) - new Date(a.registered_date));
          setRecentPatients(sorted.slice(0, 4));
        }

        const resFollowups = await apiFetch('/api/followups');
        if (resFollowups.ok) {
          const followups = await resFollowups.json();
          const today = new Date().toISOString().split('T')[0];
          // Filter pending and upcoming, sort ascending
          const pending = followups
            .filter(f => f.follow_up_status === 'Pending' && new Date(f.follow_up_date) >= new Date(today))
            .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
          setUpcomingFollowups(pending.slice(0, 4));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <>
      {/* Header section */}
      <div className="content-header">
        <div className="header-title-section">
          <h2>Pediatric Orthopedic Dashboard</h2>
          <p>King's Hospital Orthopedic Specialist Unit • Patient & Follow-Up Tracker</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('excel')}>
            <FileSpreadsheet size={16} />
            Database Excel Sheet
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('patients')}>
            <UserPlus size={18} />
            Register Patient
          </button>
        </div>
      </div>

      {/* Alert Overdue banner */}
      {stats.overdueFollowUps > 0 && (
        <div className="alert-banner">
          <div className="alert-message">
            <AlertTriangle size={22} />
            <span>
              <strong>Attention Required:</strong> You have {stats.overdueFollowUps} patient follow-up{stats.overdueFollowUps > 1 ? 's' : ''} overdue.
            </span>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setActiveTab('followups')}>
            Review Overdue Lists
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="dashboard-grid">
        <div className="card stat-card stat-primary">
          <div className="stat-icon-wrap">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Patients</h3>
            <div className="value">{stats.totalPatients}</div>
          </div>
        </div>

        <div className="card stat-card stat-secondary">
          <div className="stat-icon-wrap">
            <UserPlus size={24} />
          </div>
          <div className="stat-info">
            <h3>New (30 Days)</h3>
            <div className="value">{stats.recentRegistrations}</div>
          </div>
        </div>

        <div className="card stat-card stat-warning">
          <div className="stat-icon-wrap">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Followups</h3>
            <div className="value">{stats.pendingFollowUps}</div>
          </div>
        </div>

        <div className="card stat-card stat-danger">
          <div className="stat-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <h3>Overdue Followups</h3>
            <div className="value">{stats.overdueFollowUps}</div>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        
        {/* Recent Registrations */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recent Patient Registrations</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>LATEST ADDITIONS</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentPatients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No patients registered yet.</p>
            ) : (
              recentPatients.map(p => (
                <div 
                  key={p.out_patient_id} 
                  className="patient-item-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => viewPatientDetails(p.out_patient_id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.patient_name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {p.out_patient_id} • Registered: {p.registered_date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tag tag-blue" style={{ fontSize: '0.7rem' }}>
                      {p.main_diagnosis ? (p.main_diagnosis.length > 20 ? p.main_diagnosis.slice(0, 18) + '...' : p.main_diagnosis) : 'Unassigned'}
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Followups */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Upcoming Follow-Up Consults</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>NEXT 2 WEEKS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingFollowups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No upcoming follow-ups scheduled.</p>
            ) : (
              upcomingFollowups.map(f => (
                <div 
                  key={f.visit_id} 
                  className="patient-item-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => viewPatientDetails(f.out_patient_id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{f.patient_name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due: <strong>{f.follow_up_date}</strong> • Diagnosis: {f.main_diagnosis}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tag tag-yellow" style={{ fontSize: '0.7rem' }}>Pending</span>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default Dashboard;
