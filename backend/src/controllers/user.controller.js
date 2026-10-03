import { User } from '../models/user.model.js';
import fs from 'fs';
import path from 'path';
import { CandidateResume } from '../models/candidate-resume.model.js';
import { CandidateWorkflow } from '../models/candidate-workflow.model.js';
import { Notification } from '../models/notification.model.js';
import { resumeUploadDir } from '../utils/upload.paths.js';

export const listCandidates = async (_req, res) => {
  try {
    const candidates = await User.findAll({
      where: { role: 'Candidate' },
      attributes: ['id', 'name', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    const candidateIds = candidates.map((candidate) => candidate.id);
    const [resumes, workflows] = await Promise.all([
      CandidateResume.findAll({ where: { candidateId: candidateIds }, attributes: ['candidateId'] }),
      Promise.all(candidates.map((candidate) => CandidateWorkflow.findOrCreate({
        where: { candidateId: candidate.id },
        defaults: { candidateId: candidate.id },
      }))).then((records) => records.map(([workflow]) => workflow)),
    ]);
    const resumeIds = new Set(resumes.map((resume) => resume.candidateId));
    const workflowByCandidateId = new Map(workflows.map((workflow) => [workflow.candidateId, workflow]));
    res.json(candidates.map((candidate) => ({
      ...candidate.toJSON(),
      resumeAvailable: resumeIds.has(candidate.id),
      stage: workflowByCandidateId.get(candidate.id)?.stage || 'Pending',
      outreachStatus: workflowByCandidateId.get(candidate.id)?.outreachStatus || 'Pending',
      lastContactedAt: workflowByCandidateId.get(candidate.id)?.lastContactedAt || null,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Could not load candidate details', error: error.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    const candidate = await User.findOne({ where: { id: req.params.id, role: 'Candidate' } });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid candidate name and email' });
    }
    if (email !== candidate.email && await User.findOne({ where: { email } })) {
      return res.status(409).json({ message: 'That email is already in use' });
    }

    await candidate.update({ name, email });
    res.json({ id: candidate.id, name: candidate.name, email: candidate.email, createdAt: candidate.createdAt, resumeAvailable: Boolean(await CandidateResume.findOne({ where: { candidateId: candidate.id } })) });
  } catch (error) {
    res.status(500).json({ message: 'Could not update candidate', error: error.message });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    const candidate = await User.findOne({ where: { id: req.params.id, role: 'Candidate' } });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const resume = await CandidateResume.findOne({ where: { candidateId: candidate.id } });
    await resume?.destroy();
    await CandidateWorkflow.destroy({ where: { candidateId: candidate.id } });
    await candidate.destroy();
    if (resume) {
      const filePath = path.join(resumeUploadDir, resume.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete candidate', error: error.message });
  }
};

export const updateCandidateWorkflow = async (req, res) => {
  try {
    const candidate = await User.findOne({ where: { id: req.params.id, role: 'Candidate' } });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const stages = ['Pending', 'Interview', 'Hired', 'Rejected'];
    const outreachStatuses = ['Pending', 'Contacted'];
    if (req.body.stage && !stages.includes(req.body.stage)) {
      return res.status(400).json({ message: 'Invalid candidate stage' });
    }
    if (req.body.outreachStatus && !outreachStatuses.includes(req.body.outreachStatus)) {
      return res.status(400).json({ message: 'Invalid outreach status' });
    }

    const [workflow] = await CandidateWorkflow.findOrCreate({
      where: { candidateId: candidate.id },
      defaults: { candidateId: candidate.id },
    });
    const update = {};
    if (req.body.stage) update.stage = req.body.stage;
    if (req.body.outreachStatus) {
      update.outreachStatus = req.body.outreachStatus;
      update.lastContactedAt = req.body.outreachStatus === 'Contacted' ? new Date() : null;
    }
    await workflow.update(update);

    if (req.body.stage && req.body.stage !== 'Pending') {
      await Notification.create({
        companyAdminId: req.auth.companyAdminId || req.auth.id,
        type: 'candidate',
        title: `Candidate ${req.body.stage.toLowerCase()}`,
        message: `${candidate.name} was moved to ${req.body.stage}.`,
      });
    }

    res.json({ candidateId: candidate.id, stage: workflow.stage, outreachStatus: workflow.outreachStatus, lastContactedAt: workflow.lastContactedAt });
  } catch (error) {
    res.status(500).json({ message: 'Could not update candidate status', error: error.message });
  }
};