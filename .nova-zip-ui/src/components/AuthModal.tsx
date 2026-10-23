import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrandLogo } from './BrandLogo';
import { novaApi } from '../api/novaApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: {
    name: string;
    email: string;
    phone?: string;
    isNewUser: boolean;
  }) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please provide your name.');
      return;
    }

    try {
      if (mode === 'signup') {
        const result = await novaApi.register(
          name.trim(),
          email.trim(),
          password,
          phone.trim() !== '+91 ' ? phone.trim() : undefined
        );
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        onLoginSuccess({
          name: result?.user?.name || name.trim(),
          email: result?.user?.email || email.trim(),
          phone: phone.trim() !== '+91 ' ? phone.trim() : undefined,
          isNewUser: true,
        });
      } else {
        await novaApi.login(email.trim(), password);
        onLoginSuccess({
          name: name.trim() || 'Learner',
          email: email.trim(),
          phone: phone.trim() !== '+91 ' ? phone.trim() : undefined,
          isNewUser: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header with Classic Black Illustration Seal */}
        <div className="flex items-center justify-between border-b px-6 py-4 border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <BrandLogo
            size="md"
            subtitle={mode === 'signup' ? 'NEW ASPIRANT REGISTRATION' : 'MEMBER AUTHENTICATION'}
          />
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="p-1 mx-6 mt-4 grid grid-cols-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-bold transition-all ${
              mode === 'signup'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Full Name for Signup */}
          {mode === 'signup' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <User className="h-3.5 w-3.5 text-orange-500" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'signup'}
                placeholder="e.g. Yashika"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Mail className="h-3.5 w-3.5 text-orange-500" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="aspirant@gmail.com"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          {/* Phone Number for Signup */}
          {mode === 'signup' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Phone className="h-3.5 w-3.5 text-orange-500" />
                <span>Mobile Number (Optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Lock className="h-3.5 w-3.5 text-orange-500" />
                <span>Password</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = '/forgot-password';
                    if (window.top && window.top !== window.self) window.top.location.href = target;
                    else window.location.href = target;
                  }}
                  className="text-[11px] font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 pr-9 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Terms checkbox */}
          {mode === 'signup' && (
            <label className="flex items-start gap-2 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded-sm border-neutral-300 text-orange-500 focus:ring-orange-400 dark:border-neutral-700"
              />
              <span>
                I agree to the Examination Preparation Honour Code and adaptive syllabus tracking.
              </span>
            </label>
          )}

          {/* Main Action Button */}
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-xs hover:bg-orange-600 active:scale-98 transition-all"
          >
            <span>
              {mode === 'signup'
                ? 'Create Account & Continue to Setup'
                : 'Sign In to Dashboard'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>


        </form>
      </div>
    </div>
  );
};
