'use strict';

/**
 * Eligibility Engine — deterministic, server-side evaluation.
 *
 * Rules are evaluated in order. The first failing rule determines "not_eligible".
 * Missing academic data (null/undefined CGPA etc.) yields "needs_verification".
 *
 * Never uses AI. Never trusts client-side data.
 */

const ELIGIBLE = 'eligible';
const NOT_ELIGIBLE = 'not_eligible';
const NEEDS_VERIFICATION = 'needs_verification';

/**
 * Evaluate a student profile against an opportunity's eligibility criteria.
 *
 * @param {Object} studentProfile - Mongoose StudentProfile document (lean)
 * @param {Object} opportunity - Mongoose Opportunity document (lean)
 * @returns {{ status: string, reasons: string[], criteriaVersion: Date }}
 */
function evaluateEligibility(studentProfile, opportunity) {
  const criteria = opportunity.eligibilityCriteria || {};
  const reasons = [];
  let status = ELIGIBLE;

  const isCompetition =
    opportunity.opportunityType === 'hackathon' ||
    opportunity.opportunityType === 'coding_competition' ||
    opportunity.type === 'hackathon' ||
    opportunity.type === 'coding_competition';

  // ── Hackathons & Coding Competitions ──────────────────────────────────────
  // Competitions are open events. If no specific barriers are set, student is immediately eligible!
  const minCgpa = criteria.minCgpa ?? 0;
  const maxBacklogs = criteria.maxActiveBacklogs ?? 999;
  const eligibleBranches = criteria.eligibleBranches || [];
  const eligibleYears = criteria.eligibleGraduationYears || [];

  if (isCompetition && minCgpa === 0 && eligibleBranches.length === 0 && eligibleYears.length === 0) {
    return {
      status: ELIGIBLE,
      reasons: ['Open participation event! All registered students are eligible to participate.'],
      criteriaVersion: opportunity.updatedAt,
    };
  }

  // ── Missing academic data check ───────────────────────────────────────────
  // Registered students with active accounts are considered valid unless core info is absent
  if (!studentProfile.rollNumber || !studentProfile.branch) {
    reasons.push('Core academic details (roll number or branch) are missing from your profile.');
    return {
      status: NEEDS_VERIFICATION,
      reasons,
      criteriaVersion: opportunity.updatedAt,
    };
  }

  // ── CGPA check ────────────────────────────────────────────────────────────
  if (minCgpa > 0) {
    const studentCgpa = studentProfile.cgpa !== null && studentProfile.cgpa !== undefined ? Number(studentProfile.cgpa) : null;
    if (studentCgpa === null) {
      reasons.push('CGPA is not recorded. Cannot verify CGPA eligibility.');
      status = NEEDS_VERIFICATION;
    } else if (studentCgpa < minCgpa) {
      reasons.push(
        `Your CGPA (${studentCgpa.toFixed(2)}) is below the required minimum of ${minCgpa.toFixed(2)}.`
      );
      status = NOT_ELIGIBLE;
    }
  }

  // ── Active backlogs check ─────────────────────────────────────────────────
  if (criteria.maxActiveBacklogs !== undefined && criteria.maxActiveBacklogs !== null) {
    const studentBacklogs = Number(studentProfile.activeBacklogs || 0);
    const allowed = Number(criteria.maxActiveBacklogs);
    if (studentBacklogs > allowed) {
      reasons.push(
        `You have ${studentBacklogs} active backlog(s), but maximum ${allowed} allowed.`
      );
      status = NOT_ELIGIBLE;
    }
  }

  // ── Branch check ──────────────────────────────────────────────────────────
  if (eligibleBranches && eligibleBranches.length > 0) {
    const hasWildcard = eligibleBranches.some((b) =>
      ['all', 'any', 'open to all', 'all branches', '*'].includes(String(b).trim().toLowerCase())
    );

    if (!hasWildcard) {
      const studentBranch = String(studentProfile.branch || '').trim().toLowerCase();
      const acronymMap = {
        cse: ['computer science', 'computer science and engineering', 'cs', 'comp sci'],
        it: ['information technology', 'info tech'],
        ece: ['electronics and communication', 'electronics and communication engineering', 'electronics'],
        eee: ['electrical and electronics', 'electrical and electronics engineering'],
        ee: ['electrical engineering'],
        me: ['mechanical engineering', 'mech'],
        ce: ['civil engineering', 'civil'],
        aids: ['artificial intelligence and data science', 'ai & ds', 'ai/ds'],
        aiml: ['artificial intelligence and machine learning', 'ai & ml', 'ai/ml'],
      };

      const isBranchEligible = eligibleBranches.some((b) => {
        const norm = String(b).trim().toLowerCase();
        if (norm === studentBranch) return true;
        if (norm.includes(studentBranch) || studentBranch.includes(norm)) return true;

        for (const [code, aliases] of Object.entries(acronymMap)) {
          const matchStudent = studentBranch === code || aliases.some((a) => studentBranch.includes(a));
          const matchTarget = norm === code || aliases.some((a) => norm.includes(a));
          if (matchStudent && matchTarget) return true;
        }
        return false;
      });

      if (!isBranchEligible) {
        reasons.push(
          `Your branch (${studentProfile.branch}) is not listed in eligible branches: ${eligibleBranches.join(', ')}.`
        );
        status = NOT_ELIGIBLE;
      }
    }
  }

  // ── Graduation year check ─────────────────────────────────────────────────
  if (eligibleYears && eligibleYears.length > 0) {
    const studentYear = Number(studentProfile.graduationYear);
    const hasYearWildcard = eligibleYears.some((y) =>
      ['all', 'any', 'open to all', '0', 0].includes(y)
    );

    if (!hasYearWildcard && studentYear) {
      const isYearEligible = eligibleYears.some((y) => Number(y) === studentYear);
      if (!isYearEligible) {
        reasons.push(
          `Your graduation year (${studentProfile.graduationYear}) is not eligible. Eligible batches: ${eligibleYears.join(', ')}.`
        );
        status = NOT_ELIGIBLE;
      }
    }
  }

  // ── Required profile fields check ─────────────────────────────────────────
  const requiredFields = criteria.requiredProfileFields;
  if (requiredFields && requiredFields.length > 0) {
    const missingFields = [];
    for (const field of requiredFields) {
      const value = studentProfile[field];
      const isEmpty =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        missingFields.push(field);
      }
    }
    if (missingFields.length > 0) {
      reasons.push(
        `Profile is missing: ${missingFields.join(', ')}. Please update your profile before registering.`
      );
      if (status === ELIGIBLE) status = NEEDS_VERIFICATION;
    }
  }

  // ── All clear ─────────────────────────────────────────────────────────────
  if (status === ELIGIBLE) {
    reasons.push(
      isCompetition
        ? 'You meet all registration criteria for this competition!'
        : 'You meet all academic and department eligibility criteria for this opportunity.'
    );
  }

  return {
    status,
    reasons,
    criteriaVersion: opportunity.updatedAt,
  };
}

/**
 * Evaluate eligibility for a list of opportunities.
 * Returns a Map: opportunityId → eligibilityResult
 */
function evaluateBulk(studentProfile, opportunities) {
  const results = new Map();
  for (const opp of opportunities) {
    const id = opp._id?.toString() || opp.id?.toString();
    results.set(id, evaluateEligibility(studentProfile, opp));
  }
  return results;
}

module.exports = { evaluateEligibility, evaluateBulk, ELIGIBLE, NOT_ELIGIBLE, NEEDS_VERIFICATION };
