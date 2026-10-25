import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase, CheckCircle, ChevronDown, Eye, FileText, Filter, RefreshCw,
  Search, Sparkles, UploadCloud, UserRound, X, Zap,
} from 'lucide-react';
import api from '../../api/axios.config.js';
import { toast } from 'sonner';

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CandidateDashboard = () => {
  const [account] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeSection, setActiveSection] = useState('info');
  const [jobFilter, setJobFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [interestedJobs, setInterestedJobs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [file, setFile] = useState(null);
  const [parsingData, setParsingData] = useState(null);
  const fileInputRef = useRef(null);

  const resume = profile?.resume;
  const workflow = profile?.workflow || { stage: 'Pending', outreachStatus: 'Pending' };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileResponse, jobsResponse] = await Promise.all([
        api.get('/users/me/candidate'),
        api.get('/jobs/open'),
      ]);
      setProfile(profileResponse.data);
      setJobs(jobsResponse.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load your candidate workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') loadData(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const isMatching = (job) => {
    if (!resume) return false;
    const requiredExperience = Number(job.experience_required) || 0;
    const candidateTokens = new Set(normalize(resume.mappedCourse).split(' ').filter((token) => token.length > 1));
    const requiredTokens = normalize(job.course_required).split(' ').filter((token) => token.length > 1);
    return resume.yearsExperience >= requiredExperience
      && (requiredTokens.length === 0 || resume.mappedCourse === 'Unknown' || requiredTokens.some((token) => candidateTokens.has(token)));
  };

  const departments = useMemo(() => [...new Set(jobs.map((job) => job.department || 'General'))].sort(), [jobs]);
  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const searchable = normalize(`${job.title} ${job.department} ${job.course_required} ${job.skills_required}`);
    return (!jobSearch.trim() || searchable.includes(normalize(jobSearch)))
      && (departmentFilter === 'all' || (job.department || 'General') === departmentFilter)
      && (jobFilter === 'all' || isMatching(job));
  }), [jobs, jobSearch, departmentFilter, jobFilter, resume]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      event.target.value = '';
      toast.error('Choose a PDF resume to continue.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadResume = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/resumes/upload', formData);
      setParsingData(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
      toast.success('Resume analyzed successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleViewResume = async () => {
    setViewingResume(true);
    try {
      const response = await api.get('/resumes/me/file', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not open your uploaded resume.');
    } finally {
      setViewingResume(false);
    }
  };

  const handleInterest = async (job) => {
    try {
      await api.post(`/jobs/${job.id}/interest`);
      setInterestedJobs((current) => new Set([...current, job.id]));
      toast.success(`Interest sent for ${job.title}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send your interest.');
    }
  };

  const matchingCount = jobs.filter(isMatching).length;
  const stageColors = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Interview: 'bg-blue-50 text-blue-700 border-blue-200',
    Hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="mx-auto min-h-[70vh] max-w-7xl rounded-2xl bg-slate-50 p-4 sm:p-7">
      <section className="relative overflow-hidden rounded-2xl bg-brand-dark-green p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold ring-2 ring-white/30">
              {(profile?.name || account?.name || 'C').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Candidate workspace</p>
              <h1 className="mt-1 text-3xl font-bold">Welcome, {profile?.name || account?.name || 'Candidate'}!</h1>
              <p className="mt-2 text-sm text-emerald-50">{profile?.email || account?.email || 'Candidate account'}</p>
              <p className="mt-1 text-xs text-emerald-100">Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full border px-3 py-1.5 ${resume ? 'border-emerald-200 bg-emerald-100 text-emerald-900' : 'border-white/20 bg-white/10 text-white'}`}>{resume ? 'Resume active' : 'Resume pending'}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Stage: {workflow.stage}</span>
          </div>
        </div>
        <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Open roles', jobs.length],
            ['Matching roles', matchingCount],
            ['Experience', resume ? `${resume.yearsExperience} yrs` : '—'],
            ['AI score', resume?.matchScore || '—'],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/10 p-3"><p className="text-xs text-emerald-100">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}
        </div>
      </section>

      <nav className="my-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Candidate dashboard sections">
        <button type="button" onClick={() => setActiveSection('positions')} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${activeSection === 'positions' ? 'bg-brand-dark-green text-white' : 'text-slate-600 hover:bg-brand-green'}`}><Briefcase size={17} /> Open positions</button>
        <button type="button" onClick={() => setActiveSection('info')} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${activeSection === 'info' ? 'bg-brand-dark-green text-white' : 'text-slate-600 hover:bg-brand-green'}`}><UserRound size={17} /> Candidate info</button>
      </nav>

      {activeSection === 'info' ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Resume status" value={resume ? 'Active' : 'Not uploaded'} detail={resume?.originalName || 'Upload a PDF to get started'} />
            <Metric label="Detected education" value={resume?.mappedCourse || '—'} detail="AI-extracted qualification" />
            <Metric label="Detected experience" value={resume ? `${resume.yearsExperience} Years` : '—'} detail={`${matchingCount} matching open roles`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Personal &amp; account details</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Info label="Full name" value={profile?.name || account?.name} />
                <Info label="Email address" value={profile?.email || account?.email} />
                <Info label="Role" value="Candidate" />
                <Info label="Pipeline status" value={workflow.stage} />
                <Info label="AI compatibility" value={resume?.matchScore || 'Not analyzed'} />
              </dl>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Resume management</h2>
              <p className="mt-2 text-sm text-slate-500">Upload or replace your PDF resume for AI parsing.</p>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="mt-5 w-full text-sm" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={handleUploadResume} disabled={!file || uploading} className="inline-flex items-center gap-2 rounded-lg bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><UploadCloud size={16} /> {uploading ? 'Analyzing...' : 'Upload resume'}</button>
                {resume && <button type="button" onClick={handleViewResume} disabled={viewingResume} className="inline-flex items-center gap-2 rounded-lg border border-brand-dark-green px-4 py-2.5 text-sm font-semibold text-brand-dark-green disabled:opacity-50"><Eye size={16} /> {viewingResume ? 'Opening...' : 'View resume'}</button>}
              </div>
              {resume && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle size={15} /> {resume.originalName}</p>}
            </div>
          </div>
          {resume && <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
            <div className="flex items-center gap-2"><Sparkles size={18} className="text-brand-dark-green" /><h2 className="text-lg font-bold text-slate-800">AI profile insights</h2></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3"><Info label="Mapped course" value={resume.mappedCourse} /><Info label="Years of experience" value={`${resume.yearsExperience} Years`} /><Info label="Application status" value={resume.status} /></div>
            {parsingData?.extracted_data?.raw_text_preview && <p className="mt-5 rounded-lg bg-white p-4 text-sm italic text-slate-600">{parsingData.extracted_data.raw_text_preview}</p>}
          </div>}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-2xl font-bold text-slate-800">Open positions</h2><p className="mt-1 text-sm text-slate-500">Find your next opportunity and express interest instantly.</p></div>
            <button type="button" onClick={loadData} className="rounded-lg border border-slate-200 p-2 text-brand-dark-green hover:bg-brand-green"><RefreshCw size={17} /></button>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search title, skills, education, or department" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-dark-green" /></label>
            <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="all">All open roles</option><option value="matching">Matching your resume</option></select>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="all">All departments</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
          </div>
          {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading open positions...</p> : filteredJobs.length === 0 ? <div className="py-12 text-center"><Filter className="mx-auto text-slate-300" size={30} /><p className="mt-3 font-semibold text-slate-700">No positions found</p><p className="mt-1 text-sm text-slate-500">Try clearing your search or browse all open roles.</p><button type="button" onClick={() => { setJobSearch(''); setJobFilter('all'); setDepartmentFilter('all'); }} className="mt-4 text-sm font-semibold text-brand-dark-green">Clear filters</button></div> : <div className="mt-6 grid gap-4 md:grid-cols-2">{filteredJobs.map((job) => <JobCard key={job.id} job={job} matched={isMatching(job)} interested={interestedJobs.has(job.id)} onDetails={() => setSelectedJob(job)} onInterest={() => handleInterest(job)} />)}</div>}
        </section>
      )}

      {selectedJob && <JobDetails job={selectedJob} matched={isMatching(selectedJob)} interested={interestedJobs.has(selectedJob.id)} onClose={() => setSelectedJob(null)} onInterest={() => handleInterest(selectedJob)} />}
    </div>
  );
};

const Metric = ({ label, value, detail }) => <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 truncate text-lg font-bold text-brand-dark-green">{value}</p><p className="mt-1 truncate text-xs text-slate-500">{detail}</p></div>;
const Info = ({ label, value }) => <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value || '—'}</dd></div>;

