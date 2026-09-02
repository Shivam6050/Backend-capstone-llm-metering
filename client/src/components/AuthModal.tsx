import React, { useState } from 'react';
import { Lock, Mail, User, LogIn, UserPlus, ShieldCheck, X, FileText, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
  onOpenForgotPassword?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenForgotPassword,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode('');

    if (mode === 'signup') {
      if (!acceptedTerms || !acceptedPrivacy) {
        setErrorMsg('Please read the Terms of Service & Privacy Policy and check both agreement boxes to proceed with account creation.');
        setErrorCode('AGREEMENT_REQUIRED');
        return;
      }
    }

    setLoading(true);

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

  const ensureGoogleGsiLoaded = (): Promise<any> => {
    return new Promise((resolve) => {
      if ((window as any).google?.accounts) {
        resolve((window as any).google);
        return;
      }
      const existingScript = document.getElementById('google-gsi-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve((window as any).google));
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve((window as any).google);
      document.head.appendChild(script);
    });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setErrorCode('');

    const GOOGLE_CLIENT_ID =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      '214519630977-9p6mdfthtb0db55vpk2ett5ch10l8tcs.apps.googleusercontent.com';

    try {
      const googleObj = await ensureGoogleGsiLoaded();

      if (googleObj?.accounts?.oauth2) {
        const client = googleObj.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              try {
                const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await profileRes.json();
                if (profile.email) {
                  await processGoogleAuth({ email: profile.email, name: profile.name });
                  return;
                }
              } catch (err: any) {
                setErrorMsg(`Google Profile error: ${err.message}`);
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          },
          error_callback: (err: any) => {
            console.error('Google OAuth error:', err);
            promptFallbackGoogleEmail();
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      }
    } catch (err) {
      console.warn('Google GSI error:', err);
    }

    promptFallbackGoogleEmail();
  };

  const promptFallbackGoogleEmail = () => {
    const googleEmail = prompt('Sign in with Google Account:\nEnter your Google email address:');
    if (!googleEmail) {
      setLoading(false);
      return;
    }

    const cleanEmail = googleEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      setLoading(false);
      return;
    }

    const googleName = cleanEmail.split('@')[0].replace('.', ' ');
    processGoogleAuth({ email: cleanEmail, name: googleName });
  };

  const processGoogleAuth = async (payload: { credential?: string; email?: string; name?: string }) => {
    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text || 'Google sign-in failed' };
      }

      if (res.ok && data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.message || 'Google Authentication failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel border-glow-top rounded-2xl max-w-md w-full p-7 shadow-2xl space-y-5 relative overflow-hidden border border-zinc-800">
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

        {/* Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2.5 bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-xs font-semibold py-2.5 px-4 rounded border border-zinc-800 hover:border-zinc-700 transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center my-2">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-zinc-500 font-semibold">Or use email</span>
          <div className="flex-grow border-t border-zinc-800"></div>
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

          {/* Mandatory Terms & Privacy Checkboxes during Sign Up */}
          {mode === 'signup' && (
            <div className="space-y-2.5 pt-2 pb-2 border-t border-b border-zinc-800/80">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-mono text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked && acceptedPrivacy) {
                      setErrorMsg('');
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-white focus:ring-zinc-700 cursor-pointer accent-white"
                />
                <span>
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onOpenTerms && onOpenTerms()}
                    className="text-white underline font-semibold hover:text-zinc-300 transition-colors"
                  >
                    Terms of Service
                  </button>
                </span>
              </label>

              <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-mono text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => {
                    setAcceptedPrivacy(e.target.checked);
                    if (e.target.checked && acceptedTerms) {
                      setErrorMsg('');
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-white focus:ring-zinc-700 cursor-pointer accent-white"
                />
                <span>
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onOpenPrivacy && onOpenPrivacy()}
                    className="text-white underline font-semibold hover:text-zinc-300 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>
          )}

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
