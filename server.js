import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import exceljs from 'exceljs';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// POPMS_ENV_FILE lets a host process (e.g. the Electron wrapper) point this
// at a config file outside the app bundle, since a packaged app's own
// directory is typically read-only.
dotenv.config(process.env.POPMS_ENV_FILE ? { path: process.env.POPMS_ENV_FILE } : undefined);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 8420 avoids common collisions on both platforms (macOS AirPlay Receiver
// squats on 5000/7000; 3000/8000/8080 are common dev-server defaults).
const PORT = process.env.PORT || 8420;

app.use(cors());
app.use(express.json());

// Setup local media directory (used when Google Drive storage is not configured)
// POPMS_UPLOADS_DIR overrides this to a writable location outside the app bundle.
const UPLOADS_DIR = process.env.POPMS_UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Excel Database Path (fallback when Google Sheets is not configured)
// POPMS_DB_FILE overrides this to a writable location outside the app bundle.
const DB_FILE = process.env.POPMS_DB_FILE || path.join(__dirname, 'popms_database.xlsx');

// Shared table schema, used by both the Excel and Google Sheets backends
const TABLE_SCHEMAS = {
  Patients: ['out_patient_id', 'patient_name', 'mobile', 'dob', 'gender', 'hospital', 'unit', 'main_diagnosis', 'registered_date'],
  Visits: ['visit_id', 'out_patient_id', 'visit_date', 'visit_type', 'height_cm', 'weight_kg', 'affected_side', 'clinical_notes', 'diagnosis', 'treatment_plan', 'media_urls', 'follow_up_date', 'follow_up_status'],
  Profiles: ['id', 'email', 'role', 'created_at']
};

const COLUMN_WIDTHS = {
  out_patient_id: 15, patient_name: 25, mobile: 18, dob: 12, gender: 10, hospital: 20, unit: 25, main_diagnosis: 35, registered_date: 15,
  visit_id: 15, visit_date: 12, visit_type: 15, height_cm: 12, weight_kg: 12, affected_side: 15, clinical_notes: 50, diagnosis: 35, treatment_plan: 35, media_urls: 40, follow_up_date: 15, follow_up_status: 15,
  id: 30, email: 30, role: 12, created_at: 15
};

const SHEET_HEADER_COLORS = {
  Patients: 'FF1E3A8A',
  Visits: 'FF0D9488',
  Profiles: 'FF7C3AED'
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

// ── Google API client setup ──────────────────────────────────────────────

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Google] GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON:', err.message);
      return null;
    }
  }
  if (filePath && fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error('[Google] Failed to read GOOGLE_SERVICE_ACCOUNT_KEY_FILE:', err.message);
      return null;
    }
  }
  return null;
}

const serviceAccountCreds = loadServiceAccountCredentials();
let sheetsApi = null;
let driveApi = null;

if (serviceAccountCreds) {
  const googleAuth = new google.auth.GoogleAuth({
    credentials: serviceAccountCreds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  sheetsApi = google.sheets({ version: 'v4', auth: googleAuth });
  driveApi = google.drive({ version: 'v3', auth: googleAuth });
}

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || null;
const googleOAuthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;

// ── Session signing ───────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('[Auth] SESSION_SECRET is not set — using a temporary secret for this run. All sessions will be invalidated on restart. Set SESSION_SECRET in .env for persistent sessions.');
}

// ── Excel backend (fallback database) ───────────────────────────────────

function createExcelBackend(dbFile) {
  async function initialize() {
    if (fs.existsSync(dbFile)) return;

    const workbook = new exceljs.Workbook();
    for (const table of Object.keys(TABLE_SCHEMAS)) {
      const sheet = workbook.addWorksheet(table);
      sheet.columns = TABLE_SCHEMAS[table].map(col => ({ header: col, key: col, width: COLUMN_WIDTHS[col] || 20 }));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SHEET_HEADER_COLORS[table] } };
    }
    mockPatients.forEach(p => workbook.getWorksheet('Patients').addRow(p));
    mockVisits.forEach(v => workbook.getWorksheet('Visits').addRow(v));

    await workbook.xlsx.writeFile(dbFile);
  }

  async function list(table) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(dbFile);
    const worksheet = workbook.getWorksheet(table);
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

  async function insert(table, dataObject) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(dbFile);
    const worksheet = workbook.getWorksheet(table);
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    const rowValues = [];
    headers.forEach((header, colNumber) => {
      rowValues[colNumber] = dataObject[header] !== undefined && dataObject[header] !== null ? dataObject[header] : '';
    });
    worksheet.addRow(rowValues);
    await workbook.xlsx.writeFile(dbFile);
  }

  async function update(table, keyColName, keyValue, updateData) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(dbFile);
    const worksheet = workbook.getWorksheet(table);
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    const keyColIdx = headers.indexOf(keyColName);
    if (keyColIdx === -1) {
      throw new Error(`Key column '${keyColName}' not found in sheet '${table}'`);
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
      throw new Error(`Row with ${keyColName}=${keyValue} not found in ${table}`);
    }
    await workbook.xlsx.writeFile(dbFile);
  }

  return { type: 'excel', initialize, list, insert, update };
}

