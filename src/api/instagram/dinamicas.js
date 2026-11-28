// ═══════════════════════════════════════════════════════════════
// api/instagram/dinamicas.js
// Motor aislado de dinámicas de comentarios -> DM en Instagram.
//  - Escucha comentarios de publicaciones/Reels (entry.changes: comments)
//  - Ignora comentarios propios y respuestas anidadas (parent_id)
//  - Registra idempotencia por commentId en MongoDB (dinamicalogs)
//  - Encola envíos con pausa controlada (anti rate-limit)
//  - Responde comentario público (texto rotativo) + 1 Private Reply
//  - Atiende botones postback (prefijo "DINAMICA:") con verificación
//    de seguidor (is_user_follow_business) y entrega de cortesía al 3er reintento
//  - NUNCA toca las sesiones ni los flujos del chatbot Gavi
// ═══════════════════════════════════════════════════════════════
const { almacenDinamicas, normalizarPalabra } = require('../../db/dinamicas');

const GRAPH_VERSION = 'v23.0';
const PREFIJO_POSTBACK = 'DINAMICA:';
const MAX_REINTENTOS_SEGUIR = 3;
const PAUSA_COLA_MS = Number(process.env.IG_DINAMICAS_PAUSA_MS ?? 400);
const CACHE_CUENTA_MS = 60 * 60 * 1000; // 1 hora

let cacheCuenta = { exp: 0, ids: new Set() };
let colaPromesa = Promise.resolve();
const intentosMemoria = new Map(); // respaldo en memoria si no existe log reciente

const esperar = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

function encolar(tarea) {
  const siguiente = colaPromesa.then(async () => {
    try {
      return await tarea();
    } finally {
      await esperar(PAUSA_COLA_MS);
    }
  });
  colaPromesa = siguiente.catch(() => {});
  return siguiente;
}

// ─── Configuración de Graph API (Instagram Login o Facebook Login) ───
function configGraph() {
  const igToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  if (igToken) {
    return {
      modo: 'instagram_login',
      base: `https://graph.instagram.com/${GRAPH_VERSION}`,
      token: igToken,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${igToken}`,
      },
      urlConToken: (ruta) => `https://graph.instagram.com/${GRAPH_VERSION}${ruta}`,
    };
  }
  const fbToken = (process.env.MESSENGER_PAGE_ACCESS_TOKEN || '').trim();
  return {
    modo: 'facebook_login',
    base: `https://graph.facebook.com/${GRAPH_VERSION}`,
    token: fbToken,
    headers: { 'Content-Type': 'application/json' },
    urlConToken: (ruta) => {
      const sep = ruta.includes('?') ? '&' : '?';
      return `https://graph.facebook.com/${GRAPH_VERSION}${ruta}${sep}access_token=${encodeURIComponent(fbToken)}`;
    },
  };
}

async function fetchMeta(url, opciones = {}) {
  try {
    const r = await fetch(url, opciones);
    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* sin JSON */ }
    if (!r.ok) {
      console.error('[IG DINAMICAS] Meta respondió error:', r.status, text.slice(0, 300));
    }
    return { ok: r.ok, status: r.status, json };
  } catch (err) {
    console.error('[IG DINAMICAS] Error de red con Meta:', err.message);
    return { ok: false, status: 0, json: {}, error: err.message };
  }
}

// Obtiene y cachea los IDs propios de la cuenta para no responderse a sí mismo
async function obtenerIdsPropios() {
  const ids = new Set();
  if (process.env.INSTAGRAM_ACCOUNT_ID) ids.add(String(process.env.INSTAGRAM_ACCOUNT_ID).trim());

  if (cacheCuenta.exp > Date.now() && cacheCuenta.ids.size > 0) {
    cacheCuenta.ids.forEach((id) => ids.add(id));
    return ids;
  }

  const cfg = configGraph();
  if (!cfg.token) return ids;

  if (cfg.modo === 'instagram_login') {
    const r = await fetchMeta(cfg.urlConToken('/me?fields=user_id,id,username'), { headers: cfg.headers });
    if (r.ok) {
      const perfil = Array.isArray(r.json?.data) ? r.json.data[0] : r.json;
      if (perfil?.user_id) ids.add(String(perfil.user_id));
      if (perfil?.id) ids.add(String(perfil.id));
    }
  } else {
    const r = await fetchMeta(cfg.urlConToken('/me?fields=instagram_business_account{id}'), { headers: cfg.headers });
    if (r.ok && r.json?.instagram_business_account?.id) {
      ids.add(String(r.json.instagram_business_account.id));
    }
  }

  if (ids.size > 0) {
    cacheCuenta = { exp: Date.now() + CACHE_CUENTA_MS, ids: new Set(ids) };
  }
  return ids;
}

