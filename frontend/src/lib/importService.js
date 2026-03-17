import * as XLSX from 'xlsx';

export async function parseSpreadsheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    return { headers: [], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const headers = Object.keys(rows[0] || {});

  return { headers, rows };
}

export function mapImportedRows(rows, mapping) {
  return rows
    .map((row) => {
      const mapped = {};
      Object.entries(mapping).forEach(([targetField, sourceColumn]) => {
        mapped[targetField] = sourceColumn ? row[sourceColumn] : undefined;
      });
      return mapped;
    })
    .filter((row) => Object.values(row).some((value) => value !== undefined && value !== null && String(value).trim() !== ''));
}
