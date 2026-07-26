import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Users, RefreshCw, AlertTriangle, Key } from 'lucide-react';

function AdminPanel({ session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error('Failed to load users');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const token = session?.access_token;
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        alert('Failed to update user role.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="header-title-section">
          <h2>User Access Control</h2>
          <p>Promote clinicians, manage role assignments, and audit active staff accounts</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-animation' : ''} />
            Refresh List
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '32px' }}>
        
        {/* User Accounts list */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Account</th>
                <th>User ID</th>
                <th>Registration Date</th>
                <th>Current Role</th>
                <th style={{ textAlign: 'right' }}>Modify Access</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Fetching system accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users registered in the profiles database.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                        <div style={{ padding: '6px', backgroundColor: 'rgba(79, 70, 229, 0.08)', borderRadius: '999px', color: 'var(--primary)' }}>
                          <User size={16} />
                        </div>
                        {u.email}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {u.id}
                    </td>
                    <td>{u.created_at || 'Pre-migration'}</td>
                    <td>
                      <span className={`tag ${u.role === 'admin' ? 'tag-red' : 'tag-teal'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={updatingId === u.id}
                        className="filter-select"
                        style={{ minWidth: '120px', padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        <option value="doctor">doctor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Access description pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
              Access Level Summary
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <strong>Admin role</strong> grants full permissions:
              <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
                <li>Access to DB configuration stats</li>
                <li>Compile spreadsheet backups</li>
                <li>Manage accounts & change user roles</li>
              </ul>
              <br/>
              <strong>Doctor role</strong> restricts views:
              <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
                <li>Limited strictly to patient profiles & clinical timelines</li>
                <li>No DB configuration or download tools</li>
              </ul>
            </p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
              HIPAA Guidelines
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Ensure only authorized medical staff are promoted to the **Admin** role. 
              <br/><br/>
              Admin capabilities allow downloading complete patient profiles in Excel, which contain protected health information (PHI). 
              Keep these exports secure.
            </p>
          </div>

        </div>

      </div>
    </>
  );
}

export default AdminPanel;
