'use strict';

const { parse } = require('csv-parse/sync');

const EXPECTED_HEADERS = ['name', 'email', 'rollNumber', 'branch', 'graduationYear', 'cgpa', 'activeBacklogs'];

function validateCsvContent(csvBuffer, existingRollNumbers = new Set(), existingEmails = new Set()) {
  const rows = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
  });

  if (rows.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
  const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h.toLowerCase()));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
  }

  const valid = [];
  const invalid = [];
  const duplicates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const errors = [];

    const normalized = {
      name: String(row.name || '').trim(),
      email: String(row.email || '').trim().toLowerCase(),
      rollNumber: String(row.rollNumber || '').trim().toUpperCase(),
      branch: String(row.branch || '').trim(),
      graduationYear: parseInt(row.graduationYear, 10),
      cgpa: row.cgpa !== '' && row.cgpa !== null && row.cgpa !== undefined ? parseFloat(row.cgpa) : null,
      activeBacklogs: row.activeBacklogs !== '' ? parseInt(row.activeBacklogs, 10) : 0,
    };

    if (!normalized.name) errors.push('Name is required');
    if (!normalized.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email))
      errors.push('Invalid email');
    if (!normalized.rollNumber) errors.push('Roll number is required');
    if (!normalized.branch) errors.push('Branch is required');
    if (isNaN(normalized.graduationYear) || normalized.graduationYear < 2000)
      errors.push('Invalid graduation year');
    if (normalized.cgpa !== null && (isNaN(normalized.cgpa) || normalized.cgpa < 0 || normalized.cgpa > 10))
      errors.push('CGPA must be between 0 and 10');
    if (isNaN(normalized.activeBacklogs) || normalized.activeBacklogs < 0)
      errors.push('Invalid active backlogs count');

    if (errors.length > 0) {
      invalid.push({ row: rowNum, data: row, errors });
      continue;
    }

    if (existingRollNumbers.has(normalized.rollNumber) || existingEmails.has(normalized.email)) {
      duplicates.push({ row: rowNum, data: normalized, reason: 'Duplicate roll number or email' });
      continue;
    }

    valid.push({ row: rowNum, data: normalized });
  }

  return { total: rows.length, valid, invalid, duplicates };
}

describe('CSV Student Onboarding Validation Suite', () => {
  test('successfully parses and validates clean CSV data', () => {
    const csv = `name,email,rollNumber,branch,graduationYear,cgpa,activeBacklogs\nJohn Doe,john@college.edu,21CS01,CSE,2025,8.5,0`;
    const res = validateCsvContent(Buffer.from(csv));
    expect(res.total).toBe(1);
    expect(res.valid.length).toBe(1);
    expect(res.invalid.length).toBe(0);
    expect(res.duplicates.length).toBe(0);
    expect(res.valid[0].data.name).toBe('John Doe');
    expect(res.valid[0].data.rollNumber).toBe('21CS01');
    expect(res.valid[0].data.cgpa).toBe(8.5);
  });

  test('catches missing required headers', () => {
    const csv = `name,email,branch\nJohn Doe,john@college.edu,CSE`;
    expect(() => validateCsvContent(Buffer.from(csv))).toThrow(/Missing required CSV columns/);
  });

  test('flags invalid rows with invalid email or CGPA > 10', () => {
    const csv = `name,email,rollNumber,branch,graduationYear,cgpa,activeBacklogs\nBad Student,not-an-email,21CS02,CSE,2025,11.5,-1`;
    const res = validateCsvContent(Buffer.from(csv));
    expect(res.invalid.length).toBe(1);
    expect(res.invalid[0].errors).toContain('Invalid email');
    expect(res.invalid[0].errors).toContain('CGPA must be between 0 and 10');
    expect(res.invalid[0].errors).toContain('Invalid active backlogs count');
  });

  test('detects duplicate roll numbers against existing student database records', () => {
    const csv = `name,email,rollNumber,branch,graduationYear,cgpa,activeBacklogs\nExisting Student,new@college.edu,21CS01,CSE,2025,8.0,0`;
    const existingRolls = new Set(['21CS01']);
    const res = validateCsvContent(Buffer.from(csv), existingRolls);
    expect(res.duplicates.length).toBe(1);
    expect(res.valid.length).toBe(0);
  });

  test('detects duplicate emails against existing student database records', () => {
    const csv = `name,email,rollNumber,branch,graduationYear,cgpa,activeBacklogs\nExisting Student,existing@college.edu,21CS99,CSE,2025,8.0,0`;
    const existingEmails = new Set(['existing@college.edu']);
    const res = validateCsvContent(Buffer.from(csv), new Set(), existingEmails);
    expect(res.duplicates.length).toBe(1);
    expect(res.valid.length).toBe(0);
  });
});
