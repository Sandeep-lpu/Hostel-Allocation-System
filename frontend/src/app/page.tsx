import React from 'react';
import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Users,
  Bed,
  Sparkles,
  ClipboardList,
  FileCheck,
  LogIn,
  UserPlus,
  Compass,
} from 'lucide-react';
import { getStudentSession, getAdminSession } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // SSR Session Check for personalized buttons
  const { student } = await getStudentSession();
  const { admin } = await getAdminSession();

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-50/50">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo without the technical SSR badge */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Hostel<span className="text-rose-500">Sphere</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 -mt-1">
                University Residential Portal
              </span>
            </div>
          </Link>

          {/* Top Right Action: Login & Sign Up (Clean & Prominent) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {student ? (
              <Link
                href="/student/dashboard"
                className="inline-flex items-center space-x-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Dashboard ({student.rollNumber})</span>
              </Link>
            ) : admin ? (
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            ) : (
              <>
                {/* Sign In Button */}
                <Link
                  href="/student/login"
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-500" />
                  <span>Log In</span>
                </Link>

                {/* Sign Up / Apply Button */}
                <Link
                  href="/student/application"
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-500/20 hover:bg-rose-700 transition-all hover:shadow-md"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Sign Up / Apply</span>
                </Link>

                {/* Admin Portal Gateway */}
                <Link
                  href="/admin/login"
                  className="hidden md:inline-flex items-center space-x-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-xs font-bold transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Admin</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container - Full Width Utilization without empty side gutters */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Next-Gen University <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
              Hostel Allocation System
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A transparent and automated residential housing system featuring AI roommate matching,
            floor-wise bed management, multi-tier warden approvals, and live waiting list tracking.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/student/application"
              className="inline-flex items-center space-x-2 rounded-2xl bg-rose-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition-all shadow-rose-500/20"
            >
              <span>Apply for Hostel</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/student/hostels"
              className="inline-flex items-center space-x-2 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Compass className="h-4 w-4 text-slate-500" />
              <span>Explore Hostels & Fees</span>
            </Link>
          </div>
        </div>

        {/* Project-Focused Overview & Residential Telemetry Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Residential Infrastructure & Allocation Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time occupancy metrics, automated compatibility matching, and governance cycle status
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Academic Year 2026–27 • Cycle Active
              </span>
            </div>
          </div>

          {/* Project Metrics Grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Bed Inventory */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Bed className="h-4 w-4 text-rose-500" />
                  <span>Bed Inventory</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  2 Halls
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">572 Beds</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Tagore Hall (BH-01) & Kasturba Hall (GH-01) with ground floor accessible units.
              </p>
            </div>

            {/* Metric 2: Roommate Matching */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Roommate Matching</span>
                </span>
                <span className="text-[11px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  7 Factors
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">88% Avg</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Cosine compatibility algorithm factoring sleep, study habits, noise, and cleanliness.
              </p>
            </div>

            {/* Metric 3: Warden Governance */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="flex items-center space-x-1.5">
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                  <span>Allocation Pipeline</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Audit Ready
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">4 Stages</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Draft Seed → Warden Review & Overrides → Approval → Official Pass Generation.
              </p>
            </div>

            {/* Metric 4: Waiting List Engine */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="flex items-center space-x-1.5">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  <span>Waiting List Engine</span>
                </span>
                <span className="text-[11px] font-mono text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  Dynamic
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">1-Click Auto</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Live merit ranking with automated promotions whenever bed vacancies open.
              </p>
            </div>
          </div>
        </div>

        {/* Portal Entry Options: Student vs Admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Student Residential Portal */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-xs transition-all hover:border-slate-300 hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <GraduationCap className="h-6 w-6" />
                </div>
                {student ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    Active: {student.rollNumber}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Student Portal
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Student Residential Portal
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Submit hostel admission applications, choose ranked room preferences, complete your
                  7-factor roommate compatibility profile, and download your official printable allotment slip.
                </p>
              </div>

              {/* Quick links & Demo Account */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Test Student Profiles:
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-700 font-mono text-[11px] gap-1">
                  <span>• Roll: <strong className="text-slate-900">2024BCSE101</strong> (Sandeep Kumar)</span>
                  <span className="text-slate-500">Pass: Password@123</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-700 font-mono text-[11px] gap-1">
                  <span>• Roll: <strong className="text-slate-900">2024BCSE105</strong> (Vikram Singh)</span>
                  <span className="text-slate-500">Pass: Password@123</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={student ? '/student/dashboard' : '/student/login'}
                className="flex-1 inline-flex items-center justify-center space-x-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                <span>{student ? 'Go to Student Dashboard' : 'Student Login'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/student/application"
                className="inline-flex items-center justify-center space-x-1.5 rounded-2xl bg-rose-50 border border-rose-200 py-3.5 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <span>New Application</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Hostel Administration & Warden Cockpit */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-xs transition-all hover:border-slate-300 hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                {admin ? (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                    Active: {admin.role}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Admin & Warden Cockpit
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Hostel Administration & Warden Cockpit
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Manage hostel bed inventory, verify student documents, trigger seed-reproducible
                  allocation runs, execute manual warden overrides with institutional audit logs, and publish allotments.
                </p>
              </div>

              {/* Quick links & Demo Account */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Admin & Warden Credentials:
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-700 font-mono text-[11px] gap-1">
                  <span>• <strong className="text-slate-900">admin@univ.edu</strong> (Hostel Admin)</span>
                  <span className="text-slate-500">Pass: Password@123</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-700 font-mono text-[11px] gap-1">
                  <span>• <strong className="text-slate-900">warden.bh1@univ.edu</strong> (Warden)</span>
                  <span className="text-slate-500">Pass: Password@123</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={admin ? '/admin/dashboard' : '/admin/login'}
                className="flex-1 inline-flex items-center justify-center space-x-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <span>{admin ? 'Go to Admin Dashboard' : 'Admin Login'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/inventory"
                className="inline-flex items-center justify-center space-x-1.5 rounded-2xl bg-slate-100 border border-slate-200 py-3.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>Bed Matrix</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HostelSphere • University Residential Allocation & Roommate Matching System</span>
          <span className="text-slate-500">Academic Year 2026–27</span>
        </div>
      </footer>
    </div>
  );
}
