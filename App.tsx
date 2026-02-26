
import React, { useState, useEffect } from 'react';
import { Pillar, User } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KnowledgeRepo from './components/KnowledgeRepo';
import SalesEnablement from './components/SalesEnablement';
import CompetitiveIntel from './components/CompetitiveIntel';
import LearningHub from './components/LearningHub';
import AIAssistant from './components/AIAssistant';
import SalesAssetsRepository from './components/SalesAssetsRepository';
import AdminPanel from './components/AdminPanel';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ChangePassword } from './components/ChangePassword';
import ThemeToggle from './components/ThemeToggle';
import './theme.css';

const App: React.FC = () => {
  // Initialize from LocalStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const [isRegistering, setIsRegistering] = useState(false);
  const [activePillar, setActivePillar] = useState<Pillar>(() => {
    const saved = localStorage.getItem('activePillar');
    return (saved && Object.values(Pillar).includes(saved as Pillar))
      ? (saved as Pillar)
      : Pillar.DASHBOARD;
  });

  // Persist active tab whenever it changes
  useEffect(() => {
    localStorage.setItem('activePillar', activePillar);
  }, [activePillar]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Gemini Key State
  const [geminiKey, setGeminiKey] = useState<string | null>(() => localStorage.getItem('gemini-api-key'));
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  // Check for key on login
  React.useEffect(() => {
    if (user && !geminiKey && !isKeyModalOpen) {
      setIsKeyModalOpen(true);
    }
  }, [user, geminiKey]);

  const handleSaveKey = (key: string) => {
    if (key.trim()) {
      localStorage.setItem('gemini-api-key', key.trim());
      setGeminiKey(key.trim());
      setIsKeyModalOpen(false);
    }
  };

  // Load user's theme preference
  useEffect(() => {
    const loadTheme = async () => {
      if (!user || !token) {
        setIsLoadingTheme(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const response = await fetch(`${API_URL}/api/user/preferences`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTheme(data.theme || 'light');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoadingTheme(false);
      }
    };

    loadTheme();
  }, [user, token]);

  // Apply theme to document
  useEffect(() => {
    if (!isLoadingTheme) {
      console.log('Applying theme to document:', theme);
      document.documentElement.setAttribute('data-theme', theme);
      console.log('data-theme attribute set to:', document.documentElement.getAttribute('data-theme'));
    }
  }, [theme, isLoadingTheme]);

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    if (token) {
      try {
        const response = await fetch(`${API_URL}/api/user/preferences/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ theme: newTheme })
        });
        const data = await response.json();
        console.log('Theme saved to backend:', data);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  // Auth Layout
  if (!user) {
    if (isRegistering) {
      return <Register onSwitchToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <Login
        onLoginSuccess={(u, t) => {
          setUser(u);
          setToken(t);
          localStorage.setItem('user', JSON.stringify(u));
          localStorage.setItem('token', t);
        }}
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
      const governancePerms = [
        'USERS_VIEW', 'USERS_CREATE', 'USERS_MANAGE', 'USERS_APPROVE',
        'DEPARTMENTS_VIEW', 'DEPARTMENTS_CREATE', 'DEPARTMENTS_MANAGE',
        'ROLES_UPDATE', 'ROLES_CREATE', 'ROLES_DELETE',
        'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
        'AUDIT_DELETE', 'CATEGORIES_MANAGE',
      ];
      const hasGovPerm = user?.permissions?.some((p: string) => governancePerms.includes(p));
      if (!allowedRoles.includes(user?.role || '') && !hasGovPerm) {
        return <Dashboard user={user} />;
      }
    }

    switch (activePillar) {
      case Pillar.DASHBOARD: return <Dashboard user={user} />;
      case Pillar.KNOWLEDGE: return <KnowledgeRepo user={user} />;
      case Pillar.ENABLEMENT: return <SalesEnablement />;
      case Pillar.COMPETITIVE: return <CompetitiveIntel />;
      case Pillar.LEARNING: return <LearningHub />;
      case Pillar.ASSETS: return <SalesAssetsRepository />;
      case Pillar.AI_ASSISTANT: return <AIAssistant />;
      case Pillar.ADMIN: return <AdminPanel user={user} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">

      {/* Gemini Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center animate-fadeIn relative">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-indigo-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔑</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900">Configure AI Assistant</h3>
            <p className="text-slate-500 mb-6 text-sm">To use the AI features, please enter your personal Gemini API Key. This will be stored locally on your device.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('key') as HTMLInputElement;
              handleSaveKey(input.value);
            }}>
              <input
                name="key"
                type="password"
                required
                autoFocus
                placeholder="Enter Gemini API Key (AIza...)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg">
                Save & Continue
              </button>
              <p className="mt-4 text-xs text-slate-400">
                Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Get one from Google AI Studio</a>.
              </p>
            </form>
          </div>
        </div>
      )}

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

      {/* Top Right Controls */}
      <div className="fixed top-2 right-2 z-50 flex items-center space-x-2">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className="px-2 py-1 bg-indigo-50 text-indigo-600 font-bold max-w-xs rounded shadow-sm border border-indigo-100 hover:bg-indigo-100 transition text-xs"
          title="Update Gemini API Key"
        >
          🔑 API Key
        </button>
        <button
          onClick={() => {
            setUser(null);
            setToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('gemini-api-key'); // Clear key on logout
            localStorage.removeItem('activePillar'); // Reset tab on logout
            setGeminiKey(null); // Clear state

            // Force page reload to ensure Login component appears
            // This fixes E2E test failures where React state updates weren't triggering re-render
            window.location.href = '/';
          }}
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
