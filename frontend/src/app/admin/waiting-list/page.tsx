import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  Zap,
  LogOut,
  Building2,
  FileCheck,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth-cookies';
import { logoutAction } from '@/app/actions/auth-actions';
import {
  getWaitingListAction,
  getAvailableVacanciesAction,
} from '@/app/actions/waiting-list-actions';
import WaitingListManager from '@/components/allocation/WaitingListManager';

export const dynamic = 'force-dynamic';

export default async function AdminWaitingListPage() {
  const { admin } = await getAdminSession();

  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch waiting list & available vacancies
  const [waitlistRes, vacanciesRes] = await Promise.all([
    getWaitingListAction(),
    getAvailableVacanciesAction(),
  ]);

  const waitlistData = waitlistRes.success
    ? waitlistRes.data
    : {
        runId: '',
        status: '',
        stats: { totalWaiting: 0, totalPromoted: 0, malesWaiting: 0, femalesWaiting: 0 },
        waitingList: [],
        promotedList: [],
        movementLog: [],
      };

  const vacanciesData = vacanciesRes.success
    ? vacanciesRes.data
    : {
        totalVacancies: 0,
        maleVacancies: 0,
        femaleVacancies: 0,
        vacancies: [],
      };

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
                Waiting List Management
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                Phase 5 Promotion Engine
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin: {admin.email}</span>
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 font-mono text-xl font-black shadow-xs">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Waiting List Priority Ranking & Vacancy Allocation
                </h1>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  Real-Time
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Track waiting candidates, view real-time vacant beds across Tagore & Kasturba halls, and promote students with automated audit logging.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/reviews"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Warden Review</span>
            </Link>
            <Link
              href="/admin/allocation"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Allocation Engine</span>
            </Link>
          </div>
        </div>

        {/* Waiting List Manager */}
        <WaitingListManager
          initialData={waitlistData}
          initialVacancies={vacanciesData}
          adminEmail={admin.email}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/50 py-4 text-center text-xs text-slate-500 font-mono">
        University Hostel System • Phase 5: Waiting List Priority Ranking, Real-Time Vacancies & Auto-Promotion
      </footer>
    </div>
  );
}

