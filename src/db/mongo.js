const mongoose = require('mongoose');

const { enviarRegistroOnline } = require('./sheetsOnline');

const mongoURI = process.env.MONGO_URI || process.env.mongoURI;

if (mongoURI) {
  mongoose.connect(mongoURI)
    .then(() => console.log('Conectado a MongoDB Atlas con exito'))
    .catch(err => console.error('Error al conectar con MongoDB:', err.message));
} else {
  console.warn('Falta MONGO_URI en las variables de entorno (.env)');
}

const registroSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  flow: { type: String, required: true },
  nombre: { type: String, required: true },
  telefono: { type: String, default: '' },
  correo: { type: String, default: '', lowercase: true, trim: true },
  servicioSolicita: String,
  data: Object,
}, { timestamps: true });

const Registro = mongoose.model('Registro', registroSchema);

// ─── Configuración editable desde el panel admin (precios, números, convocatorias...) ───
const configSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true },
  valor: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
const ConfigDoc = mongoose.model('Config', configSchema);

const hayMongo = Boolean(mongoURI);

async function leerConfigRemota() {
  if (!hayMongo) return null;
  try {
    const docs = await ConfigDoc.find({});
    return Object.fromEntries(docs.map((d) => [d.clave, d.valor]));
  } catch (err) {
    console.error('[CONFIG] No se pudo leer la configuración de Mongo:', err.message);
    return null;
  }
}

async function guardarConfigRemota(clave, valor) {
  if (!hayMongo) throw new Error('Mongo no está configurado');
  await ConfigDoc.findOneAndUpdate({ clave }, { valor }, { upsert: true });
}

async function borrarConfigRemota(clave) {
  if (!hayMongo) return;
  await ConfigDoc.deleteOne({ clave });
}

async function saveBotRecord(flow, sessionData, userId) {
  const { correo, telefono, nombre, contacto, info } = sessionData || {};

  // Se guarda si la persona dejó algún dato suyo (nombre o forma de contacto).
  // Así también entran los servicios que no piden correo (Servicios del centro, Empoderamiento
  // económico, Donativos...). Una sesión sin ningún dato (ej. alerta de crisis) NO se guarda.
  const tieneDatos = Boolean(nombre || correo || telefono || contacto || info);
  if (!tieneDatos) {
    console.warn(`Registro omitido: usuario ${userId} en flujo '${flow}' no dejó datos de contacto.`);
    return;
  }

  // Copia exacta en el Excel en línea (no bloquea ni depende de que Mongo funcione)
  enviarRegistroOnline(flow, sessionData, userId);

  try {
    const nuevoRegistro = new Registro({
      userId,
      flow,
      nombre: nombre ? nombre.trim() : 'No especificado',
      telefono: telefono ? String(telefono).trim() : '',
      correo: correo ? String(correo).trim().toLowerCase() : '',
      servicioSolicita: sessionData.servicioSolicita || flow,
      data: sessionData,
    });

    await nuevoRegistro.save();
    console.log(`Registro finalizado y guardado en MongoDB Atlas (${flow}): ${correo || telefono || nombre || contacto || userId}`);
  } catch (error) {
    console.error('Error al guardar en Mongo:', error.message);
  }
}

async function getRegisteredEmails() {
  try {
    const registros = await Registro.find({}).select('correo');
    const emails = registros.map(r => r.correo).filter(Boolean);
    return [...new Set(emails)];
  } catch (error) {
    console.error('Error al obtener correos:', error.message);
    return [];
  }  
}

module.exports = { saveBotRecord, getRegisteredEmails, leerConfigRemota, guardarConfigRemota, borrarConfigRemota };