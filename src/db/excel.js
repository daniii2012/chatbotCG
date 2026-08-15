const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { EMPODERAMIENTO_PREGUNTAS } = require('../config/questionnaires');

// El archivo se guarda en la raíz del proyecto, junto a package.json
// (o dentro de DATA_DIR si está definido, ej. en producción con disco persistente)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const FILE_PATH = path.join(DATA_DIR, 'registros.xlsx');
const SHEET_NAME = 'Registros';

const HEADERS = [
  'Fecha', 'Flujo', 'UserId', 'Nombre', 'Teléfono', 'Correo',
  'Residencia', 'Edad', 'Modalidad', 'Detalle',
];

// Campos "conocidos" que ya tienen su propia columna.
// Todo lo demás (programa, empresa, contacto, interés, tipo, etc.)
// se concatena en la columna "Detalle".
const CAMPOS_CONOCIDOS = ['nombre', 'telefono', 'correo', 'residencia', 'edad', 'modalidad'];

// Evita escrituras simultáneas al mismo archivo (Excel no soporta
// múltiples escrituras concurrentes sin corromper el archivo).
let writeQueue = Promise.resolve();

function buildDetalle(data) {
  const extra = Object.entries(data || {}).filter(([k]) => !CAMPOS_CONOCIDOS.includes(k));
  return extra.map(([k, v]) => `${k}: ${v}`).join(' | ');
}

async function getOrCreateSheet(workbook) {
  let sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow(HEADERS);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8DCC4' },
    };
    sheet.columns = HEADERS.map((h) => ({
      width: h === 'Detalle' ? 45 : h === 'UserId' ? 30 : 20,
    }));
  }
  return sheet;
}

// Escribe primero a un archivo temporal y luego renombra — evita que
// registros.xlsx quede corrupto si el proceso muere a medio guardar.
// Reintenta el renombrado varias veces por si el archivo está
// momentáneamente bloqueado (antivirus, OneDrive, --watch reiniciando).
async function writeWorkbookAtomically(workbook) {
  const tempPath = FILE_PATH + '.tmp';
  await workbook.xlsx.writeFile(tempPath);

  const maxIntentos = 5;
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      fs.renameSync(tempPath, FILE_PATH);
      return; // éxito, salimos de la función
    } catch (err) {
      if (intento === maxIntentos) {
        console.error(`⚠️ No se pudo renombrar el archivo tras ${maxIntentos} intentos.`);
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

async function appendRecord(flow, data, userId) {
  // Encolamos para que dos escrituras no se pisen entre sí
  writeQueue = writeQueue.then(async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      if (fs.existsSync(FILE_PATH)) {
        await workbook.xlsx.readFile(FILE_PATH);
      }
      const sheet = await getOrCreateSheet(workbook);

      sheet.addRow([
        new Date().toLocaleString('es-MX'),
        flow || '',
        userId || '',
        data?.nombre || '',
        data?.telefono || '',
        data?.correo || '',
        data?.residencia || '',
        data?.edad || '',
        data?.modalidad || '',
        buildDetalle(data),
      ]);

      await writeWorkbookAtomically(workbook);
      console.log(`📊 Registro guardado en Excel (flujo: ${flow})`);
    } catch (err) {
      console.error('⚠️ Error guardando en Excel:', err.message);
    }
  });
  return writeQueue;
}

async function appendEmpoderamientoRecord(session) {
  const { userId, data } = session;
  writeQueue = writeQueue.then(async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      if (fs.existsSync(FILE_PATH)) {
        await workbook.xlsx.readFile(FILE_PATH);
      }
      let sheet = workbook.getWorksheet('Empoderamiento');
      const headers = ['Fecha', 'UserId', 'Nombre', ...EMPODERAMIENTO_PREGUNTAS.map((p) => p.key)];
      if (!sheet) {
        sheet = workbook.addWorksheet('Empoderamiento');
        sheet.addRow(headers);
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC4' } };
        sheet.columns = headers.map(() => ({ width: 18 }));
      }
      sheet.addRow([
        new Date().toLocaleString('es-MX'),
        userId || '',
        data?.nombre || '',
        ...EMPODERAMIENTO_PREGUNTAS.map((p) => data?.[p.key] || ''),
      ]);

      await writeWorkbookAtomically(workbook);
      console.log('📊 Cuestionario de empoderamiento guardado en Excel');
    } catch (err) {
      console.error('⚠️ Error guardando empoderamiento:', err.message);
    }
  });
  return writeQueue;
}

module.exports = { appendRecord, appendEmpoderamientoRecord, FILE_PATH };
