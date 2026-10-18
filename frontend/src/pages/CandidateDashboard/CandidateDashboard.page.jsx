import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, Eye, Briefcase, RefreshCw } from 'lucide-react';
import api from '../../api/axios.config.js';
import { toast } from 'sonner';

const CandidateDashboard = () => {
  const [file, setFile] = useState(null);
  const [parsingData, setParsingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [viewingResume, setViewingResume] = useState(false);
  const fileInputRef = useRef(null);

  const loadCandidateData = async () => {
    setJobsLoading(true);
    try {
      const [resumeResponse, jobsResponse] = await Promise.all([
        api.get('/resumes/me'),
        api.get('/jobs/matches'),
      ]);
      setResume(resumeResponse.data);
      setJobs(jobsResponse.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || 'Could not load your resume and job matches.');
      }
      setResume(null);
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidateData();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setFile(null);
      e.target.value = '';
      toast.error('Choose a PDF resume to continue.');
      return;
    }

    setFile(selectedFile);
    toast.success('Resume selected', { description: selectedFile.name });
  };

  const handleUploadResume = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/resumes/upload', formData);
      setParsingData(res.data);
      await loadCandidateData();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Resume analyzed successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the resume. Check that the backend is running.');
    } finally {
      setLoading(false);
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

  return (
    <div className="bg-white rounded-lg shadow min-h-[70vh] p-8">
      <h2 className="text-3xl font-bold text-brand-dark-green mb-2">My Applications</h2>
      <p className="text-gray-600 mb-8 border-b pb-4">Upload your PDF resume to have our AI analyze your profile for the best matches.</p>
      
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8">
          <FileText size={64} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Your resume</h3>
          <p className="text-sm text-gray-500 mb-6">Upload a PDF resume. Your profile is used to find suitable roles from recruiter job listings.</p>
          
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="mb-4 text-sm" />
          
          <button 
            onClick={handleUploadResume}
            disabled={!file || loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition ${(!file || loading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-dark-green hover:bg-opacity-90 shadow-lg'}`}
          >
            <UploadCloud size={20} /> {loading ? 'Analyzing with AI...' : 'Upload resume'}
          </button>
          {resume && (
            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="mb-3 text-sm font-semibold text-gray-700">Uploaded: {resume.originalName}</p>
              <button onClick={handleViewResume} disabled={viewingResume} className="flex items-center gap-2 rounded border border-brand-dark-green px-4 py-2 text-sm font-semibold text-brand-dark-green hover:bg-brand-green/10 disabled:opacity-50">
                <Eye size={17} /> {viewingResume ? 'Opening...' : 'View uploaded resume'}
              </button>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6 shadow-sm bg-white">
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800"><Briefcase size={21} /> Jobs matching your resume</h3>
              <p className="mt-1 text-sm text-gray-500">Recruiter-uploaded roles filtered by course and experience.</p>
            </div>
            <button onClick={loadCandidateData} title="Refresh matches" className="rounded p-2 text-brand-dark-green hover:bg-brand-green/10"><RefreshCw size={18} /></button>
          </div>

          {jobsLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">Loading matching jobs...</p>
          ) : !resume ? (
            <p className="py-10 text-center text-sm text-gray-500">Upload your resume to see matching jobs.</p>
          ) : jobs.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No jobs currently match your resume.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {jobs.map((job) => (
                <article key={job.id} className="rounded border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-brand-dark-green">{job.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{job.department || 'General'} · {job.experience_required || 0} years experience</p>
                    </div>
                    {job.course_required && <span className="rounded-full bg-brand-green/20 px-3 py-1 text-xs font-semibold text-brand-dark-green">{job.course_required}</span>}
                  </div>
                  {job.skills_required && <p className="mt-3 text-sm text-gray-600"><span className="font-semibold">Skills:</span> {job.skills_required}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {parsingData && (
        <div className="mt-8 max-w-3xl mx-auto border rounded-lg p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-6 border-b pb-4">
             {parsingData.status === 'Forwarded to HR' ? (
                <CheckCircle className="text-green-600" size={32} />
             ) : (
                <XCircle className="text-red-500" size={32} />
             )}
             <div>
                <h3 className="text-xl font-bold text-gray-800">Application Status: {parsingData.status}</h3>
                <p className="text-gray-500">Match Score: {parsingData.ai_match_score}</p>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="bg-brand-green/20 p-4 rounded-lg">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">AI Detected Course</p>
                <p className="text-lg font-medium text-brand-dark-green">{parsingData.extracted_data.mapped_course}</p>
             </div>
             <div className="bg-brand-green/20 p-4 rounded-lg">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">AI Detected Experience</p>
                <p className="text-lg font-medium text-brand-dark-green">{parsingData.extracted_data.years_experience} Years</p>
             </div>
             <div className="col-span-2 bg-gray-50 p-4 rounded-lg border mt-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Raw Extracted Text (Preview)</p>
                <p className="text-sm text-gray-700 italic font-mono whitespace-pre-wrap">"{parsingData.extracted_data.raw_text_preview}"</p>
             </div>
           </div>

           <div className="mt-8 flex justify-center">
             <button onClick={() => setParsingData(null)} className="text-brand-dark-green underline font-medium hover:text-black">
               Dismiss analysis
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
