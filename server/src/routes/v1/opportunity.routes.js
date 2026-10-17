'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const oppController = require('../../controllers/opportunity.controller');
const appController = require('../../controllers/application.controller');
const roundController = require('../../controllers/round.controller');
const resultController = require('../../controllers/result.controller');

// Opportunity CRUD
router.get('/', authenticate, oppController.listOpportunities);
router.post('/', authenticate, requireRole('placement_admin', 'sys_admin'), oppController.createOpportunity);
router.get('/:id', authenticate, oppController.getOpportunityById);
router.patch('/:id', authenticate, requireRole('placement_admin', 'sys_admin'), oppController.updateOpportunity);
router.patch('/:id/status', authenticate, requireRole('placement_admin', 'sys_admin'), oppController.changeOpportunityStatus);
router.delete('/:id', authenticate, requireRole('placement_admin', 'sys_admin'), oppController.deleteOpportunity);

// Eligibility check
router.get('/:id/eligibility', authenticate, requireRole('student'), oppController.checkEligibility);

// Applications for this opportunity
router.post('/:id/applications', authenticate, requireRole('student'), appController.submitApplication);
router.post('/:id/apply', authenticate, requireRole('student'), appController.submitApplication);
router.get('/:id/applications', authenticate, requireRole('placement_admin', 'sys_admin'), appController.listApplicationsForOpportunity);

// Recruitment rounds
router.get('/:id/rounds', authenticate, roundController.listRounds);
router.post('/:id/rounds', authenticate, requireRole('placement_admin', 'sys_admin'), roundController.createRound);

// Results for this opportunity
router.post('/:id/results', authenticate, requireRole('placement_admin', 'sys_admin'), resultController.createResult);
router.post('/:id/publish-results', authenticate, requireRole('placement_admin', 'sys_admin'), resultController.publishOpportunityResults);

module.exports = router;
