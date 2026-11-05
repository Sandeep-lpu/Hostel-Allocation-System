'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  RotateCcw,
  Dice5,
  X,
  Eye,
  Building2,
  Users2,
  Bed,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Shuffle,
  FileCheck2,
} from 'lucide-react';
import { runAllocationEngineAction } from '@/app/actions/allocation-actions';

interface StudentAssignment {
  studentRollNumber: string;
  studentName: string;
  gender: 'MALE' | 'FEMALE';
  category: string;
  isSpeciallyAbled: boolean;
  cgpa: number;
  preferenceSatisfied: number;
  assignedBlockCode: string;
  assignedFloor: number;
  assignedRoomNumber: string;
  assignedBedLabel: string;
  assignedBedId: string;
  roommates: Array<{ rollNumber: string; name: string }>;
  compatibilityScore: number;
  allocationExplanation: string;
}

interface WaitingListEntry {
  rank: number;
  studentRollNumber: string;
  studentName: string;
  cgpa: number;
  category: string;
  reason: string;
}

interface AllocationRunItem {
  _id: string;
  runId: string;
  cycleCode: string;
  academicSession: string;
  randomSeed: number;
  status: string;
  stats: {
    totalEligibleStudents: number;
    totalBedsAssigned: number;
    preference1Satisfied: number;
    preference2Satisfied: number;
    preference3Satisfied: number;
    preferenceSatisfactionRate: number;
    averageCompatibilityScore: number;
    waitingListCount: number;
  };
  assignments: StudentAssignment[];
  waitingList: WaitingListEntry[];
  auditTrail: Array<{ action: string; by: string; at: string; reason: string }>;
  createdAt: string;
}

interface AdminAllocationCockpitProps {
  initialRun: AllocationRunItem | null;
  activeCycle: any;
  adminName: string;
}

