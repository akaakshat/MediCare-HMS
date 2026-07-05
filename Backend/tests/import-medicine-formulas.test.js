const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { collectMedicineNamesFromSources } = require('../scripts/import-medicine-formulas');

test('collectMedicineNamesFromSources merges medicines from multiple files without duplicates', () => {
  const oldList = path.join(__dirname, '..', '..', 'WHO-MVP-EMP-IAU-2019.06-eng.csv');
  const newList = path.join(__dirname, '..', '..', 'essentialmedicineslist2013_2.csv');

  const names = collectMedicineNamesFromSources([oldList, newList]);
  const normalized = names.map((name) => name.toLowerCase());

  assert.ok(normalized.includes('paracetamol'));
  assert.ok(normalized.some((name) => name.includes('lignocaine with adrenaline')));
  assert.equal(new Set(normalized).size, normalized.length);
  assert.ok(names.length > 50);
});
