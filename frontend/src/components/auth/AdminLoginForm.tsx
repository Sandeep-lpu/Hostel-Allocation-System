'use client';

import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { adminLoginAction, ActionResponse } from '@/app/actions/auth-actions';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Check,
  Lock,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all hover:scale-[1.01] disabled:opacity-50"
    >
      <span>{pending ? 'Verifying Admin Authority...' : 'Sign In to Administrative Cockpit'}</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export default function AdminLoginForm() {
  const [state, formAction] = useFormState<ActionResponse | null, FormData>(
    adminLoginAction,
    null,
  );

  const [email, setEmail] = useState('admin@delhiuniv.ac.in');
  const [password, setPassword] = useState('Admin@Password123');
  const [showPassword, setShowPassword] = useState(false);

  const demoAdmins = [
    {
      email: 'admin@delhiuniv.ac.in',
      pass: 'Admin@Password123',
      name: 'Prof. S. K. Gupta',
      role: 'SUPER_ADMIN',
    },
    {
      email: 'warden.bh1@delhiuniv.ac.in',
      pass: 'Warden@Password123',
      name: 'Dr. Rajesh Sharma',
      role: 'WARDEN (BH-01)',
    },
    {
      email: 'warden.gh1@delhiuniv.ac.in',
      pass: 'Warden@Password123',
      name: 'Dr. Meenakshi Sundaram',
      role: 'WARDEN (GH-01)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1-Click Quick Demo Admin Selector */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Select Demo Admin / Warden:</span>
          </div>
          <span className="font-mono text-[10px] text-indigo-500">1-Click Fast Fill</span>
        </div>

        <div className="space-y-2">
          {demoAdmins.map((ad) => (
            <button
              key={ad.email}
              type="button"
              onClick={() => {
                setEmail(ad.email);
                setPassword(ad.pass);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all border ${
                email === ad.email
                  ? 'border-indigo-600 bg-white shadow-xs font-bold text-slate-900'
                  : 'border-indigo-200/80 bg-white/70 text-slate-600 hover:border-indigo-300'
              }`}
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono text-[11px] font-bold text-indigo-700">{ad.role}</span>
                  <span className="text-[11px] text-slate-700">• {ad.name}</span>
                </div>
                <p className="font-mono text-[10px] text-slate-400">{ad.email}</p>
              </div>
              {email === ad.email && <Check className="h-3.5 w-3.5 text-indigo-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {state?.error && (
        <div className="flex items-start space-x-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="font-bold">Access Denied</p>
            <p className="mt-0.5 leading-relaxed">{state.error}</p>
          </div>
        </div>
      )}

      {/* Main Server Action Form */}
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Administrator Email
          </label>
          <div className="relative mt-1.5">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@delhiuniv.ac.in"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-900 shadow-xs placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Security Password
          </label>
          <div className="relative mt-1.5 flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter administrator password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-mono text-slate-900 shadow-xs placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

