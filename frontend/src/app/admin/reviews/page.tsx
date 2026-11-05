import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  FileCheck,
  LogOut,
  Building2,
  Lock,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth-cookies';
import { fetchFromBackend } from '@/lib/api';
import { logoutAction } from '@/app/actions/auth-actions';
import WardenReviewCockpit from '@/components/allocation/WardenReviewCockpit';

export const dynamic = 'force-dynamic';

export default async function AdminWardenReviewPage() {
  const { admin } = await getAdminSession();

  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch Latest Allocation Run
  const runRes = await fetchFromBackend<any>('/allocation/latest');
  const latestRun = runRes.ok ? runRes.data : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                Warden Review & Overrides
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                Phase 4 Governance
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Warden: {admin.email}</span>
            </div>

            <form
              action={async () => {
                'use server';
                await logoutAction('admin');
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-indigo-600" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 space-y-6 flex-1">
        {/* Banner */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 font-mono text-xl font-black shadow-xs">
              <FileCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Warden Approval & Override Cockpit
                </h1>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  Governance
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Review draft allocations, reassign rooms with mandatory justification reasons, and formally authorize publication.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/allocation"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Allocation Engine</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Bed Matrix Map</span>
            </Link>
          </div>
        </div>

        {/* Warden Review Cockpit */}
        <WardenReviewCockpit initialRun={latestRun} adminEmail={admin.email} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/50 py-4 text-center text-xs text-slate-500 font-mono">
        University Hostel System • Phase 4: Warden Review, Override Audit Trail & Multi-Tier Governance
      </footer>
    </div>
  );
}
