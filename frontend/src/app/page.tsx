import React from 'react';
import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  Server,
  Database,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { fetchFromBackend } from '@/lib/api';
import { getStudentSession, getAdminSession } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // SSR Database & Backend Health Probe
  const healthRes = await fetchFromBackend<any>('/auth/test-connection');
  const isHealthy = healthRes.ok && healthRes.data?.status === 'UP';
  const healthData = healthRes.data;

  // SSR Session Check
  const { student } = await getStudentSession();
  const { admin } = await getAdminSession();

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 text-white shadow-md shadow-pink-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Hostel<span className="text-rose-500">Sphere</span>
              </span>
              <span className="ml-2 hidden sm:inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                SSR & Server Actions Architecture
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isHealthy ? 'Backend & DB Live' : 'Backend Disconnected'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 flex-1 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <span>Next.js 14 • SSR • Server Actions • Fastify • MongoDB 7</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Next-Gen University <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">
              Hostel Allocation System
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Select your portal below to test live student authentication against MongoDB,
            administrator role verifications, and real-time backend synchronization.
          </p>
        </div>

        {/* Real-time System Connectivity Test Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center space-x-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white ${
                  isHealthy ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {isHealthy ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Stack Telemetry (SSR Server-Side Probe)
                </h3>
                <p className="text-xs text-slate-500">
                  Queried directly during SSR page rendering from NestJS Fastify Backend & MongoDB
                </p>
              </div>
            </div>

            <div className="font-mono text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
              Port: 3000 API • Port: 3001 SSR
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>MongoDB 7.0 Replica</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">
                  {isHealthy ? 'Connected' : 'Offline'}
                </span>
                <span className="text-xs font-mono text-emerald-600 font-bold">
                  {healthData?.database?.totalStudentsSeeded || 4} Profiles
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Collection: <code className="text-slate-600">student_profiles</code>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
                <Cpu className="h-4 w-4 text-indigo-600" />
                <span>Redis & BullMQ Engine</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">
                  {isHealthy ? 'Online (RAM)' : 'Offline'}
                </span>
                <span className="text-xs font-mono text-indigo-600 font-bold">6379</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Atomic Lua Lockers & Catalog Hash</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
                <Server className="h-4 w-4 text-violet-600" />
                <span>NestJS Fastify Engine</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">
                  {isHealthy ? '200 OK' : 'No Response'}
                </span>
                <span className="text-xs font-mono text-violet-600 font-bold">/api/v1/auth</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">HMAC-SHA256 & JWT Tokens</p>
            </div>
          </div>
        </div>

        {/* Portal Entry Options: Student vs Admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Student Residential Portal */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <GraduationCap className="h-6 w-6" />
                </div>
                {student ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    Active Session: {student.rollNumber}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Student Login Required
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Student Residential Portal
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Authenticate using your official university Roll Number or registered campus email.
                  Validates directly against live MongoDB records and issues your cryptographic admission pass.
                </p>
              </div>

              {/* Demo Credentials Snippet */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs font-mono space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Seeded Student Test Profiles:
                </div>
                <div className="text-slate-700 font-semibold">
                  • <code>2024BCSE-0412</code> (Aarav Sharma)
                </div>
                <div className="text-slate-700 font-semibold">
                  • <code>2024BCSE-0511</code> (Rohan Verma)
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={student ? '/student/dashboard' : '/student/login'}
                className="inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                <span>{student ? 'Enter Student Dashboard' : 'Login to Student Portal'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Hostel Administration & Warden Cockpit */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                {admin ? (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                    Active Admin: {admin.role}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Admin / Warden Auth
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Hostel Administration & Warden Cockpit
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Dedicated portal for Hostel Wardens, Chief Wardens, and University Estate Administrators.
                  Inspect live bed capacity, perform turnstile QR check-ins, and trigger system telemetry.
                </p>
              </div>

              {/* Demo Credentials Snippet */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs font-mono space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pre-configured Admin Credentials:
                </div>
                <div className="text-slate-700 font-semibold truncate">
                  • <code>admin@delhiuniv.ac.in</code> / <code>Admin@Password123</code>
                </div>
                <div className="text-slate-700 font-semibold truncate">
                  • <code>warden.bh1@delhiuniv.ac.in</code> / <code>Warden@Password123</code>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={admin ? '/admin/dashboard' : '/admin/login'}
                className="inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <span>{admin ? 'Enter Admin Dashboard' : 'Login to Admin Cockpit'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-6xl px-4">
          HostelSphere Architecture • High-Concurrency University Residential Allocation System • 2026
        </div>
      </footer>
    </div>
  );
}

