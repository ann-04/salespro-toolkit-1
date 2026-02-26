
import React from 'react';
import { SECLORE_ICP, PERSONAS, OBJECTIONS } from '../data';

const SalesEnablement: React.FC = () => {
  const icp = SECLORE_ICP;
  const personas = PERSONAS;
  const objections = OBJECTIONS;

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Sales Enablement Layer</h2>
        <p className="text-slate-500 mt-1">Turning product knowledge into revenue with targeted tracks.</p>
      </header>

      {/* ICP Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <span className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">B1</span>
          <span>Ideal Customer Profile (ICP)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Target Size</h4>
            <div className="flex flex-wrap gap-2">
              {icp.companySize.map(s => <span key={s} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded font-bold">{s}</span>)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Key Industries</h4>
            <div className="flex flex-wrap gap-2">
              {icp.industries.map(s => <span key={s} className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-1 rounded font-bold">{s}</span>)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Buying Triggers</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              {icp.buyingTriggers.slice(0, 3).map(t => <li key={t}>• {t}</li>)}
            </ul>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Geography</h4>
            <div className="flex flex-wrap gap-2">
              {icp.geography.map(s => <span key={s} className="bg-amber-50 text-amber-700 text-[10px] px-2 py-1 rounded font-bold">{s}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Buyer Personas */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Buyer Personas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {personas.map(p => (
            <div key={p.role} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                <h4 className="text-2xl font-bold text-slate-900">{p.role}</h4>
                <p className="text-blue-600 font-medium">{p.name}</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Talk Track</h5>
                  <p className="text-slate-700 italic border-l-2 border-slate-300 pl-4">"{p.narrative}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Primary KPIs</h5>
                    <ul className="text-sm text-slate-600 list-disc list-inside">
                      {p.kpis.map(k => <li key={k}>{k}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Fears</h5>
                    <ul className="text-sm text-slate-600 list-disc list-inside">
                      {p.fears.map(f => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Objection Handling */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Objection Handling</h3>
        <div className="space-y-4">
          {objections.map((o, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-8">
              <div className="md:w-1/3">
                <p className="text-sm font-bold text-slate-500 uppercase">Customer Says:</p>
                <p className="text-lg font-bold text-slate-900">"{o.query}"</p>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-blue-600 mr-2">The Pivot:</span>
                  {o.response}
                </p>
                <div className="bg-slate-50 p-3 rounded text-xs text-slate-500">
                  <strong>Proof to use:</strong> {o.proof}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SalesEnablement;