// ── Google Sheets backend ─────────────────────────────────────────────────

function columnLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function createSheetsBackend(spreadsheetId) {
  async function ensureSheet(table) {
    const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets.map(s => s.properties.title);
    if (!existingTitles.includes(table)) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: table } } }] }
      });
    }
    const header = TABLE_SCHEMAS[table];
    const lastCol = columnLetter(header.length - 1);
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `${table}!A1:${lastCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] }
    });
  }

  async function initialize() {
    await sheetsApi.spreadsheets.get({ spreadsheetId });
    for (const table of Object.keys(TABLE_SCHEMAS)) {
      await ensureSheet(table);
    }
    const patients = await list('Patients');
    if (patients.length === 0) {
      for (const p of mockPatients) await insert('Patients', p);
      for (const v of mockVisits) await insert('Visits', v);
    }
  }

  async function list(table) {
    const header = TABLE_SCHEMAS[table];
    const lastCol = columnLetter(header.length - 1);
    const res = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: `${table}!A2:${lastCol}20000` });
    const rows = res.data.values || [];
    return rows.filter(r => r.length > 0).map(row => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
  }

  async function insert(table, dataObject) {
    const header = TABLE_SCHEMAS[table];
    const rowValues = header.map(h => (dataObject[h] !== undefined && dataObject[h] !== null ? dataObject[h] : ''));
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId,
      range: `${table}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] }
    });
  }

  async function update(table, keyColName, keyValue, updateData) {
    const header = TABLE_SCHEMAS[table];
    const keyIdx = header.indexOf(keyColName);
    const lastCol = columnLetter(header.length - 1);
    const res = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: `${table}!A2:${lastCol}20000` });
    const rows = res.data.values || [];
    const rowIdx = rows.findIndex(r => String(r[keyIdx]) === String(keyValue));
    if (rowIdx === -1) {
      throw new Error(`Row with ${keyColName}=${keyValue} not found in ${table}`);
    }
    const existing = rows[rowIdx];
    const merged = header.map((h, i) => (updateData[h] !== undefined ? updateData[h] : (existing[i] !== undefined ? existing[i] : '')));
    const sheetRowNumber = rowIdx + 2;
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `${table}!A${sheetRowNumber}:${lastCol}${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [merged] }
    });
  }

  return { type: 'sheets', initialize, list, insert, update };
}

// ── Engine state (resolved at boot) ────────────────────────────────────────

let db = null;
let dbEngine = 'excel';
let storageEngine = 'local';

// ── Auth ────────────────────────────────────────────────────────────────

function signSession(profile) {
  const token = jwt.sign({ sub: profile.id, email: profile.email, role: profile.role }, SESSION_SECRET, { expiresIn: '7d' });
  return { access_token: token, user: { id: profile.id, email: profile.email }, role: profile.role };
}

async function resolveProfile(id, email) {
  const profiles = await db.list('Profiles');
  const existing = profiles.find(p => p.id === id);
  if (existing) {
    return { id, email: existing.email || email, role: existing.role || 'doctor' };
  }
  const role = profiles.length === 0 ? 'admin' : 'doctor';
  await db.insert('Profiles', { id, email, role, created_at: new Date().toISOString().split('T')[0] });
  return { id, email, role };
}

app.post('/api/auth/bypass', async (req, res) => {
  try {
    const profile = await resolveProfile('local-poc-id', 'doctor@popms.com');
    res.json(signSession(profile));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start local session.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  if (!googleOAuthClient) {
    return res.status(400).json({ error: 'Google Sign-In is not configured on this server.' });
  }
  try {
    const { credential } = req.body;
    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_OAUTH_CLIENT_ID });
    const payload = ticket.getPayload();
    const profile = await resolveProfile(payload.sub, payload.email);
    res.json(signSession(profile));
  } catch (error) {
    console.error('[Auth] Google sign-in failed:', error.message);
    res.status(401).json({ error: 'Google sign-in verification failed.' });
  }
});

const authenticateJWT = (req, res, next) => {
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
    const payload = jwt.verify(token, SESSION_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
};

// ── File upload (Google Drive, falls back to local disk) ─────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/upload', authenticateJWT, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (storageEngine === 'drive') {
      const filename = `${Date.now()}-${req.file.originalname}`;
      const driveRes = await driveApi.files.create({
        requestBody: { name: filename, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] },
        media: { mimeType: req.file.mimetype, body: Readable.from(req.file.buffer) },
        fields: 'id, webViewLink'
      });
      await driveApi.permissions.create({
        fileId: driveRes.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      res.json({ url: driveRes.data.webViewLink, filename });
    } else {
      const filename = `media-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
      res.json({ url: `/uploads/${filename}`, filename });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

