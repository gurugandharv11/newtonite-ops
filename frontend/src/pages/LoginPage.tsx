import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('sarah.lead');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (user: string) => {
    setUsername(user);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Newtonite Operations
        </h2>
        <p className="mt-1 text-center text-sm text-indigo-300 font-medium">
          Under Pressure — Enterprise Incident & Work Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Operations'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>

          {/* Quick Demo Account Selector */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              <UserCheck className="w-4 h-4 mr-1.5 text-indigo-500" />
              Quick Demo Accounts (password123)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSelectDemo('sarah.lead')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition"
              >
                <div className="font-semibold text-slate-900">sarah.lead</div>
                <div className="text-slate-500">Core Ops Lead</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('alex.member')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition"
              >
                <div className="font-semibold text-slate-900">alex.member</div>
                <div className="text-slate-500">Core Ops Member</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('david.finlead')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition"
              >
                <div className="font-semibold text-slate-900">david.finlead</div>
                <div className="text-slate-500">Finance Lead</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('admin')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition"
              >
                <div className="font-semibold text-slate-900">admin</div>
                <div className="text-slate-500">Global Admin</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
