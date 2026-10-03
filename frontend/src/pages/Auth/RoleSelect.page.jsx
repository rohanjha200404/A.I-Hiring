import { ArrowRight, BriefcaseBusiness, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const RoleSelect = () => (
  <section className="auth-page">
    <div className="auth-card">
      <aside className="auth-story">
        <p className="auth-kicker">AI RECRUITMENT PLATFORM</p>
        <h1>People and opportunity, brought together.</h1>
        <p>A focused workspace for smarter hiring and better career matches.</p>
      </aside>

      <div className="auth-panel">
        <div className="auth-panel-heading">
          <h2>Welcome</h2>
          <p>Choose how you want to sign in.</p>
        </div>

        <div className="role-options">
          <Link className="role-option" to="/login/recruiter">
            <span className="role-option-icon"><BriefcaseBusiness size={21} /></span>
            <span className="role-option-copy">
              <strong>Recruiter login</strong>
              <span>Manage roles and review candidate matches</span>
            </span>
            <ArrowRight className="role-option-arrow" size={19} />
          </Link>

          <Link className="role-option" to="/login/candidate">
            <span className="role-option-icon"><UserRound size={21} /></span>
            <span className="role-option-copy">
              <strong>Candidate login</strong>
              <span>Upload your resume and explore opportunities</span>
            </span>
            <ArrowRight className="role-option-arrow" size={19} />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default RoleSelect;