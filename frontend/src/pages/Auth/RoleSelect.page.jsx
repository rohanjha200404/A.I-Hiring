import { ArrowRight, BriefcaseBusiness, Check, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoUrl from '../../assets/gs-solution-logo.svg';

const RoleSelect = () => (
  <section className="auth-page role-select-page">
    <div className="landing-brand" aria-label="GS Solution">
      <span className="landing-brand-icon"><img src={logoUrl} alt="" /></span>
      <span>GS Solution <b aria-hidden="true">|</b> <small>Smart job &amp; hiring</small></span>
    </div>
    <div className="auth-card">
      <aside className="auth-story">
        <h1>Good people. Great roles. Zero awkward handshakes.</h1>
        <p className="auth-story-description">Find your next opportunity or build the team that takes your ideas further, all in one thoughtful workspace.</p>
        <div className="auth-story-points">
          <span><Check size={15} /> AI-powered matching</span>
          <span><Check size={15} /> One simple workspace</span>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-panel-heading">
          <p className="auth-panel-eyebrow">WELCOME</p>
          <h2>How would you like to continue?</h2>
          <p>Choose the path that fits what you are here to do.</p>
        </div>

        <div className="role-options">
          <Link className="role-option" to="/login/recruiter">
            <span className="role-option-icon"><BriefcaseBusiness size={21} /></span>
            <span className="role-option-copy">
              <strong>Continue as a recruiter</strong>
              <span>Find standout people and move great roles forward.</span>
            </span>
            <ArrowRight className="role-option-arrow" size={19} />
          </Link>

          <Link className="role-option" to="/login/candidate">
            <span className="role-option-icon"><UserRound size={21} /></span>
            <span className="role-option-copy">
              <strong>Continue as a candidate</strong>
              <span>Show your strengths and discover roles made for you.</span>
            </span>
            <ArrowRight className="role-option-arrow" size={19} />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default RoleSelect;