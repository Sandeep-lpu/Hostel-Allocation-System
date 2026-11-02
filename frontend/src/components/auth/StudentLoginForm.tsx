'use client';

import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { studentLoginAction, ActionResponse } from '@/app/actions/auth-actions';
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Check,
  UserCheck,
  KeyRound,
} from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all hover:scale-[1.01] disabled:opacity-50"
    >
      <span>{pending ? 'Verifying Student Identity in MongoDB...' : 'Authenticate & Enter Student Portal'}</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export default function StudentLoginForm() {
  const [state, formAction] = useFormState<ActionResponse | null, FormData>(
    studentLoginAction,
    null,
  );

  const [identifier, setIdentifier] = useState('2024BCSE-0412');

  const demoStudents = [
    { roll: '2024BCSE-0412', name: 'Aarav Sharma', gender: 'MALE' },
    { roll: '2024BCSE-0511', name: 'Rohan Verma', gender: 'MALE' },
    { roll: '2024BCSE-0628', name: 'Karan Mehra', gender: 'MALE' },
    { roll: '2024BCSE-0789', name: 'Sameer Khan', gender: 'MALE' },
  ];

  return (
    <div className="space-y-6">
      {/* 1-Click Quick Demo Profile Selector */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-rose-500" />
            <span>Select Demo Student (1-Click Test):</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">Live in MongoDB</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {demoStudents.map((st) => (
            <button
              key={st.roll}
              type="button"
              onClick={() => setIdentifier(st.roll)}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all border ${
                identifier === st.roll
                  ? 'border-slate-900 bg-white shadow-xs font-bold text-slate-900'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="font-mono text-[11px] leading-tight">{st.roll}</p>
                <p className="text-[10px] text-slate-400">{st.name}</p>
              </div>
              {identifier === st.roll && <Check className="h-3.5 w-3.5 text-rose-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {state?.error && (
        <div className="flex items-start space-x-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="font-bold">Authentication Error</p>
            <p className="mt-0.5 leading-relaxed">{state.error}</p>
          </div>
        </div>
      )}

      {/* Main Server Action Form */}
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Roll Number or Campus Email
          </label>
          <div className="relative mt-1.5">
            <input
              type="text"
              name="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="e.g. 2024BCSE-0412 or student@delhiuniv.ac.in"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono font-bold text-slate-900 shadow-xs placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Queried via NestJS against <code className="text-slate-600">student_profiles</code> collection.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Student Password / PIN (Optional for Demo)
          </label>
          <div className="relative mt-1.5">
            <input
              type="password"
              name="passwordOrPin"
              defaultValue="Student@123"
              placeholder="Enter PIN (Default: Student@123)"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-900 shadow-xs placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

