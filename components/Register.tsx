import React, { useState } from 'react';
import { DataService } from '../services/api';

interface RegisterProps {
    onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [userType, setUserType] = useState('INTERNAL');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await DataService.register({ name, email, userType });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    // ...

    // IN RENDER, AFTER EMAIL INPUT:
    /*
        <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">I am a:</label>
            <div className="flex space-x-4">
                <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center transition ${userType === 'INTERNAL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="userType" value="INTERNAL" checked={userType === 'INTERNAL'} onChange={() => setUserType('INTERNAL')} className="hidden" />
                    Internal User
                </label>
                <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center transition ${userType === 'PARTNER' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="userType" value="PARTNER" checked={userType === 'PARTNER'} onChange={() => setUserType('PARTNER')} className="hidden" />
                    External Partner
                </label>
            </div>
        </div>
    */

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        ✓
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h2>
                    <p className="text-slate-600 mb-6">
                        Your access request has been submitted. An administrator will review it shortly.
                        Once approved, you will serve receive an email with your credentials.
                    </p>
                    <button
                        onClick={onSwitchToLogin}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Request Access</h2>
                <p className="text-slate-500 mb-8">Join the SalesPro Toolkit platform</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@technobind.com"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">I am a:</label>
                        <div className="flex space-x-4">
                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center transition ${userType === 'INTERNAL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'hover:bg-slate-50'}`}>
                                <input type="radio" name="userType" value="INTERNAL" checked={userType === 'INTERNAL'} onChange={() => setUserType('INTERNAL')} className="hidden" />
                                Internal User
                            </label>
                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center transition ${userType === 'PARTNER' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'hover:bg-slate-50'}`}>
                                <input type="radio" name="userType" value="PARTNER" checked={userType === 'PARTNER'} onChange={() => setUserType('PARTNER')} className="hidden" />
                                External Partner
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending Request...' : 'Submit Request'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="text-indigo-600 font-bold hover:underline">
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};
