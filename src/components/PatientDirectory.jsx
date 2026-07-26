import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Filter, ChevronRight, Check } from 'lucide-react';

// Age calculation utility
export const calculateAge = (dob) => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 'N/A';
  
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  
  if (years === 0) {
    return `${months} mo`;
  }
  if (months === 0) {
    return `${years} yo`;
  }
  return `${years}y ${months}m`;
};

function PatientDirectory({ viewPatientDetails, onStatsChange, authFetch }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('All');
  const [selectedHospital, setSelectedHospital] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiFetch = authFetch || fetch;

  // Form State
  const [formData, setFormData] = useState({
    out_patient_id: '',
    patient_name: '',
    mobile: '',
    dob: '',
    gender: 'Female',
    hospital: "King's Hospital",
    unit: 'Pediatric Orthopedic',
    main_diagnosis: 'Developmental Dysplasia of the Hip (DDH)'
  });

  const fetchPatients = async () => {
    try {
      const res = await apiFetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const generateOPID = () => {
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `OP-${currentYear}-${randomNum}`;
    setFormData({ ...formData, out_patient_id: generatedId });
  };

  const openRegistrationModal = () => {
    setIsModalOpen(true);
    setErrorMessage('');
    setSuccessMessage('');
    // Auto-generate standard ID on open
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData({
      out_patient_id: `OP-${currentYear}-${randomNum}`,
      patient_name: '',
      mobile: '',
      dob: '',
      gender: 'Female',
      hospital: "King's Hospital",
      unit: 'Pediatric Orthopedic',
      main_diagnosis: 'Developmental Dysplasia of the Hip (DDH)'
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.out_patient_id || !formData.patient_name || !formData.dob || !formData.main_diagnosis) {
      setErrorMessage('Please fill in all required fields marked with *.');
      return;
    }

    try {
      const res = await apiFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.error || 'Registration failed.');
      } else {
        setSuccessMessage('Patient successfully registered!');
        fetchPatients();
        onStatsChange(); // update dashboard statistics
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error occurred during registration.');
    }
  };

  // Filtering Logic
  const filteredPatients = patients.filter(p => {
    const searchMatch = 
      p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.out_patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm) ||
      (p.main_diagnosis && p.main_diagnosis.toLowerCase().includes(searchTerm.toLowerCase()));

    const genderMatch = selectedGender === 'All' || p.gender === selectedGender;
    const diagnosisMatch = selectedDiagnosis === 'All' || p.main_diagnosis === selectedDiagnosis;
    const hospitalMatch = selectedHospital === 'All' || p.hospital === selectedHospital;

    return searchMatch && genderMatch && diagnosisMatch && hospitalMatch;
  });

  // Extract unique values for filter lists
  const diagnosesList = ['All', ...new Set(patients.map(p => p.main_diagnosis).filter(Boolean))];
  const hospitalsList = ['All', ...new Set(patients.map(p => p.hospital).filter(Boolean))];

  const getDiagnosisTagClass = (diag) => {
    if (!diag) return 'tag-blue';
    const d = diag.toLowerCase();
    if (d.includes('hip') || d.includes('ddh')) return 'tag-red';
    if (d.includes('clubfoot') || d.includes('equinovarus')) return 'tag-teal';
    if (d.includes('fracture') || d.includes('humerus')) return 'tag-blue';
    if (d.includes('scoliosis')) return 'tag-yellow';
    return 'tag-blue';
  };

  return (
    <>
      {/* Header */}
      <div className="content-header">
        <div className="header-title-section">
          <h2>Patient Registry</h2>
          <p>Search, filter, and register pediatric orthopedic cases</p>
        </div>
        <div className="header-action-section">
          <button className="btn btn-primary" onClick={openRegistrationModal}>
            <UserPlus size={18} />
            Register New Patient
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="search-input-wrap">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search by Name, Patient ID, Mobile, or Diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="filter-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            <Filter size={16} />
            <span>Filters:</span>
          </div>

          <select 
            className="filter-select"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select 
            className="filter-select"
            value={selectedDiagnosis}
            onChange={(e) => setSelectedDiagnosis(e.target.value)}
          >
            <option value="All">All Diagnoses</option>
            {diagnosesList.filter(d => d !== 'All').map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
          >
            <option value="All">All Hospitals</option>
            {hospitalsList.filter(h => h !== 'All').map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Listing Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Out-Patient ID</th>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Hospital / Unit</th>
              <th>Main Diagnosis</th>
              <th>Reg. Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No matching patients found in the Excel database.
                </td>
              </tr>
            ) : (
              filteredPatients.map(p => (
                <tr 
                  key={p.out_patient_id} 
                  className="patient-clickable-row" 
                  onClick={() => viewPatientDetails(p.out_patient_id)}
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {p.out_patient_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.patient_name}</td>
                  <td>{calculateAge(p.dob)}</td>
                  <td>{p.gender}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.hospital}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.unit}</div>
                  </td>
                  <td>
                    <span className={`tag ${getDiagnosisTagClass(p.main_diagnosis)}`}>
                      {p.main_diagnosis}
                    </span>
                  </td>
                  <td>{p.registered_date}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={() => viewPatientDetails(p.out_patient_id)}>
                      View Profile
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Pediatric Orthopedic Patient</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {errorMessage && (
                  <div className="alert-banner" style={{ margin: '0 0 24px 0', padding: '10px 14px' }}>
                    <div className="alert-message">
                      <AlertTriangle size={18} />
                      <span style={{ fontSize: '0.85rem' }}>{errorMessage}</span>
                    </div>
                  </div>
                )}
                
                {successMessage && (
                  <div className="alert-banner" style={{ margin: '0 0 24px 0', padding: '10px 14px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'rgba(22, 163, 74, 0.2)' }}>
                    <div className="alert-message">
                      <Check size={18} />
                      <span style={{ fontSize: '0.85rem' }}>{successMessage}</span>
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label>Out-Patient ID *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        name="out_patient_id"
                        value={formData.out_patient_id}
                        onChange={handleInputChange}
                        placeholder="OP-YYYY-NNNN"
                        required
                        style={{ fontFamily: 'monospace', flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={generateOPID}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Auto-Gen
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Patient Name *</label>
                    <input 
                      type="text" 
                      name="patient_name"
                      value={formData.patient_name}
                      onChange={handleInputChange}
                      placeholder="Enter Full Name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Parent Mobile No.</label>
                    <input 
                      type="tel" 
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input 
                      type="date" 
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select 
                      name="gender" 
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Hospital Site *</label>
                    <input 
                      type="text" 
                      name="hospital"
                      value={formData.hospital}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Clinical Unit *</label>
                    <input 
                      type="text" 
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Main Diagnosis *</label>
                    <select 
                      name="main_diagnosis"
                      value={formData.main_diagnosis}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Developmental Dysplasia of the Hip (DDH)">Developmental Dysplasia of the Hip (DDH)</option>
                      <option value="Congenital Talipes Equinovarus (Clubfoot)">Congenital Talipes Equinovarus (Clubfoot)</option>
                      <option value="Scoliosis">Scoliosis</option>
                      <option value="Supracondylar Humerus Fracture">Supracondylar Humerus Fracture</option>
                      <option value="Femur Fracture">Femur Fracture</option>
                      <option value="Osteogenesis Imperfecta">Osteogenesis Imperfecta</option>
                      <option value="Perthes Disease">Perthes Disease</option>
                      <option value="Slipped Capital Femoral Epiphysis (SCFE)">Slipped Capital Femoral Epiphysis (SCFE)</option>
                      <option value="Other Pediatric Orthopedic Anomaly">Other Pediatric Orthopedic Anomaly</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Patient
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

export default PatientDirectory;
