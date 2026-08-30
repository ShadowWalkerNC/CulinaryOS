// ============================================================
// CulinaryOS — CulinaryTalent & Restaurant Hiring Engine
// Public Job Board (/v1/jobs) & Manager ATS Pipeline (/v1/talent)
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export interface JobPosting {
  id: string;
  tenant_id: string;
  title: string;
  department: 'BOH' | 'FOH' | 'Management' | 'Bar';
  role: 'cook' | 'server' | 'bartender' | 'dishwasher' | 'manager';
  pay_type: 'hourly' | 'salary';
  pay_range: string;
  shift_type: 'Full-Time' | 'Part-Time' | 'Seasonal' | 'Flexible';
  experience_level: 'Entry Level' | '1-2 Years' | '3+ Years' | 'Senior';
  description: string;
  requirements: string[];
  perks: string[];
  status: 'active' | 'draft' | 'closed';
  applicant_count: number;
  created_at: string;
}

export interface JobApplication {
  id: string;
  tenant_id: string;
  job_id: string;
  job_title: string;
  department: string;
  candidate_name: string;
  email: string;
  phone: string;
  years_experience: number;
  certifications: string[];
  availability: string;
  cover_notes?: string;
  stage: 'applied' | 'review' | 'interview' | 'staging_trial' | 'offer' | 'hired' | 'rejected';
  applied_at: string;
  hired_at?: string;
  staff_pin_issued?: string;
  staff_id?: string;
}

