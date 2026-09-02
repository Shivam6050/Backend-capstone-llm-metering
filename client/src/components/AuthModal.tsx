import React, { useState } from 'react';
import { Lock, Mail, User, LogIn, UserPlus, ShieldCheck, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
  onOpenForgotPassword?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenForgotPassword,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setErrorCode('');

    const endpoint = mode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/login';
    const bodyPayload = mode === 'signup' ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = { message: 'Invalid JSON response from server.' };
        }
      } else {
        const text = await res.text();
        data = { message: text && text.length < 150 ? text : `Server error (${res.status}). Please check Vercel environment variables & database connection.` };
      }

      if (res.ok && data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.message || 'Authentication failed');
        if (data.error) setErrorCode(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel border-glow-top rounded-2xl max-w-md w-full p-7 shadow-2xl space-y-6 relative overflow-hidden border border-zinc-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Access your unified AI proxy gateway & token analytics'
              : 'Start monitoring OpenAI, Claude, Groq, DeepSeek & Gemini'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/30 border border-red-800/50 rounded p-3 text-xs text-red-300 font-mono font-medium space-y-1.5">
            <p>{errorMsg}</p>
            {(errorCode === 'USER_NOT_FOUND' || errorMsg.includes('User does not exist')) && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); setErrorCode(''); }}
                className="text-white underline font-semibold hover:text-zinc-200 block text-left"
              >
                Click here to Create an Account →
              </button>
            )}
            {(errorCode === 'EMAIL_ALREADY_EXISTS' || errorMsg.includes('already exists')) && (
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setErrorCode(''); }}
                className="text-white underline font-semibold hover:text-zinc-200 block text-left"
              >
                Click here to Sign In →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all font-mono"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all font-mono"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-mono font-semibold text-zinc-300">Password</label>
              {mode === 'login' && onOpenForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgotPassword();
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white hover:underline font-mono transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all font-mono"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-mono text-xs font-semibold py-3 px-4 rounded shadow-sm transition-all duration-200 active:scale-95 uppercase tracking-wider"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Free Account</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="text-center pt-3 border-t border-zinc-800 text-xs text-zinc-400 font-mono">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                className="text-white hover:underline font-semibold transition-colors"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                className="text-white hover:underline font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