// ─── Llamadas a Meta: comentario público, DM y verificación de seguidor ───
async function responderComentarioPublico(commentId, mensaje) {
  const cfg = configGraph();
  if (!cfg.token) return false;
  const r = await fetchMeta(cfg.urlConToken(`/${encodeURIComponent(commentId)}/replies`), {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify({ message: String(mensaje).slice(0, 500) }),
  });
  return r.ok;
}

async function enviarDM(recipient, message) {
  const cfg = configGraph();
  if (!cfg.token) return false;
  const r = await fetchMeta(cfg.urlConToken('/me/messages'), {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify({ recipient, message }),
  });
  return r.ok;
}

async function consultarSiSigue(senderId) {
  const cfg = configGraph();
  if (!cfg.token) return { ok: false, sigue: false };
  const r = await fetchMeta(
    cfg.urlConToken(`/${encodeURIComponent(senderId)}?fields=is_user_follow_business`),
    { headers: cfg.headers }
  );
  if (!r.ok) return { ok: false, sigue: false };
  return { ok: true, sigue: Boolean(r.json?.is_user_follow_business) };
}

// ─── Plantillas de botones ───
function plantillaPostback(texto, tituloBoton, payload) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: String(texto || '').slice(0, 640),
        buttons: [
          {
            type: 'postback',
            title: String(tituloBoton || 'Continuar').slice(0, 20),
            payload: String(payload),
          },
        ],
      },
    },
  };
}

function plantillaEnlaces(texto, enlaces) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: String(texto || '').slice(0, 640),
        buttons: enlaces.slice(0, 3).map((e) => ({
          type: 'web_url',
          url: e.url,
          title: String(e.texto || 'Abrir enlace').slice(0, 20),
        })),
      },
    },
  };
}

function enlacesComoTexto(texto, enlaces) {
  const lineas = (enlaces || []).map((e) => `${e.texto}: ${e.url}`);
  return [texto, ...lineas].filter(Boolean).join('\n\n').slice(0, 1000);
}

// Envía el mensaje final + enlaces (respetando la regla de 1 solo mensaje en Private Reply)
async function enviarEntregaFinal(recipient, dinamica, { esPrivateReplyUnico = false } = {}) {
  const texto = String(dinamica.mensajeEntrega || '').trim();
  const enlaces = Array.isArray(dinamica.enlaces) ? dinamica.enlaces.filter((e) => e?.texto && e?.url) : [];

  if (!enlaces.length) {
    return enviarDM(recipient, { text: texto.slice(0, 1000) });
  }

  // En Private Reply directo (sin follow-gate) Meta solo permite 1 petición por comment_id
  if (esPrivateReplyUnico) {
    const ok = await enviarDM(recipient, plantillaEnlaces(texto, enlaces));
    if (ok) return true;
    return enviarDM(recipient, { text: enlacesComoTexto(texto, enlaces) });
  }

  // En ventana de 24 h (después de tocar el botón) sí podemos enviar varios mensajes si hace falta
  if (texto.length <= 640 && enlaces.length <= 3) {
    const ok = await enviarDM(recipient, plantillaEnlaces(texto, enlaces));
    if (ok) return true;
    return enviarDM(recipient, { text: enlacesComoTexto(texto, enlaces) });
  }

  let enviado = await enviarDM(recipient, { text: texto.slice(0, 1000) });
  for (let i = 0; i < enlaces.length; i += 3) {
    const grupo = enlaces.slice(i, i + 3);
    const okGrupo = await enviarDM(recipient, plantillaEnlaces('Aquí tienes los enlaces:', grupo));
    if (!okGrupo) {
      await enviarDM(recipient, { text: enlacesComoTexto('', grupo) });
    } else {
      enviado = true;
    }
  }
  return enviado;
}

