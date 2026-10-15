'use strict';

const { z } = require('zod');

const updateStudentProfileSchema = z.object({
  phone: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  skills: z.array(z.string().trim().max(100)).max(50).optional(),
  interests: z.array(z.string().trim().max(100)).max(30).optional(),
  linkedinUrl: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
  portfolioUrl: z.string().optional().or(z.literal('')),
  resumeUrl: z.string().optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional(),
});

const csvImportConfirmSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  rowIndices: z.array(z.number().int().min(0)).optional(), // if empty, confirm all valid rows
});

const studentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
  branch: z.string().optional(),
  graduationYear: z.coerce.number().int().optional(),
  isPlaced: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'rollNumber', 'cgpa', 'graduationYear']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = { updateStudentProfileSchema, csvImportConfirmSchema, studentQuerySchema };
