'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Building2,
  Users,
  CheckCircle2,
  PieChart,
  Megaphone,
  Send,
  Sparkles,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  TrendingUp,
  Percent,
  Bed,
  Check,
} from 'lucide-react';
import { broadcastAnnouncementAction } from '@/app/actions/reports-actions';

interface ReportsSummary {
  runId: string;
  runStatus: string;
  inventory: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    maintenanceBeds: number;
    overallOccupancyRate: number;
    blocks: {
      'BH-01': { name: string; total: number; occupied: number; available: number; rate: number };
      'GH-01': { name: string; total: number; occupied: number; available: number; rate: number };
    };
  };
  applications: {
    total: number;
    allocated: number;
    verified: number;
    pending: number;
    categoryBreakdown: Record<string, number>;
  };
  allocationAnalytics: {
    totalAssigned: number;
    averageCompatibilityScore: number;
    satisfactionRate: number;
    preferences: {
      p1Count: number;
      p2Count: number;
      p3Count: number;
      satisfactionRate: number;
    };
    compatibilityBands: {
      tier90Plus: number;
      tier80to89: number;
      tier70to79: number;
      below70: number;
    };
    overridesCount: number;
    waitlistCount: number;
  };
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  category: string;
  targetAudience: string;
  publishedBy: string;
  createdAt: string;
}

interface AdminReportsCockpitProps {
  summary: ReportsSummary;
  announcements: Announcement[];
  adminEmail: string;
}

