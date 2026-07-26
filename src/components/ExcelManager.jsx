import React, { useState } from 'react';
import { Database, FileSpreadsheet, Download, RefreshCw, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

function ExcelManager({ stats, onStatsChange }) {
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await onStatsChange();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleBackupDownload = async () => {
    setDownloading(true);
    try {
      // Trigger native browser download for Excel sheet
      window.open('/api/database/backup', '_blank');
    } catch (e) {
      console.error(e);
      alert('Failed to initiate backup download.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="content-header">
        <div className="header-title-section">
          <h2>Excel Database Management</h2>
          <p>Inspect database configuration, connection logs, and download spreadsheet backups</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-outline" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin-animation' : ''} />
            Test Connection
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div 
        className="sync-status-indicator" 
        style={stats.dbEngine?.includes('PostgreSQL') ? { backgroundColor: 'var(--success-light)', borderColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' } : {}}
      >
        <ShieldCheck size={26} />
        <div>
          <strong style={{ fontSize: '1.05rem' }}>
            {stats.dbEngine?.includes('PostgreSQL') ? 'Active Supabase Cloud Database Connected' : 'Active Local Connection Established'}
          </strong>
          <p style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>
            {stats.dbEngine?.includes('PostgreSQL') 
              ? 'The Node server is reading and writing to your Supabase PostgreSQL cloud database in real-time over TLS.' 
              : 'The Node server is reading and writing to your local Excel sheet file in real-time.'}
          </p>
        </div>
      </div>

      {/* Database Properties Card */}
      <div className="card excel-sync-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} style={{ color: 'var(--primary)' }} />
          Database Properties & Connection Details
        </h3>
        
        <table className="sync-details-table">
          <tbody>
            <tr>
              <td className="label-cell">{stats.dbEngine?.includes('PostgreSQL') ? 'Database Type' : 'File Name'}</td>
              <td className="value-cell" style={{ fontFamily: 'inherit', fontWeight: 500 }}>
                {stats.dbEngine?.includes('PostgreSQL') ? 'Supabase cloud-hosted PostgreSQL' : 'popms_database.xlsx'}
              </td>
            </tr>
            <tr>
              <td className="label-cell">{stats.dbEngine?.includes('PostgreSQL') ? 'Connection URI' : 'Absolute Path'}</td>
              <td className="value-cell">
                {stats.excelPath || 'c:\\Users\\FRACTAL\\Desktop\\Kings PMS\\popms_database.xlsx'}
              </td>
            </tr>
            <tr>
              <td className="label-cell">Database Engine</td>
              <td className="value-cell" style={{ fontFamily: 'inherit' }}>
                {stats.dbEngine || 'Node.js ExcelJS Engine (Thread-Safe Reads/Writes)'}
              </td>
            </tr>
            <tr>
              <td className="label-cell">{stats.dbEngine?.includes('PostgreSQL') ? 'Target Tables' : 'Target Sheets'}</td>
              <td className="value-cell" style={{ fontFamily: 'inherit' }}>
                {stats.dbEngine?.includes('PostgreSQL') ? (
                  <>
                    <code>patients</code> (Demographics Table) <br/>
                    <code>visits</code> (Clinical History & Media Table)
                  </>
                ) : (
                  <>
                    <code>Patients</code> (Registered Profile Records) <br/>
                    <code>Visits</code> (Consultation History & Media Logs)
                  </>
                )}
              </td>
            </tr>
            <tr>
              <td className="label-cell">Current Records Size</td>
              <td className="value-cell" style={{ fontFamily: 'inherit' }}>
                <strong>{stats.totalPatients}</strong> registered patients in database
              </td>
            </tr>
          </tbody>
        </table>

        {/* Database Download Action */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleBackupDownload} disabled={downloading}>
            <Download size={18} />
            Download Spreadsheet (.xlsx)
          </button>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {stats.dbEngine?.includes('PostgreSQL')
              ? 'Compiles the live Supabase PostgreSQL relational database tables into a structured Excel workbook (.xlsx) download on-the-fly.'
              : 'Downloads the raw Excel workbook file directly for manual reviews or custom reports.'}
          </span>
        </div>
      </div>

      {/* Pediatric Clinical Notice / Instructions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Safe Operations Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            Preventing File Lock Issues
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Because this application uses a local Excel spreadsheet as its database, <strong>opening the Excel file in Microsoft Excel or another viewer while the server is saving data can cause lock conflicts</strong>. 
            <br/><br/>
            To prevent failures:
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Close the Excel spreadsheet before submitting new registrations or consultations.</li>
              <li>If the database locks, restart the Node.js console window and refresh the browser tab.</li>
            </ul>
          </p>
        </div>

        {/* Future SQL Migration */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
            SQL Database Integration
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            This system was architected with a decoupled REST API abstraction layer. All read/write operations occur through standardized controllers.
            <br/><br/>
            When ready to transition from **Excel Sheets** to a production-ready SQL database (like **PostgreSQL**, **MySQL**, or **SQLite**):
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Swap the database helper module in <code>server.js</code> with an ORM (e.g. Prisma, Sequelize).</li>
              <li>No alterations will be required on the React frontend components.</li>
              <li>We can run a database seeding script to parse your existing Excel spreadsheet and load records into the SQL tables.</li>
            </ul>
          </p>
        </div>

      </div>
    </>
  );
}

export default ExcelManager;
