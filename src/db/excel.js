const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// El archivo se guarda en la raíz del proyecto, junto a package.json
const FILE_PATH = path.join(__dirname, '..', '..', 'registros.xlsx');
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

      await workbook.xlsx.writeFile(FILE_PATH);
      console.log(`📊 Registro guardado en Excel (flujo: ${flow})`);
    } catch (err) {
      console.error('⚠️ Error guardando en Excel:', err.message);
    }
  });
  return writeQueue;
}

module.exports = { appendRecord, FILE_PATH };