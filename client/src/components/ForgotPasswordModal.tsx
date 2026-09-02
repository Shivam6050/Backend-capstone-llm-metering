import React, { useState } from 'react';
import { KeyRound, Mail, Lock, CheckCircle2, X } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setMessage('');

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Password reset instructions have been sent to your email. Check your inbox.');
        setStep(2);
      } else {
        setErrorMsg(data.message || 'Request failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Password updated successfully! You can now sign in with your new password.');
        onClose();
      } else {
        setErrorMsg(data.message || 'Password reset failed');
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
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {step === 1 ? 'Reset Your Password' : 'Set New Password'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-950/30 border border-red-800/50 rounded p-3 text-xs text-red-300 font-mono font-medium">
            {errorMsg}
          </div>
        )}

        {message && (
          <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs text-zinc-200 flex items-start space-x-2 font-mono font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-300" />
            <span>{message}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">
                Account Email Address
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-mono text-xs font-semibold py-3 px-4 rounded shadow-sm transition-all duration-200 active:scale-95 uppercase tracking-wider"
            >
              {loading ? 'Sending...' : 'Send Password Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-zinc-400 font-mono">
              Paste the reset token from the email sent to <strong className="text-white">{email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">Reset Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                placeholder="Paste token from email..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all font-mono"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-mono text-xs font-semibold py-3 px-4 rounded shadow-sm transition-all duration-200 active:scale-95 uppercase tracking-wider"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-zinc-400 hover:text-white font-mono text-xs py-1 transition-colors"
            >
              ← Request a new token
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
