import * as XLSX from 'xlsx';

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildCaseInsensitiveMap(row) {
  const map = new Map();
  Object.keys(row || {}).forEach((key) => {
    map.set(normalizeKey(key), row[key]);
  });
  return map;
}

export function parseSpreadsheetRowsFromFile(file) {
  if (!file?.buffer) {
    throw new Error('Spreadsheet file is required.');
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

export function mapRowsByFieldMapping(rows, mapping = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const normalizedMapping = Object.entries(mapping || {}).reduce((acc, [targetField, sourceHeader]) => {
    if (!sourceHeader) {
      return acc;
    }
    acc[targetField] = normalizeKey(sourceHeader);
    return acc;
  }, {});

  return rows
    .map((row) => {
      const sourceMap = buildCaseInsensitiveMap(row);
      const mapped = {};

      Object.keys(normalizedMapping).forEach((targetField) => {
        mapped[targetField] = sourceMap.get(normalizedMapping[targetField]);
      });

      if (Object.keys(normalizedMapping).length === 0) {
        sourceMap.forEach((value, key) => {
          mapped[key] = value;
        });
      }

      return mapped;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''));
}
