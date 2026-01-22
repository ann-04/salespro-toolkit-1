
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/api';

const LearningHub: React.FC = () => {
  const [paths, setPaths] = useState<any[]>([]);

  useEffect(() => {
    DataService.getLearningPaths().then(setPaths).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Learning Hub</h2>
        <p className="text-slate-500 mt-1">Upskill and certify on the latest product capabilities.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {paths.map(path => (
          <div key={path.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col h-full transition hover:shadow-md">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-slate-900">{path.title}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${path.status === 'Locked' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
                }`}>
                {path.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-6 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Estimated Time: {path.duration}
            </p>
            <div className="flex-1 space-y-4 mb-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Included Modules</h4>
              <ul className="space-y-2">
                {path.modules.map(m => (
                  <li key={m} className="flex items-center text-sm text-slate-700">
                    <svg className="h-4 w-4 mr-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {m}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-slate-100 mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Learning Outcome</span>
                <p className="text-sm font-medium text-slate-900 mt-1">{path.outcome}</p>
              </div>
            </div>
            <button
              disabled={path.status === 'Locked'}
              className={`w-full py-3 rounded-xl text-sm font-bold transition ${path.status === 'Locked'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {path.status === 'In Progress' ? 'Continue Path' : 'Start Path'}
            </button>
          </div>
        ))}
      </div>

      <section className="bg-slate-900 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-6 flex items-center">
          <svg className="h-6 w-6 mr-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Glossary & Jargon Decoder
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h4 className="font-bold text-blue-400 mb-2">DRM</h4>
            <p className="text-xs text-slate-400 italic mb-2">Data Rights Management</p>
            <p className="text-sm">Persistent control over data usage even after sharing.</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h4 className="font-bold text-blue-400 mb-2">DLP</h4>
            <p className="text-xs text-slate-400 italic mb-2">Data Loss Prevention</p>
            <p className="text-sm">Stopping data from leaving the network or approved systems.</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h4 className="font-bold text-blue-400 mb-2">RBAC</h4>
            <p className="text-xs text-slate-400 italic mb-2">Role Based Access Control</p>
            <p className="text-sm">Giving access based on specific business roles or permissions.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearningHub;