// ─── Coincidencia de palabras clave ───
function coincideComentario(textoComentario, dinamica) {
  const limpio = normalizarPalabra(textoComentario);
  if (!limpio) return false;
  if (dinamica.modoCoincidencia === 'cualquiera') return true;

  const palabras = Array.isArray(dinamica.palabrasClave) ? dinamica.palabrasClave : [];
  if (!palabras.length) return false;

  if (dinamica.modoCoincidencia === 'exacta') {
    return palabras.includes(limpio);
  }

  // Modo 'contiene': palabra completa (o frase exacta si la keyword tiene espacios)
  const tokens = limpio.split(' ');
  return palabras.some((kw) => (kw.includes(' ') ? limpio.includes(kw) : tokens.includes(kw)));
}

function elegirRespuestaPublica(dinamica) {
  const lista = Array.isArray(dinamica.respuestasComentario)
    ? dinamica.respuestasComentario.filter(Boolean)
    : [];
  if (!lista.length) return '¡Listo! Te envié la información por DM 💙';
  return lista[Math.floor(Math.random() * lista.length)];
}

// ─── 1. Entrada desde webhook: comentario en publicación/Reel ───
async function manejarComentario(value) {
  if (!value || typeof value !== 'object') return { atendido: false, motivo: 'vacio' };

  const commentId = String(value.id || '').trim();
  const mediaId = String(value.media?.id || '').trim();
  const fromId = String(value.from?.id || '').trim();
  const parentId = value.parent_id ? String(value.parent_id).trim() : '';
  const texto = String(value.text || '').trim();

  if (!commentId || !mediaId || !texto) return { atendido: false, motivo: 'incompleto' };

  // Ignorar respuestas anidadas a otros comentarios para no entrar en bucles ni invadir hilos
  if (parentId) return { atendido: false, motivo: 'respuesta_anidada' };

  // Ignorar comentarios hechos por la propia cuenta de Instagram
  const idsPropios = await obtenerIdsPropios();
  if (fromId && idsPropios.has(fromId)) {
    return { atendido: false, motivo: 'comentario_propio' };
  }

  const alm = almacenDinamicas();
  const candidatas = await alm.dinamicas.activasParaMedia(mediaId);
  if (!candidatas.length) return { atendido: false, motivo: 'sin_dinamica' };

  // Prioridad: primero dinámicas específicas de este post, luego globales ('*')
  candidatas.sort((a, b) => (a.mediaId === mediaId ? -1 : b.mediaId === mediaId ? 1 : 0));
  const dinamica = candidatas.find((d) => coincideComentario(texto, d));
  if (!dinamica) return { atendido: false, motivo: 'sin_coincidencia' };

  // Idempotencia persistente: si este commentId ya se procesó, no repetir
  const reg = await alm.logs.registrarComentarioUnico({
    commentId,
    dinamicaId: dinamica.id,
    igUserId: fromId || 'desconocido',
    estado: dinamica.pedirSeguir ? 'pendiente_boton' : 'enviando_directo',
  });
  if (reg.duplicado) return { atendido: false, motivo: 'duplicado' };

  await alm.dinamicas.incrementarStat(dinamica.id, 'comentarios');

  // Encolamos las llamadas a Meta para respetar el rate-limit en posts con muchos comentarios
  await encolar(async () => {
    const respuestaPublica = elegirRespuestaPublica(dinamica);
    await responderComentarioPublico(commentId, respuestaPublica);

    const recipient = { comment_id: commentId };
    let dmOk = false;

    if (dinamica.pedirSeguir) {
      const payload = `${PREFIJO_POSTBACK}CHECK:${dinamica.id}`;
      const msg = plantillaPostback(
        dinamica.mensajeInicialDM || '¡Hola! 💙 Toca el botón de abajo para enviarte la información:',
        dinamica.textoBotonInicial || 'Quiero la info',
        payload
      );
      dmOk = await enviarDM(recipient, msg);
      if (dmOk) {
        await alm.dinamicas.incrementarStat(dinamica.id, 'dmsEnviados');
      } else {
        await alm.logs.actualizarPorComentario(commentId, { estado: 'error_dm' });
      }
    } else {
      dmOk = await enviarEntregaFinal(recipient, dinamica, { esPrivateReplyUnico: true });
      if (dmOk) {
        await alm.dinamicas.incrementarStat(dinamica.id, 'dmsEnviados');
        await alm.dinamicas.incrementarStat(dinamica.id, 'entregas');
        await alm.logs.actualizarPorComentario(commentId, { estado: 'entregado' });
      } else {
        await alm.logs.actualizarPorComentario(commentId, { estado: 'error_dm' });
      }
    }
  });

  return { atendido: true, dinamicaId: dinamica.id };
}

