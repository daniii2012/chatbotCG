// ═══════════════════════════════════════════════════════════════
// utils/respuestaNatural.js
// Para que la persona NO tenga que contestar siempre con números.
// En los pasos donde el bot da opciones (1, 2, 3...), entiende también:
//   "sí", "no puedo pagar", "presencial", "ropa", "servicio social", "la segunda",
//   "opción dos", "el nombre de la opción"... y lo convierte a la opción correcta.
// Si no lo entiende devuelve null y el flujo sigue como antes (vuelve a mostrar las opciones).
// ═══════════════════════════════════════════════════════════════
const { DATOS, TEXTOS } = require('../config/datos');
const { pideCotizacion } = require('./intencionEmpresarial');

const norm = (s) => String(s || '')
  .replace(/[\uFE0F\u20E3]/g, '')                       // emojis de número: 1️⃣ → 1
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[¡!¿?.,;:()"'“”_-]/g, ' ').replace(/\s+/g, ' ').trim();

const NUMEROS = {
  cero: 0, uno: 1, una: 1, primero: 1, primera: 1, primer: 1, dos: 2, segundo: 2, segunda: 2,
  tres: 3, tercero: 3, tercera: 3, tercer: 3, cuatro: 4, cuarto: 4, cuarta: 4, cinco: 5, quinto: 5, quinta: 5,
  seis: 6, sexto: 6, siete: 7, septimo: 7, ocho: 8, octavo: 8, nueve: 9, diez: 10, decimo: 10, decima: 10,
};

// "2", "dos", "opción 2", "la segunda", "quiero la 2 por favor", "2️⃣"  →  '2'
function numeroDicho(texto) {
  const n = norm(texto);
  const m = /^(?:(?:quiero|elijo|escojo|prefiero|me quedo con|voy con|vamos con|dame|opcion|numero|la|el|#)\s+)*(\d{1,2}|[a-z]+)(?:\s+(?:por favor|porfa|gracias|opcion))?$/.exec(n);
  if (!m) return null;
  if (/^\d{1,2}$/.test(m[1])) return m[1];
  return m[1] in NUMEROS ? String(NUMEROS[m[1]]) : null;
}

const NEGATIVO = /^(no+|nop|nel|nunca|negativo|ahora no|mejor no|todavia no|por ahora no|no gracias|nada)(\s|$)/;
const AFIRMATIVO = /^(si+|sip|claro|por supuesto|ok|okay|oki|dale|va|vale|de acuerdo|correcto|asi es|adelante|exacto|afirmativo|con gusto|seguro|obvio|desde luego|perfecto)(\s|$)/;

// ¿Se parece el texto al nombre de la opción? (por palabras importantes)
function coincideNombre(n, nombre) {
  const nn = norm(nombre);
  if (!nn) return false;
  if (n.includes(nn) || (n.length >= 5 && nn.includes(n))) return true;
  const claves = nn.split(' ').filter((p) => p.length >= 5 && !['talleres', 'cursos', 'curso'].includes(p));
  return claves.length > 0 && claves.some((p) => n.includes(p.slice(0, Math.max(5, p.length - 2))));
}

// Reglas por paso. Cada una devuelve la opción ('1', '2'...) o null.
const NO_PUEDE_PAGAR = /(no puedo|no tengo|no me alcanza|no alcanza|no cuento|sin recursos|sin dinero|poco dinero|estudio|socioeconomic|ayuda economica|beca|descuento|rebaja|cuota (menor|mas baja|reducida)|mas barato|muy caro|es caro)/;
const PUEDE_PAGAR = /(puedo cubrir|puedo pagar|si puedo|cubrir el costo|lo pago|esta bien|de acuerdo)/;

const REGLAS = {
  psico_cuota: { validos: ['1', '2'], reconocer: (n) => (NO_PUEDE_PAGAR.test(n) || NEGATIVO.test(n)) ? '2' : (AFIRMATIVO.test(n) || PUEDE_PAGAR.test(n)) ? '1' : null },
  lectura_cuota: { validos: ['1', '2'], reconocer: (n) => (NO_PUEDE_PAGAR.test(n) || NEGATIVO.test(n)) ? '2' : (AFIRMATIVO.test(n) || PUEDE_PAGAR.test(n)) ? '1' : null },
  legal_cuota: { validos: ['1', '2'], reconocer: (n) => (NO_PUEDE_PAGAR.test(n) || NEGATIVO.test(n)) ? '2' : (AFIRMATIVO.test(n) || PUEDE_PAGAR.test(n)) ? '1' : null },

  psico_valoracion: {
    validos: ['1', '2'],
    reconocer: (n) => (/(solo|espero|valoracion|despues|ahora no|mas adelante|todavia no|no gracias)/.test(n) || NEGATIVO.test(n)) ? '2'
      : (AFIRMATIVO.test(n) || /(inscrib|me interesa|quiero|participar|registr)/.test(n)) ? '1' : null,
  },

  bio_agendar: {
    validos: ['1', '2'],
    reconocer: (n) => (/(despues|luego|mas adelante|solo (informacion|info)|ahora no)/.test(n) || NEGATIVO.test(n)) ? '2'
      : (AFIRMATIVO.test(n) || /(agendar|cita|reservar|quiero)/.test(n)) ? '1' : null,
  },

  donativos_recibo: {
    validos: ['1', '2'],
    reconocer: (n) => (/(sin recibo|no lo necesito|no requiero|no necesito)/.test(n) || NEGATIVO.test(n)) ? '2'
      : (AFIRMATIVO.test(n) || /(recibo|factura|deducible|lo necesito|requiero)/.test(n)) ? '1' : null,
  },

  standup_modalidad: {
    validos: ['1', '2'],
    reconocer: (n) => /(presencial|en persona|presenci|fisic)/.test(n) ? '1'
      : /(linea|virtual|online|zoom|remot|distancia|videollamada|meet)/.test(n) ? '2' : null,
  },

  donativos_tipo: {
    validos: ['1', '2', '3'],
    reconocer: (n) => /(voluntari|mi tiempo|dar mi tiempo|colaborar con)/.test(n) ? '3'
      : /(especie|ropa|prenda|objeto|cosas|juguete|libro)/.test(n) ? '2'
      : /(economic|dinero|transfer|deposit|efectivo|pesos|aportacion)/.test(n) ? '1' : null,
  },

  rrhh_opcion: {
    validos: ['1', '2', '3', '4'],
    reconocer: (n) => /(servicio social|practicas|practicante|residencia|estancia)/.test(n) ? '2'
      : /voluntari/.test(n) ? '3'
      : /(consult|disponible|que vacantes|hay vacantes|ver vacantes|vacantes abiertas|cuales)/.test(n) ? '4'
      : /(postul|aplicar|vacante|empleo|trabajo|curriculum|cv)/.test(n) ? '1' : null,
  },

  empresarial_menu: {
    validos: ['1', '2', '3'],
    reconocer: (n) => (pideCotizacion(n) || /(solicitar|propuesta|contactar)/.test(n)) ? '3'
      : /(modalidad|formato|sesion focalizada|ruta tematica|programa a la medida)/.test(n) ? '2'
      : /(tema|taller|catalogo|que ofrecen|\bver\b)/.test(n) ? '1' : null,
  },

  empresarial_lineas: {
    validos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    reconocer: (n) => {
      if (pideCotizacion(n)) return '9';
      if (/(regresar|volver|atras|menu anterior)/.test(n)) return '0';
      const i = DATOS.empresas.lineas.findIndex((l) => coincideNombre(n, l.nombre));
      return i >= 0 ? String(i + 1) : null;
    },
  },

  empeco_programa: {
    validos: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    reconocer: (n) => {
      const hallado = Object.entries(TEXTOS.empEco.programas).find(([, nombre]) => coincideNombre(n, nombre));
      return hallado ? hallado[0] : null;
    },
  },
};

// Devuelve la opción canónica ('1', '2'...) o null si no la entendió
function resolverRespuesta(step, texto) {
  const regla = REGLAS[step];
  if (!regla) return null;
  const num = numeroDicho(texto);
  if (num !== null) return regla.validos.includes(num) ? num : null;
  return regla.reconocer(norm(texto)) || null;
}

module.exports = { resolverRespuesta, numeroDicho, REGLAS };