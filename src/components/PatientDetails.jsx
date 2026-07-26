import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Calendar, Activity, Image as ImageIcon, Link as LinkIcon, FileText, CheckCircle, Upload, X, AlertTriangle } from 'lucide-react';
import { calculateAge } from './PatientDirectory.jsx';

function PatientDetails({ patientId, onBack, onStatsChange, authFetch }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('timeline');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const apiFetch = authFetch || fetch;
  
  // Visit Form State
  const [visitFormData, setVisitFormData] = useState({
    visit_type: 'Follow-up',
    height_cm: '',
    weight_kg: '',
    affected_side: 'N/A',
    clinical_notes: '',
    diagnosis: '',
    treatment_plan: '',
    media_input_url: '', // for manually pasting google drive urls
    follow_up_date: '',
    schedule_follow_up: false
  });
  
  const [attachedMedias, setAttachedMedias] = useState([]); // list of { type: 'drive'|'local', url: string, name: string }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
        // Default diagnosis to the patient's main diagnosis
        setVisitFormData(prev => ({ ...prev, diagnosis: data.main_diagnosis || '' }));
      } else {
        console.error('Failed to load patient details');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails();
    }
  }, [patientId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVisitFormData({
      ...visitFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add a Google Drive link to the visit attachment list
  const addDriveLink = () => {
    const url = visitFormData.media_input_url.trim();
    if (!url) return;
    
    // Quick validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    let displayName = 'Google Drive Link';
    if (url.includes('drive.google.com')) {
      displayName = 'Google Drive Photo';
    } else {
      try {
        const parsed = new URL(url);
        displayName = parsed.hostname.replace('www.', '') + ' File';
      } catch(e) {}
    }

    setAttachedMedias([...attachedMedias, { type: 'drive', url, name: displayName }]);
    setVisitFormData({ ...visitFormData, media_input_url: '' });
  };

  // Upload local file
  const handleLocalFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append('media', file);

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedMedias([...attachedMedias, { 
          type: 'local', 
          url: data.url, 
          name: file.name 
        }]);
      } else {
        alert('Failed to upload file.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachedMedias(attachedMedias.filter((_, i) => i !== index));
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Prepare payload
    const mediaUrls = attachedMedias.map(m => m.url).join(',');
    const payload = {
      visit_type: visitFormData.visit_type,
      height_cm: visitFormData.height_cm ? Number(visitFormData.height_cm) : '',
      weight_kg: visitFormData.weight_kg ? Number(visitFormData.weight_kg) : '',
      affected_side: visitFormData.affected_side,
      clinical_notes: visitFormData.clinical_notes,
      diagnosis: visitFormData.diagnosis || patient.main_diagnosis,
      treatment_plan: visitFormData.treatment_plan,
      media_urls: mediaUrls,
      follow_up_date: visitFormData.schedule_follow_up ? visitFormData.follow_up_date : ''
    };

    if (visitFormData.schedule_follow_up && !visitFormData.follow_up_date) {
      setErrorMsg('Please specify a follow-up date.');
      return;
    }

    try {
      const res = await apiFetch(`/api/patients/${patientId}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg('Visit details logged successfully.');
        onStatsChange(); // Update general system stats
        
        // Reset form & state
        setVisitFormData({
          visit_type: 'Follow-up',
          height_cm: '',
          weight_kg: '',
          affected_side: 'N/A',
          clinical_notes: '',
          diagnosis: patient.main_diagnosis,
          treatment_plan: '',
          media_input_url: '',
          follow_up_date: '',
          schedule_follow_up: false
        });
        setAttachedMedias([]);
        
        // Reload details & return to timeline
        await fetchPatientDetails();
        setTimeout(() => {
          setActiveSubTab('timeline');
          setSuccessMsg('');
        }, 1000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to log visit.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while saving visit.');
    }
  };

  // Helper to parse comma separated URLs
  const renderVisitMedia = (urlsString) => {
    if (!urlsString) return null;
    const urls = urlsString.split(',').filter(Boolean);
    
    return (
      <div className="media-showcase">
        <h4>Images & Diagnostic Media</h4>
        <div className="media-gallery">
          {urls.map((url, idx) => {
            const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
            const isLocal = url.startsWith('/uploads/');
            
            return (
              <div 
                key={idx} 
                className="media-thumbnail-container"
                onClick={() => window.open(url, '_blank')}
              >
                {isLocal ? (
                  <img src={url} alt="Medical scan" className="media-thumbnail" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: 'var(--primary)', padding: '8px' }}>
                    <ImageIcon size={28} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: '4px', textAlign: 'center' }}>Google Drive File</span>
                  </div>
                )}
                <div className="media-link-overlay">
                  <div className="media-link-icon-only">
                    <LinkIcon size={12} />
                    <span>Open Link</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading patient medical records...</div>;
  }

  if (!patient) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Patient Record Not Found</h3>
        <p style={{ margin: '8px 0 24px 0', color: 'var(--text-muted)' }}>The specified Out-Patient ID does not exist in the Excel database.</p>
        <button className="btn btn-primary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Registry
        </button>
      </div>
    );
  }

  // Calculate age for display
  const dispAge = calculateAge(patient.dob);

  return (
    <>
      {/* Back button */}
      <div>
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Patient Directory
        </button>
      </div>

      {/* Patient Profile Banner */}
      <section className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-title">
            <div className="profile-avatar">
              {patient.patient_name ? patient.patient_name.charAt(0) : 'P'}
            </div>
            <div className="profile-name-id">
              <h3>{patient.patient_name}</h3>
              <div className="p-id">Out-Patient ID: {patient.out_patient_id}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span className="tag tag-red" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              {patient.main_diagnosis}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered: {patient.registered_date}</span>
          </div>
        </div>

        <div className="profile-meta-grid">
          <div className="meta-item">
            <label>Gender</label>
            <span>{patient.gender}</span>
          </div>
          <div className="meta-item">
            <label>Date of Birth</label>
            <span>{patient.dob} ({dispAge})</span>
          </div>
          <div className="meta-item">
            <label>Parent Contact</label>
            <span>{patient.mobile || 'N/A'}</span>
          </div>
          <div className="meta-item">
            <label>Location & Unit</label>
            <span>{patient.hospital} • {patient.unit}</span>
          </div>
        </div>
      </section>

      {/* Profile Section Tabs */}
      <div className="tabs-navigation">
        <div 
          className={`tab-link ${activeSubTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('timeline')}
        >
          Clinical Timeline
        </div>
        <div 
          className={`tab-link ${activeSubTab === 'log-visit' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('log-visit')}
        >
          Log New Visit / Surgery
        </div>
      </div>

      {/* Subtab Contents */}
      <div style={{ marginTop: '8px' }}>
        {activeSubTab === 'timeline' && (
          <div className="visit-timeline">
            {(!patient.visits || patient.visits.length === 0) ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No clinical visits recorded for this patient. Click "Log New Visit" to add one.
              </div>
            ) : (
              patient.visits.map((visit, index) => {
                // Calculate BMI
                const heightM = visit.height_cm ? Number(visit.height_cm) / 100 : null;
                const weightKg = visit.weight_kg ? Number(visit.weight_kg) : null;
                const bmi = heightM && weightKg ? (weightKg / (heightM * heightM)).toFixed(1) : null;

                // Timeline dots custom colors
                let dotClass = 'timeline-dot';
                if (visit.visit_type === 'Initial') dotClass += ' initial';
                else if (visit.visit_type === 'Post-Op') dotClass += ' post-op';

                return (
                  <div key={visit.visit_id} className="timeline-item">
                    <div className={dotClass}></div>
                    
                    <div className="card">
                      <div className="visit-card-header">
                        <div className="visit-badge-date">
                          <span className={`tag ${
                            visit.visit_type === 'Initial' ? 'tag-blue' :
                            visit.visit_type === 'Post-Op' ? 'tag-yellow' : 'tag-teal'
                          }`}>
                            {visit.visit_type}
                          </span>
                          <span className="visit-date">{visit.visit_date}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          Ref ID: {visit.visit_id}
                        </div>
                      </div>

                      {/* Vitals */}
                      {(visit.height_cm || visit.weight_kg) && (
                        <div className="visit-vitals">
                          {visit.height_cm && (
                            <div className="vitals-item">
                              Height: <span>{visit.height_cm} cm</span>
                            </div>
                          )}
                          {visit.weight_kg && (
                            <div className="vitals-item">
                              Weight: <span>{visit.weight_kg} kg</span>
                            </div>
                          )}
                          {bmi && (
                            <div className="vitals-item">
                              BMI: <span>{bmi} kg/m²</span>
                            </div>
                          )}
                          {visit.affected_side && (
                            <div className="vitals-item">
                              Affected Side: <span>{visit.affected_side}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clinical Notes & Details */}
                      <div className="visit-clinical-details">
                        <div className="clinical-section">
                          <h4>Visit Diagnosis / Status</h4>
                          <p style={{ fontWeight: 600 }}>{visit.diagnosis}</p>
                        </div>

                        {visit.clinical_notes && (
                          <div className="clinical-section">
                            <h4>Clinical Assessment / Notes</h4>
                            <p>{visit.clinical_notes}</p>
                          </div>
                        )}

                        {visit.treatment_plan && (
                          <div className="clinical-section">
                            <h4>Treatment Plan / Prescriptions</h4>
                            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{visit.treatment_plan}</p>
                          </div>
                        )}

                        {/* Media rendering */}
                        {renderVisitMedia(visit.media_urls)}

                        {/* Follow up sched */}
                        {visit.follow_up_date && (
                          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600 }}>
                            <Calendar size={14} />
                            <span>Follow-Up Date Scheduled: {visit.follow_up_date} ({visit.follow_up_status})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeSubTab === 'log-visit' && (
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>Record Consultation or Post-Op Check</h3>
            
            {errorMsg && (
              <div className="alert-banner" style={{ margin: '0 0 24px 0', padding: '10px 14px' }}>
                <div className="alert-message">
                  <AlertTriangle size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
                </div>
              </div>
            )}
            
            {successMsg && (
              <div className="alert-banner" style={{ margin: '0 0 24px 0', padding: '10px 14px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'rgba(22, 163, 74, 0.2)' }}>
                <div className="alert-message">
                  <CheckCircle size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{successMsg}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleVisitSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Visit/Consultation Type *</label>
                  <select 
                    name="visit_type" 
                    value={visitFormData.visit_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Follow-up">Regular Follow-up</option>
                    <option value="Initial">Initial Consultation</option>
                    <option value="Post-Op">Post-Operative Check</option>
                    <option value="Cast Change">Cast/Plaster Change</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Affected Side *</label>
                  <select 
                    name="affected_side" 
                    value={visitFormData.affected_side}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Left">Left Side</option>
                    <option value="Right">Right Side</option>
                    <option value="Bilateral">Bilateral (Both Sides)</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Height (cm)</label>
                  <input 
                    type="number" 
                    name="height_cm"
                    value={visitFormData.height_cm}
                    onChange={handleInputChange}
                    placeholder="e.g. 110"
                    min="20"
                    max="250"
                  />
                </div>

                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input 
                    type="number" 
                    name="weight_kg"
                    value={visitFormData.weight_kg}
                    onChange={handleInputChange}
                    placeholder="e.g. 18.5"
                    step="0.1"
                    min="1"
                    max="200"
                  />
                </div>

                <div className="form-group form-full-width">
                  <label>Visit Diagnosis / Assessment *</label>
                  <input 
                    type="text" 
                    name="diagnosis"
                    value={visitFormData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Update clinical diagnosis or status if changed"
                    required
                  />
                </div>

                <div className="form-group form-full-width">
                  <label>Clinical Notes *</label>
                  <textarea 
                    name="clinical_notes"
                    value={visitFormData.clinical_notes}
                    onChange={handleInputChange}
                    placeholder="Write detailed notes on physical examinations, joint range of motion, plaster checks, swelling, etc."
                    required
                  />
                </div>

                <div className="form-group form-full-width">
                  <label>Treatment Plan / Interventions</label>
                  <input 
                    type="text" 
                    name="treatment_plan"
                    value={visitFormData.treatment_plan}
                    onChange={handleInputChange}
                    placeholder="E.g., Spica cast removal scheduled for 3 weeks, start PT, Ibuprofen 10mg..."
                  />
                </div>

                {/* Media Management Section */}
                <div className="form-group form-full-width" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginTop: '12px' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={18} style={{ color: 'var(--primary)' }} />
                    Medical Media Attachments
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                    {/* Local File Upload Zone */}
                    <div 
                      className="upload-zone"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <Upload size={24} />
                      <div>
                        <strong>Upload Medical Photo</strong>
                        <p style={{ fontSize: '0.75rem', marginTop: '2px' }}>JPEG, PNG (X-rays, surgical photos, casts)</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: 'none' }} 
                        accept="image/*"
                        onChange={handleLocalFileUpload}
                      />
                      {uploading && <div className="upload-progress">Uploading file...</div>}
                    </div>

                    {/* Google Drive Link paste box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Paste Google Drive Shared Link</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          name="media_input_url"
                          value={visitFormData.media_input_url}
                          onChange={handleInputChange}
                          placeholder="https://drive.google.com/..."
                          style={{ flex: 1, padding: '8px' }}
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline btn-sm"
                          onClick={addDriveLink}
                        >
                          Attach
                        </button>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Files saved to drive can be linked directly here.</span>
                    </div>
                  </div>

                  {/* Attachment chips */}
                  {attachedMedias.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ready to attach ({attachedMedias.length}):</label>
                      <div className="uploaded-preview-list">
                        {attachedMedias.map((media, index) => (
                          <div key={index} className="upload-chip">
                            {media.type === 'drive' ? <LinkIcon size={14} style={{ color: 'var(--primary)' }} /> : <ImageIcon size={14} style={{ color: 'var(--secondary)' }} />}
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={media.url}>
                              {media.name}
                            </span>
                            <button type="button" onClick={() => removeAttachment(index)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Follow-up scheduler checkbox & date */}
                <div className="form-group form-full-width" style={{ marginTop: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="schedule_follow_up"
                    name="schedule_follow_up"
                    checked={visitFormData.schedule_follow_up}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="schedule_follow_up" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>
                    Schedule next follow-up/check-up date
                  </label>
                </div>

                {visitFormData.schedule_follow_up && (
                  <div className="form-group" style={{ animation: 'slideInDown 0.2s ease' }}>
                    <label>Follow-up Date *</label>
                    <input 
                      type="date" 
                      name="follow_up_date"
                      value={visitFormData.follow_up_date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]} // Cannot schedule in past
                      required
                    />
                  </div>
                )}

              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveSubTab('timeline')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={18} />
                  Save Consultation Record
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default PatientDetails;
