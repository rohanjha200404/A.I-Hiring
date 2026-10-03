import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { CandidateResume } from '../models/candidate-resume.model.js';
import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { resumeUploadDir } from '../utils/upload.paths.js';

export const parseResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No resume PDF uploaded' });
  }
  
  let saved = false;
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const parser = new PDFParse({ data: dataBuffer });
    let data;
    try {
      data = await parser.getText();
    } finally {
      await parser.destroy();
    }
    const text = data.text.toLowerCase();
    
    // Preliminary AI/NLP Parsing Simulation
    // In production, this data would be fed into your Q-learning / RL model
    // Here we use Regex and simple NLP techniques to extract standard data.
    
    let parsedCourse = '';
    if (text.includes('btech') || text.includes('b.tech') || text.includes('bachelor of technology')) {
        parsedCourse = 'B.Tech';
    } else if (text.includes('mca') || text.includes('master of computer applications')) {
        parsedCourse = 'MCA';
    } else if (text.includes('bca')) {
        parsedCourse = 'BCA';
    }

    if (text.includes('computer science') || text.includes('cse')) {
        parsedCourse += ' Computer Science';
    }
    
    let experience = 0;
    const expMatch = text.match(/(\d+)\+?\s*years?\s*(?:of)?\s*experience/);
    if (expMatch) {
      experience = parseInt(expMatch[1]);
    }

    const mappedCourse = parsedCourse || 'Unknown';
    const matchScore = Math.floor(Math.random() * 40) + 60; // Returns 60 - 100 for dev purposes
    const status = matchScore >= 80 ? 'Forwarded to HR' : 'Automatically Rejected';
    const [resume] = await CandidateResume.findOrCreate({
      where: { candidateId: req.auth.id },
      defaults: {
        candidateId: req.auth.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mappedCourse,
        yearsExperience: experience,
        matchScore: `${matchScore}%`,
        status,
      },
    });

    const previousFilename = resume.filename;
    await resume.update({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mappedCourse,
      yearsExperience: experience,
      matchScore: `${matchScore}%`,
      status,
    });
    saved = true;

    if (previousFilename !== req.file.filename) {
      const previousPath = path.join(resumeUploadDir, previousFilename);
      if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
    }

    try {
      const candidate = await User.findByPk(req.auth.id, { attributes: ['name'] });
      await Notification.create({
        companyAdminId: null,
        type: 'candidate',
        title: 'New resume uploaded',
        message: `${candidate?.name || 'A candidate'} submitted a resume.`,
      });
    } catch (notificationError) {
      console.error('Could not create resume notification:', notificationError.message);
    }

    res.json({
       message: 'Resume parsed successfully',
       resume_available: true,
       extracted_data: {
          raw_text_preview: data.text.substring(0, 300) + '...',
          mapped_course: mappedCourse,
          years_experience: experience,
       },
       ai_match_score: `${matchScore}%`,
       status,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error parsing PDF Resume', error: error.message });
  } finally {
    if (!saved && req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

export const viewCandidateResume = async (req, res) => {
  try {
    const resume = await CandidateResume.findOne({ where: { candidateId: req.params.candidateId } });
    if (!resume) {
      return res.status(404).json({ message: 'Candidate resume not found' });
    }

    const filePath = path.join(resumeUploadDir, resume.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file is missing' });
    }

    res.type('application/pdf').set('Content-Disposition', 'inline').sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: 'Could not open candidate resume', error: error.message });
  }
};
