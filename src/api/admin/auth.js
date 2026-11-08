// ═══════════════════════════════════════════════════════════════
// api/admin/auth.js
// Acceso individual al panel admin: login por persona, equipo e historial de cambios.
//  - Cada persona entra con su correo y contraseña (cifrada). Sesión de 12 horas.
//  - "Acceso de emergencia": la contraseña ADMIN_PASSWORD del .env (por si falla la base de datos).
//  - Las administradoras agregan/desactivan personas y restablecen contraseñas.
//  - Todo lo que se hace queda en el historial (y los cambios de datos se pueden deshacer).
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const crypto = require('crypto');
const { almacen, hashPassword, verificarPassword, generarPasswordTemporal, validarPasswordNueva } = require('../../db/equipo');
const { sendNotificationEmail } = require('../../senders/email');
const { guardarSeccion, valorActual, describirCambios, tituloSeccion } = require('../../config/configStore');

const router = express.Router();

const DURACION_SESION_MS = 12 * 60 * 60 * 1000;
const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 10;
const esCorreo = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 120;

const USUARIO_EMERGENCIA = { id: 'emergencia', nombre: 'Acceso de emergencia', correo: 'emergencia', rol: 'admin', emergencia: true };
const DUMMY_HASH = hashPassword('contraseña-de-relleno'); // para que el tiempo de respuesta no delate si el correo existe

// ─── Sesiones firmadas (sin guardar nada en el servidor) ───────────────────
let _secretoAleatorio = null;
function secreto() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const base = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;
  if (base) return `${base}::casagaviota-panel`;
  if (!_secretoAleatorio) _secretoAleatorio = crypto.randomBytes(32).toString('hex');
  return _secretoAleatorio;
}
const firma = (cuerpo) => crypto.createHmac('sha256', secreto()).update(cuerpo).digest('base64url');

function crearToken(payload) {
  const cuerpo = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + DURACION_SESION_MS })).toString('base64url');
  return `${cuerpo}.${firma(cuerpo)}`;
}

function leerToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [cuerpo, f] = token.split('.');
  const esperada = firma(cuerpo);
  const a = Buffer.from(f || ''); const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    return p.exp && p.exp > Date.now() ? p : null;
  } catch { return null; }
}

