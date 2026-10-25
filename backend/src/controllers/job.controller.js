import fs from 'fs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Job } from '../models/job.model.js';
import { CandidateResume } from '../models/candidate-resume.model.js';
import { CompanyJobTemplate } from '../models/company-job-template.model.js';
import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';

export const uploadJobsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const jobs = [];
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (row) => {
          const title = row.title?.trim();
          if (title) {
            const standardHeaders = new Set(['title', 'department', 'experience_required', 'course_required', 'skills_required']);
            jobs.push({
              title,
              department: row.department?.trim() || 'General',
              experience_required: parseInt(row.experience_required, 10) || 0,
              course_required: row.course_required?.trim() || '',
              skills_required: row.skills_required?.trim() || '',
              customFields: Object.fromEntries(
                Object.entries(row)
                  .filter(([header, value]) => !standardHeaders.has(header) && String(value || '').trim())
                  .map(([header, value]) => [header, String(value).trim()]),
              ),
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (jobs.length === 0) {
      return res.status(400).json({ message: 'No valid jobs found. Include a title column with at least one job.' });
    }

    await Job.bulkCreate(jobs);
    try {
      await Notification.create({
        companyAdminId: req.auth.companyAdminId || req.auth.id,
        type: 'job',
        title: 'Jobs uploaded',
        message: `${jobs.length} job ${jobs.length === 1 ? 'position was' : 'positions were'} added: ${jobs.slice(0, 3).map((job) => job.title).join(', ')}${jobs.length > 3 ? ', and more' : ''}.`,
      });
    } catch (notificationError) {
      console.error('Could not create job notification:', notificationError.message);
    }
    res.status(200).json({ message: 'Jobs successfully imported!', count: jobs.length });
  } catch (error) {
    res.status(500).json({ message: 'Error importing jobs from CSV', error: error.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

const defaultJobTemplate = 'title,department,experience_required,course_required,skills_required\nSoftware Engineer,Engineering,2,BTech Computer Science,React Node.js\nData Analyst,Data,1,BCA,Python SQL';

export const downloadTemplate = async (req, res) => {
  try {
    const companyAdminId = req.auth.companyAdminId || req.auth.id;
    const template = await CompanyJobTemplate.findOne({ where: { companyAdminId } });
    const csvContent = template?.content || defaultJobTemplate;
    const filename = (template?.filename || 'job_template.csv').replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Could not download job CSV template', error: error.message });
  }
};

export const uploadJobTemplate = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a CSV template to upload' });

  try {
    const headers = await new Promise((resolve, reject) => {
      let foundHeaders = false;
      const parser = csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() });
      parser.once('headers', (parsedHeaders) => {
        foundHeaders = true;
        resolve(parsedHeaders);
      });
      parser.once('error', reject);
      parser.once('end', () => {
        if (!foundHeaders) resolve([]);
      });
      Readable.from([req.file.buffer]).pipe(parser);
    });

    if (!headers.includes('title')) {
      return res.status(400).json({ message: 'The template must include a title column' });
    }

    const companyAdminId = req.auth.id;
    const [template] = await CompanyJobTemplate.findOrCreate({
      where: { companyAdminId },
      defaults: { companyAdminId, filename: req.file.originalname, content: req.file.buffer.toString('utf8') },
    });
    await template.update({ filename: req.file.originalname, content: req.file.buffer.toString('utf8') });
    res.json({ message: 'Job download template updated', filename: template.filename });
  } catch (error) {
    res.status(400).json({ message: 'Could not read CSV template', error: error.message });
  }
};

export const listJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Could not load uploaded jobs', error: error.message });
  }
};

export const createJob = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const experienceRequired = Number(req.body.experience_required);
    if (!title) return res.status(400).json({ message: 'Job title is required' });
    if (!Number.isInteger(experienceRequired) || experienceRequired < 0) {
      return res.status(400).json({ message: 'Experience must be a non-negative whole number' });
    }

    const job = await Job.create({
      title,
      department: req.body.department?.trim() || 'General',
      experience_required: experienceRequired,
      course_required: req.body.course_required?.trim() || '',
      skills_required: req.body.skills_required?.trim() || '',
      customFields: req.body.customFields || {},
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Could not create job', error: error.message });
  }
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const listMatchingJobs = async (req, res) => {
  try {
    const resume = await CandidateResume.findOne({ where: { candidateId: req.auth.id } });
    if (!resume) return res.json([]);

    const courseTokens = new Set(normalize(resume.mappedCourse).split(' ').filter((token) => token.length > 1));
    const jobs = await Job.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
    const matchingJobs = jobs.filter((job) => {
      const requiredExperience = Number(job.experience_required) || 0;
      const requiredCourse = normalize(job.course_required);
      const requiredTokens = requiredCourse.split(' ').filter((token) => token.length > 1);
      const courseMatches = requiredTokens.length === 0
        || resume.mappedCourse === 'Unknown'
        || requiredTokens.some((token) => courseTokens.has(token));
      return resume.yearsExperience >= requiredExperience && courseMatches;
    });

    res.json(matchingJobs);
  } catch (error) {
    res.status(500).json({ message: 'Could not load matching jobs', error: error.message });
  }
};

export const listOpenJobs = async (_req, res) => {
  try {
    const jobs = await Job.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Could not load open jobs', error: error.message });
  }
};

export const expressInterest = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const candidate = await User.findByPk(req.auth.id, { attributes: ['name', 'email'] });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    await Notification.create({
      companyAdminId: null,
      type: 'candidate',
      title: 'Candidate expressed interest',
      message: `${candidate.name} (${candidate.email}) expressed interest in the ${job.title} position.`,
    });
    res.json({ message: `Your interest in ${job.title} was sent to the recruiter.` });
  } catch (error) {
    res.status(500).json({ message: 'Could not send your interest', error: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const title = req.body.title?.trim();
    const experienceRequired = Number(req.body.experience_required);
    if (!title) {
      return res.status(400).json({ message: 'Job title is required' });
    }
    if (!Number.isInteger(experienceRequired) || experienceRequired < 0) {
      return res.status(400).json({ message: 'Experience must be a non-negative whole number' });
    }

    await job.update({
      title,
      department: req.body.department?.trim() || 'General',
      experience_required: experienceRequired,
      course_required: req.body.course_required?.trim() || '',
      skills_required: req.body.skills_required?.trim() || '',
      customFields: req.body.customFields || {},
    });

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Could not update job', error: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await job.destroy();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete job', error: error.message });
  }
};
