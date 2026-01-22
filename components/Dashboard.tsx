
import React from 'react';
import { SECLORE_PRODUCT } from '../data';
import { User } from '../types';

interface DashboardProps {
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name || 'Guest'}</h2>
        <p className="text-slate-500 mt-1">Here's a summary of your assigned portfolio and activity.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Assigned Portfolio</h3>
          <p className="text-2xl font-bold mt-2 text-blue-600">12 Products</p>
          <div className="mt-4 flex flex-col space-y-2">
            <span className="text-sm text-slate-600">Active: 8</span>
            <span className="text-sm text-slate-600">New Release: 2</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Learning Progress</h3>
          <p className="text-2xl font-bold mt-2 text-emerald-600">68% Complete</p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '68%' }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
          <p className="text-2xl font-bold mt-2 text-purple-600">4 Deals Enabled</p>
          <p className="text-sm text-slate-500 mt-4">Last asset used: Seclore Proposal Block v2.1</p>
        </div>
      </div>

      <section>
        <h3 className="text-xl font-bold mb-4">My Primary Focus</h3>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-slate-900">{SECLORE_PRODUCT.name}</h4>
              <p className="text-sm text-slate-500">{SECLORE_PRODUCT.category}</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Quick Pitch
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Plain-English Description</h5>
              <p className="text-slate-700 leading-relaxed">{SECLORE_PRODUCT.description}</p>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">IT Landscape Fit</h5>
              <ul className="space-y-2">
                {SECLORE_PRODUCT.itLandscape.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-slate-600">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
