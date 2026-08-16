const fs = require('fs');
const path = require('path');

// El archivo de sesiones se guarda en la raíz del proyecto
// (o dentro de DATA_DIR si está definido, ej. en producción con disco persistente)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions_data.json');

// ─── Carga inicial: si ya existían sesiones guardadas, las recuperamos ────
function loadSessionsFromDisk() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('⚠️ No se pudieron cargar sesiones previas, se inicia vacío:', err.message);
  }
  return {};
}

const sessions = loadSessionsFromDisk();

// ─── Guardado en disco (escritura atómica, igual que en excel.js) ─────────
function persistSessions() {
  try {
    const tempPath = SESSIONS_FILE + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(sessions, null, 2));
    fs.renameSync(tempPath, SESSIONS_FILE);
  } catch (err) {
    console.error('⚠️ Error guardando sesiones en disco:', err.message);
  }
}

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      userId,
      flow: null,       // flujo activo: 'psico', 'legal', etc.
      step: 'menu',      // paso actual dentro del flujo
      data: {},          // datos recopilados (nombre, teléfono, etc.)
      history: [],       // historial de pasos
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    persistSessions();
  }
  return sessions[userId];
}

function updateSession(userId, updates) {
  const session = getSession(userId);
  Object.assign(session, updates, { updatedAt: new Date() });
  if (updates.step) {
    session.history.push({ step: updates.step, ts: new Date() });
  }
  persistSessions();
  return session;
}

function resetSession(userId) {
  sessions[userId] = null;
  persistSessions();
  return getSession(userId);
}

function getAllSessions() {
  return sessions;
}

module.exports = { getSession, updateSession, resetSession, getAllSessions };
