import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const { Pool } = pg;

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

// Excel Database Path (Fallback/PoC only)
const DB_FILE = path.join(__dirname, 'popms_database.xlsx');

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

// Database Connection States
let isPostgres = false;
let pgPool = null;
let supabase = null;

// Initialize Supabase Client if env is provided
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Date Formatter Helper
const formatDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toISOString().split('T')[0];
};

// Seed Mock Data Definitions
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

const mockVisits = [
  {
    visit_id: 'V-10001',
    out_patient_id: 'OP-2026-0001',
    visit_date: '2026-01-15',
    visit_type: 'Initial',
    height_cm: 110.0,
    weight_kg: 18.0,
    affected_side: 'Left',
    clinical_notes: 'Limping noticed by parents. Ultrasound shows incomplete coverage of femoral head. Subluxation of left hip. Discussed pelvic osteotomy procedure.',
    diagnosis: 'Developmental Dysplasia of the Hip (DDH) - Subluxation',
    treatment_plan: 'Schedule closed/open reduction & pelvic osteotomy.',
    media_urls: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600',
    follow_up_date: '2026-03-10',
    follow_up_status: 'Completed'
  },
  {
    visit_id: 'V-10002',
    out_patient_id: 'OP-2026-0001',
    visit_date: '2026-03-10',
    visit_type: 'Post-Op',
    height_cm: 111.0,
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
    height_cm: 112.0,
    weight_kg: 18.5,
    affected_side: 'Left',
    clinical_notes: 'Spica cast removed. X-ray shows good bony consolidation of the osteotomy site. Hip stable. Soft tissue healing clean.',
    diagnosis: 'Post-cast Pelvic Osteotomy follow-up',
    treatment_plan: 'Initiate gentle range of motion physical therapy. Partial weight-bearing for 2 weeks.',
    media_urls: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?q=80&w=600',
    follow_up_date: '2026-08-05',
    follow_up_status: 'Pending'
  },
  {
    visit_id: 'V-20001',
    out_patient_id: 'OP-2026-0002',
    visit_date: '2026-02-10',
    visit_type: 'Initial',
    height_cm: 65.0,
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
    height_cm: 67.0,
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
    height_cm: 68.0,
    weight_kg: 8.1,
    affected_side: 'Bilateral',
    clinical_notes: 'Cast removed. Feet are clinically fully corrected and flexible. Mitchell boots and bar bracing initiated.',
    diagnosis: 'Bilateral clubfoot - Corrected, Bracing phase',
    treatment_plan: 'Brace wear 23 hrs/day for 3 months, then nightly check.',
    media_urls: '',
    follow_up_date: '2026-07-15',
    follow_up_status: 'Overdue'
  },
  {
    visit_id: 'V-30001',
    out_patient_id: 'OP-2026-0003',
    visit_date: '2026-07-20',
    visit_type: 'Initial',
    height_cm: 125.0,
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
    height_cm: 125.0,
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

// JWT Session Authentication Middleware
const authenticateJWT = async (req, res, next) => {
  if (!isPostgres) {
    // Excel offline mode bypasses Supabase JWT token verification
    req.user = { id: 'local-poc-id', email: 'doctor@popms.com', role: 'admin' };
    return next();
  }

  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authorization token is missing or invalid.' });
  }
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured on the backend.' });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // Query local profiles table for user role
    const profileResult = await pgPool.query('SELECT role FROM profiles WHERE id = $1', [user.id]);
    
    // Default to doctor if no profile row yet
    let role = 'doctor';
    if (profileResult.rows.length > 0) {
      role = profileResult.rows[0].role;
    } else {
      // Create profile row if it doesn't exist (failsafe)
      await pgPool.query('INSERT INTO profiles (id, email, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [user.id, user.email, 'doctor']);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: role
    };
    next();
  } catch (err) {
    console.error('[Auth] Verification failed:', err.message);
    return res.status(401).json({ error: 'Session authentication failed.' });
  }
};

// Admin Protection Middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
};

