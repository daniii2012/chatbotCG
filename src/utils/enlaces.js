// ═══════════════════════════════════════════════════════════════
// utils/enlaces.js
// Los textos del bot escriben los enlaces como [texto](url), para que el
// TEXTO sea lo que se ve y lo que se toca (como "Haz clic aquí" y no la URL larga).
//   • Simulador web: lo dibuja como enlace con ese texto (public/simulator.html).
//   • Instagram / Messenger / WhatsApp texto simple: no aceptan texto con enlace,
//     así que se manda "texto" y debajo la URL (aTextoPlano).
//   • WhatsApp: con botón de enlace (cta_url) sí puede verse con texto propio
//     (ver armarMensajesWhatsApp y src/api/whatsapp/send.js).
// ═══════════════════════════════════════════════════════════════
const RE_ENLACE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

// "[Instagram: Casa Gaviota AC](https://...)" -> "Instagram: Casa Gaviota AC\nhttps://..."
function aTextoPlano(texto) {
  return String(texto ?? '').replace(RE_ENLACE, (_, t, url) => `${t}\n${url}`);
}

// Parte un mensaje largo en trozos (por párrafos) para canales con límite de caracteres
function dividirMensaje(texto, max = 1000) {
  const trozos = [];
  let actual = '';
  for (const parrafo of String(texto ?? '').split(/\n{2,}/)) {
    const candidato = actual ? `${actual}\n\n${parrafo}` : parrafo;
    if (candidato.length <= max) { actual = candidato; continue; }
    if (actual) trozos.push(actual);
    // un párrafo que por sí solo rebasa el límite se corta por líneas
    actual = '';
    for (const linea of parrafo.split('\n')) {
      const c = actual ? `${actual}\n${linea}` : linea;
      if (c.length <= max) actual = c;
      else { if (actual) trozos.push(actual); actual = linea.slice(0, max); }
    }
  }
  if (actual) trozos.push(actual);
  return trozos;
}

// El botón de enlace de WhatsApp admite máximo 20 caracteres:
// "Instagram: Casa Gaviota AC" -> "Instagram"
function etiquetaBoton(t) {
  if (t.length <= 20) return t;
  const antes = t.split(':')[0].trim();
  return (antes.length && antes.length <= 20 ? antes : t.slice(0, 20)).trim();
}

// Devuelve los mensajes de WhatsApp a enviar: el texto (sin las líneas de enlace) y,
// por cada enlace, un mensaje con botón (cta_url), que es lo que permite ver texto en vez de URL.
function armarMensajesWhatsApp(texto, to) {
  const t = String(texto ?? '');
  const enlaces = [...t.matchAll(RE_ENLACE)].map((m) => ({ texto: m[1], url: m[2] }));
  if (!enlaces.length) {
    return [{ messaging_product: 'whatsapp', to, type: 'text', text: { body: t } }];
  }
  // quita del cuerpo las líneas que eran solo un enlace (con su emoji)
  const soloEnlace = (l) => {
    const sinEnlace = l.replace(RE_ENLACE, '');
    return sinEnlace !== l && sinEnlace.replace(/[\s\p{Extended_Pictographic}\uFE0F\u200D]/gu, '') === '';
  };
  const cuerpo = t.split('\n').filter((l) => !soloEnlace(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const mensajes = [];
  if (cuerpo) mensajes.push({ messaging_product: 'whatsapp', to, type: 'text', text: { body: cuerpo } });
  for (const e of enlaces) {
    mensajes.push({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: e.texto.slice(0, 1024) },
        action: { name: 'cta_url', parameters: { display_text: etiquetaBoton(e.texto), url: e.url } },
      },
    });
  }
  return mensajes;
}

module.exports = { aTextoPlano, dividirMensaje, etiquetaBoton, armarMensajesWhatsApp, RE_ENLACE };