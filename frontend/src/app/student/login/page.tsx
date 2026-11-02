import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import StudentLoginForm from '@/components/auth/StudentLoginForm';
import { getStudentSession } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export default async function StudentLoginPage() {
  const { student } = await getStudentSession();

  if (student) {
    redirect('/student/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc]">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal Selection</span>
          </Link>

          <Link href="/admin/login" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Switch to Admin / Warden Login</span>
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          {/* Emblem & Title */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Student Residential Login
            </h1>
            <p className="text-xs text-slate-500">
              Enter your University Roll Number to authenticate your profile
            </p>
          </div>

          {/* Client Form Component with Server Action */}
          <StudentLoginForm />

          {/* Footer notice */}
          <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4">
            Protected by University Identity Gateway • Academic Session 2026-27
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        HostelSphere • University Residential Allocation Protocol
      </footer>
    </div>
  );
}

