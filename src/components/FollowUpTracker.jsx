import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, AlertTriangle, User, Search, RefreshCw, X, ChevronRight } from 'lucide-react';

function FollowUpTracker({ viewPatientDetails, onStatsChange }) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('active'); // 'active' (pending/overdue) | 'overdue' | 'upcoming' | 'completed'
  
  // Rescheduling modal state
  const [rescheduleVisitId, setRescheduleVisitId] = useState(null);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/followups');
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleMarkCompleted = async (visitId) => {
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_up_status: 'Completed' })
      });
      if (res.ok) {
        fetchFollowUps();
        onStatsChange();
      } else {
        alert('Failed to mark follow-up as completed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newFollowUpDate) return;
    
    try {
      const res = await fetch(`/api/visits/${rescheduleVisitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          follow_up_date: newFollowUpDate,
          follow_up_status: 'Pending' 
        })
      });
      
      if (res.ok) {
        setRescheduleVisitId(null);
        setNewFollowUpDate('');
        fetchFollowUps();
        onStatsChange();
      } else {
        alert('Failed to reschedule.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Categorize & Filter follow ups
  const processedFollowUps = followUps.map(f => {
    const isPast = new Date(f.follow_up_date) < new Date(todayStr);
    let resolvedStatus = f.follow_up_status;
    
    // Auto flag overdue if it is Pending but the date has passed
    if (f.follow_up_status === 'Pending' && isPast) {
      resolvedStatus = 'Overdue';
    }
    
    return { ...f, resolvedStatus };
  });

  const filteredFollowUps = processedFollowUps.filter(f => {
    // Text search
    const textMatch = 
      f.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.out_patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.main_diagnosis.toLowerCase().includes(searchTerm.toLowerCase());

    if (!textMatch) return false;

    // Tab filters
    if (activeFilter === 'active') {
      return f.resolvedStatus === 'Pending' || f.resolvedStatus === 'Overdue';
    }
    if (activeFilter === 'overdue') {
      return f.resolvedStatus === 'Overdue';
    }
    if (activeFilter === 'upcoming') {
      return f.resolvedStatus === 'Pending' && new Date(f.follow_up_date) >= new Date(todayStr);
    }
    if (activeFilter === 'completed') {
      return f.resolvedStatus === 'Completed';
    }
    return true;
  });

  return (
    <>
      {/* Header */}
      <div className="content-header">
        <div className="header-title-section">
          <h2>Follow-Up Tracker</h2>
          <p>Track checkups, osteotomy monitoring, plaster cast removals, and tenotomy bracing phases</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-outline" onClick={fetchFollowUps} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-animation' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs-navigation" style={{ margin: 0 }}>
          <div 
            className={`tab-link ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Active Schedules ({processedFollowUps.filter(f => f.resolvedStatus === 'Pending' || f.resolvedStatus === 'Overdue').length})
          </div>
          <div 
            className={`tab-link ${activeFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveFilter('overdue')}
          >
            Overdue Alert ({processedFollowUps.filter(f => f.resolvedStatus === 'Overdue').length})
          </div>
          <div 
            className={`tab-link ${activeFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveFilter('upcoming')}
          >
            Upcoming ({processedFollowUps.filter(f => f.resolvedStatus === 'Pending' && new Date(f.follow_up_date) >= new Date(todayStr)).length})
          </div>
          <div 
            className={`tab-link ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            Completed ({processedFollowUps.filter(f => f.resolvedStatus === 'Completed').length})
          </div>
        </div>

        {/* Mini Search */}
        <div className="search-input-wrap" style={{ maxWidth: '300px' }}>
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search active followups..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Follow-up Board Content */}
      <div className="followups-board">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading medical schedule board...</div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No scheduled follow-up consults matching this criteria.
          </div>
        ) : (
          <div className="followups-table-card">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient Info</th>
                  <th>Contact</th>
                  <th>Diagnosis Details</th>
                  <th>Follow-Up Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Management Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowUps.map(f => {
                  const isOverdue = f.resolvedStatus === 'Overdue';
                  const isCompleted = f.resolvedStatus === 'Completed';

                  return (
                    <tr key={f.visit_id} className={isOverdue ? 'overdue-banner-row' : ''}>
                      <td>
                        <div 
                          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => viewPatientDetails(f.out_patient_id)}
                        >
                          <User size={14} />
                          {f.patient_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {f.out_patient_id}
                        </div>
                      </td>
                      <td>{f.mobile || 'N/A'}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{f.main_diagnosis}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Last Consult Assessment: {f.diagnosis_recorded}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          {f.follow_up_date}
                        </div>
                      </td>
                      <td>
                        {isOverdue ? (
                          <span className="overdue-text">
                            <AlertTriangle size={14} />
                            Overdue Checkup
                          </span>
                        ) : isCompleted ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} />
                            Completed
                          </span>
                        ) : (
                          <span className="upcoming-text">
                            <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!isCompleted && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleMarkCompleted(f.visit_id)}
                              >
                                <CheckCircle size={14} />
                                Completed
                              </button>
                              <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setRescheduleVisitId(f.visit_id);
                                  setNewFollowUpDate(f.follow_up_date);
                                }}
                              >
                                Reschedule
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px' }}
                            onClick={() => viewPatientDetails(f.out_patient_id)}
                            title="Open Profile"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleVisitId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Reschedule Follow-Up</h3>
              <button className="modal-close" onClick={() => setRescheduleVisitId(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="form-group">
                  <label>Select New Consultation Date *</label>
                  <input 
                    type="date" 
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} // Cannot schedule in past
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-actions" style={{ marginTop: '24px', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setRescheduleVisitId(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Schedule
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FollowUpTracker;
