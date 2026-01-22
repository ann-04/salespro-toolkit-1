
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/api';

const AssetRepository: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    DataService.getAssets().then(setAssets).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Sales Asset Repository</h2>
          <p className="text-slate-500 mt-1">Ready-to-use collateral, decks, and proposal blocks.</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition">
            Filter by Industry
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition">
            Bulk Download
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sales Stage</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Audience</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset, i) => (
              <tr key={i} className="hover:bg-blue-50/20 transition cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 text-white font-bold text-[10px] ${asset.type === 'Deck' ? 'bg-amber-500' : asset.type === 'Case Study' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}>
                      {asset.type[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{asset.title}</p>
                      <p className="text-xs text-slate-400">{asset.size}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.type}</td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded font-bold">{asset.stage}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.audience}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 font-bold text-sm">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <h3 className="text-xl font-bold mb-6">Proposal Content Blocks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition group">
            <div className="flex justify-between mb-4">
              <h4 className="font-bold">Managed Service Scope</h4>
              <button className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">Copy to Clipboard</button>
            </div>
            <p className="text-sm text-slate-500 line-clamp-3">Our deployment includes a comprehensive 90-day onboarding phase covering infrastructure setup, policy definition, and stakeholder training...</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition group">
            <div className="flex justify-between mb-4">
              <h4 className="font-bold">Standard Value Narrative</h4>
              <button className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">Copy to Clipboard</button>
            </div>
            <p className="text-sm text-slate-500 line-clamp-3">Seclore DRM provides enterprise-wide data protection by automatically applying rights management to sensitive assets across all communication channels...</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssetRepository;
