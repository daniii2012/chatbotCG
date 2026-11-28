// ═══════════════════════════════════════════════════════════════
// db/dinamicas.js
// Almacenamiento de las dinámicas de comentarios en Instagram.
//  - Con MONGO_URI: guarda en MongoDB Atlas (colecciones
//    `dinamicainstagrams` y `dinamicalogs`).
//  - Sin MONGO_URI (pruebas locales): guarda en `dinamicas_ig.json`
//    para desarrollar sin tocar la base de datos de producción.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODOS_COINCIDENCIA = ['contiene', 'exacta', 'cualquiera'];

const normalizarPalabra = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function limpiarTexto(v, max = 1000) {
  return String(v ?? '').trim().slice(0, max);
}

function sanitizarMediaInfo(info) {
  if (!info || typeof info !== 'object') return null;
  return {
    mediaType: limpiarTexto(info.mediaType, 30),
    tituloCorto: limpiarTexto(info.tituloCorto, 120),
    caption: limpiarTexto(info.caption, 200),
    imagenUrl: '',
    fecha: limpiarTexto(info.fecha, 60),
    gradient: limpiarTexto(info.gradient, 160),
    permalink: limpiarTexto(info.permalink, 500),
  };
}

function validarDinamica(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Datos de la dinámica inválidos.' };
  }

  const mediaId = limpiarTexto(body.mediaId, 80);
  if (!mediaId) {
    return { ok: false, error: 'Debes seleccionar una publicación de Instagram (o la opción Global).' };
  }

  const nombre = limpiarTexto(body.nombre, 120);
  if (nombre.length < 2) {
    return { ok: false, error: 'Escribe un nombre para identificar la dinámica (mínimo 2 caracteres).' };
  }

  const modoCoincidencia = MODOS_COINCIDENCIA.includes(body.modoCoincidencia)
    ? body.modoCoincidencia
    : 'contiene';

  const rawPalabras = Array.isArray(body.palabrasClave)
    ? body.palabrasClave
    : String(body.palabrasClave || '').split(',');
  const palabrasClave = modoCoincidencia === 'cualquiera'
    ? []
    : [...new Set(rawPalabras.map(normalizarPalabra).filter(Boolean))].slice(0, 20);

  if (modoCoincidencia !== 'cualquiera' && !palabrasClave.length) {
    return { ok: false, error: 'Agrega al menos una palabra clave.' };
  }

  const rawRespuestas = Array.isArray(body.respuestasComentario) ? body.respuestasComentario : [];
  const respuestasComentario = rawRespuestas
    .map((r) => limpiarTexto(r, 500))
    .filter(Boolean)
    .slice(0, 10);

  if (!respuestasComentario.length) {
    return { ok: false, error: 'Agrega al menos una respuesta pública al comentario.' };
  }

  const pedirSeguir = Boolean(body.pedirSeguir);
  const mensajeInicialDM = limpiarTexto(
    body.mensajeInicialDM || '¡Hola! 💙 Gracias por comentar. Toca el botón de abajo para enviarte la información:',
    640
  );
  const textoBotonInicial = limpiarTexto(body.textoBotonInicial || 'Quiero la info', 20);
  const mensajeNoSigue = limpiarTexto(
    body.mensajeNoSigue || '¡Casi listo! Antes de enviarte el enlace, síguenos en Instagram y toca aquí para verificar 💜',
    640
  );
  const textoBotonReintentar = limpiarTexto(body.textoBotonReintentar || 'Ya los sigo ✅', 20);

  const rawEnlaces = Array.isArray(body.enlaces) ? body.enlaces : [];
  const enlaces = [];
  for (const e of rawEnlaces) {
    const texto = limpiarTexto(e?.texto, 20);
    const url = limpiarTexto(e?.url, 500);
    if (!texto && !url) continue;
    if (!texto) return { ok: false, error: 'Cada botón de enlace necesita un texto (máx. 20 caracteres).' };
    if (!/^https?:\/\/[^\s)]+$/i.test(url)) {
      return { ok: false, error: `El enlace de "${texto}" debe empezar con http:// o https:// y no llevar espacios.` };
    }
    enlaces.push({ texto, url });
  }

  const maxEnlaces = pedirSeguir ? 6 : 3;
  if (enlaces.length > maxEnlaces) {
    return {
      ok: false,
      error: pedirSeguir
        ? 'Puedes agregar como máximo 6 botones con enlace.'
        : 'Sin verificación de seguidor, Instagram permite máximo 3 botones en el mensaje inicial.',
    };
  }

  const mensajeEntregaRaw = String(body.mensajeEntrega ?? '').trim();
  if (!mensajeEntregaRaw) {
    return { ok: false, error: 'Escribe el mensaje final que se enviará por DM.' };
  }
  const limiteMensaje = !pedirSeguir && enlaces.length > 0 ? 640 : 1000;
  if (mensajeEntregaRaw.length > limiteMensaje) {
    return {
      ok: false,
      error: `El mensaje final supera el límite de ${limiteMensaje} caracteres permitido por Instagram.`,
    };
  }

  const expiraEn = limpiarTexto(body.expiraEn, 10);
  if (expiraEn && !/^\d{4}-\d{2}-\d{2}$/.test(expiraEn)) {
    return { ok: false, error: 'La fecha de expiración no tiene un formato válido (AAAA-MM-DD).' };
  }

  return {
    ok: true,
    valor: {
      mediaId,
      mediaInfo: sanitizarMediaInfo(body.mediaInfo),
      nombre,
      activa: body.activa !== false,
      expiraEn,
      modoCoincidencia,
      palabrasClave,
      respuestasComentario,
      pedirSeguir,
      mensajeInicialDM,
      textoBotonInicial,
      mensajeNoSigue,
      textoBotonReintentar,
      mensajeEntrega: mensajeEntregaRaw,
      enlaces,
    },
  };
}

