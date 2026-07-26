import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Setup local media directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Excel Database Path
const DB_FILE = path.join(__dirname, 'popms_database.xlsx');

// Initialize and Seed Excel Database
async function initializeDatabase() {
  if (fs.existsSync(DB_FILE)) {
    console.log(`Database already exists at ${DB_FILE}`);
    return;
  }

  console.log('Database not found. Creating a new one with mock data...');
  const workbook = new exceljs.Workbook();
  
  // Create Patients Sheet
  const patientsSheet = workbook.addWorksheet('Patients');
  patientsSheet.columns = [
    { header: 'out_patient_id', key: 'out_patient_id', width: 15 },
    { header: 'patient_name', key: 'patient_name', width: 25 },
    { header: 'mobile', key: 'mobile', width: 18 },
    { header: 'dob', key: 'dob', width: 12 },
    { header: 'gender', key: 'gender', width: 10 },
    { header: 'hospital', key: 'hospital', width: 20 },
    { header: 'unit', key: 'unit', width: 25 },
    { header: 'main_diagnosis', key: 'main_diagnosis', width: 35 },
    { header: 'registered_date', key: 'registered_date', width: 15 }
  ];

  // Apply some styling to header row
  patientsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  patientsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
  };

  const mockPatients = [
    {
      out_patient_id: 'OP-2026-0001',
      patient_name: 'Liam Carter',
      mobile: '+1 (555) 019-2834',
      dob: '2020-04-12',
      gender: 'Male',
      hospital: "King's Hospital",
      unit: 'Pediatric Orthopedic',
      main_diagnosis: 'Developmental Dysplasia of the Hip (DDH)',
      registered_date: '2026-01-15'
    },
    {
      out_patient_id: 'OP-2026-0002',
      patient_name: 'Sophia Patel',
      mobile: '+1 (555) 014-9922',
      dob: '2025-11-05',
      gender: 'Female',
      hospital: "King's Hospital",
      unit: 'Pediatric Orthopedic',
      main_diagnosis: 'Congenital Talipes Equinovarus (Clubfoot)',
      registered_date: '2026-02-10'
    },
    {
      out_patient_id: 'OP-2026-0003',
      patient_name: 'Ethan Hunt',
      mobile: '+1 (555) 017-8833',
      dob: '2018-09-20',
      gender: 'Male',
      hospital: "King's Hospital",
      unit: 'Pediatric Orthopedic',
      main_diagnosis: 'Supracondylar Humerus Fracture',
      registered_date: '2026-07-20'
    }
  ];

  mockPatients.forEach(p => patientsSheet.addRow(p));

  // Create Visits Sheet
  const visitsSheet = workbook.addWorksheet('Visits');
  visitsSheet.columns = [
    { header: 'visit_id', key: 'visit_id', width: 15 },
    { header: 'out_patient_id', key: 'out_patient_id', width: 15 },
    { header: 'visit_date', key: 'visit_date', width: 12 },
    { header: 'visit_type', key: 'visit_type', width: 15 },
    { header: 'height_cm', key: 'height_cm', width: 12 },
    { header: 'weight_kg', key: 'weight_kg', width: 12 },
    { header: 'affected_side', key: 'affected_side', width: 15 },
    { header: 'clinical_notes', key: 'clinical_notes', width: 50 },
    { header: 'diagnosis', key: 'diagnosis', width: 35 },
    { header: 'treatment_plan', key: 'treatment_plan', width: 35 },
    { header: 'media_urls', key: 'media_urls', width: 40 },
    { header: 'follow_up_date', key: 'follow_up_date', width: 15 },
    { header: 'follow_up_status', key: 'follow_up_status', width: 15 }
  ];

  visitsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  visitsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' } // Teal
  };

  const mockVisits = [
    // Liam Carter (DDH)
    {
      visit_id: 'V-10001',
      out_patient_id: 'OP-2026-0001',
      visit_date: '2026-01-15',
      visit_type: 'Initial',
      height_cm: 110,
      weight_kg: 18.0,
      affected_side: 'Left',
      clinical_notes: 'Limping noticed by parents. Ultrasound shows incomplete coverage of femoral head. Subluxation of left hip. Discussed pelvic osteotomy procedure.',
      diagnosis: 'Developmental Dysplasia of the Hip (DDH) - Subluxation',
      treatment_plan: 'Schedule closed/open reduction & pelvic osteotomy.',
      media_urls: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600', // Mock placeholder image
      follow_up_date: '2026-03-10',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-10002',
      out_patient_id: 'OP-2026-0001',
      visit_date: '2026-03-10',
      visit_type: 'Post-Op',
      height_cm: 111,
      weight_kg: 18.2,
      affected_side: 'Left',
      clinical_notes: 'Patient post-op 4 weeks. Left pelvic osteotomy completed successfully. Spica cast is clean, dry and intact. No signs of distress or skin issues.',
      diagnosis: 'Post-op Pelvic Osteotomy - Spica Cast check',
      treatment_plan: 'Keep cast. Return in 6 weeks for cast removal & X-ray check.',
      media_urls: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600',
      follow_up_date: '2026-04-20',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-10003',
      out_patient_id: 'OP-2026-0001',
      visit_date: '2026-04-20',
      visit_type: 'Follow-up',
      height_cm: 112,
      weight_kg: 18.5,
      affected_side: 'Left',
      clinical_notes: 'Spica cast removed. X-ray shows good bony consolidation of the osteotomy site. Hip stable. Soft tissue healing clean.',
      diagnosis: 'Post-cast Pelvic Osteotomy follow-up',
      treatment_plan: 'Initiate gentle range of motion physical therapy. Partial weight-bearing for 2 weeks.',
      media_urls: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?q=80&w=600',
      follow_up_date: '2026-08-05',
      follow_up_status: 'Pending'
    },
    // Sophia Patel (Clubfoot)
    {
      visit_id: 'V-20001',
      out_patient_id: 'OP-2026-0002',
      visit_date: '2026-02-10',
      visit_type: 'Initial',
      height_cm: 65,
      weight_kg: 7.2,
      affected_side: 'Bilateral',
      clinical_notes: 'Bilateral rigid clubfoot. Adduction, varus, and equinus deformities present. Pirani score: 5.5. Recommending Ponseti serial casting.',
      diagnosis: 'Congenital Talipes Equinovarus (Bilateral Clubfoot)',
      treatment_plan: 'Apply 1st Ponseti serial cast.',
      media_urls: '',
      follow_up_date: '2026-02-17',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-20002',
      out_patient_id: 'OP-2026-0002',
      visit_date: '2026-02-17',
      visit_type: 'Follow-up',
      height_cm: 65.5,
      weight_kg: 7.3,
      affected_side: 'Bilateral',
      clinical_notes: 'Cast 1 removed. Pirani score improved to 4.5. Correction moving well. Reapplied serial cast 2.',
      diagnosis: 'Clubfoot correction - Cast 2',
      treatment_plan: 'Weekly cast change.',
      media_urls: '',
      follow_up_date: '2026-02-24',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-20003',
      out_patient_id: 'OP-2026-0002',
      visit_date: '2026-03-24',
      visit_type: 'Post-Op',
      height_cm: 67,
      weight_kg: 7.8,
      affected_side: 'Bilateral',
      clinical_notes: 'Percutaneous Achilles Tenotomy done last week to correct residual equinus. Casted in full correction for 3 weeks.',
      diagnosis: 'Clubfoot post-tenotomy cast check',
      treatment_plan: 'Keep cast for 2 more weeks. Fit for Mitchell boots and bar braces.',
      media_urls: '',
      follow_up_date: '2026-04-14',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-20004',
      out_patient_id: 'OP-2026-0002',
      visit_date: '2026-04-14',
      visit_type: 'Follow-up',
      height_cm: 68,
      weight_kg: 8.1,
      affected_side: 'Bilateral',
      clinical_notes: 'Cast removed. Feet are clinically fully corrected and flexible. Mitchell boots and bar bracing initiated.',
      diagnosis: 'Bilateral clubfoot - Corrected, Bracing phase',
      treatment_plan: 'Brace wear 23 hrs/day for 3 months, then nightly check.',
      media_urls: '',
      follow_up_date: '2026-07-15',
      follow_up_status: 'Overdue' // This one has passed the current date (July 25, 2026) -> Triggering "Overdue" status!
    },
    // Ethan Hunt (Fracture)
    {
      visit_id: 'V-30001',
      out_patient_id: 'OP-2026-0003',
      visit_date: '2026-07-20',
      visit_type: 'Initial',
      height_cm: 125,
      weight_kg: 24.0,
      affected_side: 'Right',
      clinical_notes: 'Fell from school playground bars. Severe swelling and visual deformity in right elbow. Gartland Type III supracondylar humerus fracture on X-ray. Pulses and nerves intact.',
      diagnosis: 'Gartland Type III Supracondylar Humerus Fracture Right',
      treatment_plan: 'Urgent Closed Reduction and Percutaneous Pinning (CRPP) in OR.',
      media_urls: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600',
      follow_up_date: '2026-07-21',
      follow_up_status: 'Completed'
    },
    {
      visit_id: 'V-30002',
      out_patient_id: 'OP-2026-0003',
      visit_date: '2026-07-21',
      visit_type: 'Post-Op',
      height_cm: 125,
      weight_kg: 24.0,
      affected_side: 'Right',
      clinical_notes: 'Day 1 Post-op CRPP right elbow. Two lateral K-wires visible. Splint dry, pulses good. Repeat X-ray shows stable anatomical alignment.',
      diagnosis: 'Post-op CRPP Right Supracondylar Fracture',
      treatment_plan: 'Discharge with pin care guidelines. Keep cast dry. Schedule pin removal in 3 weeks.',
      media_urls: '',
      follow_up_date: '2026-08-11',
      follow_up_status: 'Pending'
    }
  ];

  mockVisits.forEach(v => visitsSheet.addRow(v));

  await workbook.xlsx.writeFile(DB_FILE);
  console.log(`Excel Database successfully created with mock data at ${DB_FILE}`);
}

