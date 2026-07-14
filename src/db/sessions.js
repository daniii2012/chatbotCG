// Sesiones en memoria — en producción esto va a Redis o DB
const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      userId,
      flow: null,       // flujo activo: 'psico', 'legal', etc.
      step: 'menu',     // paso actual dentro del flujo
      data: {},         // datos recopilados (nombre, teléfono, etc.)
      history: [],      // historial de pasos
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return sessions[userId];
}

function updateSession(userId, updates) {
  const session = getSession(userId);
  Object.assign(session, updates, { updatedAt: new Date() });
  if (updates.step) {
    session.history.push({ step: updates.step, ts: new Date() });
  }
  return session;
}

function resetSession(userId) {
  sessions[userId] = null;
  return getSession(userId);
}

function getAllSessions() {
  return sessions;
}

module.exports = { getSession, updateSession, resetSession, getAllSessions };
