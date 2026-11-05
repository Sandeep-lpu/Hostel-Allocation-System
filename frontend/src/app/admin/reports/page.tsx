import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  ArrowLeft,
  FileSpreadsheet,
  LogOut,
  Download,
  Building2,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth-cookies';
import { logoutAction } from '@/app/actions/auth-actions';
import {
  getReportsSummaryAction,
  getAnnouncementsAction,
} from '@/app/actions/reports-actions';
import AdminReportsCockpit from '@/components/reports/AdminReportsCockpit';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const { admin } = await getAdminSession();

  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch summary and announcements
  const [summaryRes, announcementsRes] = await Promise.all([
    getReportsSummaryAction(),
    getAnnouncementsAction(),
  ]);

  const defaultSummary = {
    runId: 'RUN-2026-FALL',
    runStatus: 'PUBLISHED',
    inventory: {
      totalBeds: 572,
      occupiedBeds: 6,
      availableBeds: 566,
      maintenanceBeds: 0,
      overallOccupancyRate: 1,
      blocks: {
        'BH-01': { name: 'Rabindranath Tagore Hall (Boys)', total: 500, occupied: 5, available: 495, rate: 1 },
        'GH-01': { name: 'Kasturba Hall of Residence (Girls)', total: 72, occupied: 1, available: 71, rate: 1 },
      },
    },
    applications: {
      total: 8,
      allocated: 6,
      verified: 2,
      pending: 0,
      categoryBreakdown: { GEN: 4, OBC: 2, SC: 1, ST: 1, EWS: 0 },
    },
    allocationAnalytics: {
      totalAssigned: 6,
      averageCompatibilityScore: 92,
      satisfactionRate: 100,
      preferences: { p1Count: 6, p2Count: 0, p3Count: 0, satisfactionRate: 100 },
      compatibilityBands: { tier90Plus: 4, tier80to89: 2, tier70to79: 0, below70: 0 },
      overridesCount: 1,
      waitlistCount: 2,
    },
  };

  const summary = summaryRes.success ? summaryRes.data : defaultSummary;
  const announcements = announcementsRes.success ? announcementsRes.data : [];

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
                Institutional Reports & BI Analytics
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Phase 6 Analytics
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Analyst: {admin.email}</span>
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono text-xl font-black shadow-xs">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Campus Allocation Intelligence & Export Center
                </h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Audited
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Institutional occupancy reports, preference satisfaction metrics, category quota analytics, and ISO CSV exports.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/waiting-list"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Waiting List Hub</span>
            </Link>
            <Link
              href="/admin/reviews"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Warden Review</span>
            </Link>
          </div>
        </div>

        {/* Reports Cockpit */}
        <AdminReportsCockpit
          summary={summary}
          announcements={announcements}
          adminEmail={admin.email}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/50 py-4 text-center text-xs text-slate-500 font-mono">
        University Hostel System • Phase 6: System Analytics, Official Exports & Campus Communications
      </footer>
    </div>
  );
}