// PostgreSQL Database Initializer
async function initializePostgres() {
  const client = await pgPool.connect();
  try {
    console.log('[Database] Checking / creating relational tables in Supabase PGSQL...');
    
    // Create profiles table (links to auth.users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'doctor',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);

    // Create Patients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        out_patient_id VARCHAR(50) PRIMARY KEY,
        patient_name VARCHAR(100) NOT NULL,
        mobile VARCHAR(50),
        dob DATE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        hospital VARCHAR(100) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        main_diagnosis TEXT NOT NULL,
        registered_date DATE DEFAULT CURRENT_DATE
      );
    `);

    // Create Visits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        visit_id VARCHAR(50) PRIMARY KEY,
        out_patient_id VARCHAR(50) REFERENCES patients(out_patient_id) ON DELETE CASCADE,
        visit_date DATE DEFAULT CURRENT_DATE,
        visit_type VARCHAR(50) NOT NULL,
        height_cm NUMERIC(5,2),
        weight_kg NUMERIC(5,2),
        affected_side VARCHAR(50),
        clinical_notes TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        treatment_plan TEXT,
        media_urls TEXT,
        follow_up_date DATE,
        follow_up_status VARCHAR(50)
      );
    `);

    // Create Database Triggers to automatically link profiles
    console.log('[Database] Syncing authentication trigger in schema auth...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        admin_count integer;
      BEGIN
        -- If this is the absolute first user, promote them to admin
        SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
        IF admin_count = 0 THEN
          INSERT INTO public.profiles (id, email, role)
          VALUES (new.id, new.email, 'admin')
          ON CONFLICT (id) DO NOTHING;
        ELSE
          INSERT INTO public.profiles (id, email, role)
          VALUES (new.id, new.email, 'doctor')
          ON CONFLICT (id) DO NOTHING;
        END IF;
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `);
    
    await client.query(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `);

    // Seed Patients if empty
    const checkPatients = await client.query('SELECT COUNT(*) FROM patients');
    if (parseInt(checkPatients.rows[0].count) === 0) {
      console.log('[Database] Seeding mock patients into Supabase...');
      for (const p of mockPatients) {
        await client.query(`
          INSERT INTO patients (out_patient_id, patient_name, mobile, dob, gender, hospital, unit, main_diagnosis, registered_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [p.out_patient_id, p.patient_name, p.mobile, p.dob, p.gender, p.hospital, p.unit, p.main_diagnosis, p.registered_date]);
      }
    }

    // Seed Visits if empty
    const checkVisits = await client.query('SELECT COUNT(*) FROM visits');
    if (parseInt(checkVisits.rows[0].count) === 0) {
      console.log('[Database] Seeding mock visit logs into Supabase...');
      for (const v of mockVisits) {
        await client.query(`
          INSERT INTO visits (visit_id, out_patient_id, visit_date, visit_type, height_cm, weight_kg, affected_side, clinical_notes, diagnosis, treatment_plan, media_urls, follow_up_date, follow_up_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          v.visit_id, v.out_patient_id, v.visit_date, v.visit_type,
          v.height_cm ? Number(v.height_cm) : null,
          v.weight_kg ? Number(v.weight_kg) : null,
          v.affected_side, v.clinical_notes, v.diagnosis, v.treatment_plan, v.media_urls,
          v.follow_up_date || null, v.follow_up_status || null
        ]);
      }
    }

    console.log('[Database] Supabase SQL Database initialized successfully!');
  } finally {
    client.release();
  }
}

// Fallback Excel Database Initializer
async function initializeExcelDatabase() {
  if (fs.existsSync(DB_FILE)) {
    console.log(`[Database] Excel fallback database verified at ${DB_FILE}`);
    return;
  }

  console.log('[Database] Excel database not found. Initializing a new template on disk...');
  const workbook = new exceljs.Workbook();
  
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

  patientsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  patientsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  };
  mockPatients.forEach(p => patientsSheet.addRow(p));

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
    fgColor: { argb: 'FF0D9488' }
  };
  mockVisits.forEach(v => visitsSheet.addRow(v));

  await workbook.xlsx.writeFile(DB_FILE);
  console.log(`[Database] Fallback Excel Database created successfully with mock data.`);
}

