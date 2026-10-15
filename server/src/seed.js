'use strict';

/**
 * Seed script — creates a demo college, sys_admin, placement_admin,
 * and a few demo student accounts for development.
 *
 * Run: node src/seed.js
 * NEVER run against production.
 */

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGODB_URI, BCRYPT_ROUNDS } = require('./config/env');
const logger = require('./utils/logger');

async function seed() {
  await mongoose.connect(MONGODB_URI);
  logger.info('Connected to MongoDB for seeding');

  const College = require('./models/College');
  const User = require('./models/User');
  const StudentProfile = require('./models/StudentProfile');
  const Opportunity = require('./models/Opportunity');

  // ── College ─────────────────────────────────────────────────────────────
  let college = await College.findOne({ slug: 'demo-college' });
  if (!college) {
    college = await College.create({
      name: 'Demo Engineering College',
      slug: 'demo-college',
      emailDomains: ['demo.edu.in'],
      address: '123 Campus Road, Demo City',
      website: 'https://demo.edu.in',
      placementCellEmail: 'placements@demo.edu.in',
    });
    logger.info(`Created college: ${college.name}`);
  }

  // ── Sys Admin ─────────────────────────────────────────────────────────────
  const sysAdminEmail = 'sysadmin@campushire.dev';
  let sysAdmin = await User.findOne({ email: sysAdminEmail });
  if (!sysAdmin) {
    sysAdmin = await User.create({
      email: sysAdminEmail,
      passwordHash: await bcrypt.hash('Admin@12345', BCRYPT_ROUNDS),
      role: 'sys_admin',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      isEmailVerified: true,
      activatedAt: new Date(),
    });
    logger.info(`Created sys_admin: ${sysAdminEmail}`);
  }

  // ── Placement Admin ──────────────────────────────────────────────────────
  const adminEmail = 'admin@demo.edu.in';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@12345', BCRYPT_ROUNDS),
      role: 'placement_admin',
      college: college._id,
      firstName: 'Placement',
      lastName: 'Officer',
      isActive: true,
      isEmailVerified: true,
      activatedAt: new Date(),
    });
    logger.info(`Created placement_admin: ${adminEmail}`);
  }

  // ── Demo Students ────────────────────────────────────────────────────────
  const demoStudents = [
    { name: 'Alice Sharma', email: 'alice@demo.edu.in', roll: 'CS2021001', branch: 'Computer Science', year: 2025, cgpa: 8.5, backlogs: 0 },
    { name: 'Bob Patel', email: 'bob@demo.edu.in', roll: 'CS2021002', branch: 'Computer Science', year: 2025, cgpa: 7.2, backlogs: 1 },
    { name: 'Carol Nair', email: 'carol@demo.edu.in', roll: 'EC2021003', branch: 'Electronics', year: 2025, cgpa: 9.1, backlogs: 0 },
    { name: 'Dave Singh', email: 'dave@demo.edu.in', roll: 'ME2021004', branch: 'Mechanical', year: 2025, cgpa: 6.8, backlogs: 2 },
    { name: 'Eve Gupta', email: 'eve@demo.edu.in', roll: 'CS2022005', branch: 'Computer Science', year: 2026, cgpa: 8.9, backlogs: 0 },
  ];

  for (const s of demoStudents) {
    let user = await User.findOne({ email: s.email });
    if (!user) {
      user = await User.create({
        email: s.email,
        passwordHash: await bcrypt.hash('Student@12345', BCRYPT_ROUNDS),
        role: 'student',
        college: college._id,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ')[1],
        isActive: true,
        isEmailVerified: true,
        activatedAt: new Date(),
      });
    }

    const existingProfile = await StudentProfile.findOne({ user: user._id });
    if (!existingProfile) {
      await StudentProfile.create({
        user: user._id,
        college: college._id,
        rollNumber: s.roll,
        branch: s.branch,
        graduationYear: s.year,
        cgpa: s.cgpa,
        activeBacklogs: s.backlogs,
        academicDataVerified: true,
        verifiedBy: admin._id,
        verifiedAt: new Date(),
        importBatchId: 'seed',
        completenessScore: 40,
      });
      logger.info(`Created student: ${s.email}`);
    }
  }

  // ── Demo Opportunities ────────────────────────────────────────────────────
  const existingOpps = await Opportunity.countDocuments({ college: college._id });
  if (existingOpps === 0) {
    await Opportunity.insertMany([
      {
        college: college._id,
        createdBy: admin._id,
        lastUpdatedBy: admin._id,
        companyName: 'TechCorp India',
        title: 'Software Engineer Intern',
        description: 'A 6-month software engineering internship at TechCorp India working on cloud infrastructure.',
        opportunityType: 'internship',
        workMode: 'hybrid',
        location: 'Bangalore, Karnataka',
        stipendMin: 25000,
        stipendMax: 35000,
        applicationMode: 'internal',
        eligibilityCriteria: {
          minCgpa: 7.0,
          maxActiveBacklogs: 0,
          eligibleBranches: ['Computer Science', 'Electronics'],
          eligibleGraduationYears: [2025, 2026],
          requiredProfileFields: ['phone', 'resumeUrl'],
        },
        status: 'published',
        publishedAt: new Date(),
        applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        college: college._id,
        createdBy: admin._id,
        lastUpdatedBy: admin._id,
        companyName: 'FinServ Solutions',
        title: 'Associate Software Developer',
        description: 'Full-time role at FinServ Solutions for fresh graduates in software development.',
        opportunityType: 'full_time',
        workMode: 'on_site',
        location: 'Mumbai, Maharashtra',
        ctcMin: 600000,
        ctcMax: 800000,
        applicationMode: 'internal',
        eligibilityCriteria: {
          minCgpa: 6.5,
          maxActiveBacklogs: 1,
          eligibleBranches: ['Computer Science'],
          eligibleGraduationYears: [2025],
        },
        status: 'published',
        publishedAt: new Date(),
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        college: college._id,
        createdBy: admin._id,
        lastUpdatedBy: admin._id,
        companyName: 'GlobalAnalytics',
        title: 'Data Analyst',
        description: 'Entry-level data analyst position at GlobalAnalytics. Strong analytical skills required.',
        opportunityType: 'full_time',
        workMode: 'remote',
        location: 'Remote',
        ctcMin: 500000,
        ctcMax: 700000,
        applicationMode: 'external',
        externalApplicationUrl: 'https://globalanalytics.example.com/careers',
        eligibilityCriteria: {
          minCgpa: 8.0,
          maxActiveBacklogs: 0,
          eligibleBranches: ['Computer Science', 'Electronics', 'Mechanical'],
          eligibleGraduationYears: [2025],
        },
        status: 'draft',
      },
    ]);
    logger.info('Created demo opportunities');
  }

  logger.info('\n✅ Seed complete!\n');
  logger.info('Demo accounts:');
  logger.info('  Sys Admin:          sysadmin@campushire.dev / Admin@12345');
  logger.info('  Placement Admin:    admin@demo.edu.in / Admin@12345');
  logger.info('  Student (eligible): alice@demo.edu.in / Student@12345');
  logger.info('  Student (inelig.):  dave@demo.edu.in / Student@12345');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
