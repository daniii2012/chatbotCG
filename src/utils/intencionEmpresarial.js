// Detecta cuándo alguien pide una COTIZACIÓN / propuesta de talleres empresariales,
// y valida la extensión telefónica. Se usa para pasar directo a pedir sus datos
// (en vez de repetir la información del catálogo).
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const PIDE_COTIZACION = /(cotiz|presupuesto|precio|costo|cuanto (cuesta|cuestan|sale|salen|cobran|cobra)|tarifa|propuesta|contratar|contratacion)/;
const CONTEXTO_EMPRESA = /(empresa|empresarial|corporativ|institucion|organizacion|colaborador|mi equipo|mi personal|responsabilidad social)/;
// Si habla de otro servicio, no se confunde con una solicitud empresarial
const OTRO_SERVICIO = /(psicolog|terapia|legal|abogad|biodesc|stand ?up|acoso callejero|donativ|donar|curso|masaje|empoderamiento|vacante)/;

// "quiero cotización de talleres para mi empresa"; o "cotización" cuando venían hablando de empresas
function esCotizacionEmpresarial(texto, ultimaOpcionMencionada) {
  const n = norm(texto);
  if (!PIDE_COTIZACION.test(n)) return false;
  if (CONTEXTO_EMPRESA.test(n)) return true;
  return ultimaOpcionMencionada === '7' && !OTRO_SERVICIO.test(n);
}

// Dentro del flujo de empresas basta con que mencione cotización / precio / propuesta
const pideCotizacion = (texto) => PIDE_COTIZACION.test(norm(texto));

// Extensión: solo números (opcionalmente con "ext") o "no tengo"
const NO_TIENE = /^(no|no tengo|no aplica|no cuento|ninguna|ninguno|n\/?a|sin extension|no hay|-+)$/;
function esExtensionValida(texto) {
  const n = norm(texto);
  return NO_TIENE.test(n) || /^(ext\.?\s*)?\d{1,8}$/.test(n);
}
function normalizarExtension(texto) {
  const n = norm(texto);
  if (NO_TIENE.test(n)) return 'No tiene';
  return n.replace(/^ext\.?\s*/, '');
}

module.exports = { esCotizacionEmpresarial, pideCotizacion, esExtensionValida, normalizarExtension };
