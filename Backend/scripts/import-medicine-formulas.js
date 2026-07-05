const path = require('path');
const fs = require('fs');
const { connectDB } = require('../config/db');
const MasterData = require('../models/MasterData');

function normalizeMedicineName(value) {
  if (value === undefined || value === null) return null;

  let cleaned = String(value).trim().replace(/^['"\s]+|['"\s]+$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');

  if (!cleaned) return null;
  if (/^\d+(?:\.\d+)*\s*/.test(cleaned)) return null;
  if (/^[*?]+$/.test(cleaned)) return null;
  if (/^(complementary list|national list|eml|list)$/i.test(cleaned)) return null;
  if (/^(inhalation|injection|topical forms|dental cartridge|oral|tablet|capsule|syrup|cream|ointment|solution|suppository|drops|ampoule|vial|box|strip|bottle)/i.test(cleaned)) return null;
  if (/:/.test(cleaned) || /;/.test(cleaned)) return null;
  if (/[0-9]/.test(cleaned) && !/[A-Za-z]/.test(cleaned)) return null;

  cleaned = cleaned.replace(/\*+$/g, '').trim();
  if (!cleaned) return null;

  return cleaned;
}

function extractMedicineNamesFromText(text) {
  const names = [];
  const seen = new Set();

  const lines = String(text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/^['"]|['"]$/g, '').trim();
    if (!line) continue;

    const normalized = normalizeMedicineName(line);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      names.push(normalized);
    }
  }

  return names;
}

function collectMedicineNamesFromSources(sources) {
  const names = [];
  const seen = new Set();
  const sourceList = Array.isArray(sources) ? sources : [sources];

  for (const source of sourceList) {
    const absolutePath = path.resolve(source);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const text = fs.readFileSync(absolutePath, 'utf8');
    for (const name of extractMedicineNamesFromText(text)) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
    }
  }

  return names;
}

async function importMedicineFormulas(source, options = {}) {
  const { connect = true, skipIfExists = false } = options;
  const sourceList = Array.isArray(source) ? source : [source];

  if (connect) {
    await connectDB();
  }

  if (skipIfExists) {
    const existingCount = await MasterData.countDocuments({ type: 'medicine_master', isActive: true });
    if (existingCount > 0) {
      return { inserted: 0, updated: 0, skipped: existingCount };
    }
  }

  const names = collectMedicineNamesFromSources(sourceList);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const name of names) {
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const record = await MasterData.findOne({ type: 'medicine_master', code });

    if (record) {
      if (record.name !== name) {
        record.name = name;
        await record.save();
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await MasterData.create({
      type: 'medicine_master',
      name,
      code: code || `MED_${inserted + 1}`,
      description: 'Imported from medicine formulas list',
      isActive: true,
    });
    inserted += 1;
  }

  return { inserted, updated, skipped };
}

if (require.main === module) {
  (async () => {
    try {
      const requestedSources = process.argv.slice(2);
      const sources = requestedSources.length > 0
        ? requestedSources
        : [
            path.join(__dirname, '..', 'WHO-MVP-EMP-IAU-2019.06-eng.csv'),
            path.join(__dirname, '..', 'essentialmedicineslist2013_2.csv'),
          ];
      const summary = await importMedicineFormulas(sources, { connect: true, skipIfExists: false });
      console.log(JSON.stringify(summary));
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

module.exports = {
  extractMedicineNamesFromText,
  collectMedicineNamesFromSources,
  importMedicineFormulas,
  normalizeMedicineName,
};
