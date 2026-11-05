import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertCircle, LogOut } from 'lucide-react';
import { getStudentSession } from '@/lib/auth-cookies';
import { fetchFromBackend } from '@/lib/api';
import { logoutAction } from '@/app/actions/auth-actions';
import StudentAllotmentSlip from '@/components/allocation/StudentAllotmentSlip';

export const dynamic = 'force-dynamic';

export default async function StudentAllotmentSlipPage() {
  const { student, token } = await getStudentSession();

  if (!student) {
    redirect('/student/login');
  }

  // 1. Fetch live profile
  const liveProfileRes = await fetchFromBackend<any>(`/students/${student.rollNumber}`, {
    headers: { Authorization: `Bearer ${token}`, 'x-student-id': student.rollNumber },
  });
  const liveProfile = liveProfileRes.ok ? liveProfileRes.data : student;

  // 2. Fetch latest allocation run
  const runRes = await fetchFromBackend<any>('/allocation/latest');
  const latestRun = runRes.ok ? runRes.data : null;

  const myAssignment = latestRun?.assignments?.find(
    (a: any) => a.studentRollNumber?.toUpperCase() === student.rollNumber?.toUpperCase(),
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Navbar (hidden on print) */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <span className="text-sm font-black tracking-tight text-slate-900">
              Hostel Allotment Pass
            </span>
          </div>

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
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 space-y-6 flex-1 print:p-0 print:m-0 print:max-w-none">
        {myAssignment ? (
          <StudentAllotmentSlip
            student={{
              name: liveProfile.name,
              rollNumber: liveProfile.rollNumber,
              gender: liveProfile.gender,
              email: liveProfile.email,
              mobile: liveProfile.mobile,
              programme: liveProfile.course || 'B.Tech Computer Science & Engineering',
              category: liveProfile.category || 'GENERAL',
            }}
            assignment={myAssignment}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Confirmed Allotment Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your room allotment pass will be generated once official publication is authorized by the Chief Warden.
            </p>
            <Link
              href="/student/dashboard"
              className="inline-flex items-center space-x-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              <span>Return to Student Dashboard</span>
            </Link>
          </div>
        )}
      </main>

      {/* Footer (hidden on print) */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-400 print:hidden font-mono">
        University of Delhi • Electronic Residential Allotment Verification Pass
      </footer>
    </div>
  );
}