// In-Memory Mock Store for Zero-Config Demo Mode
let mockJobs: JobPosting[] = [
  {
    id: 'job-101',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Lead Line Cook (Wood-Fired Pizza & Grill)',
    department: 'BOH',
    role: 'cook',
    pay_type: 'hourly',
    pay_range: '$22.00 - $26.00 / hr',
    shift_type: 'Full-Time',
    experience_level: '3+ Years',
    description: 'Seeking an experienced line cook skilled in high-temperature wood-fired pizza ovens, steak searing, and fast-paced dinner services.',
    requirements: ['3+ years high-volume kitchen experience', 'ServSafe Food Handler certified', 'Ability to lift 50 lbs and work weekend dinner services'],
    perks: ['Shift meals included', 'Weekly tip pool share', 'Health insurance stipend', 'Flexible scheduling'],
    status: 'active',
    applicant_count: 3,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'job-102',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Lead Bartender & Craft Cocktail Specialist',
    department: 'Bar',
    role: 'bartender',
    pay_type: 'hourly',
    pay_range: '$16.00 / hr + Tips ($35-$45/hr avg)',
    shift_type: 'Full-Time',
    experience_level: '1-2 Years',
    description: 'Lead our dinner cocktail program, curate seasonal drinks, maintain liquor inventory par levels, and deliver exceptional guest hospitality.',
    requirements: ['TIPS / Alcohol service certified', '2+ years craft cocktail bartending', 'Proficiency with POS systems and inventory counting'],
    perks: ['High-earning tip environment', 'Creative menu input', 'Discounted staff dining'],
    status: 'active',
    applicant_count: 2,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'job-103',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Dining Room Server (Evening Service)',
    department: 'FOH',
    role: 'server',
    pay_type: 'hourly',
    pay_range: '$12.00 / hr + Tips ($30-$40/hr avg)',
    shift_type: 'Part-Time',
    experience_level: '1-2 Years',
    description: 'Engaging, detail-oriented tableside server for busy dinner shifts. Experience with multi-seat table ordering, coursing, and wine service.',
    requirements: ['1+ year full-service restaurant experience', 'Strong menu and allergen awareness', 'Positive team-first attitude'],
    perks: ['Daily cash/card tip out', 'Flexible 4-day work week options', 'Shift meal provided'],
    status: 'active',
    applicant_count: 4,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'job-104',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Kitchen Steward & Prep Assistant',
    department: 'BOH',
    role: 'dishwasher',
    pay_type: 'hourly',
    pay_range: '$17.00 - $19.00 / hr',
    shift_type: 'Full-Time',
    experience_level: 'Entry Level',
    description: 'Maintain dish station cleanliness, assist prep cooks with morning vegetable/sauce prep, and support evening kitchen operations.',
    requirements: ['Punctual, reliable, and hardworking', 'Enjoys working in a collaborative culinary team', 'No experience necessary — we train!'],
    perks: ['Fast-track promotion to Line Cook', 'Paid shift meals', 'Consistent 40 hr schedule'],
    status: 'active',
    applicant_count: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

let mockApplications: JobApplication[] = [
  {
    id: 'app-501',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    job_id: 'job-101',
    job_title: 'Lead Line Cook (Wood-Fired Pizza & Grill)',
    department: 'BOH',
    candidate_name: 'Marcus Vance',
    email: 'marcus.vance@culinaryemail.com',
    phone: '(555) 234-5678',
    years_experience: 4,
    certifications: ['ServSafe Manager', 'Culinary Arts Diploma'],
    availability: 'Evenings & Weekends (Immediate Start)',
    cover_notes: '4 years experience on high-volume saute and wood-fired pizza ovens. Passionate about sourdough fermentation and meat fabrication.',
    stage: 'interview',
    applied_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'app-502',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    job_id: 'job-101',
    job_title: 'Lead Line Cook (Wood-Fired Pizza & Grill)',
    department: 'BOH',
    candidate_name: 'David Chen',
    email: 'dchen.cook@gmail.com',
    phone: '(555) 876-5432',
    years_experience: 2,
    certifications: ['ServSafe Food Handler'],
    availability: 'Full Availability',
    cover_notes: 'Grill and fryer cook looking to level up to wood-fired pizza and dinner service.',
    stage: 'review',
    applied_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'app-503',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    job_id: 'job-102',
    job_title: 'Lead Bartender & Craft Cocktail Specialist',
    department: 'Bar',
    candidate_name: 'Elena Rostova',
    email: 'elena.rostova@cocktailcraft.com',
    phone: '(555) 345-6789',
    years_experience: 3,
    certifications: ['TIPS Certified', 'Sommelier Level 1'],
    availability: 'Thursday - Sunday Evenings',
    cover_notes: 'Specialized in house-made bitters, syrups, and cocktail balancing. Fast bar volume management.',
    stage: 'staging_trial',
    applied_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'app-504',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    job_id: 'job-103',
    job_title: 'Dining Room Server (Evening Service)',
    candidate_name: 'Sarah Jenkins',
    department: 'FOH',
    email: 'sarah.j@outlook.com',
    phone: '(555) 456-7890',
    years_experience: 2,
    certifications: ['TIPS Certified'],
    availability: 'Friday - Monday Nights',
    cover_notes: 'Enthusiastic dining room server with high wine and food pairing knowledge.',
    stage: 'offer',
    applied_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

// ============================================================
// PUBLIC JOB BOARD ROUTES (/v1/jobs)
// ============================================================

export const talentPublicRoutes = new Hono<Env>();

// List all active job postings for the restaurant / public job board
talentPublicRoutes.get('/', async (c) => {
  const department = c.req.query('department');
  let jobs = mockJobs.filter((j) => j.status === 'active');
  if (department && department !== 'all') {
    jobs = jobs.filter((j) => j.department.toLowerCase() === department.toLowerCase());
  }
  return ok(c, {
    restaurant: 'The Golden Fork',
    open_positions: jobs.length,
    jobs,
  });
});

// Get job posting detail
talentPublicRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const job = mockJobs.find((j) => j.id === id);
  if (!job) return err(c, 'NOT_FOUND', `Job posting ${id} not found`, 404);
  return ok(c, job);
});

// Candidate applies to a job opening
talentPublicRoutes.post('/:id/apply', async (c) => {
  const id = c.req.param('id');
  const job = mockJobs.find((j) => j.id === id);
  if (!job) return err(c, 'NOT_FOUND', `Job posting ${id} not found`, 404);

  const body = await c.req.json<{
    candidate_name: string;
    email: string;
    phone: string;
    years_experience?: number;
    certifications?: string[];
    availability?: string;
    cover_notes?: string;
  }>();

  if (!body.candidate_name || !body.email || !body.phone) {
    return err(c, 'VALIDATION_ERROR', 'Name, email, and phone number are required', 422);
  }

  const newApp: JobApplication = {
    id: `app-${Date.now()}`,
    tenant_id: job.tenant_id,
    job_id: job.id,
    job_title: job.title,
    department: job.department,
    candidate_name: body.candidate_name,
    email: body.email,
    phone: body.phone,
    years_experience: body.years_experience ?? 0,
    certifications: body.certifications ?? [],
    availability: body.availability ?? 'Flexible',
    cover_notes: body.cover_notes ?? '',
    stage: 'applied',
    applied_at: new Date().toISOString(),
  };

  mockApplications.unshift(newApp);
  job.applicant_count += 1;

  return ok(c, {
    message: 'Application submitted successfully! Our culinary manager will review your submission.',
    application_id: newApp.id,
    candidate_name: newApp.candidate_name,
    job_title: newApp.job_title,
  }, 201);
});

// ============================================================
// MANAGER ATS & TALENT PIPELINE ROUTES (/v1/talent)
// ============================================================

export const talentAdminRoutes = new Hono<Env>();
talentAdminRoutes.use('*', requireTenant);

// List all manager job requisitions
talentAdminRoutes.get('/jobs', async (c) => {
  return ok(c, { jobs: mockJobs });
});

// Create new job posting requisition
talentAdminRoutes.post('/jobs', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{
    title: string;
    department: 'BOH' | 'FOH' | 'Management' | 'Bar';
    role: 'cook' | 'server' | 'bartender' | 'dishwasher' | 'manager';
    pay_type: 'hourly' | 'salary';
    pay_range: string;
    shift_type: 'Full-Time' | 'Part-Time' | 'Seasonal' | 'Flexible';
    experience_level?: 'Entry Level' | '1-2 Years' | '3+ Years' | 'Senior';
    description: string;
    requirements?: string[];
    perks?: string[];
  }>();

  if (!body.title || !body.department || !body.role || !body.pay_range) {
    return err(c, 'VALIDATION_ERROR', 'Title, department, role, and pay range are required', 422);
  }

  const newJob: JobPosting = {
    id: `job-${Date.now()}`,
    tenant_id: tenantId,
    title: body.title,
    department: body.department,
    role: body.role,
    pay_type: body.pay_type ?? 'hourly',
    pay_range: body.pay_range,
    shift_type: body.shift_type ?? 'Full-Time',
    experience_level: body.experience_level ?? '1-2 Years',
    description: body.description ?? '',
    requirements: body.requirements ?? ['Restaurant experience preferred', 'Reliable and punctual'],
    perks: body.perks ?? ['Shift meal provided', 'Employee discount'],
    status: 'active',
    applicant_count: 0,
    created_at: new Date().toISOString(),
  };

  mockJobs.unshift(newJob);
  return ok(c, newJob, 201);
});

// Update / Close job posting
talentAdminRoutes.patch('/jobs/:id', async (c) => {
  const id = c.req.param('id');
  const job = mockJobs.find((j) => j.id === id);
  if (!job) return err(c, 'NOT_FOUND', `Job ${id} not found`, 404);

  const body = await c.req.json<Partial<JobPosting>>();
  if (body.title !== undefined) job.title = body.title;
  if (body.status !== undefined) job.status = body.status;
  if (body.pay_range !== undefined) job.pay_range = body.pay_range;
  if (body.description !== undefined) job.description = body.description;

  return ok(c, job);
});

// List all candidate applications across pipeline stages
talentAdminRoutes.get('/applications', async (c) => {
  const stage = c.req.query('stage');
  let list = mockApplications;
  if (stage && stage !== 'all') {
    list = list.filter((a) => a.stage === stage);
  }
  return ok(c, {
    total_candidates: mockApplications.length,
    pipeline: {
      applied: mockApplications.filter((a) => a.stage === 'applied').length,
      review: mockApplications.filter((a) => a.stage === 'review').length,
      interview: mockApplications.filter((a) => a.stage === 'interview').length,
      staging_trial: mockApplications.filter((a) => a.stage === 'staging_trial').length,
      offer: mockApplications.filter((a) => a.stage === 'offer').length,
      hired: mockApplications.filter((a) => a.stage === 'hired').length,
      rejected: mockApplications.filter((a) => a.stage === 'rejected').length,
    },
    applications: list,
  });
});

// Move candidate to another stage in ATS pipeline
talentAdminRoutes.patch('/applications/:id/stage', async (c) => {
  const id = c.req.param('id');
  const app = mockApplications.find((a) => a.id === id);
  if (!app) return err(c, 'NOT_FOUND', `Application ${id} not found`, 404);

  const body = await c.req.json<{
    stage: 'applied' | 'review' | 'interview' | 'staging_trial' | 'offer' | 'hired' | 'rejected';
    notes?: string;
  }>();

  if (!body.stage) return err(c, 'VALIDATION_ERROR', 'Stage is required', 422);

  app.stage = body.stage;
  if (body.notes) app.cover_notes = `${app.cover_notes ?? ''}\n[Note]: ${body.notes}`.trim();

  return ok(c, app);
});

// 1-Click Turnkey Onboarding: Hire candidate -> Auto-generate POS Security PIN -> Provision Staff
talentAdminRoutes.post('/applications/:id/hire', async (c) => {
  const id = c.req.param('id');
  const app = mockApplications.find((a) => a.id === id);
  if (!app) return err(c, 'NOT_FOUND', `Application ${id} not found`, 404);

  const job = mockJobs.find((j) => j.id === app.job_id);
  const role = job?.role ?? 'server';

  // Generate 4-digit POS PIN
  const generatedPin = String(Math.floor(1000 + Math.random() * 9000));
  const staffUserId = `u-staff-${Date.now()}`;

  app.stage = 'hired';
  app.hired_at = new Date().toISOString();
  app.staff_pin_issued = generatedPin;
  app.staff_id = staffUserId;

  return ok(c, {
    message: `🎉 Candidate ${app.candidate_name} hired successfully!`,
    onboarding: {
      staff_id: staffUserId,
      display_name: app.candidate_name,
      email: app.email,
      phone: app.phone,
      role: role,
      department: app.department,
      pos_pin: generatedPin,
      hired_at: app.hired_at,
      status: 'active',
      instructions: `Employee can immediately login to the POS at http://localhost:5172 using PIN: ${generatedPin}`,
    },
  });
});
