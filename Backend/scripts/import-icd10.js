const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { connectDB } = require('../config/db');
const IcdCode = require('../models/IcdCode');

const normalize = (value) => !value && value !== 0 ? undefined : String(value).trim();

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const pushRow = () => {
    row.push(cell);
    if (row.some((value) => value !== '')) {
      rows.push(row);
    }
    row = [];
    cell = '';
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      pushRow();
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

function parseCsvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsvRows(text);

  if (rows.length < 1) {
    throw new Error('No rows in CSV');
  }

  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((line) => {
    return header.reduce((acc, key, index) => {
      acc[key] = line[index] !== undefined ? line[index].trim() : '';
      return acc;
    }, {});
  });
}

async function importIcdCodes(source, options = {}) {
  const { connect = true, skipIfExists = false } = options;
  const absolutePath = path.resolve(source);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  if (connect) {
    console.log('Connecting to DB...');
    await connectDB();
  }

  if (skipIfExists) {
    const existingCount = await IcdCode.countDocuments();
    if (existingCount > 0) {
      console.log(`ICD master data already exists (${existingCount} records); skipping import.`);
      return { inserted: 0, updated: 0, skipped: existingCount };
    }
  }

  let rows = [];
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('No sheets found in workbook');
    rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  } else if (ext === '.csv' || ext === '.tsv') {
    rows = parseCsvFile(absolutePath);
  } else {
    throw new Error('Unsupported file extension: ' + ext + '. Use .xlsx, .xls, .csv or .tsv');
  }

  console.log(`Parsed ${rows.length} rows from ${absolutePath}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const batchSize = 1000;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const operations = [];

    for (const raw of batch) {
      const code = normalize(
        raw.code || raw.code?.toString() || raw.CODE || raw.icd || raw.ICD || raw.ICD10 || raw['ICD-10'] || raw['CODE']
      );
      const description = normalize(
        raw.description || raw.Description || raw.DESCRIPTION ||
        raw['SHORT DESCRIPTION (VALID ICD-10 FY2026)'] || raw['LONG DESCRIPTION (VALID ICD-10 FY2026)'] ||
        raw['SHORT DESCRIPTION'] || raw['LONG DESCRIPTION'] || raw.DESC
      );
      const chapter = normalize(raw.chapter || raw.Chapter || raw.CHAPTER);
      const category = normalize(raw.category || raw.Category || raw.CATEGORY || raw['NF EXCL']);

      if (!code || !description) {
        skipped += 1;
        continue;
      }

      const payload = {
        code,
        description,
        chapter: chapter || undefined,
        category: category || undefined,
        active: true,
      };

      operations.push({
        updateOne: {
          filter: { code },
          update: { $set: payload },
          upsert: true,
        },
      });
    }

    if (operations.length === 0) {
      continue;
    }

    const result = await IcdCode.bulkWrite(operations, { ordered: false });
    inserted += result.upsertedCount || 0;
    updated += result.modifiedCount || 0;
  }

  return { inserted, updated, skipped };
}

if (require.main === module) {
  (async () => {
    try {
      const source = process.argv[2];
      if (!source) {
        console.error('Usage: node scripts/import-icd10.js <path-to-csv-or-xlsx>');
        process.exit(1);
      }

      const summary = await importIcdCodes(source, { connect: true, skipIfExists: false });
      console.log(`Import completed: inserted=${summary.inserted}, updated=${summary.updated}, skipped=${summary.skipped}`);
      process.exit(0);
    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { importIcdCodes, normalize, parseCsvRows, parseCsvFile };
