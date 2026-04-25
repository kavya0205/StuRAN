import { db } from '../firebase';
import {
  collection, getDocs, doc, getDoc, setDoc, addDoc, writeBatch
} from 'firebase/firestore';

// ─── EXPORT ──────────────────────────────────────────────────────────────────

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const buildSection = (sectionName, rows) => {
  if (!rows.length) return `##SECTION:${sectionName}\n(empty)\n`;
  const keys = Object.keys(rows[0]);
  const header = keys.map(escapeCSV).join(',');
  const body = rows.map(r => keys.map(k => escapeCSV(r[k])).join(',')).join('\n');
  return `##SECTION:${sectionName}\n${header}\n${body}\n`;
};

export const exportAllData = async (uid) => {
  let csv = `##STURAN_EXPORT\n##EXPORTED_AT:${new Date().toISOString()}\n##UID:${uid}\n\n`;

  // 1. Assignments
  const assignSnap = await getDocs(collection(db, 'users', uid, 'assignments'));
  const assignments = assignSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  csv += buildSection('assignments', assignments) + '\n';

  // 2. Exams
  const examSnap = await getDocs(collection(db, 'users', uid, 'exams'));
  const exams = examSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  csv += buildSection('exams', exams) + '\n';

  // 3. Notes
  const noteSnap = await getDocs(collection(db, 'users', uid, 'notes'));
  const notes = noteSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  csv += buildSection('notes', notes) + '\n';

  // 4. Todos
  const todoSnap = await getDocs(collection(db, 'users', uid, 'todos'));
  const todos = todoSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  csv += buildSection('todos', todos) + '\n';

  // 5. Timetables (stored in data/attendance_timetables)
  const ttSnap = await getDoc(doc(db, 'users', uid, 'data', 'attendance_timetables'));
  const timetables = ttSnap.exists() ? ttSnap.data().list || [] : [];
  csv += `##SECTION:timetables_json\n${escapeCSV(JSON.stringify(timetables))}\n\n`;

  // 6. Attendance records
  const attSnap = await getDoc(doc(db, 'users', uid, 'data', 'attendance_records'));
  const attendance = attSnap.exists() ? attSnap.data().records || {} : {};
  csv += `##SECTION:attendance_json\n${escapeCSV(JSON.stringify(attendance))}\n\n`;

  // 7. Study goal
  const goalSnap = await getDoc(doc(db, 'users', uid, 'data', 'study_goal'));
  const studyGoal = goalSnap.exists() ? goalSnap.data() : {};
  csv += `##SECTION:study_goal_json\n${escapeCSV(JSON.stringify(studyGoal))}\n\n`;

  return csv;
};

// ─── IMPORT ──────────────────────────────────────────────────────────────────

const parseCSVRow = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

const parseTableSection = (lines) => {
  if (!lines.length || lines[0] === '(empty)') return [];
  const headers = parseCSVRow(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
};

const parseJsonSection = (lines) => {
  const raw = lines.join('\n').trim();
  // Remove surrounding quotes if escapeCSV added them
  const unquoted = raw.startsWith('"') ? raw.slice(1, -1).replace(/""/g, '"') : raw;
  try { return JSON.parse(unquoted); } catch { return null; }
};

export const importAllData = async (uid, csvText) => {
  if (!csvText.startsWith('##STURAN_EXPORT')) {
    throw new Error('Invalid StuRAN export file.');
  }

  // Split into sections
  const lines = csvText.split('\n');
  const sections = {};
  let currentSection = null;
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('##SECTION:')) {
      if (currentSection) sections[currentSection] = currentLines;
      currentSection = line.replace('##SECTION:', '').trim();
      currentLines = [];
    } else if (line.startsWith('##')) {
      // skip meta lines
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentLines;

  const batch = writeBatch(db);
  const promises = [];

  // Helper: coerce string values to proper types
  const coerce = (obj) => {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === 'true') result[k] = true;
      else if (v === 'false') result[k] = false;
      else if (v !== '' && !isNaN(Number(v)) && v !== null) result[k] = Number(v);
      else result[k] = v;
    }
    return result;
  };

  // 1. Assignments
  if (sections['assignments']) {
    const rows = parseTableSection(sections['assignments'].filter(l => l.trim()));
    for (const row of rows) {
      const { _id, ...data } = coerce(row);
      if (_id) {
        batch.set(doc(db, 'users', uid, 'assignments', _id), data);
      }
    }
  }

  // 2. Exams
  if (sections['exams']) {
    const rows = parseTableSection(sections['exams'].filter(l => l.trim()));
    for (const row of rows) {
      const { _id, ...data } = coerce(row);
      if (_id) {
        batch.set(doc(db, 'users', uid, 'exams', _id), data);
      }
    }
  }

  // 3. Notes
  if (sections['notes']) {
    const rows = parseTableSection(sections['notes'].filter(l => l.trim()));
    for (const row of rows) {
      const { _id, ...data } = coerce(row);
      if (_id) {
        batch.set(doc(db, 'users', uid, 'notes', _id), data);
      }
    }
  }

  // 4. Todos
  if (sections['todos']) {
    const rows = parseTableSection(sections['todos'].filter(l => l.trim()));
    for (const row of rows) {
      const { _id, ...data } = coerce(row);
      if (_id) {
        batch.set(doc(db, 'users', uid, 'todos', _id), data);
      }
    }
  }

  // 5. Timetables (JSON)
  if (sections['timetables_json']) {
    const parsed = parseJsonSection(sections['timetables_json'].filter(l => l.trim()));
    if (parsed !== null) {
      batch.set(doc(db, 'users', uid, 'data', 'attendance_timetables'), { list: parsed });
    }
  }

  // 6. Attendance records (JSON)
  if (sections['attendance_json']) {
    const parsed = parseJsonSection(sections['attendance_json'].filter(l => l.trim()));
    if (parsed !== null) {
      batch.set(doc(db, 'users', uid, 'data', 'attendance_records'), { records: parsed });
    }
  }

  // 7. Study goal (JSON)
  if (sections['study_goal_json']) {
    const parsed = parseJsonSection(sections['study_goal_json'].filter(l => l.trim()));
    if (parsed !== null) {
      batch.set(doc(db, 'users', uid, 'data', 'study_goal'), parsed);
    }
  }

  await batch.commit();
};
