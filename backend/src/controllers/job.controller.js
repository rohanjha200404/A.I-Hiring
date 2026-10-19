import fs from 'fs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Job } from '../models/job.model.js';
import { CandidateResume } from '../models/candidate-resume.model.js';
import { CompanyJobTemplate } from '../models/company-job-template.model.js';
import { Notification } from '../models/notification.model.js';
import { JobUploadHistory } from '../models/job-upload-history.model.js';
import { User } from '../models/user.model.js';
import { Employee } from '../models/employee.model.js';

const getUploaderName = async (req) => {
  const user = await User.findByPk(req.auth.id, { attributes: ['name'] });
  if (user) return user.name;
  const employee = await Employee.findByPk(req.auth.id, { attributes: ['name', 'email'] });
  return employee?.name || employee?.email || 'Unknown user';
};

const startUploadHistory = async (req, uploadType, filename) => JobUploadHistory.create({
  companyAdminId: req.auth.companyAdminId || req.auth.id,
  uploadedById: req.auth.id,
  uploadedByName: await getUploaderName(req),
  uploadType,
  filename,
  status: 'processing',
});

const finishUploadHistory = async (history, updates) => {
  if (history) await history.update(updates);
};

const readCsvHeaders = (content) => new Promise((resolve, reject) => {
  let foundHeaders = false;
  const parser = csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() });
  parser.once('headers', (headers) => {
    foundHeaders = true;
    resolve(headers);
  });
  parser.once('error', reject);
  parser.once('end', () => {
    if (!foundHeaders) resolve([]);
  });
  Readable.from([content]).pipe(parser);
});

const validateTemplateHeaders = (headers) => {
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (headers.length === 0) return 'The template must contain a header row.';
  if (duplicates.length > 0) return `The template contains duplicate column: ${duplicates[0]}.`;
  return null;
};

export const uploadJobsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const jobs = [];
  let history;
  try {
    history = await startUploadHistory(req, 'jobs', req.file.originalname);
    const companyAdminId = req.auth.companyAdminId || req.auth.id;
    const savedTemplate = await CompanyJobTemplate.findOne({ where: { companyAdminId } });
    const templateContent = savedTemplate?.content || defaultJobTemplate;
    const requiredHeaders = await readCsvHeaders(templateContent);
    const templateError = validateTemplateHeaders(requiredHeaders);
    if (templateError) {
      await finishUploadHistory(history, { status: 'failed', message: templateError });
      return res.status(400).json({ message: templateError, uploadId: history.id });
    }

    const uploadedHeaders = [];
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('headers', (headers) => uploadedHeaders.push(...headers))
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (JSON.stringify(uploadedHeaders) !== JSON.stringify(requiredHeaders)) {
      const message = `Job sheet columns must exactly match the active template: ${requiredHeaders.join(', ')}.`;
      await finishUploadHistory(history, { status: 'failed', message, details: { requiredHeaders, uploadedHeaders } });
      return res.status(400).json({
        message,
        uploadId: history.id,
        requiredHeaders,
        uploadedHeaders,
      });
    }

    for (const [index, row] of rows.entries()) {
      const missingHeader = requiredHeaders.find((header) => !String(row[header] ?? '').trim());
      if (missingHeader) {
        const message = `Row ${index + 2} is missing a value for required field: ${missingHeader}.`;
        await finishUploadHistory(history, { status: 'failed', message, details: { row: index + 2, missingHeader } });
        return res.status(400).json({ message, uploadId: history.id });
      }

      const experience = Number(row.experience_required);
      if (requiredHeaders.includes('experience_required') && (!Number.isInteger(experience) || experience < 0)) {
        const message = `Row ${index + 2} must contain a non-negative whole number for experience_required.`;
        await finishUploadHistory(history, { status: 'failed', message });
        return res.status(400).json({ message, uploadId: history.id });
      }

      const title = row.title?.trim() || row.position?.trim() || row.job_title?.trim() || row[requiredHeaders[0]]?.trim();
      jobs.push({
        title,
        department: row.department?.trim() || 'General',
        experience_required: requiredHeaders.includes('experience_required') ? experience : 0,
        course_required: row.course_required?.trim() || '',
        skills_required: row.skills_required?.trim() || '',
        customFields: Object.fromEntries(requiredHeaders.map((header) => [header, row[header].trim()])),
      });
    }

    if (jobs.length === 0) {
      const message = 'No valid jobs found in the uploaded sheet.';
      await finishUploadHistory(history, { status: 'failed', message });
      return res.status(400).json({ message, uploadId: history.id });
    }

    await Job.bulkCreate(jobs);
    await finishUploadHistory(history, { status: 'success', message: 'Jobs uploaded successfully.', rowCount: jobs.length });
    try {
      await Notification.create({
        companyAdminId,
        audience: 'recruiter',
        type: 'job',
        title: 'Jobs uploaded',
        message: `${jobs.length} job ${jobs.length === 1 ? 'position was' : 'positions were'} added: ${jobs.slice(0, 3).map((job) => job.title).join(', ')}${jobs.length > 3 ? ', and more' : ''}.`,
      });
    } catch (notificationError) {
      console.error('Could not create job notification:', notificationError.message);
    }
    res.status(200).json({ message: 'Jobs successfully imported!', count: jobs.length, uploadId: history.id });
  } catch (error) {
    await finishUploadHistory(history, { status: 'failed', message: error.message });
    res.status(500).json({ message: 'Error importing jobs from CSV', error: error.message, uploadId: history?.id });
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

export const getTemplateSchema = async (req, res) => {
  try {
    const companyAdminId = req.auth.companyAdminId || req.auth.id;
    const template = await CompanyJobTemplate.findOne({ where: { companyAdminId } });
    const content = template?.content || defaultJobTemplate;
    const headers = await readCsvHeaders(content);
    res.json({ filename: template?.filename || 'job_template.csv', headers });
  } catch (error) {
    res.status(500).json({ message: 'Could not load the job template schema', error: error.message });
  }
};

export const uploadJobTemplate = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a CSV template to upload' });

  let history;
  try {
    history = await startUploadHistory(req, 'template', req.file.originalname);
    const content = req.file.buffer.toString('utf8');
    const headers = await readCsvHeaders(content);

    const templateError = validateTemplateHeaders(headers);
    if (templateError) {
      await finishUploadHistory(history, { status: 'failed', message: templateError });
      return res.status(400).json({ message: templateError, uploadId: history.id });
    }

    const companyAdminId = req.auth.id;
    const [template] = await CompanyJobTemplate.findOrCreate({
      where: { companyAdminId },
      defaults: { companyAdminId, filename: req.file.originalname, content },
    });
    await template.update({ filename: req.file.originalname, content });
    await finishUploadHistory(history, { status: 'success', message: 'Job upload template updated.' });
    res.json({ message: 'Job upload template updated', filename: template.filename, headers, uploadId: history.id });
  } catch (error) {
    await finishUploadHistory(history, { status: 'failed', message: error.message });
    res.status(400).json({ message: 'Could not read CSV template', error: error.message, uploadId: history?.id });
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
      customFields: req.body.customFields || job.customFields || {},
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
