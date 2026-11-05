'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  X,
  Bed,
  Building2,
  Search,
  Filter,
  History,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  promoteCandidateAction,
  autoPromoteAllVacanciesAction,
  getWaitingListAction,
  getAvailableVacanciesAction,
} from '@/app/actions/waiting-list-actions';

interface WaitingListEntry {
  rank: number;
  studentRollNumber: string;
  studentName: string;
  gender: string;
  cgpa: number;
  category: string;
  preferredBlockCode?: string;
  status: string;
  reason: string;
  promotedAt?: string;
  promotedToBlockCode?: string;
  promotedToRoomNumber?: string;
  promotedToBedLabel?: string;
  addedAt?: string;
}

interface VacancyBed {
  bedId: string;
  blockCode: string;
  hostelName: string;
  gender: string;
  floor: number;
  roomNumber: string;
  bedLabel: string;
  roomType: string;
  isAccessible: boolean;
  status: string;
}

interface MovementLog {
  studentRollNumber: string;
  studentName: string;
  previousRank: number;
  promotedToBlockCode: string;
  promotedToRoomNumber: string;
  promotedToBedLabel: string;
  actionType: string;
  authorizedBy: string;
  timestamp: string;
}

interface WaitingListManagerProps {
  initialData: {
    runId: string;
    status: string;
    stats: {
      totalWaiting: number;
      totalPromoted: number;
      malesWaiting: number;
      femalesWaiting: number;
    };
    waitingList: WaitingListEntry[];
    promotedList: WaitingListEntry[];
    movementLog: MovementLog[];
  };
  initialVacancies: {
    totalVacancies: number;
    maleVacancies: number;
    femaleVacancies: number;
    vacancies: VacancyBed[];
  };
  adminEmail: string;
}

