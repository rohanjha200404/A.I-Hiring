import { Mail, Phone } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <p className="text-sm font-bold text-slate-800">GS Solution</p>
        <p className="mt-1 text-xs text-slate-500">AI Recruitment</p>
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:items-end">
        <p className="text-xs font-semibold uppercase text-slate-500">For help and queries, contact us</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a className="inline-flex items-center gap-2 transition hover:text-brand-dark-green" href="mailto:imrohanjha001@gmail.com">
            <Mail size={15} aria-hidden="true" /> imrohanjha001@gmail.com
          </a>
          <a className="inline-flex items-center gap-2 transition hover:text-brand-dark-green" href="tel:7982737082">
            <Phone size={15} aria-hidden="true" /> 7982737082
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;