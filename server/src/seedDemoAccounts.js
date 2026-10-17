'use strict';

/**
 * Safe, idempotent database seeding script for CampusHire demo accounts.
 *
 * Can be run safely against local, staging, or production databases:
 * - Creates or updates demo college
 * - Creates or updates demo accounts (Placement Admin, Students, Sys Admin)
 * - Sets matching passwords using bcrypt
 * - Creates or updates StudentProfile records so eligibility works
 * - Creates initial opportunities ONLY if none exist for the demo college
 * - NEVER deletes database data or modifies unrelated user accounts.
 *
 * Usage:
 *   node src/seedDemoAccounts.js
 *   node src/seedDemoAccounts.js "<MONGODB_URI>"
 */

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('./utils/logger');

// Retrieve connection string from CLI arg, MONGODB_URI env, or fallback
const targetUri = process.argv[2] || process.env.MONGODB_URI;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

if (!targetUri) {
  console.error('Error: MONGODB_URI must be provided either as an argument or in .env');
  process.exit(1);
}

// Mask connection URI for safe logging
function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
}

async function seedDemoAccounts() {
  logger.info(`Connecting to database at ${maskUri(targetUri)}...`);
  await mongoose.connect(targetUri);
  logger.info(`Connected to database: ${mongoose.connection.db.databaseName}`);

  const College = require('./models/College');
  const User = require('./models/User');
  const StudentProfile = require('./models/StudentProfile');
  const Opportunity = require('./models/Opportunity');

  // ── 1. Demo College ─────────────────────────────────────────────────────────
  let college = await College.findOne({ slug: 'demo-college' });
  if (!college) {
    college = await College.create({
      name: 'Demo Engineering College',
      slug: 'demo-college',
      emailDomains: ['demo.edu.in'],
      address: '123 Campus Road, Demo City',
      website: 'https://demo.edu.in',
      placementCellEmail: 'placements@demo.edu.in',
      isActive: true,
    });
    logger.info(`Created demo college: ${college.name} (${college.slug})`);
  } else {
    college.name = 'Demo Engineering College';
    if (!college.emailDomains.includes('demo.edu.in')) {
      college.emailDomains.push('demo.edu.in');
    }
    college.isActive = true;
    await college.save();
    logger.info(`Verified demo college: ${college.name} (${college.slug})`);
  }

  // ── 2. Sys Admin ───────────────────────────────────────────────────────────
  const sysAdminEmail = 'sysadmin@campushire.dev';
  const sysAdminPassHash = await bcrypt.hash('Admin@12345', BCRYPT_ROUNDS);
  let sysAdmin = await User.findOne({ email: sysAdminEmail });
  if (!sysAdmin) {
    sysAdmin = await User.create({
      email: sysAdminEmail,
      passwordHash: sysAdminPassHash,
      role: 'sys_admin',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      isEmailVerified: true,
      activatedAt: new Date(),
    });
    logger.info(`Created sys_admin: ${sysAdminEmail}`);
  } else {
    sysAdmin.passwordHash = sysAdminPassHash;
    sysAdmin.role = 'sys_admin';
    sysAdmin.isActive = true;
    sysAdmin.isEmailVerified = true;
    if (!sysAdmin.activatedAt) sysAdmin.activatedAt = new Date();
    await sysAdmin.save();
    logger.info(`Updated sys_admin: ${sysAdminEmail}`);
  }

  // ── 3. Placement Admin (Displayed on Login Page) ───────────────────────────
  const adminEmail = 'admin@demo.edu.in';
  const adminPassHash = await bcrypt.hash('Admin@12345', BCRYPT_ROUNDS);
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      passwordHash: adminPassHash,
      role: 'placement_admin',
      college: college._id,
      firstName: 'Placement',
      lastName: 'Officer',
      isActive: true,
      isEmailVerified: true,
      activatedAt: new Date(),
    });
    logger.info(`Created placement_admin: ${adminEmail}`);
  } else {
    admin.passwordHash = adminPassHash;
    admin.role = 'placement_admin';
    admin.college = college._id;
    admin.isActive = true;
    admin.isEmailVerified = true;
    if (!admin.activatedAt) admin.activatedAt = new Date();
    await admin.save();
    logger.info(`Updated placement_admin: ${adminEmail}`);
  }

  // ── 4. Demo Students (Displayed on Login Page & Test Candidates) ───────────
  const demoStudents = [
    {
      name: 'Alice Sharma',
      email: 'alice@demo.edu.in',
      pass: 'Student@12345',
      roll: 'CS2021001',
      branch: 'Computer Science',
      year: 2025,
      cgpa: 8.5,
      backlogs: 0,
      description: 'Student (eligible)',
    },
    {
      name: 'Dave Singh',
      email: 'dave@demo.edu.in',
      pass: 'Student@12345',
      roll: 'ME2021004',
      branch: 'Mechanical',
      year: 2025,
      cgpa: 6.8,
      backlogs: 2,
      description: 'Student (ineligible)',
    },
    {
      name: 'Bob Patel',
      email: 'bob@demo.edu.in',
      pass: 'Student@12345',
      roll: 'CS2021002',
      branch: 'Computer Science',
      year: 2025,
      cgpa: 7.2,
      backlogs: 1,
      description: 'Student (additional)',
    },
    {
      name: 'Carol Nair',
      email: 'carol@demo.edu.in',
      pass: 'Student@12345',
      roll: 'EC2021003',
      branch: 'Electronics',
      year: 2025,
      cgpa: 9.1,
      backlogs: 0,
      description: 'Student (additional)',
    },
    {
      name: 'Eve Gupta',
      email: 'eve@demo.edu.in',
      pass: 'Student@12345',
      roll: 'CS2022005',
      branch: 'Computer Science',
      year: 2026,
      cgpa: 8.9,
      backlogs: 0,
      description: 'Student (additional)',
    },
  ];

  for (const s of demoStudents) {
    const studentPassHash = await bcrypt.hash(s.pass, BCRYPT_ROUNDS);
    let user = await User.findOne({ email: s.email });

    if (!user) {
      user = await User.create({
        email: s.email,
        passwordHash: studentPassHash,
        role: 'student',
        college: college._id,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ')[1] || '',
        isActive: true,
        isEmailVerified: true,
        activatedAt: new Date(),
      });
      logger.info(`Created ${s.description}: ${s.email}`);
    } else {
      user.passwordHash = studentPassHash;
      user.role = 'student';
      user.college = college._id;
      user.firstName = s.name.split(' ')[0];
      user.lastName = s.name.split(' ')[1] || '';
      user.isActive = true;
      user.isEmailVerified = true;
      if (!user.activatedAt) user.activatedAt = new Date();
      await user.save();
      logger.info(`Updated ${s.description}: ${s.email}`);
    }

    // StudentProfile record
    let profile = await StudentProfile.findOne({ user: user._id });
    if (!profile) {
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
      logger.info(`Created profile for: ${s.email} (${s.roll}, ${s.branch})`);
    } else {
      profile.college = college._id;
      profile.rollNumber = s.roll;
      profile.branch = s.branch;
      profile.graduationYear = s.year;
      profile.cgpa = s.cgpa;
      profile.activeBacklogs = s.backlogs;
      profile.academicDataVerified = true;
      if (!profile.verifiedAt) {
        profile.verifiedBy = admin._id;
        profile.verifiedAt = new Date();
      }
      await profile.save();
      logger.info(`Updated profile for: ${s.email} (${s.roll}, ${s.branch})`);
    }
  }

  // ── 5. Demo Opportunities (Only seeded if none exist for college) ───────────
  const existingOpps = await Opportunity.countDocuments({ college: college._id });
  if (existingOpps === 0) {
    const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const threeWeeksLater = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

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
        applicationDeadline: twoWeeksLater,
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
        applicationDeadline: oneWeekLater,
      },
      {
        college: college._id,
        createdBy: admin._id,
        lastUpdatedBy: admin._id,
        companyName: 'CampusHire Coding',
        title: 'CodeRun 2026',
        description: 'Annual algorithmic programming contest. Open to all students to showcase competitive coding skills and win prizes.',
        opportunityType: 'coding_competition',
        workMode: 'remote',
        location: 'Virtual / Online',
        ctcOrStipend: 'Prizes up to ₹1,00,000',
        applicationMode: 'internal',
        eligibilityCriteria: {
          minCgpa: 0,
          maxActiveBacklogs: 99,
          eligibleBranches: [],
          eligibleGraduationYears: [],
        },
        status: 'published',
        publishedAt: new Date(),
        applicationDeadline: threeWeeksLater,
      },
    ]);
    logger.info('Created initial demo opportunities for college');
  } else {
    logger.info(`Existing opportunities found (${existingOpps}); preserved existing data.`);
  }

  logger.info('\n======================================================');
  logger.info('  ✅ Demo Account Seeding Succeeded!');
  logger.info('======================================================');
  logger.info('  Placement Admin:    admin@demo.edu.in    / Admin@12345');
  logger.info('  Student (eligible): alice@demo.edu.in    / Student@12345');
  logger.info('  Student (inelig.):  dave@demo.edu.in     / Student@12345');
  logger.info('  Sys Admin:          sysadmin@campushire.dev / Admin@12345');
  logger.info('======================================================\n');

  await mongoose.disconnect();
}

seedDemoAccounts().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
