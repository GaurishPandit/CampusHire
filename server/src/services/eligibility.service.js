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

  // ── Missing academic data check ───────────────────────────────────────────
  if (!studentProfile.academicDataVerified) {
    reasons.push('Your academic data has not been verified yet. Please contact the placement cell.');
    return {
      status: NEEDS_VERIFICATION,
      reasons,
      criteriaVersion: opportunity.updatedAt,
    };
  }

  // ── CGPA check ────────────────────────────────────────────────────────────
  const minCgpa = criteria.minCgpa ?? 0;
  if (minCgpa > 0) {
    if (studentProfile.cgpa === null || studentProfile.cgpa === undefined) {
      reasons.push('CGPA is not recorded. Cannot verify CGPA eligibility.');
      status = NEEDS_VERIFICATION;
    } else if (studentProfile.cgpa < minCgpa) {
      reasons.push(
        `Your CGPA (${studentProfile.cgpa.toFixed(2)}) is below the minimum required CGPA of ${minCgpa.toFixed(2)}.`
      );
      status = NOT_ELIGIBLE;
    }
  }

  // ── Active backlogs check ─────────────────────────────────────────────────
  const maxBacklogs = criteria.maxActiveBacklogs ?? 0;
  if (studentProfile.activeBacklogs === null || studentProfile.activeBacklogs === undefined) {
    reasons.push('Active backlog count is not recorded. Cannot verify backlog eligibility.');
    if (status === ELIGIBLE) status = NEEDS_VERIFICATION;
  } else if (studentProfile.activeBacklogs > maxBacklogs) {
    reasons.push(
      `You have ${studentProfile.activeBacklogs} active backlog(s), but this opportunity allows a maximum of ${maxBacklogs}.`
    );
    status = NOT_ELIGIBLE;
  }

  // ── Branch check ──────────────────────────────────────────────────────────
  const eligibleBranches = criteria.eligibleBranches;
  if (eligibleBranches && eligibleBranches.length > 0) {
    if (!studentProfile.branch) {
      reasons.push('Branch is not recorded. Cannot verify branch eligibility.');
      if (status === ELIGIBLE) status = NEEDS_VERIFICATION;
    } else {
      const normalizedBranch = studentProfile.branch.trim().toLowerCase();
      const isEligible = eligibleBranches.some(
        (b) => b.trim().toLowerCase() === normalizedBranch
      );
      if (!isEligible) {
        reasons.push(
          `Your branch (${studentProfile.branch}) is not eligible for this opportunity. Eligible branches: ${eligibleBranches.join(', ')}.`
        );
        status = NOT_ELIGIBLE;
      }
    }
  }

  // ── Graduation year check ─────────────────────────────────────────────────
  const eligibleYears = criteria.eligibleGraduationYears;
  if (eligibleYears && eligibleYears.length > 0) {
    if (!studentProfile.graduationYear) {
      reasons.push('Graduation year is not recorded. Cannot verify graduation year eligibility.');
      if (status === ELIGIBLE) status = NEEDS_VERIFICATION;
    } else if (!eligibleYears.includes(studentProfile.graduationYear)) {
      reasons.push(
        `Your graduation year (${studentProfile.graduationYear}) is not eligible. Eligible years: ${eligibleYears.join(', ')}.`
      );
      status = NOT_ELIGIBLE;
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
        `Your profile is missing required information: ${missingFields.join(', ')}. Please complete your profile before applying.`
      );
      if (status === ELIGIBLE) status = NEEDS_VERIFICATION;
    }
  }

  // ── All clear ─────────────────────────────────────────────────────────────
  if (status === ELIGIBLE) {
    reasons.push('You meet all eligibility criteria for this opportunity.');
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
