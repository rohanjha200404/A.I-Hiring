import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Download, Users, Briefcase, Pencil, Trash2, Save, X, Eye, Mail, Settings } from 'lucide-react';
import api from '../../api/axios.config.js';
import { toast } from 'sonner';

const fillMailTemplate = (text, candidate, company) => text
  .replaceAll('{{candidate}}', candidate.name)
  .replaceAll('{{company}}', company);

const topCommonLabels = (values, limit = 3) => {
  const counts = new Map();
  for (const value of values) {
    for (const item of String(value || '').split(/[,;|]/)) {
      const label = item.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const existing = counts.get(key);
      counts.set(key, { label: existing?.label || label, count: (existing?.count || 0) + 1 });
    }
  }
  return [...counts.values()].sort((first, second) => second.count - first.count).slice(0, limit);
};

const readSessionUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const companyDomainFromName = (name) => (name || 'company')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '') || 'company';

const HRDashboard = () => {
  const [account] = useState(readSessionUser);
  const isCompanyAdmin = ['HR', 'Admin'].includes(account?.role);
  const canAccessJobs = isCompanyAdmin || (account?.role === 'Employee' && account.permissions?.includes('jobs'));
  const canAccessCandidates = isCompanyAdmin || (account?.role === 'Employee' && account.permissions?.includes('candidates'));
  const [activeTab, setActiveTab] = useState(() => {
    const currentAccount = readSessionUser();
    if (currentAccount?.role === 'Employee' && !currentAccount.permissions?.includes('jobs') && currentAccount.permissions?.includes('candidates')) return 'candidates';
    return 'jobs';
  });
  const [uploadStatus, setUploadStatus] = useState('');
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState(null);
  const [resumePreview, setResumePreview] = useState(null);
  const [mailCandidate, setMailCandidate] = useState(null);
  const [mailTemplates, setMailTemplates] = useState([]);
  const [mailTemplate, setMailTemplate] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailTemplatesLoading, setMailTemplatesLoading] = useState(false);
  const [mailTemplateForm, setMailTemplateForm] = useState({ id: '', name: '', subject: '', body: '' });
  const [mailTemplateSaving, setMailTemplateSaving] = useState(false);
  const [jobTemplateFile, setJobTemplateFile] = useState(null);
  const [jobTemplateUploading, setJobTemplateUploading] = useState(false);
  const [uploadedJobTemplateName, setUploadedJobTemplateName] = useState('');
  const [jobsModalOpen, setJobsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeCreateOpen, setEmployeeCreateOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ name: '', employeeId: '', password: '', permissions: ['jobs'] });
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [companySettings, setCompanySettings] = useState({
    companyName: account?.name || '',
    employeeEmailDomain: `${companyDomainFromName(account?.name)}.com`,
    defaultEmployeePermissions: ['jobs'],
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [busyJobId, setBusyJobId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const uploadControllerRef = useRef(null);

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await api.get('/jobs');
      setJobs(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load uploaded jobs.');
    } finally {
      setJobsLoading(false);
    }
  };

  const loadCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const response = await api.get('/users/candidates');
      setCandidates(response.data);
      setCandidatesLoaded(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load candidate details.');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load employee accounts.');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const loadMailTemplates = async () => {
    setMailTemplatesLoading(true);
    try {
      const response = await api.get('/mail-templates');
      setMailTemplates(response.data);
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load email templates.');
      return [];
    } finally {
      setMailTemplatesLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await api.get('/company-settings');
      setCompanySettings(response.data);
      setEmployeeForm((current) => ({ ...current, permissions: response.data.defaultEmployeePermissions }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load company settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (canAccessJobs) loadJobs();
  }, [canAccessJobs]);

  useEffect(() => {
    if (isCompanyAdmin) loadEmployees();
  }, [isCompanyAdmin]);

  useEffect(() => {
    if (isCompanyAdmin) loadCompanySettings();
  }, [isCompanyAdmin]);

  useEffect(() => {
    if (activeTab === 'settings' && isCompanyAdmin) loadMailTemplates();
  }, [activeTab, isCompanyAdmin]);

  useEffect(() => {
    if (activeTab === 'candidates' && canAccessCandidates && !candidatesLoaded && !candidatesLoading) {
      loadCandidates();
    }
  }, [activeTab, canAccessCandidates, candidatesLoaded, candidatesLoading]);

  useEffect(() => () => {
    if (resumePreview?.url) URL.revokeObjectURL(resumePreview.url);
  }, [resumePreview]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/jobs/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'job_template.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not download the CSV template.');
    }
  };

  const handleUploadJobTemplate = async () => {
    if (!jobTemplateFile) {
      toast.error('Choose a CSV template to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', jobTemplateFile);
    setJobTemplateUploading(true);
    try {
      const response = await api.post('/jobs/template', formData);
      setUploadedJobTemplateName(response.data.filename);
      setJobTemplateFile(null);
      toast.success('Job download template updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the job CSV template.');
    } finally {
      setJobTemplateUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Choose a CSV file to upload.');
      input.value = '';
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);

    setActiveTab('jobs');
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setUploading(true);
    setUploadStatus('Uploading...');
    try {
      const res = await api.post('/jobs/upload', formData, {
        signal: controller.signal,
        onUploadProgress: ({ loaded, total }) => {
          if (total) setUploadStatus(`Uploading... ${Math.round((loaded / total) * 100)}%`);
        },
      });
      setUploadStatus(`Success: ${res.data.message} (${res.data.count} jobs)`);
      toast.success(`${res.data.count} jobs uploaded successfully.`);
      await loadJobs();
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ERR_CANCELED') {
        setUploadStatus('Upload canceled.');
        toast.info('Job upload canceled.');
        return;
      }
      const message = error.response?.data?.message || 'Could not reach the server. Check that the backend is running.';
      setUploadStatus(`Error: ${message}`);
      toast.error(message);
    } finally {
      uploadControllerRef.current = null;
      setUploading(false);
      input.value = '';
    }
  };

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
  };

  const startEditing = (job) => {
    setEditingJobId(job.id);
    setEditValues({
      title: job.title,
      department: job.department || '',
      experience_required: job.experience_required ?? 0,
      course_required: job.course_required || '',
      skills_required: job.skills_required || '',
    });
  };

  const handleSaveJob = async (jobId) => {
    if (!editValues.title?.trim()) {
      toast.error('Job title is required.');
      return;
    }

    setBusyJobId(jobId);
    try {
      const response = await api.put(`/jobs/${jobId}`, {
        ...editValues,
        experience_required: Number(editValues.experience_required),
      });
      setJobs((currentJobs) => currentJobs.map((job) => job.id === jobId ? response.data : job));
      setEditingJobId(null);
      toast.success('Job updated successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update this job.');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;

    setBusyJobId(job.id);
    try {
      await api.delete(`/jobs/${job.id}`);
      setJobs((currentJobs) => currentJobs.filter((currentJob) => currentJob.id !== job.id));
      if (editingJobId === job.id) setEditingJobId(null);
      toast.success('Job deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete this job.');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Delete ${candidate.name} and their saved resume? This cannot be undone.`)) return;

    setBusyCandidateId(candidate.id);
    try {
      await api.delete(`/users/candidates/${candidate.id}`);
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      toast.success('Candidate and resume deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete candidate.');
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleCandidateWorkflowChange = async (candidate, update) => {
    try {
      const response = await api.patch(`/users/candidates/${candidate.id}/workflow`, update);
      setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, ...response.data } : item));
      toast.success('Candidate pipeline updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update candidate pipeline.');
    }
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setCreatingEmployee(true);
    try {
      const response = await api.post('/employees', employeeForm);
      setEmployees((current) => [response.data, ...current]);
      setEmployeeForm({ name: '', employeeId: '', password: '', permissions: ['jobs'] });
      setEmployeeCreateOpen(false);
      toast.success('Employee account created', { description: `Login: ${response.data.email}` });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create employee account.');
    } finally {
      setCreatingEmployee(false);
    }
  };

  const toggleDefaultPermission = (permission) => {
    setCompanySettings((current) => ({
      ...current,
      defaultEmployeePermissions: current.defaultEmployeePermissions.includes(permission)
        ? current.defaultEmployeePermissions.filter((item) => item !== permission)
        : [...current.defaultEmployeePermissions, permission],
    }));
  };

  const handleSaveCompanySettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      const response = await api.put('/company-settings', companySettings);
      setCompanySettings(response.data);
      setEmployeeForm((current) => ({ ...current, permissions: response.data.defaultEmployeePermissions }));
      const updatedAccount = { ...account, name: response.data.companyName };
      localStorage.setItem('user', JSON.stringify(updatedAccount));
      window.dispatchEvent(new Event('app:account-updated'));
      toast.success('Company settings saved. Existing employee login emails are unchanged.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save company settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleEmployeePermission = (permission) => {
    setEmployeeForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Delete employee account for ${employee.name}? They will no longer be able to sign in.`)) return;

    setBusyEmployeeId(employee.id);
    try {
      await api.delete(`/employees/${employee.id}`);
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      toast.success('Employee account deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete employee account.');
    } finally {
      setBusyEmployeeId(null);
    }
  };

  const handleSaveMailTemplate = async (event) => {
    event.preventDefault();
    setMailTemplateSaving(true);
    try {
      const payload = { name: mailTemplateForm.name, subject: mailTemplateForm.subject, body: mailTemplateForm.body };
      const response = mailTemplateForm.id
        ? await api.put(`/mail-templates/${mailTemplateForm.id}`, payload)
        : await api.post('/mail-templates', payload);
      setMailTemplates((current) => mailTemplateForm.id
        ? current.map((template) => template.id === response.data.id ? response.data : template)
        : [...current, response.data]);
      setMailTemplateForm({ id: '', name: '', subject: '', body: '' });
      toast.success(mailTemplateForm.id ? 'Email template updated.' : 'Email template created.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save email template.');
    } finally {
      setMailTemplateSaving(false);
    }
  };

  const handleDeleteMailTemplate = async (template) => {
    if (template.isDefault) return;
    if (!window.confirm(`Delete the "${template.name}" email template?`)) return;
    try {
      await api.delete(`/mail-templates/${template.id}`);
      setMailTemplates((current) => current.filter((item) => item.id !== template.id));
      toast.success('Email template deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete email template.');
    }
  };

  const handleViewResume = async (candidate) => {
    try {
      const response = await api.get(`/resumes/${candidate.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setResumePreview({ url, name: candidate.name });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not open this resume.');
    }
  };

  const openMailComposer = async (candidate) => {
    const templates = await loadMailTemplates();
    const template = templates[0];
    if (!template) return;
    const company = companySettings.companyName || account?.name || 'GS Solution';
    setMailCandidate(candidate);
    setMailTemplate(template.id);
    setMailSubject(fillMailTemplate(template.subject, candidate, company));
    setMailBody(fillMailTemplate(template.body, candidate, company));
  };

  const handleMailTemplateChange = (event) => {
    const template = mailTemplates.find((item) => item.id === event.target.value);
    if (!template || !mailCandidate) return;
    const company = companySettings.companyName || account?.name || 'GS Solution';
    setMailTemplate(template.id);
    setMailSubject(fillMailTemplate(template.subject, mailCandidate, company));
    setMailBody(fillMailTemplate(template.body, mailCandidate, company));
  };

  const averageExperience = jobs.length
    ? (jobs.reduce((total, job) => total + (Number(job.experience_required) || 0), 0) / jobs.length).toFixed(1)
    : '0';
  const topQualifications = topCommonLabels(jobs.map((job) => job.course_required));
  const topSkills = topCommonLabels(jobs.map((job) => job.skills_required));
  const candidateSummary = {
    total: candidates.length,
    hired: candidates.filter((candidate) => candidate.stage === 'Hired').length,
    rejected: candidates.filter((candidate) => candidate.stage === 'Rejected').length,
    interviews: candidates.filter((candidate) => candidate.stage === 'Interview').length,
    mailPending: candidates.filter((candidate) => candidate.outreachStatus !== 'Contacted').length,
  };

  return (
    <div className="bg-white rounded-lg shadow min-h-[70vh]">
      <div className="flex flex-wrap items-center gap-2 border-b px-4">
        {canAccessJobs && (
          <button
            className={`min-w-[180px] flex-1 py-4 flex justify-center items-center gap-2 border-b-2 font-semibold ${activeTab === 'jobs' ? 'text-brand-dark-green border-brand-dark-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('jobs')}
          >
            <Briefcase size={20} /> Job Positions
          </button>
        )}
        {canAccessCandidates && (
          <button
            className={`min-w-[180px] flex-1 py-4 flex justify-center items-center gap-2 border-b-2 font-semibold ${activeTab === 'candidates' ? 'text-brand-dark-green border-brand-dark-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('candidates')}
          >
            <Users size={20} /> Candidate Details
          </button>
        )}
        {isCompanyAdmin && (
          <button
            className={`min-w-[180px] flex-1 py-4 flex justify-center items-center gap-2 border-b-2 font-semibold ${activeTab === 'accounts' ? 'text-brand-dark-green border-brand-dark-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('accounts')}
          >
            <Users size={20} /> Employee Accounts
          </button>
        )}
        {isCompanyAdmin && (
          <button
            className={`min-w-[180px] flex-1 py-4 flex justify-center items-center gap-2 border-b-2 font-semibold ${activeTab === 'settings' ? 'text-brand-dark-green border-brand-dark-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} /> Settings
          </button>
        )}
      </div>

      <div className="p-8">
        {activeTab === 'jobs' && canAccessJobs && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-800">Job Positions Management</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 rounded border border-brand-dark-green bg-white px-3 py-2 text-sm text-brand-dark-green shadow-sm transition hover:bg-brand-green"
                >
                  <Download size={16} /> Template
                </button>

                {uploading ? (
                  <button type="button" onClick={handleCancelUpload} className="flex items-center gap-2 rounded border border-red-200 bg-white px-3 py-2 text-sm text-red-700 shadow-sm transition hover:bg-red-50">
                    <X size={16} /> Cancel upload
                  </button>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded bg-brand-dark-green px-3 py-2 text-sm text-white shadow-sm transition hover:bg-opacity-90">
                    <UploadCloud size={16} /> Upload CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
            </div>
            {uploadStatus && (
              <div aria-live="polite" className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-700">
                {uploadStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Available jobs</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{jobsLoading ? '—' : jobs.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Top education</p>
                {jobsLoading ? <p className="mt-2 text-sm text-slate-500">Loading...</p> : topQualifications.length ? (
                  <ol className="mt-2 space-y-1">
                    {topQualifications.map(({ label, count }) => <li key={label} className="flex justify-between gap-2 text-sm font-semibold text-slate-800"><span className="truncate">{label}</span><span className="text-slate-500">{count}</span></li>)}
                  </ol>
                ) : <p className="mt-2 text-sm text-slate-500">Not specified</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Most requested skills</p>
                {jobsLoading ? <p className="mt-2 text-sm text-slate-500">Loading...</p> : topSkills.length ? (
                  <ol className="mt-2 space-y-1">
                    {topSkills.map(({ label, count }) => <li key={label} className="flex justify-between gap-2 text-sm font-semibold text-slate-800"><span className="truncate">{label}</span><span className="text-slate-500">{count}</span></li>)}
                  </ol>
                ) : <p className="mt-2 text-sm text-slate-500">Not specified</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Average experience</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{jobsLoading ? '—' : `${averageExperience} yrs`}</p>
              </div>
            </div>

            {jobsLoading ? (
              <p className="text-sm text-gray-500">Loading uploaded jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-500">No jobs uploaded yet.</p>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-600">{jobs.length} job {jobs.length === 1 ? 'position' : 'positions'} in your workspace</p>
                <button type="button" onClick={() => setJobsModalOpen(true)} className="inline-flex items-center gap-2 rounded border border-brand-dark-green px-3 py-2 text-sm font-medium text-brand-dark-green hover:bg-brand-green">
                  <Eye size={16} /> View jobs
                </button>
              </div>
            )}

            {jobsModalOpen && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Uploaded jobs">
                <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">Job positions</h3>
                      <p className="mt-1 text-sm text-slate-500">{jobs.length} positions</p>
                    </div>
                    <button type="button" title="Close job list" aria-label="Close job list" onClick={() => setJobsModalOpen(false)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                  </div>
                  <div className="overflow-auto p-4">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-gray-500">
                        <th className="px-3 py-3 font-semibold">Position</th>
                        <th className="px-3 py-3 font-semibold">Department</th>
                        <th className="px-3 py-3 font-semibold">Experience</th>
                        <th className="px-3 py-3 font-semibold">Course</th>
                        <th className="px-3 py-3 font-semibold">Skills</th>
                        <th className="px-3 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} className="border-b border-slate-100 text-slate-700 last:border-0">
                          {editingJobId === job.id ? (
                            <>
                              <td className="px-2 py-2"><input aria-label="Job title" className="w-36 rounded border border-slate-300 px-2 py-1.5" value={editValues.title} onChange={(event) => setEditValues({ ...editValues, title: event.target.value })} /></td>
                              <td className="px-2 py-2"><input aria-label="Department" className="w-28 rounded border border-slate-300 px-2 py-1.5" value={editValues.department} onChange={(event) => setEditValues({ ...editValues, department: event.target.value })} /></td>
                              <td className="px-2 py-2"><input aria-label="Required experience in years" type="number" min="0" step="1" className="w-20 rounded border border-slate-300 px-2 py-1.5" value={editValues.experience_required} onChange={(event) => setEditValues({ ...editValues, experience_required: event.target.value })} /></td>
                              <td className="px-2 py-2"><input aria-label="Required course" className="w-28 rounded border border-slate-300 px-2 py-1.5" value={editValues.course_required} onChange={(event) => setEditValues({ ...editValues, course_required: event.target.value })} /></td>
                              <td className="px-2 py-2"><input aria-label="Required skills" className="w-32 rounded border border-slate-300 px-2 py-1.5" value={editValues.skills_required} onChange={(event) => setEditValues({ ...editValues, skills_required: event.target.value })} /></td>
                              <td className="px-2 py-2">
                                <div className="flex justify-end gap-1">
                                  <button type="button" title="Save changes" aria-label="Save changes" disabled={busyJobId === job.id} onClick={() => handleSaveJob(job.id)} className="rounded p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Save size={16} /></button>
                                  <button type="button" title="Cancel editing" aria-label="Cancel editing" disabled={busyJobId === job.id} onClick={() => setEditingJobId(null)} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 font-medium text-slate-900">{job.title}</td>
                              <td className="px-3 py-3">{job.department || 'General'}</td>
                              <td className="px-3 py-3">{job.experience_required} years</td>
                              <td className="px-3 py-3">{job.course_required || 'Any'}</td>
                              <td className="px-3 py-3">{job.skills_required || 'Not specified'}</td>
                              <td className="px-3 py-3">
                                <div className="flex justify-end gap-1">
                                  <button type="button" title="Edit job" aria-label={`Edit ${job.title}`} onClick={() => startEditing(job)} className="rounded p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={16} /></button>
                                  <button type="button" title="Delete job" aria-label={`Delete ${job.title}`} disabled={busyJobId === job.id} onClick={() => handleDeleteJob(job)} className="rounded p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'candidates' && canAccessCandidates && (
          <div className="w-full py-2">
            <h2 className="mb-5 text-2xl font-bold text-gray-800">Candidate Details</h2>
            {!candidatesLoading && (
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  ['Total candidates', candidateSummary.total],
                  ['Hired', candidateSummary.hired],
                  ['Rejected', candidateSummary.rejected],
                  ['Interviews', candidateSummary.interviews],
                  ['Mail pending', candidateSummary.mailPending],
                ].map(([label, count]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></div>)}
              </div>
            )}
            {candidatesLoading ? (
              <p className="text-sm text-gray-500">Loading candidate details...</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-gray-500">No candidate accounts found.</p>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-600">{candidates.length} candidate {candidates.length === 1 ? 'record' : 'records'} in your workspace</p>
                <button type="button" onClick={() => setCandidateModalOpen(true)} className="inline-flex items-center gap-2 rounded border border-brand-dark-green px-3 py-2 text-sm font-medium text-brand-dark-green hover:bg-brand-green">
                  <Eye size={16} /> View candidates
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounts' && isCompanyAdmin && (
          <div className="flex flex-col gap-6">
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Employee Accounts</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage account access to Job Positions and Candidate Details.</p>
                </div>
                <button type="button" onClick={() => setEmployeeCreateOpen(true)} className="inline-flex items-center gap-2 rounded bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90">
                  <Users size={16} /> Add employee
                </button>
              </div>
              {employeesLoading ? (
                <p className="text-sm text-slate-500">Loading employee accounts...</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-slate-500">No employee accounts created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-3">Name</th><th className="px-3 py-3">Employee ID</th><th className="px-3 py-3">Login email</th><th className="px-3 py-3">Access</th><th className="px-3 py-3 text-right">Actions</th></tr></thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id} className="border-b border-slate-100 text-slate-700 last:border-0">
                          <td className="px-3 py-3 font-medium text-slate-900">{employee.name}</td>
                          <td className="px-3 py-3">{employee.employeeId}</td>
                          <td className="px-3 py-3">{employee.email}</td>
                          <td className="px-3 py-3">{employee.permissions.map((permission) => permission === 'jobs' ? 'Jobs' : 'Candidates').join(', ')}</td>
                          <td className="px-3 py-3 text-right"><button type="button" title="Delete employee" aria-label={`Delete ${employee.name}`} disabled={busyEmployeeId === employee.id} onClick={() => handleDeleteEmployee(employee)} className="rounded p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'settings' && isCompanyAdmin && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['company', 'Company settings', 'Company name, employee email domain and default access.'],
              ['email', 'Email templates', 'Create and manage candidate mail templates.'],
              ['job-template', 'Job download template', 'Upload the CSV file used by Template.'],
            ].map(([key, title, description]) => (
              <button key={key} type="button" onClick={() => setSettingsDialog(key)} className="flex min-h-32 flex-col items-start justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40">
                <Settings size={19} className="text-brand-dark-green" />
                <span><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {settingsDialog && isCompanyAdmin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label={settingsDialog === 'company' ? 'Company settings' : settingsDialog === 'email' ? 'Email templates' : 'Job download template'}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">{settingsDialog === 'company' ? 'Company settings' : settingsDialog === 'email' ? 'Email templates' : 'Job download template'}</h2>
              <button type="button" title="Close settings" aria-label="Close settings" onClick={() => setSettingsDialog(null)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-5">
              {settingsDialog === 'company' && (
                settingsLoading ? <p className="text-sm text-slate-500">Loading settings...</p> : (
                  <form onSubmit={handleSaveCompanySettings} className="flex flex-col gap-4">
                    <label className="auth-field">Company name
                      <input required value={companySettings.companyName} onChange={(event) => setCompanySettings({ ...companySettings, companyName: event.target.value })} />
                    </label>
                    <label className="auth-field">Employee email domain
                      <input required type="text" placeholder="company.com" value={companySettings.employeeEmailDomain} onChange={(event) => setCompanySettings({ ...companySettings, employeeEmailDomain: event.target.value })} />
                    </label>
                    <fieldset className="flex flex-col gap-3 rounded border border-slate-200 p-3">
                      <legend className="px-1 text-xs font-semibold text-slate-600">Default access for new employees</legend>
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={companySettings.defaultEmployeePermissions.includes('jobs')} onChange={() => toggleDefaultPermission('jobs')} /> Job Positions</label>
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={companySettings.defaultEmployeePermissions.includes('candidates')} onChange={() => toggleDefaultPermission('candidates')} /> Candidate Details</label>
                    </fieldset>
                    <p className="text-xs text-slate-500">Changing the domain affects future employee accounts only; existing login emails stay the same.</p>
                    <button type="submit" disabled={settingsSaving} className="w-fit rounded bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">{settingsSaving ? 'Saving...' : 'Save company settings'}</button>
                  </form>
                )
              )}

              {settingsDialog === 'email' && (
                <div className="flex flex-col gap-5">
                  <p className="text-sm text-slate-500">Use {'{{candidate}}'}, {'{{company}}'}, {'{{position}}'}, {'{{date}}'}, and {'{{time}}'} as placeholders.</p>
                  <form onSubmit={handleSaveMailTemplate} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-5">
                    <label className="auth-field">Template name
                      <input required value={mailTemplateForm.name} onChange={(event) => setMailTemplateForm({ ...mailTemplateForm, name: event.target.value })} />
                    </label>
                    <label className="auth-field">Subject
                      <input required value={mailTemplateForm.subject} onChange={(event) => setMailTemplateForm({ ...mailTemplateForm, subject: event.target.value })} />
                    </label>
                    <label className="auth-field">Message
                      <textarea required className="min-h-40 resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-800" value={mailTemplateForm.body} onChange={(event) => setMailTemplateForm({ ...mailTemplateForm, body: event.target.value })} />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={mailTemplateSaving} className="rounded bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">{mailTemplateSaving ? 'Saving...' : mailTemplateForm.id ? 'Save changes' : 'Add email template'}</button>
                      {mailTemplateForm.id && <button type="button" onClick={() => setMailTemplateForm({ id: '', name: '', subject: '', body: '' })} className="rounded border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Cancel edit</button>}
                    </div>
                  </form>
                  <div className="flex flex-col gap-2">
                    {mailTemplatesLoading ? <p className="text-sm text-slate-500">Loading email templates...</p> : mailTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{template.name}{template.isDefault ? ' · Default' : ''}</p>
                          <p className="truncate text-xs text-slate-500">{template.subject}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" title="Edit email template" aria-label={`Edit ${template.name}`} onClick={() => setMailTemplateForm({ id: template.id, name: template.name, subject: template.subject, body: template.body })} className="rounded p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                          {!template.isDefault && <button type="button" title="Delete email template" aria-label={`Delete ${template.name}`} onClick={() => handleDeleteMailTemplate(template)} className="rounded p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsDialog === 'job-template' && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">Upload a CSV with a <span className="font-semibold">title</span> column. This file will be used by Template in Job Positions.</p>
                  <label className="auth-field">CSV template file
                    <input type="file" accept=".csv,text/csv" onChange={(event) => setJobTemplateFile(event.target.files?.[0] || null)} />
                  </label>
                  {jobTemplateFile && <p className="text-sm text-slate-600">Selected: {jobTemplateFile.name}</p>}
                  {uploadedJobTemplateName && <p className="text-sm text-emerald-700">Active download: {uploadedJobTemplateName}</p>}
                  <button type="button" disabled={!jobTemplateFile || jobTemplateUploading} onClick={handleUploadJobTemplate} className="inline-flex w-fit items-center gap-2 rounded bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    <UploadCloud size={16} /> {jobTemplateUploading ? 'Uploading...' : 'Upload CSV template'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {employeeCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Create employee account">
          <form onSubmit={handleCreateEmployee} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">Create employee account</h2>
                <p className="mt-1 text-sm text-slate-500">Login email domain: @{companySettings.employeeEmailDomain}</p>
              </div>
              <button type="button" aria-label="Close employee form" onClick={() => setEmployeeCreateOpen(false)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <label className="auth-field">Employee name
                <input required value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} />
              </label>
              <label className="auth-field">Employee ID
                <input required pattern="[A-Za-z0-9_-]+" title="Use letters, numbers, hyphens or underscores" value={employeeForm.employeeId} onChange={(event) => setEmployeeForm({ ...employeeForm, employeeId: event.target.value })} />
              </label>
              <label className="auth-field">Login email
                <input readOnly value={`${employeeForm.employeeId.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'employee'}@${companySettings.employeeEmailDomain}`} />
              </label>
              <label className="auth-field">Initial password
                <input required minLength={8} type="password" autoComplete="new-password" value={employeeForm.password} onChange={(event) => setEmployeeForm({ ...employeeForm, password: event.target.value })} />
              </label>
              <fieldset className="flex flex-col gap-3 rounded border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Dashboard access</legend>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={employeeForm.permissions.includes('jobs')} onChange={() => toggleEmployeePermission('jobs')} /> Job Positions</label>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={employeeForm.permissions.includes('candidates')} onChange={() => toggleEmployeePermission('candidates')} /> Candidate Details</label>
              </fieldset>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setEmployeeCreateOpen(false)} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={creatingEmployee} className="rounded bg-brand-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">{creatingEmployee ? 'Creating...' : 'Create employee'}</button>
            </div>
          </form>
        </div>
      )}

      {candidateModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Candidate details">
          <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">Candidate details</h2>
                <p className="mt-1 text-sm text-slate-500">{candidates.length} candidates</p>
              </div>
              <button type="button" title="Close candidates" aria-label="Close candidates" onClick={() => setCandidateModalOpen(false)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-3 py-3 font-semibold">Candidate</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Hiring stage</th>
                    <th className="px-3 py-3 font-semibold">Outreach</th>
                    <th className="px-3 py-3 font-semibold">Registered</th>
                    <th className="px-3 py-3 font-semibold">Resume</th>
                    <th className="px-3 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="border-b border-slate-100 text-slate-700 last:border-0">
                      <td className="px-3 py-3 font-medium text-slate-900">{candidate.name}</td>
                      <td className="px-3 py-3">{candidate.email}</td>
                      <td className="px-3 py-3">{isCompanyAdmin ? (
                        <select aria-label={`${candidate.name} hiring stage`} value={candidate.stage || 'Pending'} onChange={(event) => handleCandidateWorkflowChange(candidate, { stage: event.target.value })} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                          {['Pending', 'Interview', 'Hired', 'Rejected'].map((stage) => <option key={stage}>{stage}</option>)}
                        </select>
                      ) : candidate.stage || 'Pending'}</td>
                      <td className="px-3 py-3">{isCompanyAdmin ? (
                        <button type="button" onClick={() => handleCandidateWorkflowChange(candidate, { outreachStatus: candidate.outreachStatus === 'Contacted' ? 'Pending' : 'Contacted' })} className={`rounded px-2 py-1 text-xs font-semibold ${candidate.outreachStatus === 'Contacted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                          {candidate.outreachStatus === 'Contacted' ? 'Contacted' : 'Mark contacted'}
                        </button>
                      ) : candidate.outreachStatus || 'Pending'}</td>
                      <td className="px-3 py-3">{new Date(candidate.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3">{candidate.resumeAvailable ? (
                        <button type="button" title="View resume" aria-label={`View ${candidate.name}'s resume`} onClick={() => handleViewResume(candidate)} className="rounded p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Eye size={17} /></button>
                      ) : <span className="text-slate-400">Not uploaded</span>}</td>
                      <td className="px-3 py-3"><div className="flex justify-end gap-1">
                        <button type="button" title="Create email" aria-label={`Email ${candidate.name}`} onClick={() => openMailComposer(candidate)} className="rounded p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Mail size={16} /></button>
                        {isCompanyAdmin && <button type="button" title="Delete candidate" aria-label={`Delete ${candidate.name}`} disabled={busyCandidateId === candidate.id} onClick={() => handleDeleteCandidate(candidate)} className="rounded p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16} /></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {resumePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label={`${resumePreview.name} resume`}>
          <div className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="truncate font-semibold text-slate-800">{resumePreview.name} - Resume</h2>
              <button type="button" title="Close resume" aria-label="Close resume" onClick={() => setResumePreview(null)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <iframe title={`${resumePreview.name} resume preview`} src={resumePreview.url} className="min-h-0 flex-1 border-0" />
          </div>
        </div>
      )}

      {mailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label={`Email ${mailCandidate.name}`}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">Email candidate</h2>
                <p className="mt-1 text-sm text-slate-500">To: {mailCandidate.email}</p>
              </div>
              <button type="button" title="Close email composer" aria-label="Close email composer" onClick={() => setMailCandidate(null)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <label className="auth-field">
                Email template
                <select disabled={mailTemplatesLoading} className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800" value={mailTemplate} onChange={handleMailTemplateChange}>
                  {mailTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
              <label className="auth-field">
                Subject
                <input className="h-10 rounded border border-slate-300 px-3 text-sm text-slate-800" value={mailSubject} onChange={(event) => setMailSubject(event.target.value)} />
              </label>
              <label className="auth-field">
                Message
                <textarea className="min-h-64 resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-800" value={mailBody} onChange={(event) => setMailBody(event.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setMailCandidate(null)} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <a href={`mailto:${encodeURIComponent(mailCandidate.email)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`} className="inline-flex items-center gap-2 rounded bg-brand-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90">
                <Mail size={16} /> Open email app
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