export default function WaitingListManager({
  initialData,
  initialVacancies,
  adminEmail,
}: WaitingListManagerProps) {
  const [data, setData] = useState(initialData);
  const [vacancies, setVacancies] = useState(initialVacancies);
  const [activeTab, setActiveTab] = useState<'waitlist' | 'vacancies' | 'history'>('waitlist');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Promotion Modal State
  const [promoteCandidate, setPromoteCandidate] = useState<WaitingListEntry | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPromoteCandidate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered waitlist
  const filteredWaitlist = (data.waitingList || []).filter((entry) => {
    if (genderFilter !== 'ALL' && entry.gender !== genderFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoll = entry.studentRollNumber.toLowerCase().includes(q);
      const matchName = entry.studentName.toLowerCase().includes(q);
      if (!matchRoll && !matchName) return false;
    }
    return true;
  });

  // Filtered vacancies for modal
  const eligibleBedsForCandidate = vacancies.vacancies.filter((b) => {
    if (!promoteCandidate) return true;
    return b.gender === promoteCandidate.gender;
  });

  // Action: Promote Candidate
  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteCandidate) return;

    setIsSubmitting(true);
    setFeedback(null);

    let targetBlockCode: string | undefined;
    let targetRoomNumber: string | undefined;
    let targetBedLabel: string | undefined;

    if (selectedBed) {
      const parts = selectedBed.split('|');
      targetBlockCode = parts[0];
      targetRoomNumber = parts[1];
      targetBedLabel = parts[2];
    }

    try {
      const res = await promoteCandidateAction({
        studentRollNumber: promoteCandidate.studentRollNumber,
        targetBlockCode,
        targetRoomNumber,
        targetBedLabel,
        authorizedBy: adminEmail,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: `🎉 Promoted ${promoteCandidate.studentName} to ${res.data.assignedBed.blockCode}-${res.data.assignedBed.roomNumber}-${res.data.assignedBed.bedLabel}!`,
        });
        setPromoteCandidate(null);
        setSelectedBed('');

        // Refresh data
        const [wRes, vRes] = await Promise.all([
          getWaitingListAction(data.runId),
          getAvailableVacanciesAction(),
        ]);
        if (wRes.success) setData(wRes.data);
        if (vRes.success) setVacancies(vRes.data);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to promote candidate' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Auto-Promote All Vacancies
  const handleAutoPromoteAll = async () => {
    if (
      !confirm(
        'Are you sure you want to run Batch Auto-Promotion? This will sequentially match top waiting list candidates with available vacant beds.',
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await autoPromoteAllVacanciesAction();
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `⚡ Batch promotion completed! ${res.data.totalPromoted} candidate(s) successfully assigned to vacant beds.`,
        });
        // Refresh data
        const [wRes, vRes] = await Promise.all([
          getWaitingListAction(data.runId),
          getAvailableVacanciesAction(),
        ]);
        if (wRes.success) setData(wRes.data);
        if (vRes.success) setVacancies(vRes.data);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to auto-promote candidates' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 5 Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Active Waitlist
          </span>
          <p className="text-2xl font-black text-amber-600 font-mono">
            {data.stats.totalWaiting}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Ranked candidates</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Boys Waiting
          </span>
          <p className="text-2xl font-black text-indigo-600 font-mono">
            {data.stats.malesWaiting}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Tagore Hall (BH-01)</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Girls Waiting
          </span>
          <p className="text-2xl font-black text-rose-600 font-mono">
            {data.stats.femalesWaiting}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Kasturba Hall (GH-01)</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Live Vacancies
          </span>
          <p className="text-2xl font-black text-emerald-600 font-mono">
            {vacancies.totalVacancies}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Available beds</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Total Promoted
          </span>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {data.stats.totalPromoted}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Assigned & confirmed</span>
        </div>
      </div>

      {/* Control Banner & Quick Action */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900">
            Priority Ranking & Automatic Promotion Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Candidates are dynamically prioritized by CGPA, category quotas, and home distance. As bed vacancies arise, promotions occur instantly.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoPromoteAll}
            disabled={isSubmitting || data.stats.totalWaiting === 0 || vacancies.totalVacancies === 0}
            className="inline-flex items-center space-x-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>⚡ Auto-Promote All Vacancies</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'waitlist'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Prioritized Waitlist ({filteredWaitlist.length})
          </button>

          <button
            onClick={() => setActiveTab('vacancies')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'vacancies'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Available Bed Vacancies ({vacancies.totalVacancies})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Movement Audit Log ({data.movementLog?.length || 0})
          </button>
        </div>

        {/* Filter Controls */}
        {activeTab === 'waitlist' && (
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidate or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
              />
            </div>

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Boys Only</option>
              <option value="FEMALE">Girls Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Prioritized Waitlist */}
      {activeTab === 'waitlist' && (
        <div className="space-y-3">
          {filteredWaitlist.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Candidates On Active Waitlist</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All eligible applicants have been assigned rooms or no applications match the active search filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWaitlist.map((candidate) => (
                <div
                  key={candidate.studentRollNumber}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Priority Rank Badge */}
                      <div className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 font-mono shadow-2xs shrink-0">
                        <span className="text-[9px] uppercase font-bold tracking-wider leading-none">Rank</span>
                        <span className="text-base font-black leading-none mt-0.5">#{candidate.rank}</span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-black text-slate-900">
                            {candidate.studentName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({candidate.studentRollNumber})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                              candidate.gender === 'FEMALE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {candidate.gender}
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                            CGPA: {candidate.cgpa.toFixed(2)}
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                            Quota: {candidate.category}
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                            Pref: {candidate.preferredBlockCode || 'BH-01'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Promote Button */}
                    <button
                      onClick={() => setPromoteCandidate(candidate)}
                      className="inline-flex items-center space-x-1 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Promote to Bed</span>
                    </button>
                  </div>

                  {/* Reason box */}
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-700">Waitlist Justification: </span>
                    {candidate.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Available Vacancies Explorer */}
      {activeTab === 'vacancies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {vacancies.vacancies.slice(0, 36).map((bed) => (
              <div
                key={bed.bedId}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-slate-900">
                    {bed.blockCode}-{bed.roomNumber}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      bed.gender === 'FEMALE'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {bed.gender}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-600 font-mono">{bed.bedLabel}</span>
                  <span className="text-slate-500 font-mono">Floor {bed.floor}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                  <span className="font-bold text-emerald-600 flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>AVAILABLE</span>
                  </span>
                  <span className="text-slate-400 font-mono">{bed.roomType.split('_')[0]}</span>
                </div>
              </div>
            ))}
          </div>
          {vacancies.totalVacancies > 36 && (
            <p className="text-center text-xs text-slate-400 pt-2 font-mono">
              Showing top 36 of {vacancies.totalVacancies} available vacant beds.
            </p>
          )}
        </div>
      )}

      {/* Tab 3: Movement & Promotion Audit Log */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">
                Waiting List Movement & Promotion History
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Governance Audit Log
            </span>
          </div>

          {(!data.movementLog || data.movementLog.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No waitlist candidate promotions have occurred in this cycle yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.movementLog.map((log, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{log.studentName}</span>
                      <span className="font-mono text-slate-500">({log.studentRollNumber})</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold border border-emerald-200">
                        {log.actionType}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800 border border-amber-200">
                      Previous Rank #{log.previousRank}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 border border-emerald-200">
                      Allocated: {log.promotedToBlockCode}-{log.promotedToRoomNumber}-{log.promotedToBedLabel}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Authorized By: <span className="font-semibold text-slate-700">{log.authorizedBy}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PROMOTE CANDIDATE MODAL (With Circular (X) Standard)     */}
      {/* ======================================================== */}
      {promoteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Promote Waitlisted Candidate
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Allocate newly vacant bed to Rank #{promoteCandidate.rank}
                  </p>
                </div>
              </div>

              {/* Circular (X) Close Button */}
              <button
                type="button"
                onClick={() => setPromoteCandidate(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Candidate Details */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">{promoteCandidate.studentName}</span>
                <span className="font-mono text-slate-500">({promoteCandidate.studentRollNumber})</span>
              </div>
              <p className="text-slate-500">
                Gender: <span className="font-bold text-slate-800">{promoteCandidate.gender}</span> • CGPA: <span className="font-bold text-indigo-700">{promoteCandidate.cgpa.toFixed(2)}</span> • Quota: {promoteCandidate.category}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handlePromote} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select Vacant Bed (Auto-Matches Gender: {promoteCandidate.gender})
                </label>
                <select
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">⚡ Auto-Assign Next Available Vacancy</option>
                  {eligibleBedsForCandidate.slice(0, 50).map((bed) => (
                    <option
                      key={bed.bedId}
                      value={`${bed.blockCode}|${bed.roomNumber}|${bed.bedLabel}`}
                    >
                      {bed.blockCode} • Room {bed.roomNumber} ({bed.bedLabel}) - Floor {bed.floor}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave on "Auto-Assign" to let the engine pick the optimal available bed automatically.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoteCandidate(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel & Return
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
