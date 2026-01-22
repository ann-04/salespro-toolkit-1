
import React, { useState } from 'react';
import { Pillar, User } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KnowledgeRepo from './components/KnowledgeRepo';
import SalesEnablement from './components/SalesEnablement';
import CompetitiveIntel from './components/CompetitiveIntel';
import LearningHub from './components/LearningHub';
import AIAssistant from './components/AIAssistant';
import AssetRepository from './components/AssetRepository';
import AdminPanel from './components/AdminPanel';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ChangePassword } from './components/ChangePassword';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activePillar, setActivePillar] = useState<Pillar>(Pillar.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auth Layout
  if (!user) {
    if (isRegistering) {
      return <Register onSwitchToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <Login
        onLoginSuccess={(u, t) => { setUser(u); setToken(t); }}
        onSwitchToRegister={() => setIsRegistering(true)}
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <ChangePassword
        user={user}
        onSuccess={() => setUser({ ...user, mustChangePassword: false })}
      />
    );
  }

  const renderContent = () => {
    // RBAC Protection for Admin Panel
    if (activePillar === Pillar.ADMIN) {
      const allowedRoles = ['Admin', 'Sales Manager', 'Product Manager'];
      if (!user?.role || !allowedRoles.includes(user.role)) {
        return <Dashboard user={user} />;
      }
    }

    switch (activePillar) {
      case Pillar.DASHBOARD: return <Dashboard user={user} />;
      case Pillar.KNOWLEDGE: return <KnowledgeRepo user={user} />;
      case Pillar.ENABLEMENT: return <SalesEnablement />;
      case Pillar.COMPETITIVE: return <CompetitiveIntel />;
      case Pillar.LEARNING: return <LearningHub />;
      case Pillar.ASSETS: return <AssetRepository />;
      case Pillar.AI_ASSISTANT: return <AIAssistant />;
      case Pillar.ADMIN: return <AdminPanel user={user} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
      <Sidebar
        activePillar={activePillar}
        onSelect={setActivePillar}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
      />

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-all focus:outline-none"
          title="Open Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Logout Button (Temporary placement, ideally in Sidebar) */}
      <div className="fixed top-2 right-2 z-50">
        <button
          onClick={() => { setUser(null); setToken(null); }}
          className="px-2 py-1 bg-white text-slate-500 font-medium rounded shadow-sm border border-slate-200 hover:bg-slate-50 transition text-xs opacity-75 hover:opacity-100"
        >
          Logout ({user.name.split(' ')[0]})
        </button>
      </div>

      <main className={`flex-1 overflow-y-auto h-screen p-8 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-80' : 'pl-20'}`}>
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