const passEmergencia = () => process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;
function igualSeguro(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ─── Límite de intentos por dirección (además del bloqueo por cuenta) ──────
const intentosIP = new Map();
const ipDe = (req) => String(req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim();
function minutosDeEspera(ip) {
  const e = intentosIP.get(ip);
  return e && e.hasta > Date.now() && e.n >= 10 ? Math.ceil((e.hasta - Date.now()) / 60000) : 0;
}
function anotarFallo(ip) {
  const e = intentosIP.get(ip);
  if (!e || e.hasta <= Date.now()) intentosIP.set(ip, { n: 1, hasta: Date.now() + 10 * 60000 });
  else e.n += 1;
}

// ─── Middleware: quién eres y qué puedes hacer ─────────────────────────────
function auth(opts = {}) {
  return async (req, res, next) => {
    const sesionInvalida = () => res.status(401).json({ success: false, codigo: 'SESION', error: 'Tu sesión terminó. Vuelve a entrar al panel.' });
    try {
      const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
      const p = m && leerToken(m[1]);
      if (!p) return sesionInvalida();

      let usuario;
      if (p.uid === 'emergencia') {
        if (!passEmergencia()) return sesionInvalida();
        usuario = USUARIO_EMERGENCIA;
      } else {
        const u = await almacen().usuarios.porId(p.uid);
        if (!u || !u.activo || u.passwordVersion !== p.pv) return sesionInvalida();
        usuario = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, emergencia: false, debeCambiarPassword: !!u.debeCambiarPassword };
        if (u.debeCambiarPassword && !opts.permitirPendiente) {
          return res.status(403).json({ success: false, codigo: 'CAMBIAR_PASSWORD', error: 'Debes cambiar tu contraseña temporal para continuar.' });
        }
      }
      if (opts.admin && usuario.rol !== 'admin') {
        return res.status(403).json({ success: false, error: 'Solo las administradoras pueden hacer esto.' });
      }
      req.usuario = usuario;
      next();
    } catch (err) {
      console.error('[AUTH]', err.message);
      res.status(500).json({ success: false, error: 'No se pudo verificar tu sesión.' });
    }
  };
}

// ─── Historial ─────────────────────────────────────────────────────────────
async function registrarCambio(usuario, entrada) {
  try {
    await almacen().historial.agregar({
      usuarioId: usuario?.id || '',
      usuarioNombre: usuario?.nombre || '',
      usuarioCorreo: usuario?.correo || '',
      ...entrada,
    });
  } catch (err) {
    console.error('[HISTORIAL] No se pudo registrar el movimiento:', err.message);
  }
}

// ─── Correo con el acceso ──────────────────────────────────────────────────
const baseUrl = (req) => (process.env.PUBLIC_URL || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`).replace(/\/$/, '');

async function enviarAcceso(req, usuario, passwordTemporal, esReinicio) {
  const url = `${baseUrl(req)}/admin.html`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
      <h2 style="color: #d63381;">${esReinicio ? 'Restablecimos tu contraseña' : 'Te damos la bienvenida al panel de Casa Gaviota'} 💜</h2>
      <p>Hola, ${usuario.nombre}.</p>
      <p>${esReinicio ? 'Una administradora restableció tu acceso al panel.' : 'Se creó tu acceso personal al panel interno.'} Entra con estos datos:</p>
      <p style="background:#fdf4f8; border-radius:8px; padding:14px 16px;">
        <b>Correo:</b> ${usuario.correo}<br>
        <b>Contraseña temporal:</b> <span style="font-family: monospace; font-size: 16px;">${passwordTemporal}</span>
      </p>
      <p><a href="${url}" style="color:#d63381; font-weight:bold;">Entrar al panel</a></p>
      <p style="font-size: 13px; color: #777;">Al entrar por primera vez te pediremos elegir una contraseña nueva. Si no esperabas este correo, avisa a una administradora.</p>
    </div>`;
  const r = await sendNotificationEmail(usuario.correo, esReinicio ? '[Casa Gaviota] Tu contraseña fue restablecida' : '[Casa Gaviota] Tu acceso al panel', html);
  return Boolean(r);
}

const publico = (u) => ({
  id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, activo: u.activo !== false,
  debeCambiarPassword: !!u.debeCambiarPassword, ultimoAcceso: u.ultimoAcceso || null,
  bloqueado: Boolean(u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date()),
});

// ═════════ Rutas ═════════

router.post('/auth/login', async (req, res) => {
  const { correo, password, emergencia } = req.body || {};
  const ip = ipDe(req);
  const espera = minutosDeEspera(ip);
  if (espera) return res.status(429).json({ success: false, error: `Demasiados intentos. Intenta de nuevo en ${espera} minuto(s).` });
  if (!password) return res.status(400).json({ success: false, error: 'Escribe tu contraseña.' });

  try {
    // Acceso de emergencia (contraseña del .env)
    if (emergencia) {
      const pass = passEmergencia();
      if (!pass) return res.status(500).json({ success: false, error: 'El acceso de emergencia no está configurado.' });
      if (!igualSeguro(password, pass)) {
        anotarFallo(ip);
        return res.status(401).json({ success: false, error: 'Contraseña de emergencia incorrecta.' });
      }
      await registrarCambio(USUARIO_EMERGENCIA, { tipo: 'sesion', seccion: 'Sesión', resumen: 'Inició sesión con el acceso de emergencia' });
      return res.json({
        success: true, token: crearToken({ uid: 'emergencia' }),
        usuario: { nombre: USUARIO_EMERGENCIA.nombre, correo: '', rol: 'admin', emergencia: true }, debeCambiarPassword: false,
      });
    }

    const correoN = String(correo || '').trim().toLowerCase();
    const u = await almacen().usuarios.porCorreo(correoN);
    if (!u || !u.activo) {
      verificarPassword(password, DUMMY_HASH);
      anotarFallo(ip);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
    }
    if (u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date()) {
      const min = Math.ceil((new Date(u.bloqueadoHasta) - new Date()) / 60000);
      return res.status(423).json({ success: false, error: `Cuenta bloqueada temporalmente por varios intentos fallidos. Intenta de nuevo en ${min} minuto(s).` });
    }
    if (!verificarPassword(password, u.passwordHash)) {
      const intentos = (u.intentosFallidos || 0) + 1;
      const cambios = { intentosFallidos: intentos };
      if (intentos >= MAX_INTENTOS) { cambios.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MIN * 60000); cambios.intentosFallidos = 0; }
      await almacen().usuarios.actualizar(u.id, cambios);
      anotarFallo(ip);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
    }

    await almacen().usuarios.actualizar(u.id, { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() });
    await registrarCambio(u, { tipo: 'sesion', seccion: 'Sesión', resumen: 'Inició sesión' });
    res.json({
      success: true, token: crearToken({ uid: u.id, pv: u.passwordVersion }),
      usuario: { nombre: u.nombre, correo: u.correo, rol: u.rol, emergencia: false }, debeCambiarPassword: !!u.debeCambiarPassword,
    });
  } catch (err) {
    console.error('[AUTH] Error en el inicio de sesión:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo iniciar sesión. Si el problema sigue, usa el acceso de emergencia.' });
  }
});

