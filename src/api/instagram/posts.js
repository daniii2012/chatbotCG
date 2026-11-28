// ═══════════════════════════════════════════════════════════════
// api/instagram/posts.js
// Consulta las publicaciones reales de la cuenta de Instagram
// (usando INSTAGRAM_ACCESS_TOKEN en graph.instagram.com, o respaldo
//  con MESSENGER_PAGE_ACCESS_TOKEN en graph.facebook.com).
// ═══════════════════════════════════════════════════════════════
const GRAPH_VERSION = 'v23.0';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos para no saturar Meta

const cache = new Map();

const GRADIENTES_RESPALDO = [
  'linear-gradient(135deg, #D63381 0%, #FF7AA8 100%)',
  'linear-gradient(135deg, #16AAB4 0%, #0E6E75 100%)',
  'linear-gradient(135deg, #A3225E 0%, #16AAB4 100%)',
  'linear-gradient(135deg, #3A2430 0%, #D63381 100%)',
  'linear-gradient(135deg, #12909A 0%, #5EC9C5 100%)',
];

function formatearFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

function etiquetaTipoMedia(mediaType) {
  switch (String(mediaType || '').toUpperCase()) {
    case 'VIDEO': return 'REEL / VIDEO';
    case 'CAROUSEL_ALBUM': return 'CARRUSEL';
    case 'IMAGE': return 'POST';
    default: return String(mediaType || 'POST').toUpperCase();
  }
}

function tituloDesdeCaption(caption, mediaType) {
  const limpio = String(caption || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return `Publicación (${etiquetaTipoMedia(mediaType)})`;
  return limpio.length > 48 ? limpio.slice(0, 45).trim() + '…' : limpio;
}

function normalizarPost(item, idx) {
  const tipo = String(item.media_type || 'IMAGE').toUpperCase();
  // En videos/reels media_url apunta al .mp4; la imagen de portada viene en thumbnail_url
  const imagenUrl = tipo === 'VIDEO'
    ? (item.thumbnail_url || '')
    : (item.media_url || item.thumbnail_url || '');

  return {
    id: String(item.id),
    mediaType: etiquetaTipoMedia(tipo),
    mediaTypeRaw: tipo,
    tituloCorto: tituloDesdeCaption(item.caption, tipo),
    caption: String(item.caption || '').trim() || '(Sin descripción)',
    imagenUrl,
    permalink: item.permalink || '',
    timestamp: item.timestamp || null,
    fecha: formatearFecha(item.timestamp),
    gradient: GRADIENTES_RESPALDO[idx % GRADIENTES_RESPALDO.length],
  };
}

function explicarErrorMeta(errJson, status) {
  const msg = errJson?.error?.message || `Meta respondió con estado ${status}`;
  const code = errJson?.error?.code;

  if (code === 190) {
    return {
      codigo: 'TOKEN_INVALIDO',
      error: 'El token de Instagram caducó o es inválido. Genera uno nuevo en Meta Developers y actualízalo en Render.',
      detalleMeta: msg,
    };
  }
  if (code === 10 || code === 200 || /permission/i.test(msg)) {
    return {
      codigo: 'SIN_PERMISO',
      error: 'El token actual no tiene permiso para leer publicaciones (falta instagram_business_basic o regenerar el token tras agregar permisos).',
      detalleMeta: msg,
    };
  }
  return {
    codigo: 'ERROR_META',
    error: `Meta devolvió un error al consultar publicaciones: ${msg}`,
    detalleMeta: msg,
  };
}

async function fetchJson(url, headers = {}) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* respuesta no JSON */ }
  return { ok: r.ok, status: r.status, json };
}

