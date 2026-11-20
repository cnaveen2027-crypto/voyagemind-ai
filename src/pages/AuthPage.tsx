import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User as UserIcon, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthPage() {
  const { user, signInGoogle, signInEmail, signUpEmail } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInGoogle();
      showToast('Signed in with Google', 'Your trips and preferences now sync to Cloud Firestore.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg);
      showToast('Sign-in failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'signup') {
        await signUpEmail(name || 'Traveller', email, password);
        showToast(
          'Verification email sent',
          'Please verify your email address before syncing trips to Cloud Firestore.',
          'info'
        );
      } else {
        await signInEmail(email, password);
        showToast('Welcome back', 'Signed in successfully.', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Authentication failed.';
      const helpful = raw.includes('operation-not-allowed')
        ? 'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication → Sign-in method). Please use Google Sign-In or enable Email/Password in Firebase Console.'
        : raw;
      setErrorMsg(helpful);
      showToast('Authentication error', helpful, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#10243A] mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to VoyageMind AI
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#10243A] tracking-tight">
              {user ? 'Account Connected' : 'Sign in to VoyageMind AI'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Sync itineraries, AI copilot threads, and journey recovery plans securely across devices.
            </p>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Signed in as {user.displayName || user.email}
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {user.emailVerified
                      ? 'Email verified · Firestore Cloud Sync active'
                      : 'Email verification pending — check your inbox to enable Firestore sync.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 px-4 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors"
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogle}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-[#10243A] text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <span className="w-4 h-4 rounded-full bg-[#247BA0] text-white text-[10px] font-bold flex items-center justify-center">
                  G
                </span>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-500">or use email</span>
                </div>
              </div>

              <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'signin' ? 'bg-white text-[#10243A] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'signup' ? 'bg-white text-[#10243A] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Aarav Sharma"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1b3a5c] transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <Info className="w-4 h-4 text-[#247BA0] shrink-0 mt-0.5" />
                <div>
                  <p>Want to explore first without signing in?</p>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="mt-1 font-semibold text-[#247BA0] hover:underline"
                  >
                    Continue in Local Demo Workspace
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
