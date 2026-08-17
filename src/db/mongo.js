const mongoose = require('mongoose');

const mongoURI = process.env.mongoURI;

if (mongoURI) {
    mongoose.connect(mongoURI)
    .then(() => console.log('CONECTADO a MongoDb atlas'))
    .catch(err => console.error('ERROR al conectar con MongoDb', err.message));
} else {
    console.warn('falta MONGO_URI en las variables de entorno');
}

const registroSchema = new mongoose.Schema({
    userId: {type: String, required:true},
    flow: {type: String, required: true},
    nombre: {String, required: true},
    telefono: {String, required: true},
    correo: {String, required: true, lowercase: true, trim:true},
    servicioSolicita: String,
    data: Object,
}, {timestamps: true});

const Registro = mongoose.model('Registro', registroSchema);

async function saveBotRecord(flow, sessionData, userId) {
    const{correo, telefono, nombre} = sessionData || {};
    if (!correo || telefono){
        console.warn(`Registro omitido: usuario ${userId} en flujo '${flow}', no completó correo o teléfono.`);
        return;
    }

    try{
        const nuevoRegistro = new Registro({
            userId,
            flow,
            nombre: nombre ? nombre.trim(): 'No especificado',
            telefono: telefono.trim(),
            correo: correo.trim().toLowerCase(),
            servicioSolicita: sessionData.servicioSolicita || flow,
            data: sessionData,
        });

        await nuevoRegistro.save();
        console.log('registro finalizado y guardado');
    } catch (error){
        console.error('error al guardar', error.message);
    }
}


async function getRegisteredEmails() {
    try{
        const registros = await Registro.find({}).select('correo');
        const emails = registros.map(r => r.correo).filter(Boolean);
        return [...new Set(emails)];
    } catch (error){
        console.error('error al obtener correos:', error.message);
        return[];
    }  
}

module.exports = {saveBotRecord, getRegisteredEmails};