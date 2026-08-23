const mongoose = require('mongoose');

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
  telefono: { type: String, required: true },
  correo: { type: String, required: true, lowercase: true, trim: true },
  servicioSolicita: String,
  data: Object,
}, { timestamps: true });

const Registro = mongoose.model('Registro', registroSchema);

async function saveBotRecord(flow, sessionData, userId) {
  const { correo, telefono, nombre } = sessionData || {};
  
  if (!correo || !telefono) {
    console.warn(`Registro omitido: usuario ${userId} en flujo '${flow}' no completo correo o telefono.`);
    return;
  }

  try {
    const nuevoRegistro = new Registro({
      userId,
      flow,
      nombre: nombre ? nombre.trim() : 'No especificado',
      telefono: telefono.trim(),
      correo: correo.trim().toLowerCase(),
      servicioSolicita: sessionData.servicioSolicita || flow,
      data: sessionData,
    });

    await nuevoRegistro.save();
    console.log(`Registro finalizado y guardado en MongoDB Atlas para: ${correo}`);
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

module.exports = { saveBotRecord, getRegisteredEmails };