export default function AdminReportsCockpit({
  summary,
  announcements: initialAnnouncements,
  adminEmail,
}: AdminReportsCockpitProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    content: '',
    category: 'ALLOCATION',
    targetAudience: 'ALL',
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.content) return;

    setIsBroadcasting(true);
    setFeedback(null);
    try {
      const res = await broadcastAnnouncementAction({
        ...broadcastForm,
        publishedBy: adminEmail,
      });

      if (res.success) {
        setAnnouncements([res.data, ...announcements]);
        setBroadcastForm({ title: '', content: '', category: 'ALLOCATION', targetAudience: 'ALL' });
        setFeedback('Official campus announcement broadcasted successfully!');
      } else {
        alert(res.error || 'Failed to broadcast');
      }
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="flex items-center justify-between p-4 rounded-2xl border bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Occupancy */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall Occupancy</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {summary.inventory.overallOccupancyRate}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({summary.inventory.occupiedBeds} / {summary.inventory.totalBeds} beds)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${summary.inventory.overallOccupancyRate}%` }}
            />
          </div>
        </div>

        {/* 1st Preference Satisfaction */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pref Satisfaction</span>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600 font-mono">
              {summary.allocationAnalytics.satisfactionRate}%
            </span>
            <span className="text-xs text-slate-500 font-mono">1st Choice Hit</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {summary.allocationAnalytics.preferences.p1Count} students received #1 ranked preference
          </p>
        </div>

        {/* Avg Roommate Compatibility */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Roommate Match</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600 font-mono">
              {summary.allocationAnalytics.averageCompatibilityScore}%
            </span>
            <span className="text-xs text-slate-500 font-mono">Average</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Evaluated across 7 lifestyle & study vectors
          </p>
        </div>

        {/* Waitlist & Overrides */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Waitlist & Overrides</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-purple-600 font-mono">
              {summary.allocationAnalytics.waitlistCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">Waiting</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {summary.allocationAnalytics.overridesCount} Warden Overrides Logged
          </p>
        </div>
      </div>

      {/* 2-Column: Hostel Block Breakdown & Compatibility Bands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hostel-wise Occupancy */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">Hostel-wise Bed Capacity</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Live Inventory</span>
          </div>

          <div className="space-y-4">
            {/* BH-01 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">
                  {summary.inventory.blocks['BH-01'].name}
                </span>
                <span className="font-mono text-indigo-700 font-bold">
                  {summary.inventory.blocks['BH-01'].occupied} / {summary.inventory.blocks['BH-01'].total} Beds ({summary.inventory.blocks['BH-01'].rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Math.max(summary.inventory.blocks['BH-01'].rate, 2)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Available: {summary.inventory.blocks['BH-01'].available} beds</span>
                <span>Type: Boys Residence</span>
              </div>
            </div>

            {/* GH-01 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">
                  {summary.inventory.blocks['GH-01'].name}
                </span>
                <span className="font-mono text-rose-700 font-bold">
                  {summary.inventory.blocks['GH-01'].occupied} / {summary.inventory.blocks['GH-01'].total} Beds ({summary.inventory.blocks['GH-01'].rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-rose-600 h-2 rounded-full"
                  style={{ width: `${Math.max(summary.inventory.blocks['GH-01'].rate, 2)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Available: {summary.inventory.blocks['GH-01'].available} beds</span>
                <span>Type: Girls Residence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category & Quota Distribution */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">Category & Quota Representation</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {summary.applications.total}</span>
          </div>

          <div className="space-y-3">
            {Object.entries(summary.applications.categoryBreakdown).map(([category, count]) => {
              const pct = summary.applications.total > 0
                ? Math.round((count / summary.applications.total) * 100)
                : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{category} Quota</span>
                    <span className="font-mono text-slate-900">{count} Applicants ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-800 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* One-Click Export Center */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Download className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">
              Official Institutional Export Center
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            ISO / Audit Compliant CSV Exports
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export Allocations */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Allocations Master Report</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Full list of allocated students, designated rooms, beds, roommate compatibility scores, and transparent justifications.
              </p>
            </div>
            <a
              href="http://127.0.0.1:3000/api/v1/reports/export/allocations.csv"
              download
              className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-all mt-2"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Download Allocations CSV</span>
            </a>
          </div>

          {/* Export Bed Inventory */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                <span>Bed Inventory Matrix</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Full floor-by-floor matrix of all 572 beds with live availability statuses, category codes, and occupant roll numbers.
              </p>
            </div>
            <a
              href="http://127.0.0.1:3000/api/v1/reports/export/inventory.csv"
              download
              className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-all mt-2"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Download Inventory CSV</span>
            </a>
          </div>

          {/* Export Waiting List */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                <span>Waiting List Priority Report</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ranked waiting list candidates by CGPA, category quotas, home address distance, and promotion tracking.
              </p>
            </div>
            <a
              href="http://127.0.0.1:3000/api/v1/reports/export/waiting-list.csv"
              download
              className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-all mt-2"
            >
              <Download className="h-3.5 w-3.5 text-amber-600" />
              <span>Download Waitlist CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Announcements & Communication Broadcast Center */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Megaphone className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">
              Campus Notifications & Broadcast Hub
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Real-Time Push to Student Portals
          </span>
        </div>

        {/* Create Broadcast Form */}
        <form onSubmit={handleBroadcast} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-800">Publish New Official Announcement</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Announcement Title (e.g. Official Allocation Results Published for Fall 2026)"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <select
                value={broadcastForm.category}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALLOCATION">Allotment Announcement</option>
                <option value="DEADLINE">Deadline Notice</option>
                <option value="URGENT">Urgent Circular</option>
                <option value="GENERAL">General Information</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              required
              rows={2}
              placeholder="Full announcement message content. Visible on Student Portal dashboard and allotment slips..."
              value={broadcastForm.content}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isBroadcasting}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast to Campus'}</span>
            </button>
          </div>
        </form>

        {/* Existing Announcements Feed */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Broadcast History ({announcements.length})
          </h4>

          {announcements.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No campus announcements broadcast yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((item) => (
                <div
                  key={item._id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs space-y-1 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[9px] font-bold border border-indigo-200">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.content}</p>
                  <p className="text-[10px] text-slate-400 font-mono">By: {item.publishedBy}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