// Helper to read all rows of a worksheet
async function readSheetData(sheetName) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(DB_FILE);
  const worksheet = workbook.getWorksheet(sheetName);
  
  const headers = [];
  const rows = [];
  
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers
    const rowObject = {};
    headers.forEach((header, colNumber) => {
      let cellValue = row.getCell(colNumber).value;
      
      // Format formulas or objects
      if (cellValue && typeof cellValue === 'object') {
        if (cellValue.text) cellValue = cellValue.text;
        else if (cellValue.result !== undefined) cellValue = cellValue.result;
      }
      
      rowObject[header] = cellValue === null || cellValue === undefined ? '' : cellValue;
    });
    rows.push(rowObject);
  });
  
  return rows;
}

// Helper to write a row to a worksheet
async function appendRowToSheet(sheetName, dataObject) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(DB_FILE);
  const worksheet = workbook.getWorksheet(sheetName);
  
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  const rowValues = [];
  headers.forEach((header, colNumber) => {
    rowValues[colNumber] = dataObject[header] !== undefined && dataObject[header] !== null 
      ? dataObject[header] 
      : '';
  });
  
  worksheet.addRow(rowValues);
  await workbook.xlsx.writeFile(DB_FILE);
}

// Helper to update a row
async function updateRowInSheet(sheetName, keyColName, keyValue, updateData) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(DB_FILE);
  const worksheet = workbook.getWorksheet(sheetName);
  
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  const keyColIdx = headers.indexOf(keyColName);
  if (keyColIdx === -1) {
    throw new Error(`Key column '${keyColName}' not found in sheet '${sheetName}'`);
  }
  
  let updated = false;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const currentVal = row.getCell(keyColIdx).value;
    if (String(currentVal) === String(keyValue)) {
      headers.forEach((header, colIdx) => {
        if (updateData[header] !== undefined) {
          row.getCell(colIdx).value = updateData[header];
        }
      });
      updated = true;
    }
  });
  
  if (!updated) {
    throw new Error(`Row with ${keyColName}=${keyValue} not found in ${sheetName}`);
  }
  
  await workbook.xlsx.writeFile(DB_FILE);
}

