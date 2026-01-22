
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/api';

const CompetitiveIntel: React.FC = () => {
  const [competitors, setCompetitors] = useState<any[]>([]);

  useEffect(() => {
    DataService.getCompetitors().then(setCompetitors).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Competitive Intelligence</h2>
        <p className="text-slate-500 mt-1">Battle-tested strategies to win against competitors.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {competitors.map((comp) => (
          <div key={comp.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{comp.name}</h3>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{comp.position}</span>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg text-sm border border-white/20">
                Battle Card v3.0
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-emerald-600 uppercase mb-3 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Strengths
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {comp.strengths.map(s => <li key={s}>• {s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-600 uppercase mb-3 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    Weaknesses
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {comp.weaknesses.map(w => <li key={w}>• {w}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 self-start">
                <h4 className="text-sm font-bold text-blue-900 uppercase mb-4">How to Win</h4>
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                  {comp.winStrategy}
                </p>
                <button className="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                  Download Feature Comparison
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompetitiveIntel;
