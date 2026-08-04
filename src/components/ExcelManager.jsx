import React, { useState } from 'react';
import { Database, Cloud, HardDrive, Download, RefreshCw, ShieldCheck, Info } from 'lucide-react';

function ExcelManager({ stats, dbStatus, onStatsChange, session }) {
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSheets = dbStatus?.dbEngine === 'sheets';
  const isDrive = dbStatus?.storageEngine === 'drive';

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await onStatsChange();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleBackupDownload = () => {
    setDownloading(true);
    try {
      const token = session?.access_token;
      const downloadUrl = token ? `/api/database/backup?token=${token}` : '/api/database/backup';
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="header-title-section">
          <h2>Database & Storage</h2>
          <p>Current database and file storage engine, and backup tools</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-outline" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin-animation' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div
        className="sync-status-indicator"
        style={isSheets ? { backgroundColor: 'var(--success-light)', borderColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' } : {}}
      >
        <ShieldCheck size={26} />
        <div>
          <strong style={{ fontSize: '1.05rem' }}>
            {isSheets ? 'Connected to Google Sheets' : 'Using Local Excel Fallback'}
          </strong>
          <p style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>
            {isSheets
              ? 'Patient and visit records are read from and written to a Google Sheets spreadsheet in real time.'
              : 'GOOGLE_SHEETS_ID or GOOGLE_SERVICE_ACCOUNT_KEY is not set (or unreachable) — using the local Excel workbook instead.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Database Engine Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--primary)' }} />
            Database Engine
          </h3>
          <table className="sync-details-table">
            <tbody>
              <tr>
                <td className="label-cell">Engine</td>
                <td className="value-cell">{dbStatus?.dbEngineLabel || stats.dbEngineLabel}</td>
              </tr>
              <tr>
                <td className="label-cell">{isSheets ? 'Sheet Tabs' : 'Worksheets'}</td>
                <td className="value-cell">
                  <code>Patients</code>, <code>Visits</code>, <code>Profiles</code>
                </td>
              </tr>
              <tr>
                <td className="label-cell">Records</td>
                <td className="value-cell"><strong>{stats.totalPatients}</strong> registered patients</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* File Storage Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDrive ? <Cloud size={18} style={{ color: 'var(--primary)' }} /> : <HardDrive size={18} style={{ color: 'var(--primary)' }} />}
            File Storage
          </h3>
          <table className="sync-details-table">
            <tbody>
              <tr>
                <td className="label-cell">Engine</td>
                <td className="value-cell">{dbStatus?.storageEngineLabel}</td>
              </tr>
              <tr>
                <td className="label-cell">Uploaded media</td>
                <td className="value-cell">
                  {isDrive ? 'Stored in the configured Google Drive folder.' : 'Stored locally in the uploads/ folder.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup */}
      <div className="card excel-sync-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} style={{ color: 'var(--primary)' }} />
          Spreadsheet Backup
        </h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleBackupDownload} disabled={downloading}>
            <Download size={18} />
            Download Spreadsheet (.xlsx)
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Generates a fresh .xlsx snapshot of all current records.
          </span>
        </div>
      </div>

      {!isSheets && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info size={16} style={{ color: 'var(--warning)' }} />
            Enable Google Sheets & Drive
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Set <code>GOOGLE_SERVICE_ACCOUNT_KEY</code>, <code>GOOGLE_SHEETS_ID</code> and <code>GOOGLE_DRIVE_FOLDER_ID</code> in your environment,
            then share the spreadsheet and Drive folder with the service account's <code>client_email</code> as an Editor. See <code>.env.example</code> for details.
          </p>
        </div>
      )}
    </>
  );
}

export default ExcelManager;