// Configure Storage for Multer (file upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// API: Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await readSheetData('Patients');
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve patients from database.' });
  }
});

// API: Register a new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { out_patient_id, patient_name, mobile, dob, gender, hospital, unit, main_diagnosis } = req.body;
    
    if (!out_patient_id || !patient_name || !dob || !gender || !main_diagnosis) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }
    
    // Check duplication
    const patients = await readSheetData('Patients');
    const existing = patients.find(p => p.out_patient_id === out_patient_id);
    if (existing) {
      return res.status(400).json({ error: `Out-Patient ID ${out_patient_id} is already registered.` });
    }
    
    const newPatient = {
      out_patient_id,
      patient_name,
      mobile: mobile || '',
      dob,
      gender,
      hospital: hospital || "King's Hospital",
      unit: unit || 'Pediatric Orthopedic',
      main_diagnosis,
      registered_date: new Date().toISOString().split('T')[0]
    };
    
    await appendRowToSheet('Patients', newPatient);
    res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register patient in Excel.' });
  }
});

// API: Get specific patient + their visit history
app.get('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patients = await readSheetData('Patients');
    const patient = patients.find(p => p.out_patient_id === id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    
    const visits = await readSheetData('Visits');
    const patientVisits = visits
      .filter(v => v.out_patient_id === id)
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date)); // Latest visit first
      
    res.json({
      ...patient,
      visits: patientVisits
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient details.' });
  }
});