router.get('/auth/yo', auth({ permitirPendiente: true }), (req, res) => {
  const { nombre, correo, rol, emergencia, debeCambiarPassword } = req.usuario;
  res.json({ success: true, usuario: { nombre, correo, rol, emergencia: Boolean(emergencia) }, debeCambiarPassword: Boolean(debeCambiarPassword) });
});

router.post('/auth/cambiar-password', auth({ permitirPendiente: true }), async (req, res) => {
  try {
    if (req.usuario.emergencia) return res.status(400).json({ success: false, error: 'El acceso de emergencia usa la contraseña del archivo .env; no se cambia desde aquí.' });
    const { actual, nueva } = req.body || {};
    const u = await almacen().usuarios.porId(req.usuario.id);
    if (!u || !verificarPassword(actual || '', u.passwordHash)) return res.status(400).json({ success: false, error: 'Tu contraseña actual no es correcta.' });
    const problema = validarPasswordNueva(nueva);
    if (problema) return res.status(400).json({ success: false, error: problema });
    if (nueva === actual) return res.status(400).json({ success: false, error: 'La contraseña nueva debe ser distinta a la actual.' });

    const pv = (u.passwordVersion || 1) + 1;
    await almacen().usuarios.actualizar(u.id, { passwordHash: hashPassword(nueva), passwordVersion: pv, debeCambiarPassword: false });
    await registrarCambio(req.usuario, { tipo: 'sesion', seccion: 'Sesión', resumen: 'Cambió su contraseña' });
    res.json({ success: true, token: crearToken({ uid: u.id, pv }) });
  } catch (err) {
    console.error('[AUTH] cambiar-password:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo cambiar la contraseña.' });
  }
});