// Helper to read Excel Worksheet rows
async function readExcelSheet(sheetName) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(DB_FILE);
  const worksheet = workbook.getWorksheet(sheetName);
  const headers = [];
  const rows = [];
  
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowObject = {};
    headers.forEach((header, colNumber) => {
      let cellValue = row.getCell(colNumber).value;
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

// Helper to append Excel Worksheet row
async function appendExcelRow(sheetName, dataObject) {
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

// Helper to update Excel Worksheet row
async function updateExcelRow(sheetName, keyColName, keyValue, updateData) {
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

// API: Get all patients
app.get('/api/patients', authenticateJWT, async (req, res) => {
  try {
    if (isPostgres) {
      const result = await pgPool.query('SELECT * FROM patients ORDER BY registered_date DESC');
      const formatted = result.rows.map(r => ({
        ...r,
        dob: formatDate(r.dob),
        registered_date: formatDate(r.registered_date)
      }));
      res.json(formatted);
    } else {
      const patients = await readExcelSheet('Patients');
      res.json(patients);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve patients from database.' });
  }
});

// API: Register a new patient
app.post('/api/patients', authenticateJWT, async (req, res) => {
  try {
    const { out_patient_id, patient_name, mobile, dob, gender, hospital, unit, main_diagnosis } = req.body;
    
    if (!out_patient_id || !patient_name || !dob || !gender || !main_diagnosis) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }
    
    // Check duplication
    let existing = null;
    if (isPostgres) {
      const result = await pgPool.query('SELECT * FROM patients WHERE out_patient_id = $1', [out_patient_id]);
      if (result.rows.length > 0) existing = result.rows[0];
    } else {
      const patients = await readExcelSheet('Patients');
      existing = patients.find(p => p.out_patient_id === out_patient_id);
    }

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
    
    if (isPostgres) {
      await pgPool.query(`
        INSERT INTO patients (out_patient_id, patient_name, mobile, dob, gender, hospital, unit, main_diagnosis, registered_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [newPatient.out_patient_id, newPatient.patient_name, newPatient.mobile, newPatient.dob, newPatient.gender, newPatient.hospital, newPatient.unit, newPatient.main_diagnosis, newPatient.registered_date]);
    } else {
      await appendExcelRow('Patients', newPatient);
    }

    res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register patient in database.' });
  }
});

// API: Get specific patient + their visit history
app.get('/api/patients/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    let patient = null;
    let patientVisits = [];

    if (isPostgres) {
      const pResult = await pgPool.query('SELECT * FROM patients WHERE out_patient_id = $1', [id]);
      if (pResult.rows.length > 0) {
        patient = {
          ...pResult.rows[0],
          dob: formatDate(pResult.rows[0].dob),
          registered_date: formatDate(pResult.rows[0].registered_date)
        };
        const vResult = await pgPool.query('SELECT * FROM visits WHERE out_patient_id = $1 ORDER BY visit_date DESC', [id]);
        patientVisits = vResult.rows.map(v => ({
          ...v,
          visit_date: formatDate(v.visit_date),
          follow_up_date: formatDate(v.follow_up_date),
          height_cm: v.height_cm ? Number(v.height_cm) : '',
          weight_kg: v.weight_kg ? Number(v.weight_kg) : ''
        }));
      }
    } else {
      const patients = await readExcelSheet('Patients');
      const found = patients.find(p => p.out_patient_id === id);
      if (found) {
        patient = found;
        const visits = await readExcelSheet('Visits');
        patientVisits = visits
          .filter(v => v.out_patient_id === id)
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
      }
    }
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    
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
app.post('/api/patients/:id/visits', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      visit_type, height_cm, weight_kg, affected_side, 
      clinical_notes, diagnosis, treatment_plan, media_urls, 
      follow_up_date, follow_up_status 
    } = req.body;
    
    let mainDiag = '';
    if (isPostgres) {
      const result = await pgPool.query('SELECT main_diagnosis FROM patients WHERE out_patient_id = $1', [id]);
      if (result.rows.length > 0) mainDiag = result.rows[0].main_diagnosis;
    } else {
      const patients = await readExcelSheet('Patients');
      const patient = patients.find(p => p.out_patient_id === id);
      if (patient) mainDiag = patient.main_diagnosis;
    }

    if (!mainDiag) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    
    const visitId = 'V-' + Math.floor(10000 + Math.random() * 90000);
    
    const newVisit = {
      visit_id: visitId,
      out_patient_id: id,
      visit_date: new Date().toISOString().split('T')[0],
      visit_type: visit_type || 'Follow-up',
      height_cm: height_cm ? Number(height_cm) : null,
      weight_kg: weight_kg ? Number(weight_kg) : null,
      affected_side: affected_side || 'N/A',
      clinical_notes: clinical_notes || '',
      diagnosis: diagnosis || mainDiag,
      treatment_plan: treatment_plan || '',
      media_urls: media_urls || '',
      follow_up_date: follow_up_date || null,
      follow_up_status: follow_up_date ? (follow_up_status || 'Pending') : ''
    };
    
    if (isPostgres) {
      await pgPool.query(`
        INSERT INTO visits (visit_id, out_patient_id, visit_date, visit_type, height_cm, weight_kg, affected_side, clinical_notes, diagnosis, treatment_plan, media_urls, follow_up_date, follow_up_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        newVisit.visit_id, newVisit.out_patient_id, newVisit.visit_date, newVisit.visit_type,
        newVisit.height_cm, newVisit.weight_kg, newVisit.affected_side, newVisit.clinical_notes,
        newVisit.diagnosis, newVisit.treatment_plan, newVisit.media_urls,
        newVisit.follow_up_date, newVisit.follow_up_status
      ]);
    } else {
      await appendExcelRow('Visits', newVisit);
    }
    
    res.status(201).json(newVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log visit in database.' });
  }
});

// API: Update an existing visit (e.g. mark follow-up completed, or reschedule)
app.patch('/api/visits/:visit_id', authenticateJWT, async (req, res) => {
  try {
    const { visit_id } = req.params;
    const updateData = req.body;
    
    if (isPostgres) {
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      
      if (keys.length > 0) {
        const setQuery = keys.map((k, index) => `${k} = $${index + 1}`).join(', ');
        values.push(visit_id);
        await pgPool.query(`UPDATE visits SET ${setQuery} WHERE visit_id = $${values.length}`, values);
      }
    } else {
      await updateExcelRow('Visits', 'visit_id', visit_id, updateData);
    }

    res.json({ message: 'Visit details updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update visit status.' });
  }
});

// API: Get follow-ups list
app.get('/api/followups', authenticateJWT, async (req, res) => {
  try {
    if (isPostgres) {
      const result = await pgPool.query(`
        SELECT v.visit_id, v.out_patient_id, p.patient_name, p.mobile, p.main_diagnosis,
               v.visit_date, v.diagnosis AS diagnosis_recorded, v.follow_up_date, v.follow_up_status
        FROM visits v
        JOIN patients p ON v.out_patient_id = p.out_patient_id
        WHERE v.follow_up_date IS NOT NULL AND v.follow_up_status IS NOT NULL AND v.follow_up_status <> ''
      `);
      const formatted = result.rows.map(r => ({
        ...r,
        visit_date: formatDate(r.visit_date),
        follow_up_date: formatDate(r.follow_up_date)
      }));
      res.json(formatted);
    } else {
      const visits = await readExcelSheet('Visits');
      const patients = await readExcelSheet('Patients');
      
      const scheduledFollowUps = visits.filter(v => v.follow_up_date && v.follow_up_status !== '');
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
    }
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
app.get('/api/stats', authenticateJWT, async (req, res) => {
  try {
    let totalPatients = 0;
    let visitsToday = 0;
    let pendingFollowUps = 0;
    let overdueFollowUps = 0;
    let recentRegistrations = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (isPostgres) {
      const pCountRes = await pgPool.query('SELECT COUNT(*) FROM patients');
      totalPatients = parseInt(pCountRes.rows[0].count);

      const vTodayRes = await pgPool.query('SELECT COUNT(*) FROM visits WHERE visit_date = CURRENT_DATE');
      visitsToday = parseInt(vTodayRes.rows[0].count);

      const fUpsRes = await pgPool.query("SELECT follow_up_date, follow_up_status FROM visits WHERE follow_up_date IS NOT NULL AND follow_up_status <> ''");
      fUpsRes.rows.forEach(f => {
        const fDateStr = formatDate(f.follow_up_date);
        if (f.follow_up_status === 'Pending') {
          const isPast = new Date(fDateStr) < new Date(todayStr);
          if (isPast) overdueFollowUps++;
          else pendingFollowUps++;
        } else if (f.follow_up_status === 'Overdue') {
          overdueFollowUps++;
        }
      });

      const pRecentRes = await pgPool.query('SELECT COUNT(*) FROM patients WHERE registered_date >= NOW() - INTERVAL \'30 days\'');
      recentRegistrations = parseInt(pRecentRes.rows[0].count);

    } else {
      const patients = await readExcelSheet('Patients');
      const visits = await readExcelSheet('Visits');
      
      totalPatients = patients.length;
      visitsToday = visits.filter(v => v.visit_date === todayStr).length;
      
      const followUps = visits.filter(v => v.follow_up_date);
      followUps.forEach(f => {
        if (f.follow_up_status === 'Pending') {
          const isPast = new Date(f.follow_up_date) < new Date(todayStr);
          if (isPast) overdueFollowUps++;
          else pendingFollowUps++;
        } else if (f.follow_up_status === 'Overdue') {
          overdueFollowUps++;
        }
      });
      recentRegistrations = patients.filter(p => new Date(p.registered_date) >= thirtyDaysAgo).length;
    }

    res.json({
      totalPatients,
      visitsToday,
      pendingFollowUps,
      overdueFollowUps,
      recentRegistrations,
      excelPath: isPostgres ? 'Supabase cloud PostgreSQL database instance.' : DB_FILE,
      dbEngine: isPostgres ? 'PostgreSQL (Supabase Cloud)' : 'Local Microsoft Excel Worksheet'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate stats.' });
  }
});

// API: Get user accounts (Admin only)
app.get('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (isPostgres) {
      const result = await pgPool.query('SELECT id, email, role, created_at FROM public.profiles ORDER BY created_at DESC');
      const formatted = result.rows.map(r => ({
        ...r,
        created_at: formatDate(r.created_at)
      }));
      res.json(formatted);
    } else {
      res.json([
        { id: 'poc-admin-id', email: 'doctor@popms.com', role: 'admin', created_at: new Date().toISOString().split('T')[0] }
      ]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve registered users.' });
  }
});

// API: Change user role permissions (Admin only)
app.patch('/api/admin/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (role !== 'admin' && role !== 'doctor') {
    return res.status(400).json({ error: 'Invalid role assignment. Choose admin or doctor.' });
  }

  try {
    if (isPostgres) {
      await pgPool.query('UPDATE public.profiles SET role = $1 WHERE id = $2', [role, id]);
      res.json({ message: 'User role updated successfully.' });
    } else {
      res.json({ message: 'User role updated successfully (Excel Mock).' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign user role.' });
  }
});

// API: Download Raw Excel Sheet Backup (Admin only)
app.get('/api/database/backup', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (isPostgres) {
      console.log('[Database] Compiling Excel file on-the-fly from Supabase tables...');
      const workbook = new exceljs.Workbook();
      
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
      patientsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      patientsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
      
      const pResult = await pgPool.query('SELECT * FROM patients ORDER BY registered_date DESC');
      pResult.rows.forEach(p => {
        patientsSheet.addRow({
          ...p,
          dob: formatDate(p.dob),
          registered_date: formatDate(p.registered_date)
        });
      });
      
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
        fgColor: { argb: 'FF0D9488' }
      };
      
      const vResult = await pgPool.query('SELECT * FROM visits ORDER BY visit_date DESC');
      vResult.rows.forEach(v => {
        visitsSheet.addRow({
          ...v,
          visit_date: formatDate(v.visit_date),
          follow_up_date: formatDate(v.follow_up_date),
          height_cm: v.height_cm ? Number(v.height_cm) : '',
          weight_kg: v.weight_kg ? Number(v.weight_kg) : ''
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=popms_supabase_backup.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
      if (fs.existsSync(DB_FILE)) {
        res.download(DB_FILE, 'popms_backup.xlsx');
      } else {
        res.status(404).json({ error: 'Database file not found.' });
      }
    }
  } catch (error) {
    console.error('Backup generation error:', error);
    res.status(500).json({ error: 'Failed to generate spreadsheet download.' });
  }
});

// Serve static assets in production (if built)
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  console.log(`[Production] Detected static build folder. Enabling single-service static hosting.`);
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

// Start Server and Initialize Database Engine
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  const USE_LOCAL_EXCEL = process.env.USE_LOCAL_EXCEL === 'true';
  
  if (USE_LOCAL_EXCEL) {
    console.log('[Database] USE_LOCAL_EXCEL is enabled. Running in offline Excel Mode.');
    isPostgres = false;
    await initializeExcelDatabase();
  } else {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('\n❌ DATABASE CONNECTION ERROR: DATABASE_URL is missing in environment variables.');
      console.error('To run in offline PoC mode, set USE_LOCAL_EXCEL=true in your .env file.');
      console.error('To connect to Supabase Cloud, add the DATABASE_URL connection string.\n');
      process.exit(1);
    }
    
    console.log('[Database] Connecting to Supabase PostgreSQL...');
    try {
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      // Test connection
      await pgPool.query('SELECT NOW()');
      console.log('[Database] Successfully connected to Supabase PostgreSQL cloud database!');
      isPostgres = true;
      
      // Initialize SQL Tables, Profiles, Triggers, and Seed
      await initializePostgres();
      
    } catch (err) {
      console.error('\n❌ DATABASE CONNECTION ERROR: Failed to connect to Supabase PostgreSQL.');
      console.error(err.message);
      console.error('App start aborted. Verify database credentials.\n');
      process.exit(1);
    }
  }
});
