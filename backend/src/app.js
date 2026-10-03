import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import jobRoutes from './routes/job.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import userRoutes from './routes/user.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import companySettingsRoutes from './routes/company-settings.routes.js';
import mailTemplateRoutes from './routes/mail-template.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/mail-templates', mailTemplateRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

export default app;