// ── API: Patients & Visits ────────────────────────────────────────────────

app.get('/api/patients', authenticateJWT, async (req, res) => {
  try {
    const patients = await db.list('Patients');
    patients.sort((a, b) => new Date(b.registered_date) - new Date(a.registered_date));
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve patients from database.' });
  }
});

app.post('/api/patients', authenticateJWT, async (req, res) => {
  try {
    const { out_patient_id, patient_name, mobile, dob, gender, hospital, unit, main_diagnosis } = req.body;

    if (!out_patient_id || !patient_name || !dob || !gender || !main_diagnosis) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }

    const patients = await db.list('Patients');
    if (patients.some(p => p.out_patient_id === out_patient_id)) {
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

    await db.insert('Patients', newPatient);
    res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register patient in database.' });
  }
});

app.get('/api/patients/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const patients = await db.list('Patients');
    const patient = patients.find(p => p.out_patient_id === id);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const visits = await db.list('Visits');
    const patientVisits = visits
      .filter(v => v.out_patient_id === id)
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

    res.json({ ...patient, visits: patientVisits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient details.' });
  }
});

app.post('/api/patients/:id/visits', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visit_type, height_cm, weight_kg, affected_side,
      clinical_notes, diagnosis, treatment_plan, media_urls,
      follow_up_date, follow_up_status
    } = req.body;

    const patients = await db.list('Patients');
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

    await db.insert('Visits', newVisit);
    res.status(201).json(newVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log visit in database.' });
  }
});

app.patch('/api/visits/:visit_id', authenticateJWT, async (req, res) => {
  try {
    const { visit_id } = req.params;
    await db.update('Visits', 'visit_id', visit_id, req.body);
    res.json({ message: 'Visit details updated successfully.' });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update visit status.' });
  }
});

app.get('/api/followups', authenticateJWT, async (req, res) => {
  try {
    const visits = await db.list('Visits');
    const patients = await db.list('Patients');

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve follow-up schedules.' });
  }
});

// ── API: Status (unauthenticated) ─────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    dbEngine,
    dbEngineLabel: dbEngine === 'sheets' ? 'Google Sheets' : 'Local Microsoft Excel Worksheet',
    storageEngine,
    storageEngineLabel: storageEngine === 'drive' ? 'Google Drive' : 'Local Disk Storage',
    googleSignInEnabled: !!googleOAuthClient,
    googleClientId: GOOGLE_OAUTH_CLIENT_ID
  });
});

// ── API: Dashboard stats ──────────────────────────────────────────────────