export default function AdminAllocationCockpit({
  initialRun,
  activeCycle,
  adminName,
}: AdminAllocationCockpitProps) {
  const [currentRun, setCurrentRun] = useState<AllocationRunItem | null>(initialRun);
  const [randomSeed, setRandomSeed] = useState<number>(initialRun?.randomSeed || 42);
  const [activeTab, setActiveTab] = useState<'ASSIGNMENTS' | 'WAITING_LIST' | 'AUDIT'>('ASSIGNMENTS');

  // Selected Assignment for Explanation Modal
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Escape key listener for explanation modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAssignment(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Run Allocation Engine Trigger
  const handleRunEngine = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await runAllocationEngineAction(
        activeCycle?.cycleCode || 'CYCLE-2026-FALL',
        Number(randomSeed),
        adminName,
      );

      if (res.success && res.data) {
        setCurrentRun(res.data);
        setFeedback({
          type: 'success',
          message: `Allocation Draft ${res.data.runId} successfully generated! Assigned ${res.data.stats.totalBedsAssigned} students with Seed: ${randomSeed}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to execute allocation run.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Allocation Engine Control Bar */}
      <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm font-mono font-black">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-900">Deterministic Allocation Engine</h1>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  Phase 3 Milestone
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cycle: <span className="font-mono font-bold text-slate-700">{activeCycle?.cycleCode}</span> • Seed Reproducibility & Roommate Clustering Enabled
              </p>
            </div>
          </div>

          {/* Seed Control & Run Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs">
              <Dice5 className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-slate-600">Seed:</span>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value, 10) || 0)}
                className="w-16 rounded-xl border border-slate-300 px-2 py-0.5 text-center font-mono font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setRandomSeed(Math.floor(1000 + Math.random() * 9000))}
                className="rounded-lg p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Generate new random seed"
              >
                <Shuffle className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRandomSeed(42)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 transition-colors text-[10px] font-bold"
                title="Reset to benchmark seed 42"
              >
                Reset 42
              </button>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleRunEngine}
              className="inline-flex items-center space-x-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black shadow-md transition-colors disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Generating Allocation...' : 'Start Allocation Run'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Engine Governance Notice */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <Info className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Deterministic Reproducibility:</strong> Running the engine with Seed <code>{randomSeed}</code> against identical verified applications will produce the exact same room assignments and explanations every time.
          </span>
        </div>
      </div>

      {/* 2. Run Statistics & Metrics */}
      {currentRun && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Run Identifier</span>
            <div className="font-mono text-base font-black text-slate-900">{currentRun.runId}</div>
            <span className="text-[10px] text-slate-400">Seed: {currentRun.randomSeed}</span>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Draft Status</span>
            <div className="text-xs font-black text-indigo-800 uppercase tracking-wider mt-1">
              {currentRun.status}
            </div>
            <span className="text-[10px] text-indigo-600 font-medium">Pending Warden Approval</span>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Beds Assigned</span>
            <div className="text-xl font-black text-emerald-700">
              {currentRun.stats.totalBedsAssigned} / {currentRun.stats.totalEligibleStudents}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">100% of Verified Apps</span>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">1st Choice Satisfied</span>
            <div className="text-xl font-black text-purple-700">
              {currentRun.stats.preferenceSatisfactionRate}%
            </div>
            <span className="text-[10px] text-purple-600 font-medium">
              {currentRun.stats.preference1Satisfied} Students matched 1st
            </span>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Avg Roommate Fit</span>
            <div className="text-xl font-black text-rose-700">
              {currentRun.stats.averageCompatibilityScore}%
            </div>
            <span className="text-[10px] text-rose-600 font-medium">Lifestyle clustered</span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waiting List</span>
            <div className="text-xl font-black text-slate-900">{currentRun.stats.waitingListCount}</div>
            <span className="text-[10px] text-slate-400">Capacity overflow</span>
          </div>
        </div>
      )}

      {/* 3. Tab Navigation (Assignments vs Waiting List vs Audit) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'ASSIGNMENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Draft Room Assignments ({currentRun?.assignments?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WAITING_LIST')}
          className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'WAITING_LIST'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Waiting List ({currentRun?.waitingList?.length || 0})
        </button>
      </div>

      {/* 4. ASSIGNMENTS TABLE */}
      {activeTab === 'ASSIGNMENTS' && currentRun && (
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Student Roll & Name</th>
                  <th className="py-3.5 px-4">Merit (CGPA)</th>
                  <th className="py-3.5 px-4">Assigned Room & Bed</th>
                  <th className="py-3.5 px-4">Preference Satisfied</th>
                  <th className="py-3.5 px-4">Roommate Match</th>
                  <th className="py-3.5 px-4">Transparent Explanation</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentRun.assignments.map((asg) => (
                  <tr key={asg.studentRollNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{asg.studentName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {asg.studentRollNumber} • {asg.gender}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{asg.cgpa} CGPA</div>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {asg.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {asg.assignedBlockCode} — {asg.assignedRoomNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Floor {asg.assignedFloor} • <span className="font-bold text-indigo-600">{asg.assignedBedLabel}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          asg.preferenceSatisfied === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : asg.preferenceSatisfied === 2
                            ? 'bg-indigo-100 text-indigo-800'
                            : asg.preferenceSatisfied === 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {asg.preferenceSatisfied > 0 ? `1st Choice (#${asg.preferenceSatisfied})` : 'System Fallback'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1 font-bold text-emerald-700">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{asg.compatibilityScore}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Lifestyle match</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {asg.allocationExplanation}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(asg)}
                        className="inline-flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 shadow-2xs transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Explanation</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. WAITING LIST VIEW */}
      {activeTab === 'WAITING_LIST' && currentRun && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Waiting List & Capacity Overflow</h3>
          {currentRun.waitingList.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 p-6 text-center text-emerald-800 space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold">100% Allocation Success!</p>
              <p className="text-[11px] text-emerald-700">
                All eligible applicants were accommodated into available residential beds without any waiting list overflow.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentRun.waitingList.map((w) => (
                <div
                  key={w.studentRollNumber}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 font-mono font-bold text-slate-700">
                      #{w.rank}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{w.studentName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {w.studentRollNumber} • CGPA: {w.cgpa} ({w.category})
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 italic">{w.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TRANSPARENT ALLOCATION EXPLANATION MODAL (WITH WORKING (X) CLOSE BUTTON & CANCEL) */}
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with WORKING (X) CLOSE BUTTON */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono font-black text-base shadow-2xs">
                  <Bed className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedAssignment.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Roll No: <span className="font-mono font-bold text-slate-700">{selectedAssignment.studentRollNumber}</span> • {selectedAssignment.gender}
                  </p>
                </div>
              </div>

              {/* Prominent Circular (X) Close Button (Identical to User Screenshot) */}
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                aria-label="Close explanation modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Assignment Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Room</span>
                <div className="mt-1 font-bold text-slate-900 text-sm">
                  {selectedAssignment.assignedBlockCode} — {selectedAssignment.assignedRoomNumber}
                </div>
                <span className="text-[10px] text-slate-500">Floor {selectedAssignment.assignedFloor} • {selectedAssignment.assignedBedLabel}</span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Merit</span>
                <div className="mt-1 font-mono font-bold text-slate-900 text-sm">
                  {selectedAssignment.cgpa} CGPA
                </div>
                <span className="text-[10px] text-slate-500">{selectedAssignment.category} Quota</span>
              </div>
            </div>

            {/* Transparent Algorithm Explanation Card */}
            <div className="rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Deterministic Engine Explanation</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {selectedAssignment.allocationExplanation}
              </p>
            </div>

            {/* Roommate Pairing & Compatibility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Roommate Compatibility Match</span>
                <span className="text-emerald-700 font-mono">{selectedAssignment.compatibilityScore}% Compatible</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedAssignment.compatibilityScore}%` }}
                />
              </div>
            </div>

            {/* Modal Footer with Working Close / Return Button */}
            <div className="flex items-center justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>Close & Return</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
