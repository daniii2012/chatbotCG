// ═══════════════════════════════════════════════════════════════
// db/equipo.js
// Personas del equipo que entran al panel admin + historial de cambios.
//  - Con MONGO_URI: se guarda en Mongo (colecciones usuarioadmins e historialadmins).
//  - Sin MONGO_URI (pruebas locales): se guarda en un archivo equipo_admin.json.
// Las contraseñas NUNCA se guardan en texto: solo un hash scrypt con sal.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Contraseñas ───────────────────────────────────────────────
function hashPassword(pw) {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), sal, 64);
  return `${sal.toString('hex')}:${h.toString('hex')}`;
}

function verificarPassword(pw, guardado) {
  if (!guardado || !String(guardado).includes(':')) return false;
  const [sal, hash] = String(guardado).split(':');
  const esperado = Buffer.from(hash, 'hex');
  const calculado = crypto.scryptSync(String(pw), Buffer.from(sal, 'hex'), 64);
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

// Contraseña temporal legible (sin 0/O/1/l/I que se confunden)
function generarPasswordTemporal() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  const todo = letras + numeros;
  let p;
  do {
    p = Array.from(crypto.randomBytes(12), (b) => todo[b % todo.length]).join('');
  } while (!/[A-Za-z]/.test(p) || !/\d/.test(p));
  return p;
}

// Reglas para la contraseña que elige cada persona
function validarPasswordNueva(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (pw.length > 100) return 'La contraseña es demasiado larga (máximo 100 caracteres).';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'La contraseña debe incluir letras y números.';
  return null;
}

// ─── Almacén en archivo (pruebas locales sin Mongo) ─────────────
function almacenArchivo() {
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
  const ARCHIVO = path.join(DATA_DIR, 'equipo_admin.json');
  const leer = () => {
    try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { return { usuarios: [], historial: [] }; }
  };
  const escribir = (d) => {
    fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(d, null, 2), 'utf8');
    fs.renameSync(ARCHIVO + '.tmp', ARCHIVO);
  };
  const clonar = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);

  return {
    tipo: 'archivo',
    usuarios: {
      async todos() { return clonar(leer().usuarios); },
      async porId(id) { return clonar(leer().usuarios.find((u) => u.id === id) || null); },
      async porCorreo(correo) { return clonar(leer().usuarios.find((u) => u.correo === correo) || null); },
      async crear(doc) {
        const d = leer();
        const u = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...doc };
        d.usuarios.push(u); escribir(d); return clonar(u);
      },
      async actualizar(id, cambios) {
        const d = leer();
        const u = d.usuarios.find((x) => x.id === id);
        if (!u) return null;
        Object.assign(u, cambios); escribir(d); return clonar(u);
      },
    },
    historial: {
      async agregar(doc) {
        const d = leer();
        const h = { id: crypto.randomUUID(), fecha: new Date().toISOString(), ...doc };
        d.historial.push(h); escribir(d); return clonar(h);
      },
      async listar({ persona, seccion, antes, limite = 50 } = {}) {
        let h = leer().historial;
        if (persona) h = h.filter((x) => x.usuarioCorreo === persona || x.usuarioNombre === persona);
        if (seccion) h = h.filter((x) => x.seccion === seccion);
        if (antes) h = h.filter((x) => new Date(x.fecha) < new Date(antes));
        h.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        return clonar(h.slice(0, limite));
      },
      async porId(id) { return clonar(leer().historial.find((x) => x.id === id) || null); },
      async actualizar(id, cambios) {
        const d = leer();
        const h = d.historial.find((x) => x.id === id);
        if (!h) return null;
        Object.assign(h, cambios); escribir(d); return clonar(h);
      },
    },
  };
}

// ─── Almacén en Mongo ───────────────────────────────────────────
function almacenMongo() {
  const mongoose = require('mongoose');

  const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    rol: { type: String, enum: ['admin', 'equipo'], default: 'equipo' },
    activo: { type: Boolean, default: true },
    passwordHash: String,
    passwordVersion: { type: Number, default: 1 },
    debeCambiarPassword: { type: Boolean, default: true },
    intentosFallidos: { type: Number, default: 0 },
    bloqueadoHasta: Date,
    ultimoAcceso: Date,
    creadoPor: String,
  }, { timestamps: true });

  const historialSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now, index: true },
    usuarioId: String,
    usuarioNombre: String,
    usuarioCorreo: String,
    tipo: String,
    seccion: String,
    resumen: String,
    detalles: [String],
    clave: String,
    antes: mongoose.Schema.Types.Mixed,
    despues: mongoose.Schema.Types.Mixed,
    deshecho: Boolean,
    deshechoPor: String,
    deshechoEn: Date,
  });

  const Usuario = mongoose.models.UsuarioAdmin || mongoose.model('UsuarioAdmin', usuarioSchema);
  const Historial = mongoose.models.HistorialAdmin || mongoose.model('HistorialAdmin', historialSchema);

  const norm = (d) => (d ? { ...d, id: String(d._id) } : null);
  const esIdValido = (id) => mongoose.isValidObjectId ? mongoose.isValidObjectId(id) : /^[a-f\d]{24}$/i.test(String(id));

  return {
    tipo: 'mongo',
    usuarios: {
      async todos() { return (await Usuario.find({}).sort({ createdAt: 1 }).lean()).map(norm); },
      async porId(id) { return esIdValido(id) ? norm(await Usuario.findById(id).lean()) : null; },
      async porCorreo(correo) { return norm(await Usuario.findOne({ correo }).lean()); },
      async crear(doc) { const u = await Usuario.create(doc); return norm(u.toObject()); },
      async actualizar(id, cambios) {
        if (!esIdValido(id)) return null;
        await Usuario.updateOne({ _id: id }, { $set: cambios });
        return norm(await Usuario.findById(id).lean());
      },
    },
    historial: {
      async agregar(doc) { const h = await Historial.create(doc); return norm(h.toObject()); },
      async listar({ persona, seccion, antes, limite = 50 } = {}) {
        const filtro = {};
        if (persona) filtro.usuarioCorreo = persona;
        if (seccion) filtro.seccion = seccion;
        if (antes) filtro.fecha = { $lt: new Date(antes) };
        return (await Historial.find(filtro).sort({ fecha: -1 }).limit(limite).lean()).map(norm);
      },
      async porId(id) { return esIdValido(id) ? norm(await Historial.findById(id).lean()) : null; },
      async actualizar(id, cambios) {
        if (!esIdValido(id)) return null;
        await Historial.updateOne({ _id: id }, { $set: cambios });
        return norm(await Historial.findById(id).lean());
      },
    },
  };
}

// Se elige al primer uso (así los tests pueden fijar las variables de entorno antes)
let _almacen = null;
function almacen() {
  if (!_almacen) _almacen = process.env.MONGO_URI ? almacenMongo() : almacenArchivo();
  return _almacen;
}

module.exports = { almacen, hashPassword, verificarPassword, generarPasswordTemporal, validarPasswordNueva };