app.get('/api/stats', authenticateJWT, async (req, res) => {
  try {
    const patients = await db.list('Patients');
    const visits = await db.list('Visits');

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalPatients = patients.length;
    const visitsToday = visits.filter(v => v.visit_date === todayStr).length;

    let pendingFollowUps = 0;
    let overdueFollowUps = 0;
    visits.filter(v => v.follow_up_date).forEach(f => {
      if (f.follow_up_status === 'Pending') {
        const isPast = new Date(f.follow_up_date) < new Date(todayStr);
        if (isPast) overdueFollowUps++;
        else pendingFollowUps++;
      } else if (f.follow_up_status === 'Overdue') {
        overdueFollowUps++;
      }
    });

    const recentRegistrations = patients.filter(p => new Date(p.registered_date) >= thirtyDaysAgo).length;

    res.json({
      totalPatients,
      visitsToday,
      pendingFollowUps,
      overdueFollowUps,
      recentRegistrations,
      dbEngine,
      dbEngineLabel: dbEngine === 'sheets' ? 'Google Sheets' : 'Local Microsoft Excel Worksheet'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate stats.' });
  }
});

// ── API: User accounts (Admin only) ───────────────────────────────────────

app.get('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const profiles = await db.list('Profiles');
    res.json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve registered users.' });
  }
});

app.patch('/api/admin/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'admin' && role !== 'doctor') {
    return res.status(400).json({ error: 'Invalid role assignment. Choose admin or doctor.' });
  }

  try {
    await db.update('Profiles', 'id', id, { role });
    res.json({ message: 'User role updated successfully.' });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to assign user role.' });
  }
});

// ── API: Spreadsheet backup download (Admin only) ─────────────────────────

app.get('/api/database/backup', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    for (const table of Object.keys(TABLE_SCHEMAS)) {
      const sheet = workbook.addWorksheet(table);
      sheet.columns = TABLE_SCHEMAS[table].map(col => ({ header: col, key: col, width: COLUMN_WIDTHS[col] || 20 }));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SHEET_HEADER_COLORS[table] } };
      const rows = await db.list(table);
      rows.forEach(row => sheet.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=popms_backup.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Backup generation error:', error);
    res.status(500).json({ error: 'Failed to generate spreadsheet download.' });
  }
});

// Serve static assets in production (if built)
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  console.log('[Production] Detected static build folder. Enabling single-service static hosting.');
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

// ── Start Server and resolve database / storage engines ──────────────────

async function startServer() {
  const useLocalExcel = process.env.USE_LOCAL_EXCEL === 'true';
  const sheetsConfigured = !!(sheetsApi && process.env.GOOGLE_SHEETS_ID);

  if (!useLocalExcel && sheetsConfigured) {
    try {
      const sheetsBackend = createSheetsBackend(process.env.GOOGLE_SHEETS_ID);
      await sheetsBackend.initialize();
      db = sheetsBackend;
      dbEngine = 'sheets';
      console.log('[Database] Connected to Google Sheets.');
    } catch (err) {
      console.error('[Database] Failed to initialize Google Sheets, falling back to local Excel:', err.message);
    }
  }

  if (dbEngine !== 'sheets') {
    const excelBackend = createExcelBackend(DB_FILE);
    await excelBackend.initialize();
    db = excelBackend;
    dbEngine = 'excel';
    console.log(`[Database] Using local Excel workbook fallback at ${DB_FILE}`);
  }

  const driveConfigured = !!(driveApi && process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (driveConfigured) {
    try {
      await driveApi.files.get({ fileId: process.env.GOOGLE_DRIVE_FOLDER_ID, fields: 'id' });
      storageEngine = 'drive';
      console.log('[Storage] Connected to Google Drive folder.');
    } catch (err) {
      console.error('[Storage] Failed to access Google Drive folder, falling back to local disk storage:', err.message);
    }
  }
  if (storageEngine !== 'drive') {
    console.log(`[Storage] Using local disk storage fallback at ${UPLOADS_DIR}`);
  }

  if (!googleOAuthClient) {
    console.log('[Auth] GOOGLE_OAUTH_CLIENT_ID not set — Google Sign-In disabled, local bypass login only.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
