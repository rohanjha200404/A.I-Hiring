import { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios.config.js';
import { toast } from 'sonner';

const CandidateDashboard = () => {
  const [file, setFile] = useState(null);
  const [parsingData, setParsingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

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
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Resume analyzed successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the resume. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow min-h-[70vh] p-8">
      <h2 className="text-3xl font-bold text-brand-dark-green mb-2">My Applications</h2>
      <p className="text-gray-600 mb-8 border-b pb-4">Upload your PDF resume to have our AI analyze your profile for the best matches.</p>
      
      {!parsingData ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 max-w-2xl mx-auto">
          <FileText size={64} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload your Resume</h3>
          <p className="text-sm text-gray-500 mb-6 text-center">We only accept PDF formats. Our AI will automatically extract your coursework and experience.</p>
          
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="mb-4 text-sm" />
          
          <button 
            onClick={handleUploadResume}
            disabled={!file || loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition ${(!file || loading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-dark-green hover:bg-opacity-90 shadow-lg'}`}
          >
            <UploadCloud size={20} /> {loading ? 'Analyzing with AI...' : 'Submit Resume'}
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto border rounded-lg p-6 shadow-sm">
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
               Upload another resume
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
