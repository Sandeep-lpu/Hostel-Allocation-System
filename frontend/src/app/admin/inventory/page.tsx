import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  Layers,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Activity,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth-cookies';
import { fetchFromBackend } from '@/lib/api';
import { logoutAction } from '@/app/actions/auth-actions';
import FloorBedMap from '@/components/inventory/FloorBedMap';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const { admin } = await getAdminSession();

  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch real-time Inventory Overview from backend API
  const overviewRes = await fetchFromBackend<any>('/inventory/overview');
  const overview = overviewRes.ok
    ? overviewRes.data
    : {
        totalHostels: 0,
        totalCapacity: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        maintenanceBeds: 0,
        occupancyPercentage: 0,
        blocks: [],
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
                Hostel Inventory & Visual Bed Map
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>{admin.role}</span>
            </div>

            {/* Sign Out Server Action Form */}
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
        {/* Inventory High-Level KPI Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Hostels</span>
            <div className="text-2xl font-black text-slate-900">{overview.totalHostels} Blocks</div>
            <p className="text-[11px] text-slate-500">Boys (BH-01) & Girls (GH-01)</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Capacity</span>
            <div className="text-2xl font-black text-slate-900">{overview.totalCapacity} Beds</div>
            <p className="text-[11px] text-slate-500">Across all active categories</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available Beds</span>
            <div className="text-2xl font-black text-emerald-700">{overview.availableBeds}</div>
            <p className="text-[11px] text-emerald-600 font-medium">Ready for student assignment</p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Occupied / Cart</span>
            <div className="text-2xl font-black text-rose-700">{overview.occupiedBeds}</div>
            <p className="text-[11px] text-rose-600 font-medium">{overview.occupancyPercentage}% Occupancy rate</p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Maintenance Beds</span>
            <div className="text-2xl font-black text-amber-700">{overview.maintenanceBeds}</div>
            <p className="text-[11px] text-amber-600 font-medium">Out of active allocation rotation</p>
          </div>
        </div>

        {/* Interactive Floor-wise Bed Matrix Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Visual Floor-wise Bed Map
              </h2>
              <p className="text-xs text-slate-500">
                Select a hostel block and floor level to inspect individual room capacity and toggle bed maintenance.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Available</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Occupied/Locked</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Maintenance</span>
              </span>
            </div>
          </div>

          {/* Interactive Client Component */}
          <FloorBedMap
            initialBlockCode="BH-01"
            initialFloor={1}
            blocks={overview.blocks}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        HostelSphere Administration Cockpit • Visual Bed Map & Infrastructure Engine
      </footer>
    </div>
  );
}
