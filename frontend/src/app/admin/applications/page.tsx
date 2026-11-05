import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth-cookies';
import { fetchFromBackend } from '@/lib/api';
import { logoutAction } from '@/app/actions/auth-actions';
import AdminApplicationsManager from '@/components/application/AdminApplicationsManager';

export const dynamic = 'force-dynamic';

export default async function AdminApplicationsPage() {
  const { admin } = await getAdminSession();

  if (!admin) {
    redirect('/admin/login');
  }

  // 1. Fetch Active Cycle
  const cycleRes = await fetchFromBackend<any>('/applications/cycles/active');
  const activeCycle = cycleRes.ok ? cycleRes.data : null;

  // 2. Fetch Applications Metrics
  const metricsRes = await fetchFromBackend<any>('/applications/metrics');
  const metrics = metricsRes.ok ? metricsRes.data : {};

  // 3. Fetch All Applications
  const appsRes = await fetchFromBackend<any>('/applications?limit=100');
  const applications = appsRes.ok && appsRes.data?.applications ? appsRes.data.applications : [];

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
                Application & Admission Management
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                Phase 2 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>{admin.role} • {admin.name}</span>
            </div>

            {/* Logout Server Action Form */}
            <form
              action={async () => {
                'use server';
                await logoutAction('admin');
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 space-y-8 flex-1">
        <AdminApplicationsManager
          initialApplications={applications}
          initialMetrics={metrics}
          activeCycle={activeCycle}
          adminName={admin.name}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        HostelSphere Administration Cockpit • Application Verification & Policy Enforcement Engine
      </footer>
    </div>
  );
}
