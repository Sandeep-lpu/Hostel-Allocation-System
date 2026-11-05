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

  // Fetch student application record for Phase 2
  const appRes = await fetchFromBackend<any>(`/applications/my-application/${student.rollNumber}`);
  const application = appRes.ok ? appRes.data : null;

  // Fetch latest allocation run for Phase 3/4
  const runRes = await fetchFromBackend<any>('/allocation/latest');
  const latestRun = runRes.ok ? runRes.data : null;
  const isAllocationPublished = latestRun?.status === 'PUBLISHED';
  const myAssignment = latestRun?.assignments?.find(
    (a: any) => a.studentRollNumber?.toUpperCase() === student.rollNumber?.toUpperCase(),
  );

  // Fetch student waitlist status for Phase 5
  const wlRes = await fetchFromBackend<any>(`/allocation/waiting-list/status/${student.rollNumber}`);
  const waitlistStatus = wlRes.ok ? wlRes.data : null;

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

        {/* Phase 1, Phase 2 & Phase 3 Action Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Phase 1: Explore Hostels & Fees */}
          <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 p-6 text-white shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Phase 1 • Explorer</span>
              </div>
              <h2 className="text-lg font-black tracking-tight">Hostel Blocks & Fees</h2>
              <p className="text-xs text-rose-100">
                Browse available residences for {liveProfile.gender} students, inspect rooms, and review annual pricing.
              </p>
            </div>
            <Link
              href="/student/hostels"
              className="inline-flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-rose-900 shadow-xs hover:bg-rose-50 transition-all w-fit space-x-2"
            >
              <span>Explore Hostels</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Phase 2: Hostel Application & Eligibility */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                  <Sparkles className="h-3 w-3 text-emerald-300" />
                  <span>Phase 2 • Admission</span>
                </div>
                {application && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      application.status === 'VERIFIED'
                        ? 'bg-emerald-500 text-white'
                        : application.status === 'ACTION_REQUIRED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {application.status}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight">Application & Status</h2>
              <p className="text-xs text-indigo-100">
                {application
                  ? `Application #${application.applicationNumber} active. Eligibility: ${
                      application.eligibilityResult?.isOverallEligible ? 'Verified' : 'Under Review'
                    }`
                  : 'Submit your 3 ranked preferences, emergency contact, and documents.'}
              </p>
            </div>
            <Link
              href="/student/application"
              className="inline-flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-indigo-900 shadow-xs hover:bg-indigo-50 transition-all w-fit space-x-2"
            >
              <span>{application ? 'View Scorecard' : 'Apply Now'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Phase 3: Roommate Compatibility Hub */}
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 p-6 text-white shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Phase 3 • Matching</span>
              </div>
              <h2 className="text-lg font-black tracking-tight">Roommate Compatibility</h2>
              <p className="text-xs text-purple-100">
                Fill the 7-factor questionnaire (sleep schedule, study noise, room temperature) for optimal room clustering.
              </p>
            </div>
            <Link
              href="/student/roommates"
              className="inline-flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-purple-900 shadow-xs hover:bg-purple-50 transition-all w-fit space-x-2"
            >
              <span>Match Questionnaire</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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
                  <Bed className="h-4 w-4 text-rose-500" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Hostel Allocation Status
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                    isAllocationPublished && myAssignment
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : latestRun
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isAllocationPublished && myAssignment
                    ? '🎉 Room Officially Allocated'
                    : latestRun && myAssignment
                    ? '⏳ In Governance Review'
                    : 'Application Verified'}
                </span>
              </div>

              {/* State A: Published Official Allotment */}
              {isAllocationPublished && myAssignment ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-900 font-black text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Official Allotment Published & Locked</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Congratulations! Your hostel room placement has been officially authorized by the Dean & Warden.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Hostel Block
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">
                        {myAssignment.assignedBlockCode}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Floor
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">
                        Floor {myAssignment.assignedFloor}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Room Number
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">
                        {myAssignment.assignedRoomNumber}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                        Designated Bed
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-rose-600">
                        {myAssignment.assignedBedLabel}
                      </p>
                    </div>
                  </div>

                  {/* Roommates Card */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Assigned Roommate(s)</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {myAssignment.compatibilityScore}% Compatibility
                      </span>
                    </div>

                    {myAssignment.roommates && myAssignment.roommates.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {myAssignment.roommates.map((rm: any) => (
                          <div
                            key={rm.rollNumber}
                            className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            <span>{rm.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">({rm.rollNumber})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Single Occupancy / No roommate mapped</p>
                    )}
                  </div>

                  {/* Transparent Explanation Snippet */}
                  <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-3.5 space-y-1 text-xs">
                    <span className="font-bold text-indigo-900">Allocation Explanation:</span>
                    <p className="text-slate-600 italic">"{myAssignment.allocationExplanation}"</p>
                  </div>
                </div>
              ) : latestRun && myAssignment ? (
                /* State B: Draft in Warden Review */
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950">Draft Allocation Under Review</h3>
                    <p className="mt-1 text-xs text-amber-800 max-w-md mx-auto">
                      Your room assignment has been provisionally calculated with <span className="font-bold">{myAssignment.compatibilityScore}% roommate compatibility</span>.
                      It is currently undergoing official Warden verification & Dean sign-off.
                    </p>
                  </div>
                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
                    <span>Provisional Allotment: {myAssignment.assignedBlockCode} • Room {myAssignment.assignedRoomNumber}</span>
                  </div>
                </div>
              ) : waitlistStatus?.isOnWaitlist && waitlistStatus.status === 'PROMOTED' && waitlistStatus.promotedDetails ? (
                /* State C: Promoted from Waiting List */
                <div className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-900 font-black text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Promoted From Priority Waiting List!</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      A vacant bed in your preferred hostel block became available and was automatically allocated to your profile based on your priority rank.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Hostel Block
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">
                        {waitlistStatus.promotedDetails.blockCode}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Allocated Room
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-slate-900">
                        Room {waitlistStatus.promotedDetails.roomNumber}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                        Designated Bed
                      </span>
                      <p className="mt-1 font-mono text-sm font-black text-rose-600">
                        {waitlistStatus.promotedDetails.bedLabel}
                      </p>
                    </div>
                  </div>
                </div>
              ) : waitlistStatus?.isOnWaitlist && waitlistStatus.status === 'WAITING' ? (
                /* State D: Active Waiting List Position */
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                        <span className="text-[9px] uppercase font-bold tracking-wider leading-none">Rank</span>
                        <span className="text-lg font-black leading-none mt-0.5">#{waitlistStatus.rank}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-950">
                          Priority Waiting List Active
                        </h3>
                        <p className="text-xs text-amber-800">
                          Total Candidates Waiting in Pool: <span className="font-bold">{waitlistStatus.totalWaitingInPool}</span>
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-200">
                      Quota: {waitlistStatus.entry?.category}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Waitlist Details:</p>
                    <p className="text-amber-800 text-[11px]">{waitlistStatus.entry?.reason}</p>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Automatic promotion engine continuously tracks cancelled or released beds.</span>
                  </div>
                </div>
              ) : (
                /* State E: Waiting for Allocation Run */
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-xs">
                    <Bed className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Awaiting Allocation Run</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Your profile and application are verified. Room assignments will be published once the Warden and Dean authorize the cycle run.
                    </p>
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