async function consultarConInstagramLogin({ token, limit, after }) {
  const headers = { Authorization: `Bearer ${token}` };
  const fieldsMedia = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const params = new URLSearchParams({ fields: fieldsMedia, limit: String(limit) });
  if (after) params.set('after', after);

  const [mediaRes, perfilRes] = await Promise.all([
    fetchJson(`https://graph.instagram.com/${GRAPH_VERSION}/me/media?${params.toString()}`, headers),
    after
      ? Promise.resolve(null)
      : fetchJson(`https://graph.instagram.com/${GRAPH_VERSION}/me?fields=user_id,username,name,profile_picture_url,account_type,media_count`, headers),
  ]);

  if (!mediaRes.ok) {
    return { ok: false, ...explicarErrorMeta(mediaRes.json, mediaRes.status) };
  }

  let cuenta = null;
  if (perfilRes && perfilRes.ok) {
    const rawPerfil = Array.isArray(perfilRes.json?.data) ? perfilRes.json.data[0] : perfilRes.json;
    if (rawPerfil) {
      cuenta = {
        id: String(rawPerfil.user_id || rawPerfil.id || ''),
        username: rawPerfil.username || '',
        name: rawPerfil.name || '',
        profilePictureUrl: rawPerfil.profile_picture_url || '',
        accountType: rawPerfil.account_type || '',
        mediaCount: rawPerfil.media_count ?? null,
      };
    }
  }

  const rawPosts = Array.isArray(mediaRes.json?.data) ? mediaRes.json.data : [];
  const nextCursor = mediaRes.json?.paging?.next ? (mediaRes.json?.paging?.cursors?.after || null) : null;

  return {
    ok: true,
    modo: 'instagram_login',
    cuenta,
    posts: rawPosts.map(normalizarPost),
    paging: { nextCursor, hayMas: Boolean(nextCursor) },
  };
}

async function consultarConFacebookLogin({ token, limit, after }) {
  const qs = `access_token=${encodeURIComponent(token)}`;
  const cuentaRes = await fetchJson(
    `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=instagram_business_account{id,username,name,profile_picture_url,media_count}&${qs}`
  );

  if (!cuentaRes.ok) {
    return { ok: false, ...explicarErrorMeta(cuentaRes.json, cuentaRes.status) };
  }

  const ig = cuentaRes.json?.instagram_business_account;
  if (!ig?.id) {
    return {
      ok: false,
      codigo: 'SIN_CUENTA_IG',
      error: 'La página de Facebook conectada no devolvió una cuenta de Instagram Business vinculada.',
    };
  }

  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
    limit: String(limit),
    access_token: token,
  });
  if (after) params.set('after', after);

  const mediaRes = await fetchJson(`https://graph.facebook.com/${GRAPH_VERSION}/${ig.id}/media?${params.toString()}`);
  if (!mediaRes.ok) {
    return { ok: false, ...explicarErrorMeta(mediaRes.json, mediaRes.status) };
  }

  const rawPosts = Array.isArray(mediaRes.json?.data) ? mediaRes.json.data : [];
  const nextCursor = mediaRes.json?.paging?.next ? (mediaRes.json?.paging?.cursors?.after || null) : null;

  return {
    ok: true,
    modo: 'facebook_login',
    cuenta: {
      id: String(ig.id),
      username: ig.username || '',
      name: ig.name || '',
      profilePictureUrl: ig.profile_picture_url || '',
      mediaCount: ig.media_count ?? null,
    },
    posts: rawPosts.map(normalizarPost),
    paging: { nextCursor, hayMas: Boolean(nextCursor) },
  };
}

async function listarPublicacionesInstagram({ limit = 24, after = '', refresh = false } = {}) {
  const limiteSeguro = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 50);
  const igToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  const fbToken = (process.env.MESSENGER_PAGE_ACCESS_TOKEN || '').trim();

  if (!igToken && !fbToken) {
    return {
      ok: false,
      codigo: 'FALTA_TOKEN',
      error: 'Este servidor no tiene configurado INSTAGRAM_ACCESS_TOKEN (ni MESSENGER_PAGE_ACCESS_TOKEN) en las variables de entorno.',
    };
  }

  const cacheKey = `${igToken ? 'ig' : 'fb'}:${limiteSeguro}:${after || 'first'}`;
  if (!refresh) {
    const guardado = cache.get(cacheKey);
    if (guardado && guardado.exp > Date.now()) {
      return { ...guardado.data, desdeCache: true };
    }
  }

  try {
    const resultado = igToken
      ? await consultarConInstagramLogin({ token: igToken, limit: limiteSeguro, after })
      : await consultarConFacebookLogin({ token: fbToken, limit: limiteSeguro, after });

    if (resultado.ok) {
      cache.set(cacheKey, { exp: Date.now() + CACHE_TTL_MS, data: resultado });
    }
    return resultado;
  } catch (err) {
    console.error('[INSTAGRAM POSTS] Error de red:', err.message);
    return {
      ok: false,
      codigo: 'ERROR_RED',
      error: `No se pudo conectar con Meta: ${err.message}`,
    };
  }
}

module.exports = { listarPublicacionesInstagram };
