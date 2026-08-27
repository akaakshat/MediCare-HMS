import { useState, useContext } from 'react';
import { Heart, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const { login } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email.trim().toLowerCase(), formData.password);
      const currentUser = ApiClient.getCurrentUser();
      const name = currentUser?.name || 'user';
      toast.success(`Welcome back, ${name}!`);
      onLoginSuccess();
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.20),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef5ff_45%,_#f9fbff_100%)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 shadow-xl shadow-blue-500/20">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">AI-powered clinic workspace</h1>
          <p className="text-sm text-slate-600">Sign in to access your secure hospital management suite</p>
        </div>

        <div className="login-card rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Enterprise-grade access control enabled
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@hospital.com"
                  className="login-input w-full rounded-2xl border border-slate-200 bg-white/70 py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="login-input w-full rounded-2xl border border-slate-200 bg-white/70 py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 py-3 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>Only administrators can create new accounts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