// ── Equipo (solo administradoras) ──
router.get('/equipo', auth({ admin: true }), async (req, res) => {
  try {
    res.json({ success: true, personas: (await almacen().usuarios.todos()).map(publico) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/equipo', auth({ admin: true }), async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || '').trim();
    const correo = String(req.body?.correo || '').trim().toLowerCase();
    const rol = req.body?.rol === 'admin' ? 'admin' : 'equipo';
    if (nombre.length < 2 || nombre.length > 80) return res.status(400).json({ success: false, error: 'Escribe el nombre de la persona (2 a 80 caracteres).' });
    if (!esCorreo(correo)) return res.status(400).json({ success: false, error: 'El correo no parece válido.' });
    if (await almacen().usuarios.porCorreo(correo)) return res.status(409).json({ success: false, error: 'Ya hay una persona registrada con ese correo.' });

    const passwordTemporal = generarPasswordTemporal();
    const u = await almacen().usuarios.crear({
      nombre, correo, rol, activo: true, passwordHash: hashPassword(passwordTemporal), passwordVersion: 1,
      debeCambiarPassword: true, intentosFallidos: 0, creadoPor: req.usuario.nombre,
    });
    const correoEnviado = await enviarAcceso(req, u, passwordTemporal, false);
    await registrarCambio(req.usuario, { tipo: 'equipo', seccion: 'Equipo', resumen: `Agregó a ${nombre} (${rol === 'admin' ? 'administradora' : 'equipo'})` });
    res.json({ success: true, persona: publico(u), passwordTemporal, correoEnviado });
  } catch (err) {
    console.error('[EQUIPO] agregar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo agregar a la persona.' });
  }
});

router.post('/equipo/:id/restablecer', auth({ admin: true }), async (req, res) => {
  try {
    if (req.params.id === req.usuario.id) return res.status(400).json({ success: false, error: 'Para cambiar tu propia contraseña usa "Mi contraseña".' });
    const u = await almacen().usuarios.porId(req.params.id);
    if (!u) return res.status(404).json({ success: false, error: 'No se encontró a esa persona.' });
    const passwordTemporal = generarPasswordTemporal();
    const u2 = await almacen().usuarios.actualizar(u.id, {
      passwordHash: hashPassword(passwordTemporal), passwordVersion: (u.passwordVersion || 1) + 1,
      debeCambiarPassword: true, intentosFallidos: 0, bloqueadoHasta: null,
    });
    const correoEnviado = await enviarAcceso(req, u2, passwordTemporal, true);
    await registrarCambio(req.usuario, { tipo: 'equipo', seccion: 'Equipo', resumen: `Restableció la contraseña de ${u.nombre}` });
    res.json({ success: true, passwordTemporal, correoEnviado });
  } catch (err) {
    console.error('[EQUIPO] restablecer:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo restablecer la contraseña.' });
  }
});

router.patch('/equipo/:id', auth({ admin: true }), async (req, res) => {
  try {
    const id = req.params.id;
    if (id === req.usuario.id) return res.status(400).json({ success: false, error: 'No puedes cambiar tu propio rol ni desactivarte.' });
    const destino = await almacen().usuarios.porId(id);
    if (!destino) return res.status(404).json({ success: false, error: 'No se encontró a esa persona.' });

    const cambios = {};
    if ('rol' in (req.body || {})) {
      if (!['admin', 'equipo'].includes(req.body.rol)) return res.status(400).json({ success: false, error: 'Rol no válido.' });
      cambios.rol = req.body.rol;
    }
    if ('activo' in (req.body || {})) cambios.activo = Boolean(req.body.activo);
    if (!Object.keys(cambios).length) return res.status(400).json({ success: false, error: 'No hay nada que cambiar.' });

    // Siempre debe quedar al menos una administradora activa
    const todos = await almacen().usuarios.todos();
    const adminsActivas = todos.filter((u) => {
      const rol = u.id === id ? (cambios.rol ?? u.rol) : u.rol;
      const activo = u.id === id ? (cambios.activo ?? u.activo) : u.activo;
      return rol === 'admin' && activo !== false;
    }).length;
    if (adminsActivas < 1) return res.status(400).json({ success: false, error: 'Debe quedar al menos una administradora activa.' });

    if (cambios.activo === false) cambios.passwordVersion = (destino.passwordVersion || 1) + 1; // cierra sus sesiones abiertas
    const u2 = await almacen().usuarios.actualizar(id, cambios);

    const partes = [];
    if (cambios.rol && cambios.rol !== destino.rol) partes.push(`Cambió el rol de ${destino.nombre} a ${cambios.rol === 'admin' ? 'administradora' : 'equipo'}`);
    if ('activo' in cambios && cambios.activo !== (destino.activo !== false)) partes.push(`${cambios.activo ? 'Reactivó' : 'Desactivó'} el acceso de ${destino.nombre}`);
    if (partes.length) await registrarCambio(req.usuario, { tipo: 'equipo', seccion: 'Equipo', resumen: partes.join('; ') });
    res.json({ success: true, persona: publico(u2) });
  } catch (err) {
    console.error('[EQUIPO] actualizar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo actualizar a la persona.' });
  }
});

