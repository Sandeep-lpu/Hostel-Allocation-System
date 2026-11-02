import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Bed,
  Layers,
  LogOut,
  Info,
  DollarSign,
  Flame,
} from 'lucide-react';
import { getStudentSession } from '@/lib/auth-cookies';
import { fetchFromBackend } from '@/lib/api';
import { logoutAction } from '@/app/actions/auth-actions';

export const dynamic = 'force-dynamic';

export default async function StudentHostelsPage() {
  const { student } = await getStudentSession();

  if (!student) {
    redirect('/student/login');
  }

  // Fetch Public Catalog from backend
  const catalogRes = await fetchFromBackend<any>(`/inventory/public-catalog?gender=${student.gender}`);
  const catalog = catalogRes.ok ? catalogRes.data : null;

  // Fetch Overview to show blocks
  const overviewRes = await fetchFromBackend<any>('/inventory/overview');
  const overview = overviewRes.ok ? overviewRes.data : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
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

            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                Residential Catalog & Inventory
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                Academic Session 2026-27
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <GraduationCap className="h-3.5 w-3.5 text-rose-600" />
              <span>Roll: {student.rollNumber}</span>
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

      {/* Main Container */}
      <main className="mx-auto max-w-6xl w-full px-4 py-8 sm:px-6 space-y-8 flex-1">
        {/* Hero Notice */}
        <div className="rounded-3xl border border-rose-100 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <Sparkles className="h-3.5 w-3.5 text-rose-600" />
              <span>Gender Allocation Filter: {student.gender} Residences</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Available Hostel Blocks & Room Types
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Explore university residential accommodations, verify room amenities, air conditioning options, and annual fee schedules before submitting your allocation preference.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-center min-w-[120px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hostels</span>
              <div className="text-xl font-black text-slate-900">{overview?.totalHostels || 2}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 text-center min-w-[120px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available Beds</span>
              <div className="text-xl font-black text-emerald-700">{overview?.availableBeds || 567}</div>
            </div>
          </div>
        </div>

        {/* Hostel Blocks Overview */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900">University Residential Halls</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview?.blocks?.map((block: any) => {
              const isEligible = block.gender === student.gender;
              return (
                <div
                  key={block.blockCode}
                  className={`rounded-3xl border p-6 transition-all ${
                    isEligible
                      ? 'border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-500/10'
                      : 'border-slate-200/80 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-mono text-base font-black border border-indigo-100">
                        {block.blockCode}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{block.blockName}</h3>
                        <p className="text-xs text-slate-500">{block.defaultMessName}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isEligible
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {block.gender} Residence
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-5 text-center text-xs">
                    <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Beds</span>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">{block.totalBeds}</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/70 p-2.5 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">Available</span>
                      <div className="font-mono font-bold text-emerald-700 mt-0.5">{block.availableBeds}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Occupancy</span>
                      <div className="font-mono font-bold text-slate-900 mt.0.5">{block.occupancyPercentage}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Room Categories & Pricing Schedule */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Bed className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-black text-slate-900">Room Categories & Fee Structure</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog?.categories?.map((cat: any) => {
              const isLow = cat.availableCount <= 20;
              return (
                <div
                  key={cat.categoryCode}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                        {cat.seaterCount}-Seater
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isLow
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {cat.availableCount} Seats Available
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{cat.roomType}</h3>

                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-slate-900">
                        ₹{cat.annualFee.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">/ academic year</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Washroom:</span>
                      <span className="font-semibold text-slate-900">{cat.washroomType}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Pantry Facility:</span>
                      <span className="font-semibold text-slate-900">{cat.hasPantry ? 'Included' : 'Not Included'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Category Code:</span>
                      <span className="font-mono text-[11px] font-semibold text-indigo-600">{cat.categoryCode}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        HostelSphere Student Portal • University Residential Accommodation Protocol
      </footer>
    </div>
  );
}
