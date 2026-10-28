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
  Award,
  KeyRound,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrandLogo } from './BrandLogo';

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
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (mode === 'signup') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      onLoginSuccess({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() !== '+91 ' ? phone.trim() : undefined,
        isNewUser: true,
      });
    } else {
      onLoginSuccess({
        name: name.trim() || 'Yashika',
        email: email.trim(),
        phone: phone.trim() !== '+91 ' ? phone.trim() : undefined,
        isNewUser: false,
      });
    }
  };

  const handleResetPassword = () => {
    if (!email || !email.includes('@')) {
      setError('Enter your registered email address first to receive the reset instructions.');
      return;
    }
    setError(null);
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs select-none animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Aspirant Authentication Portal"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800/90 dark:bg-stone-900 transition-all">
        {/* Classical Academy Top Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-900/80 px-5 py-4">
          <BrandLogo
            size="sm"
            showWordmark={true}
            subtitle={mode === 'signup' ? 'NEW ASPIRANT ADMISSION' : 'ASPIRANT AUTHENTICATION'}
          />
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200/60 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="mx-5 mt-4 grid grid-cols-2 rounded-2xl border border-stone-200/70 bg-stone-100/80 p-1 dark:border-stone-800/70 dark:bg-stone-800/80 text-xs font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-xl py-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white font-bold text-stone-900 shadow-2xs dark:bg-stone-900 dark:text-amber-400 ring-1 ring-amber-500/20'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`rounded-xl py-2 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white font-bold text-stone-900 shadow-2xs dark:bg-stone-900 dark:text-amber-400 ring-1 ring-amber-500/20'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            New Enrollment
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Password reset instructions dispatched to your email!</span>
            </div>
          )}

          {/* Full Name for Signup */}
          {mode === 'signup' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                <User className="h-3.5 w-3.5 text-amber-600" />
                <span>Aspirant Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'signup'}
                placeholder="e.g. Yashika"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 shadow-inner placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <Mail className="h-3.5 w-3.5 text-amber-600" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="aspirant@gmail.com"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 shadow-inner placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          {/* Phone Number for Signup */}
          {mode === 'signup' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                <Phone className="h-3.5 w-3.5 text-amber-600" />
                <span>Mobile Contact (Optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 shadow-inner placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span>Security Key / Password</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
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
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 pr-9 text-xs text-stone-900 shadow-inner placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Terms checkbox */}
          {mode === 'signup' && (
            <label className="flex items-start gap-2 pt-1 text-[11px] text-stone-500 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-700"
              />
              <span>
                I pledge adherence to the Academy Honor Code, exam integrity, and proctoring norms.
              </span>
            </label>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-98 transition-all cursor-pointer"
          >
            <span>
              {mode === 'signup'
                ? 'Enroll & Initiate Diagnostic'
                : 'Sign In to Academy'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
