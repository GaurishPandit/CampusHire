'use strict';

/**
 * Core eligibility engine unit tests.
 * These don't require a DB connection.
 */

const {
  evaluateEligibility,
  ELIGIBLE,
  NOT_ELIGIBLE,
  NEEDS_VERIFICATION,
} = require('../src/services/eligibility.service');

const baseProfile = {
  academicDataVerified: true,
  cgpa: 8.0,
  activeBacklogs: 0,
  branch: 'Computer Science',
  graduationYear: 2025,
  phone: '+91 9876543210',
  resumeUrl: 'https://example.com/resume.pdf',
  skills: ['JavaScript', 'Node.js'],
  interests: ['Backend'],
  linkedinUrl: 'https://linkedin.com/in/test',
  bio: 'A motivated developer.',
};

const baseOpportunity = {
  _id: '507f1f77bcf86cd799439011',
  updatedAt: new Date(),
  eligibilityCriteria: {
    minCgpa: 7.0,
    maxActiveBacklogs: 0,
    eligibleBranches: ['Computer Science', 'Electronics'],
    eligibleGraduationYears: [2025, 2026],
    requiredProfileFields: ['phone', 'resumeUrl'],
  },
};

describe('Eligibility Engine', () => {

  test('returns eligible when all criteria are met', () => {
    const result = evaluateEligibility(baseProfile, baseOpportunity);
    expect(result.status).toBe(ELIGIBLE);
  });

  test('returns not_eligible when CGPA is below minimum', () => {
    const profile = { ...baseProfile, cgpa: 6.5 };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NOT_ELIGIBLE);
    expect(result.reasons[0]).toMatch(/CGPA/);
  });

  test('returns not_eligible when active backlogs exceed maximum', () => {
    const profile = { ...baseProfile, activeBacklogs: 2 };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NOT_ELIGIBLE);
    expect(result.reasons[0]).toMatch(/backlog/i);
  });

  test('returns not_eligible when branch is not in eligible list', () => {
    const profile = { ...baseProfile, branch: 'Mechanical' };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NOT_ELIGIBLE);
    expect(result.reasons[0]).toMatch(/branch/i);
  });

  test('returns not_eligible when graduation year does not match', () => {
    const profile = { ...baseProfile, graduationYear: 2024 };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NOT_ELIGIBLE);
    expect(result.reasons[0]).toMatch(/graduation year/i);
  });

  test('returns needs_verification when academic data is not verified', () => {
    const profile = { ...baseProfile, academicDataVerified: false };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NEEDS_VERIFICATION);
  });

  test('returns needs_verification when CGPA is null', () => {
    const profile = { ...baseProfile, cgpa: null };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NEEDS_VERIFICATION);
    expect(result.reasons.some((r) => /CGPA/i.test(r))).toBe(true);
  });

  test('returns needs_verification when required profile field is missing', () => {
    const profile = { ...baseProfile, resumeUrl: null };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(NEEDS_VERIFICATION);
    expect(result.reasons.some((r) => /resumeUrl/i.test(r))).toBe(true);
  });

  test('eligible when no branch restriction is set', () => {
    const opp = {
      ...baseOpportunity,
      eligibilityCriteria: { ...baseOpportunity.eligibilityCriteria, eligibleBranches: [] },
    };
    const profile = { ...baseProfile, branch: 'Civil' };
    const result = evaluateEligibility(profile, opp);
    expect(result.status).toBe(ELIGIBLE);
  });

  test('eligible when no graduation year restriction is set', () => {
    const opp = {
      ...baseOpportunity,
      eligibilityCriteria: { ...baseOpportunity.eligibilityCriteria, eligibleGraduationYears: [] },
    };
    const profile = { ...baseProfile, graduationYear: 2030 };
    const result = evaluateEligibility(profile, opp);
    expect(result.status).toBe(ELIGIBLE);
  });

  test('includes criteriaVersion in result', () => {
    const result = evaluateEligibility(baseProfile, baseOpportunity);
    expect(result.criteriaVersion).toBeInstanceOf(Date);
  });

  test('branch comparison is case-insensitive', () => {
    const profile = { ...baseProfile, branch: 'computer science' };
    const result = evaluateEligibility(profile, baseOpportunity);
    expect(result.status).toBe(ELIGIBLE);
  });
});

describe('Application Status Transitions', () => {
  const { VALID_APP_TRANSITIONS } = require('../src/models/Application');

  test('submitted can transition to shortlisted', () => {
    expect(VALID_APP_TRANSITIONS.submitted).toContain('shortlisted');
  });

  test('rejected is terminal (no transitions)', () => {
    expect(VALID_APP_TRANSITIONS.rejected).toHaveLength(0);
  });

  test('selected is terminal', () => {
    expect(VALID_APP_TRANSITIONS.selected).toHaveLength(0);
  });

  test('withdrawn is terminal', () => {
    expect(VALID_APP_TRANSITIONS.withdrawn).toHaveLength(0);
  });
});

describe('Opportunity Status Transitions', () => {
  const { VALID_TRANSITIONS } = require('../src/models/Opportunity');

  test('draft can only move to published', () => {
    expect(VALID_TRANSITIONS.draft).toEqual(['published']);
  });

  test('published can move to closed or completed', () => {
    expect(VALID_TRANSITIONS.published).toContain('closed');
    expect(VALID_TRANSITIONS.published).toContain('completed');
  });

  test('completed has no valid transitions', () => {
    expect(VALID_TRANSITIONS.completed).toHaveLength(0);
  });
});