// ── Historial (todas las personas del equipo lo pueden ver) ──
router.get('/historial', auth(), async (req, res) => {
  try {
    const { persona, seccion, antes } = req.query;
    const limite = Math.min(parseInt(req.query.limite, 10) || 50, 200);
    const filas = await almacen().historial.listar({ persona, seccion, antes, limite: limite + 1 });
    const items = filas.slice(0, limite).map((h) => ({
      id: h.id, fecha: h.fecha, usuarioNombre: h.usuarioNombre, usuarioCorreo: h.usuarioCorreo, tipo: h.tipo, seccion: h.seccion,
      resumen: h.resumen, detalles: h.detalles || [], clave: h.clave,
      puedeDeshacer: h.tipo === 'config' && !h.deshecho && h.antes !== undefined && h.antes !== null,
      deshecho: Boolean(h.deshecho), deshechoPor: h.deshechoPor || null,
    }));
    const resp = { success: true, items, hayMas: filas.length > limite };
    if (!antes) {
      const recientes = await almacen().historial.listar({ limite: 500 });
      resp.filtros = {
        personas: [...new Map(recientes.map((h) => [h.usuarioCorreo, h.usuarioNombre])).entries()].map(([correo, nombre]) => ({ correo, nombre })),
        secciones: [...new Set(recientes.map((h) => h.seccion).filter(Boolean))],
      };
    }
    res.json(resp);
  } catch (err) {
    console.error('[HISTORIAL] listar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo cargar el historial.' });
  }
});

router.post('/historial/:id/deshacer', auth(), async (req, res) => {
  try {
    const h = await almacen().historial.porId(req.params.id);
    if (!h) return res.status(404).json({ success: false, error: 'No se encontró ese movimiento.' });
    if (h.tipo !== 'config' || h.deshecho || !h.clave || h.antes === undefined || h.antes === null) {
      return res.status(400).json({ success: false, error: 'Ese movimiento no se puede deshacer.' });
    }
    const cambioDespues = JSON.stringify(valorActual(h.clave)) !== JSON.stringify(h.despues);
    if (cambioDespues && !req.body?.forzar) {
      return res.status(409).json({ success: false, conflicto: true, error: 'Esta sección cambió después de ese movimiento. Si continúas, se perderán los cambios más recientes.' });
    }
    const r = await guardarSeccion(h.clave, h.antes);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });

    await almacen().historial.actualizar(h.id, { deshecho: true, deshechoPor: req.usuario.nombre, deshechoEn: new Date() });
    const cuando = new Date(h.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    await registrarCambio(req.usuario, {
      tipo: 'config', seccion: tituloSeccion(h.clave), clave: h.clave,
      resumen: `Deshizo el cambio de ${h.usuarioNombre} del ${cuando}`,
      detalles: describirCambios(h.clave, r.antes, r.valor), antes: r.antes, despues: r.valor,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[HISTORIAL] deshacer:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo deshacer el cambio.' });
  }
});

module.exports = { router, auth, registrarCambio };
