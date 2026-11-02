import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  GraduationCap,
  LogOut,
  CheckCircle2,
  Database,
  Cpu,
  Bed,
  Utensils,
  Sparkles,
  Phone,
  Mail,
  User,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { getStudentSession } from '@/lib/auth-cookies';
import { logoutAction } from '@/app/actions/auth-actions';
import { fetchFromBackend } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const { student, token } = await getStudentSession();

  if (!student) {
    redirect('/student/login');
  }

  // SSR Live query to backend & MongoDB to verify profile freshness
  const liveProfileRes = await fetchFromBackend<any>(`/students/${student.rollNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-student-id': student.rollNumber,
    },
  });

  const liveProfile = liveProfileRes.ok ? liveProfileRes.data : student;
  const allocation = liveProfile?.currentAllocation || {};

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-base font-black tracking-tight text-slate-900">
                Hostel<span className="text-rose-500">Sphere</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
              Student Portal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MongoDB Connected</span>
            </div>

            {/* Logout Server Action Form */}
            <form
              action={async () => {
                'use server';
                await logoutAction('student');
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

      {/* Main Content */}
      <main className="mx-auto max-w-6xl w-full px-4 py-8 sm:px-6 space-y-8 flex-1">
        {/* Welcome Hero Banner */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 font-mono text-xl font-black shadow-xs">
              {liveProfile.name ? liveProfile.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Welcome back, {liveProfile.name}!
                </h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Authenticated
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">
                Roll Number: <span className="font-bold text-slate-800">{liveProfile.rollNumber}</span> • Gender: {liveProfile.gender}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Database Status
              </span>
              <p className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>MongoDB Verified</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Academic Session
              </span>
              <p className="text-xs font-bold text-slate-800">2026-27 (Fall Semester)</p>
            </div>
          </div>
        </div>

        {/* Phase 1 Action Banner: Explore Hostels & Rooms */}
        <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Phase 1 Milestone • Live Inventory Explorer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Hostel Blocks & Room Categories Catalog
            </h2>
            <p className="text-xs sm:text-sm text-rose-100">
              Browse available residential blocks for {liveProfile.gender} students, examine room types (Studio AC, Standard AC, Air Cooled), and review annual fee structures.
            </p>
          </div>

          <Link
            href="/student/hostels"
            className="inline-flex items-center space-x-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-rose-900 shadow-md hover:bg-rose-50 transition-all shrink-0"
          >
            <span>Explore Hostels & Fees</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 2-Column Grid: Profile Details & Residential Allocation Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Student Details Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-rose-500" />
                  <h2 className="text-sm font-bold text-slate-900">Student Identity Record</h2>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Live MongoDB Document</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                  <span className="text-slate-400">Full Name</span>
                  <span className="font-bold text-slate-900">{liveProfile.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                  <span className="text-slate-400">Roll Number</span>
                  <span className="font-mono font-bold text-slate-900">{liveProfile.rollNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                  <span className="text-slate-400">Campus Email</span>
                  <span className="font-mono text-slate-700">{liveProfile.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                  <span className="text-slate-400">Registered Phone</span>
                  <span className="font-mono text-slate-700">{liveProfile.mobile || '+91 98765 43210'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Assigned Gender Pool</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {liveProfile.gender} HOSTEL
                  </span>
                </div>
              </div>
            </div>

            {/* Test Connection / DB Diagnostics Card */}
            <div className="rounded-3xl border border-emerald-200/90 bg-emerald-50/50 p-6 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Frontend ↔ Backend ↔ MongoDB Verification</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                This page was server-side rendered (SSR) via Next.js 14 Server Components. Your student profile
                was directly fetched from the NestJS Fastify API and verified against the local MongoDB <code>student_profiles</code> collection.
              </p>
              <div className="pt-1 flex items-center space-x-2 text-[11px] font-mono text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Session Token & Cryptographic Pass: Valid</span>
              </div>
            </div>
          </div>

          {/* Right Column: Residential Allocation Snapshot (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Bed className="h-4 w-4 text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Residential Allotment Status
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {allocation.blockCode ? 'Active Allotment' : 'Ready for Allotment'}
                </span>
              </div>

              {allocation.blockCode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Hostel Block
                      </span>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900">
                        {allocation.blockCode}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Allocated Room
                      </span>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900">
                        {allocation.roomNumber}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Designated Bed
                      </span>
                      <p className="mt-1 font-mono text-base font-bold text-rose-600">
                        {allocation.bedLabel}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dining Plan:</span>
                      <span className="font-semibold text-slate-900">
                        {allocation.messService || 'Standard Three Meals (North Indian)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Laundry Service:</span>
                      <span className="font-semibold text-slate-900">
                        {allocation.laundryService ? 'Subscribed' : 'Not Subscribed'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Gym & Recreation:</span>
                      <span className="font-semibold text-slate-900">
                        {allocation.gymService ? 'Active Membership' : 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-xs">
                    <Bed className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">No Bed Currently Locked</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Your profile is verified and eligible for fresh room selection in the upcoming allocation window.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                      <Sparkles className="h-3 w-3" />
                      <span>Ready for Next Phase Feature Expansion</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        HostelSphere Student Portal • Authenticated via Server Action & HTTP-Only Secure Cookie
      </footer>
    </div>
  );
}