const JobCard = ({ job, matched, interested, onDetails, onInterest }) => (
  <article className="rounded-xl border border-slate-200 p-5 transition hover:border-emerald-300 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-brand-dark-green">{job.title}</h3><p className="mt-1 text-sm text-slate-600">{job.department || 'General'} · {job.experience_required || 0} years experience</p></div>{matched && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"><Sparkles size={12} /> AI Matched</span>}</div>
    {job.course_required && <p className="mt-4 text-sm text-slate-600"><span className="font-semibold">Education:</span> {job.course_required}</p>}
    {job.skills_required && <div className="mt-3 flex flex-wrap gap-1.5">{job.skills_required.split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean).map((skill) => <span key={skill} className="rounded-full bg-brand-green px-2.5 py-1 text-xs font-medium text-brand-dark-green">{skill}</span>)}</div>}
    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onDetails} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Details</button><button type="button" onClick={onInterest} disabled={interested} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-brand-dark-green px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200"><Zap size={15} /> {interested ? 'Interest sent' : 'Express interest'}</button></div>
  </article>
);

const JobDetails = ({ job, matched, interested, onClose, onInterest }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`${job.title} details`}>
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-6"><div><div className="flex items-center gap-2">{matched && <Sparkles size={16} className="text-amber-500" />}<h2 className="text-xl font-bold text-slate-800">{job.title}</h2></div><p className="mt-1 text-sm text-slate-500">{job.department || 'General'} · {job.experience_required || 0} years experience</p></div><button type="button" onClick={onClose} aria-label="Close details" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div><div className="space-y-5 p-6"><Info label="Required education" value={job.course_required || 'Not specified'} /><Info label="Required skills" value={job.skills_required || 'Not specified'} /><Info label="Posted" value={job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'} />{Object.keys(job.customFields || {}).length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional job details</p><dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(job.customFields).map(([key, value]) => <Info key={key} label={key.replaceAll('_', ' ')} value={value} />)}</dl></div>}<div className="flex justify-end"><button type="button" onClick={onInterest} disabled={interested} className="inline-flex items-center gap-2 rounded-lg bg-brand-dark-green px-4 py-2.5 text-sm font-semibold text-white disabled:bg-emerald-200"><Zap size={15} /> {interested ? 'Interest sent' : 'Express interest'}</button></div></div></div>
  </div>
);

export default CandidateDashboard;