function estaVigente(dinamica, ahora = new Date()) {
  if (!dinamica?.activa) return false;
  if (!dinamica.expiraEn) return true;
  // Expira al terminar el día indicado (hora Ciudad de México aprox. UTC-6 -> usamos fin de día local/ISO)
  const limite = new Date(`${dinamica.expiraEn}T23:59:59-06:00`);
  if (Number.isNaN(limite.getTime())) return true;
  return ahora <= limite;
}

// ─── Almacén en archivo local (pruebas sin MONGO_URI) ────────────
function almacenArchivo() {
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
  const ARCHIVO = path.join(DATA_DIR, 'dinamicas_ig.json');

  const leer = () => {
    try {
      const d = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
      return {
        dinamicas: Array.isArray(d.dinamicas) ? d.dinamicas : [],
        logs: Array.isArray(d.logs) ? d.logs : [],
      };
    } catch {
      return { dinamicas: [], logs: [] };
    }
  };

  const escribir = (d) => {
    fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(d, null, 2), 'utf8');
    fs.renameSync(ARCHIVO + '.tmp', ARCHIVO);
  };

  const clonar = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);

  return {
    tipo: 'archivo',
    dinamicas: {
      async listar() {
        return clonar(leer().dinamicas).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      },
      async porId(id) {
        return clonar(leer().dinamicas.find((d) => d.id === id) || null);
      },
      async activasParaMedia(mediaId) {
        const ahora = new Date();
        return clonar(leer().dinamicas).filter(
          (d) => (d.mediaId === mediaId || d.mediaId === '*') && estaVigente(d, ahora)
        );
      },
      async crear(doc) {
        const db = leer();
        const ahora = new Date().toISOString();
        const nuevo = {
          id: crypto.randomUUID(),
          ...doc,
          stats: { comentarios: 0, dmsEnviados: 0, entregas: 0 },
          createdAt: ahora,
          updatedAt: ahora,
        };
        db.dinamicas.unshift(nuevo);
        escribir(db);
        return clonar(nuevo);
      },
      async actualizar(id, cambios) {
        const db = leer();
        const d = db.dinamicas.find((x) => x.id === id);
        if (!d) return null;
        Object.assign(d, cambios, { updatedAt: new Date().toISOString() });
        escribir(db);
        return clonar(d);
      },
      async eliminar(id) {
        const db = leer();
        const antes = db.dinamicas.length;
        db.dinamicas = db.dinamicas.filter((x) => x.id !== id);
        if (db.dinamicas.length === antes) return false;
        escribir(db);
        return true;
      },
      async incrementarStat(id, campo) {
        if (!['comentarios', 'dmsEnviados', 'entregas'].includes(campo)) return;
        const db = leer();
        const d = db.dinamicas.find((x) => x.id === id);
        if (!d) return;
        d.stats = d.stats || { comentarios: 0, dmsEnviados: 0, entregas: 0 };
        d.stats[campo] = (d.stats[campo] || 0) + 1;
        escribir(db);
      },
    },
    logs: {
      async registrarComentarioUnico({ commentId, dinamicaId, igUserId, estado = 'pendiente_boton' }) {
        const db = leer();
        if (db.logs.some((l) => l.commentId === commentId)) {
          return { duplicado: true };
        }
        const ahora = new Date().toISOString();
        const log = {
          id: crypto.randomUUID(),
          commentId,
          dinamicaId,
          igUserId,
          estado,
          intentosVerificacion: 0,
          createdAt: ahora,
          updatedAt: ahora,
        };
        db.logs.unshift(log);
        if (db.logs.length > 5000) db.logs.length = 5000;
        escribir(db);
        return { duplicado: false, log: clonar(log) };
      },
      async actualizarPorComentario(commentId, cambios) {
        const db = leer();
        const l = db.logs.find((x) => x.commentId === commentId);
        if (!l) return null;
        Object.assign(l, cambios, { updatedAt: new Date().toISOString() });
        escribir(db);
        return clonar(l);
      },
      async ultimoPorUsuarioYDinamica(igUserId, dinamicaId) {
        const db = leer();
        const l = db.logs.find((x) => x.igUserId === igUserId && x.dinamicaId === dinamicaId);
        return clonar(l || null);
      },
    },
  };
}