// ─── 2. Entrada desde webhook: clic en botón postback de dinámica ───
function esPostbackDinamica(payload) {
  return typeof payload === 'string' && payload.startsWith(PREFIJO_POSTBACK);
}

async function manejarPostbackDinamica(senderId, payload) {
  if (!senderId || !esPostbackDinamica(payload)) return { atendido: false };

  const partes = payload.slice(PREFIJO_POSTBACK.length).split(':');
  const accion = partes[0]; // 'CHECK' | 'RETRY'
  const dinamicaId = partes.slice(1).join(':');
  if (!dinamicaId) return { atendido: false };

  const alm = almacenDinamicas();
  const dinamica = await alm.dinamicas.porId(dinamicaId);
  if (!dinamica) {
    await enviarDM(
      { id: senderId },
      { text: 'Esta dinámica ya no está activa. 💙 Si necesitas información de Casa Gaviota, escribe *menú*.' }
    );
    return { atendido: true, estado: 'no_encontrada' };
  }

  const recipient = { id: senderId };
  const log = await alm.logs.ultimoPorUsuarioYDinamica(senderId, dinamica.id);
  const claveMem = `${senderId}:${dinamica.id}`;
  const yaEntregado = log?.estado === 'entregado' || log?.estado === 'entregado_cortesia';

  const completarEntrega = async (estadoFinal = 'entregado') => {
    const ok = await enviarEntregaFinal(recipient, dinamica, { esPrivateReplyUnico: false });
    if (ok) {
      if (!yaEntregado) await alm.dinamicas.incrementarStat(dinamica.id, 'entregas');
      if (log?.commentId) {
        await alm.logs.actualizarPorComentario(log.commentId, { estado: estadoFinal });
      }
      intentosMemoria.delete(claveMem);
    }
    return { atendido: true, estado: estadoFinal, ok };
  };

  if (!dinamica.pedirSeguir || yaEntregado) {
    return completarEntrega('entregado');
  }

  // En este punto el usuario ya tocó el botón (consentimiento otorgado para consultar perfil)
  const verif = await consultarSiSigue(senderId);
  if (verif.ok && verif.sigue) {
    return completarEntrega('entregado');
  }

  // Contar intentos de "Ya los sigo" (al 3er reintento entregamos de cortesía por posible caché de Meta)
  const previos = Math.max(log?.intentosVerificacion || 0, intentosMemoria.get(claveMem) || 0);
  const intentos = accion === 'RETRY' ? previos + 1 : previos;
  intentosMemoria.set(claveMem, intentos);
  if (intentosMemoria.size > 2000) intentosMemoria.delete(intentosMemoria.keys().next().value);

  if (log?.commentId) {
    await alm.logs.actualizarPorComentario(log.commentId, {
      estado: 'no_sigue',
      intentosVerificacion: intentos,
    });
  }

  if (accion === 'RETRY' && intentos >= MAX_REINTENTOS_SEGUIR) {
    return completarEntrega('entregado_cortesia');
  }

  const textoBase = dinamica.mensajeNoSigue
    || '¡Casi listo! Antes de enviarte el enlace, síguenos en Instagram y toca aquí para verificar 💜';
  const textoConAviso = accion === 'RETRY'
    ? `${textoBase}\n\n(A veces Instagram tarda unos segundos en actualizarlo; intenta tocar el botón de nuevo.)`
    : textoBase;

  const msgReintento = plantillaPostback(
    textoConAviso,
    dinamica.textoBotonReintentar || 'Ya los sigo ✅',
    `${PREFIJO_POSTBACK}RETRY:${dinamica.id}`
  );
  await enviarDM(recipient, msgReintento);

  return { atendido: true, estado: 'no_sigue', intentos };
}

function _resetEstadoInterno() {
  cacheCuenta = { exp: 0, ids: new Set() };
  intentosMemoria.clear();
}

module.exports = {
  manejarComentario,
  manejarPostbackDinamica,
  esPostbackDinamica,
  coincideComentario,
  _resetEstadoInterno,
};