// API: Add a visit for a patient
app.post('/api/patients/:id/visits', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      visit_type, height_cm, weight_kg, affected_side, 
      clinical_notes, diagnosis, treatment_plan, media_urls, 
      follow_up_date, follow_up_status 
    } = req.body;
    
    const patients = await readSheetData('Patients');
    const patient = patients.find(p => p.out_patient_id === id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    
    const visitId = 'V-' + Math.floor(10000 + Math.random() * 90000);
    
    const newVisit = {
      visit_id: visitId,
      out_patient_id: id,
      visit_date: new Date().toISOString().split('T')[0],
      visit_type: visit_type || 'Follow-up',
      height_cm: height_cm ? Number(height_cm) : '',
      weight_kg: weight_kg ? Number(weight_kg) : '',
      affected_side: affected_side || 'N/A',
      clinical_notes: clinical_notes || '',
      diagnosis: diagnosis || patient.main_diagnosis,
      treatment_plan: treatment_plan || '',
      media_urls: media_urls || '',
      follow_up_date: follow_up_date || '',
      follow_up_status: follow_up_date ? (follow_up_status || 'Pending') : ''
    };
    
    await appendRowToSheet('Visits', newVisit);
    
    // If follow up is logged in this visit, make sure other visits' old pending statuses are marked Completed if relevant,
    // but typically we just add this new one as Pending.
    
    res.status(201).json(newVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log visit in Excel.' });
  }
});

// API: Update an existing visit (e.g. mark follow-up completed, or reschedule)
app.patch('/api/visits/:visit_id', async (req, res) => {
  try {
    const { visit_id } = req.params;
    const updateData = req.body; // e.g. { follow_up_status: 'Completed' }
    
    await updateRowInSheet('Visits', 'visit_id', visit_id, updateData);
    res.json({ message: 'Visit details updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update visit status.' });
  }
});

// API: Get follow-ups list
app.get('/api/followups', async (req, res) => {
  try {
    const visits = await readSheetData('Visits');
    const patients = await readSheetData('Patients');
    
    // Filter visits that have a follow_up_date set
    const scheduledFollowUps = visits.filter(v => v.follow_up_date && v.follow_up_status !== '');
    
    // Join patient info to each follow-up
    const results = scheduledFollowUps.map(v => {
      const patient = patients.find(p => p.out_patient_id === v.out_patient_id) || {};
      return {
        visit_id: v.visit_id,
        out_patient_id: v.out_patient_id,
        patient_name: patient.patient_name || 'Unknown',
        mobile: patient.mobile || '',
        main_diagnosis: patient.main_diagnosis || '',
        visit_date: v.visit_date,
        diagnosis_recorded: v.diagnosis,
        follow_up_date: v.follow_up_date,
        follow_up_status: v.follow_up_status
      };
    });
    
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve follow-up schedules.' });
  }
});

// API: File Upload Endpoint
app.post('/api/upload', upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.json({ url: relativeUrl, filename: req.file.filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

// API: Get summary statistics for Dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const patients = await readSheetData('Patients');
    const visits = await readSheetData('Visits');
    
    // Calculate today's date in local time
    // We can parse or just use standard YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Total Patients
    const totalPatients = patients.length;
    
    // Visits logged today
    const visitsToday = visits.filter(v => v.visit_date === todayStr).length;
    
    // Follow ups tracking (relative to today or just status counts)
    const followUps = visits.filter(v => v.follow_up_date);
    
    let pendingFollowUps = 0;
    let overdueFollowUps = 0;
    
    followUps.forEach(f => {
      if (f.follow_up_status === 'Pending') {
        const isPast = new Date(f.follow_up_date) < new Date(todayStr);
        if (isPast) {
          overdueFollowUps++;
        } else {
          pendingFollowUps++;
        }
      } else if (f.follow_up_status === 'Overdue') {
        overdueFollowUps++;
      }
    });
    
    // Recent registrations (registered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = patients.filter(p => new Date(p.registered_date) >= thirtyDaysAgo).length;

    res.json({
      totalPatients,
      visitsToday,
      pendingFollowUps,
      overdueFollowUps,
      recentRegistrations,
      excelPath: DB_FILE
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate stats.' });
  }
});

// API: Download Raw Excel Sheet Backup
app.get('/api/database/backup', (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    res.download(DB_FILE, 'popms_backup.xlsx');
  } else {
    res.status(404).json({ error: 'Database file not found.' });
  }
});

// Start Server & Initialize Excel DB
app.listen(PORT, async () => {
  try {
    await initializeDatabase();
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Failed to initialize local database:', error);
  }
});
