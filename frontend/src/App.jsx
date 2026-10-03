import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import Auth from './pages/Auth/Auth.page.jsx';
import RoleSelect from './pages/Auth/RoleSelect.page.jsx';

import HRDashboard from './pages/HRDashboard/HRDashboard.page.jsx';
import CandidateDashboard from './pages/CandidateDashboard/CandidateDashboard.page.jsx';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <Toaster position="top-right" richColors closeButton />
        <main className="container mx-auto mt-6 w-full flex-1 p-4">
          <Routes>
            <Route path="/" element={<RoleSelect />} />
            <Route path="/welcome" element={
              <div className="flex flex-col items-center justify-center gap-8 py-20 text-center">
                <h1 className="text-4xl font-bold text-brand-dark-green mb-4">Welcome to GS Solution</h1>
                <p className="text-gray-600 max-w-lg mb-8">Login to access your dashboard. HR can upload Job positions via CSV, and candidates can upload PDF resumes to be instantly parsed and matched by our AI.</p>
                <div className="flex gap-4">
                  <a href="/hr-dashboard" className="bg-brand-dark-green text-white px-6 py-3 rounded font-semibold hover:bg-opacity-90">HR Dashboard</a>
                  <a href="/candidate-dashboard" className="bg-brand-green text-brand-dark-green border border-brand-dark-green px-6 py-3 rounded font-semibold hover:bg-opacity-90">Candidate Dashboard</a>
                </div>
              </div>
            } />
            <Route path="/auth" element={<RoleSelect />} />
            <Route path="/login" element={<RoleSelect />} />
            <Route path="/login/recruiter" element={<Auth role="recruiter" />} />
            <Route path="/login/candidate" element={<Auth role="candidate" />} />
            <Route path="/register" element={<Auth role="candidate" initialView="register" />} />
            <Route path="/hr-dashboard" element={<HRDashboard />} />
            <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