// ─── Almacén en MongoDB Atlas (producción) ───────────────────────
function almacenMongo() {
  const mongoose = require('mongoose');
  require('./mongo'); // asegura la conexión principal a MongoDB Atlas

  const enlaceSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    url: { type: String, required: true },
  }, { _id: false });

  const dinamicaSchema = new mongoose.Schema({
    mediaId: { type: String, required: true, index: true },
    mediaInfo: { type: mongoose.Schema.Types.Mixed, default: null },
    nombre: { type: String, required: true },
    activa: { type: Boolean, default: true, index: true },
    expiraEn: { type: String, default: '' },
    modoCoincidencia: { type: String, enum: MODOS_COINCIDENCIA, default: 'contiene' },
    palabrasClave: { type: [String], default: [] },
    respuestasComentario: { type: [String], default: [] },
    pedirSeguir: { type: Boolean, default: true },
    mensajeInicialDM: { type: String, default: '' },
    textoBotonInicial: { type: String, default: 'Quiero la info' },
    mensajeNoSigue: { type: String, default: '' },
    textoBotonReintentar: { type: String, default: 'Ya los sigo ✅' },
    mensajeEntrega: { type: String, required: true },
    enlaces: { type: [enlaceSchema], default: [] },
    stats: {
      comentarios: { type: Number, default: 0 },
      dmsEnviados: { type: Number, default: 0 },
      entregas: { type: Number, default: 0 },
    },
  }, { timestamps: true });

  const logSchema = new mongoose.Schema({
    commentId: { type: String, required: true, unique: true },
    dinamicaId: { type: String, required: true, index: true },
    igUserId: { type: String, required: true, index: true },
    estado: { type: String, default: 'pendiente_boton' },
    intentosVerificacion: { type: Number, default: 0 },
  }, { timestamps: true });
  // Borra automáticamente cada log después de 30 días (los totales ya quedan en stats)
  logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  const DinamicaInstagram = mongoose.models.DinamicaInstagram
    || mongoose.model('DinamicaInstagram', dinamicaSchema);
  const DinamicaLog = mongoose.models.DinamicaLog
    || mongoose.model('DinamicaLog', logSchema);

  const normDoc = (d) => (d ? { ...d, id: String(d._id) } : null);
  const esIdValido = (id) => (mongoose.isValidObjectId
    ? mongoose.isValidObjectId(id)
    : /^[a-f\d]{24}$/i.test(String(id)));

  return {
    tipo: 'mongo',
    dinamicas: {
      async listar() {
        return (await DinamicaInstagram.find({}).sort({ createdAt: -1 }).lean()).map(normDoc);
      },
      async porId(id) {
        return esIdValido(id) ? normDoc(await DinamicaInstagram.findById(id).lean()) : null;
      },
      async activasParaMedia(mediaId) {
        const docs = await DinamicaInstagram.find({
          activa: true,
          mediaId: { $in: [mediaId, '*'] },
        }).lean();
        const ahora = new Date();
        return docs.filter((d) => estaVigente(d, ahora)).map(normDoc);
      },
      async crear(doc) {
        const creado = await DinamicaInstagram.create(doc);
        return normDoc(creado.toObject());
      },
      async actualizar(id, cambios) {
        if (!esIdValido(id)) return null;
        await DinamicaInstagram.updateOne({ _id: id }, { $set: cambios });
        return normDoc(await DinamicaInstagram.findById(id).lean());
      },
      async eliminar(id) {
        if (!esIdValido(id)) return false;
        const r = await DinamicaInstagram.deleteOne({ _id: id });
        return r.deletedCount > 0;
      },
      async incrementarStat(id, campo) {
        if (!esIdValido(id) || !['comentarios', 'dmsEnviados', 'entregas'].includes(campo)) return;
        await DinamicaInstagram.updateOne({ _id: id }, { $inc: { [`stats.${campo}`]: 1 } });
      },
    },
    logs: {
      async registrarComentarioUnico({ commentId, dinamicaId, igUserId, estado = 'pendiente_boton' }) {
        try {
          const doc = await DinamicaLog.create({ commentId, dinamicaId: String(dinamicaId), igUserId: String(igUserId), estado });
          return { duplicado: false, log: normDoc(doc.toObject()) };
        } catch (err) {
          if (err && err.code === 11000) return { duplicado: true };
          throw err;
        }
      },
      async actualizarPorComentario(commentId, cambios) {
        await DinamicaLog.updateOne({ commentId }, { $set: cambios });
        return normDoc(await DinamicaLog.findOne({ commentId }).lean());
      },
      async ultimoPorUsuarioYDinamica(igUserId, dinamicaId) {
        const doc = await DinamicaLog.findOne({
          igUserId: String(igUserId),
          dinamicaId: String(dinamicaId),
        }).sort({ createdAt: -1 }).lean();
        return normDoc(doc);
      },
    },
  };
}

let _almacen = null;
function almacenDinamicas() {
  if (!_almacen) {
    const uri = process.env.MONGO_URI || process.env.mongoURI;
    _almacen = uri ? almacenMongo() : almacenArchivo();
  }
  return _almacen;
}

module.exports = { almacenDinamicas, validarDinamica, normalizarPalabra, estaVigente };
