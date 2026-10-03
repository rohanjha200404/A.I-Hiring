import { useState } from 'react';
import api from '../../api/axios.config.js';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Auth = ({ role = 'candidate', initialView = 'login' }) => {
  const [view, setView] = useState(initialView); // 'login', 'register', 'forgot', 'reset'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', otp: '', newPassword: '' });
  const [devOtp, setDevOtp] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
      const validRole = role === 'recruiter'
        ? ['HR', 'Admin', 'Employee'].includes(res.data.user.role)
        : res.data.user.role === 'Candidate';

      if (!validRole) {
        toast.error(`This account is not registered as a ${role}.`);
        return;
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful');
      navigate(role === 'recruiter' ? '/hr-dashboard' : '/candidate-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reach the server. Check that the backend is running.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const endpoint = role === 'recruiter' ? '/auth/register/recruiter' : '/auth/register';
      await api.post(endpoint, { name: formData.name, email: formData.email, password: formData.password });
      toast.success(`${role === 'recruiter' ? 'Recruiter' : 'Candidate'} account created. Please log in.`);
      setView('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reach the server. Check that the backend is running.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/forgot-password', { email: formData.email });
      setDevOtp(res.data.dev_otp); // For dev mode
      toast.success('Verification code sent', {
        description: res.data.dev_otp ? `Development code: ${res.data.dev_otp}` : undefined,
      });
      setView('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reach the server. Check that the backend is running.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset-password', { email: formData.email, otp: formData.otp, newPassword: formData.newPassword });
      toast.success('Password reset successful');
      setView('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reach the server. Check that the backend is running.');
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <aside className="auth-story">
          <p className="auth-kicker">AI RECRUITMENT PLATFORM</p>
          <h1>{role === 'recruiter' ? 'Build your next great team.' : 'Find the role that fits you.'}</h1>
          <p>{role === 'recruiter' ? 'Manage open positions and find candidates who can move your team forward.' : 'Share your experience and discover opportunities matched to your profile.'}</p>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-heading">
            <h2>
              {view === 'login' && `${role === 'recruiter' ? 'Company' : 'Candidate'} login`}
              {view === 'register' && `Create ${role} account`}
              {view === 'forgot' && 'Forgot password?'}
              {view === 'reset' && 'Reset password'}
            </h2>
            <p>{view === 'login' ? role === 'recruiter' ? 'Recruiters and employees can sign in with their company account.' : 'Sign in to continue to your workspace.' : view === 'register' ? 'Create an account to get started.' : 'Enter your details to continue.'}</p>
          </div>

        <form onSubmit={
          view === 'login' ? handleLogin :
          view === 'register' ? handleRegister :
          view === 'forgot' ? handleForgotPassword : handleResetPassword
        } className="auth-form">
          
          {view === 'register' && (
            <label className="auth-field">
              {role === 'recruiter' ? 'Company name' : 'Full name'}
              <input name="name" type="text" autoComplete={role === 'recruiter' ? 'organization' : 'name'} onChange={handleChange} required />
            </label>
          )}

          <label className="auth-field">
            Email address
            <input name="email" type="email" autoComplete="email" onChange={handleChange} required />
          </label>
          
          {(view === 'login' || view === 'register') && (
            <label className="auth-field">
              Password
              <input name="password" type="password" autoComplete={view === 'login' ? 'current-password' : 'new-password'} onChange={handleChange} required />
            </label>
          )}

          {view === 'reset' && (
            <>
              {devOtp && <div className="auth-dev-otp">DEV OTP: {devOtp}</div>}
              <label className="auth-field">
                Verification code
                <input name="otp" type="text" inputMode="numeric" onChange={handleChange} required />
              </label>
              <label className="auth-field">
                New password
                <input name="newPassword" type="password" autoComplete="new-password" onChange={handleChange} required />
              </label>
            </>
          )}

          <button type="submit" className="auth-submit">
            {view === 'login' ? 'Login' : view === 'register' ? 'Register' : view === 'forgot' ? 'Send OTP' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-links">
          {view === 'login' && (
            <>
              <button onClick={() => setView('register')} className="auth-link">Create account</button>
              <span className="auth-link-divider" aria-hidden="true">|</span>
              <button onClick={() => setView('forgot')} className="auth-link">Forgot password?</button>
            </>
          )}
          {(view === 'register' || view === 'forgot' || view === 'reset') && (
            <button onClick={() => setView('login')} className="auth-link">Back to login</button>
          )}
          <span className="auth-link-divider" aria-hidden="true">|</span>
          <Link to="/" className="auth-link">Change account type</Link>
        </div>
      </div>
      </div>
    </section>
  );
};

export default Auth;
