'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  X,
  FileCheck,
  RotateCcw,
  Sparkles,
  Users,
  Compass,
  ArrowLeftRight,
  History,
  Building2,
  Lock,
  Globe,
  HelpCircle,
} from 'lucide-react';
import {
  submitForWardenReviewAction,
  overrideStudentAssignmentAction,
  approveAllocationAction,
  rejectAllocationAction,
  publishAllocationAction,
} from '@/app/actions/allocation-actions';

interface StudentAssignment {
  studentRollNumber: string;
  studentName: string;
  gender: string;
  category: string;
  isSpeciallyAbled: boolean;
  cgpa: number;
  preferenceSatisfied: number;
  assignedBlockCode: string;
  assignedFloor: number;
  assignedRoomNumber: string;
  assignedBedLabel: string;
  roommates: { rollNumber: string; name: string }[];
  compatibilityScore: number;
  allocationExplanation: string;
  isOverridden?: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

interface WardenOverrideEntry {
  studentRollNumber: string;
  studentName: string;
  previousBlockCode: string;
  previousRoomNumber: string;
  previousBedLabel: string;
  newBlockCode: string;
  newRoomNumber: string;
  newBedLabel: string;
  overrideReason: string;
  overriddenBy: string;
  overriddenAt: string;
}

interface AllocationRun {
  runId: string;
  cycleCode: string;
  academicSession: string;
  randomSeed: number;
  status: 'DRAFT_GENERATED' | 'PENDING_WARDEN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED_RETURNED';
  stats: {
    totalEligibleStudents: number;
    totalBedsAssigned: number;
    preferenceSatisfactionRate: number;
    averageCompatibilityScore: number;
    waitingListCount: number;
  };
  assignments: StudentAssignment[];
  overrideHistory: WardenOverrideEntry[];
  approvedBy?: string;
  approvedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  rejectionReason?: string;
  auditTrail: { action: string; by: string; at: string; reason: string }[];
}

interface WardenReviewCockpitProps {
  initialRun: AllocationRun | null;
  adminEmail: string;
}

export default function WardenReviewCockpit({
  initialRun,
  adminEmail,
}: WardenReviewCockpitProps) {
  const [run, setRun] = useState<AllocationRun | null>(initialRun);
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [filterOverridden, setFilterOverridden] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'overrides' | 'audit'>('assignments');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [overrideStudent, setOverrideStudent] = useState<StudentAssignment | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    targetBlockCode: '',
    targetFloor: 1,
    targetRoomNumber: '',
    targetBedLabel: '',
    overrideReason: '',
  });

  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [approvalNotes, setApprovalNotes] = useState<string>('Reviewed room assignments and student roommate compatibility. Verified adherence to University guidelines.');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishNotes, setPublishNotes] = useState<string>('Authorized official publication of hostel room allotments for Fall 2026.');

  // Handle escape key to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverrideStudent(null);
        setIsApproveModalOpen(false);
        setIsRejectModalOpen(false);
        setIsPublishModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!run) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Allocation Run Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please navigate to the Allocation Engine Cockpit to generate a draft allocation run first before Warden Review.
        </p>
      </div>
    );
  }

  // Filter assignments
  const filteredAssignments = run.assignments.filter((a) => {
    if (selectedBlock !== 'ALL' && a.assignedBlockCode !== selectedBlock) return false;
    if (filterOverridden && !a.isOverridden) return false;
    return true;
  });

  // Group by room
  const roomsMap = new Map<string, StudentAssignment[]>();
  filteredAssignments.forEach((a) => {
    const key = `${a.assignedBlockCode} - ${a.assignedRoomNumber} (Fl ${a.assignedFloor})`;
    if (!roomsMap.has(key)) {
      roomsMap.set(key, []);
    }
    roomsMap.get(key)!.push(a);
  });

  // Actions
  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await submitForWardenReviewAction(run.runId);
      if (res.success) {
        setRun(res.data);
        setFeedbackMessage({ type: 'success', text: 'Draft allocation formally submitted for Warden Review!' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to submit for review' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideStudent) return;
    if (!overrideForm.overrideReason || overrideForm.overrideReason.trim().length < 8) {
      alert('Mandatory override reason required (at least 8 characters).');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await overrideStudentAssignmentAction(run.runId, {
        studentRollNumber: overrideStudent.studentRollNumber,
        targetBlockCode: overrideForm.targetBlockCode || overrideStudent.assignedBlockCode,
        targetFloor: Number(overrideForm.targetFloor) || overrideStudent.assignedFloor,
        targetRoomNumber: overrideForm.targetRoomNumber.trim(),
        targetBedLabel: overrideForm.targetBedLabel.trim(),
        overrideReason: overrideForm.overrideReason.trim(),
        wardenEmail: adminEmail,
      });

      if (res.success) {
        setRun(res.data);
        setOverrideStudent(null);
        setFeedbackMessage({
          type: 'success',
          text: `Warden Override saved: ${overrideStudent.studentName} reassigned to ${overrideForm.targetBlockCode}-${overrideForm.targetRoomNumber}-${overrideForm.targetBedLabel}!`,
        });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to apply override' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await approveAllocationAction(run.runId, approvalNotes);
      if (res.success) {
        setRun(res.data);
        setIsApproveModalOpen(false);
        setFeedbackMessage({ type: 'success', text: 'Allocation formally approved! Authorized publication is now unlocked.' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to approve allocation' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 8) {
      alert('Please provide a specific rejection reason for the revision.');
      return;
    }
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await rejectAllocationAction(run.runId, rejectionReason);
      if (res.success) {
        setRun(res.data);
        setIsRejectModalOpen(false);
        setFeedbackMessage({ type: 'success', text: 'Draft returned for revision. Status changed to REJECTED_RETURNED.' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to return draft' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await publishAllocationAction(run.runId, publishNotes);
      if (res.success) {
        setRun(res.data);
        setIsPublishModalOpen(false);
        setFeedbackMessage({
          type: 'success',
          text: '🎉 Official publication authorized! Student Portal results are live and bed inventory marked BOOKED.',
        });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to publish allocation' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open override modal
  const openOverrideModal = (student: StudentAssignment) => {
    setOverrideStudent(student);
    setOverrideForm({
      targetBlockCode: student.assignedBlockCode,
      targetFloor: student.assignedFloor,
      targetRoomNumber: student.assignedRoomNumber,
      targetBedLabel: student.assignedBedLabel,
      overrideReason: student.overrideReason || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4-Stage Governance Pipeline Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                Governance Workflow
              </span>
              <span className="font-mono text-xs font-bold text-slate-500">
                Run ID: {run.runId}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">
              Warden Verification & Multi-Tier Approval Pipeline
            </h2>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black border ${
                run.status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : run.status === 'APPROVED'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : run.status === 'PENDING_WARDEN_REVIEW'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : run.status === 'REJECTED_RETURNED'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              ● Status: {run.status}
            </span>
          </div>
        </div>

        {/* Rejection Notice if applicable */}
        {run.status === 'REJECTED_RETURNED' && run.rejectionReason && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start space-x-3">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Warden Returned Draft for Correction</p>
              <p className="mt-0.5 text-rose-800">{run.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* 4 Pipeline Stages */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {/* Stage 1: Draft Generated */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              run.status === 'DRAFT_GENERATED' || run.status === 'PENDING_WARDEN_REVIEW' || run.status === 'APPROVED' || run.status === 'PUBLISHED'
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>1. Draft Generated</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Seed: {run.randomSeed}</p>
          </div>

          {/* Stage 2: Pending Warden Review */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              run.status === 'PENDING_WARDEN_REVIEW'
                ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/30'
                : run.status === 'APPROVED' || run.status === 'PUBLISHED'
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>2. Warden Review</span>
              {run.status === 'APPROVED' || run.status === 'PUBLISHED' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {run.overrideHistory?.length || 0} Overrides Logged
            </p>
          </div>

          {/* Stage 3: Approved Allocation */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              run.status === 'APPROVED'
                ? 'bg-indigo-100 border-indigo-300 text-indigo-950 ring-2 ring-indigo-400/30'
                : run.status === 'PUBLISHED'
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>3. Warden Approved</span>
              {run.status === 'APPROVED' || run.status === 'PUBLISHED' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {run.approvedBy ? run.approvedBy.split('@')[0] : 'Pending Signoff'}
            </p>
          </div>

          {/* Stage 4: Authorized Publication */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              run.status === 'PUBLISHED'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/30'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>4. Published</span>
              {run.status === 'PUBLISHED' ? (
                <Globe className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {run.publishedBy ? 'Live on Student Portal' : 'Gated by Approval'}
            </p>
          </div>
        </div>

        {/* Governance Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Governance Rule:</span>
            <span>Draft-to-Publication requires mandatory Warden sign-off & override audit trail.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Submit for review button */}
            {(run.status === 'DRAFT_GENERATED' || run.status === 'REJECTED_RETURNED') && (
              <button
                onClick={handleSubmitForReview}
                disabled={isSubmitting}
                className="inline-flex items-center space-x-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit to Warden Review</span>
              </button>
            )}

            {/* Warden Actions: Approve or Reject */}
            {run.status === 'PENDING_WARDEN_REVIEW' && (
              <>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-1.5 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition-all shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                  <span>Send Back / Reject</span>
                </button>

                <button
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Formally Approve Draft</span>
                </button>
              </>
            )}

            {/* Publication Button */}
            {run.status === 'APPROVED' && (
              <button
                onClick={() => setIsPublishModalOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center space-x-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Authorize & Publish Allotments</span>
              </button>
            )}

            {run.status === 'PUBLISHED' && (
              <span className="inline-flex items-center space-x-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Officially Published & Locked</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'assignments'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Room-wise Assignments ({run.assignments.length})
          </button>

          <button
            onClick={() => setActiveTab('overrides')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'overrides'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Override History</span>
            <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
              {run.overrideHistory?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Audit Trail ({run.auditTrail?.length || 0})
          </button>
        </div>

        {/* Filter Controls */}
        {activeTab === 'assignments' && (
          <div className="flex items-center space-x-3">
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Blocks</option>
              <option value="BH-01">BH-01 (Boys)</option>
              <option value="GH-01">GH-01 (Girls)</option>
            </select>

            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOverridden}
                onChange={(e) => setFilterOverridden(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <span>Overridden Only</span>
            </label>
          </div>
        )}
      </div>

      {/* Tab 1: Room-wise Assignments Grid */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(roomsMap.entries()).map(([roomKey, students]) => (
              <div
                key={roomKey}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Room Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-black text-slate-900">{roomKey}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
                    {students.length} / 2 Occupants
                  </span>
                </div>

                {/* Students in Room */}
                <div className="space-y-3">
                  {students.map((student) => (
                    <div
                      key={student.studentRollNumber}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        student.isOverridden
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50/70 border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-900">
                              {student.studentName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({student.studentRollNumber})
                            </span>
                            {student.isOverridden && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200">
                                Overridden
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                              {student.assignedBedLabel}
                            </span>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                              CGPA: {student.cgpa.toFixed(2)}
                            </span>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                              {student.compatibilityScore}% Compatibility
                            </span>
                          </div>
                        </div>

                        {/* Override Action Button */}
                        {run.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => openOverrideModal(student)}
                            className="inline-flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-2xs"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>Override</span>
                          </button>
                        )}
                      </div>

                      {/* Explanation Snippet */}
                      <p className="mt-2 text-[11px] text-slate-600 line-clamp-2 italic bg-white/70 p-2 rounded-xl border border-slate-100">
                        "{student.allocationExplanation}"
                      </p>

                      {/* Override details if overridden */}
                      {student.isOverridden && student.overrideReason && (
                        <div className="mt-2 text-[10px] text-amber-900 bg-amber-100/60 p-2 rounded-xl border border-amber-200">
                          <span className="font-bold">Warden Note: </span>
                          {student.overrideReason} (By {student.overriddenBy?.split('@')[0]})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Override History Audit */}
      {activeTab === 'overrides' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">
                Warden Override & Reassignment Log
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Mandatory Governance Audit Log
            </span>
          </div>

          {(!run.overrideHistory || run.overrideHistory.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No manual overrides have been applied to this allocation run.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {run.overrideHistory.map((override, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{override.studentName}</span>
                      <span className="font-mono text-slate-500">({override.studentRollNumber})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(override.overriddenAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-700 border border-rose-100">
                      From: {override.previousBlockCode}-{override.previousRoomNumber}-{override.previousBedLabel}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-100">
                      To: {override.newBlockCode}-{override.newRoomNumber}-{override.newBedLabel}
                    </span>
                  </div>

                  <p className="text-slate-600 bg-slate-50 p-2 rounded-xl text-[11px]">
                    <span className="font-bold text-slate-800">Reason: </span>
                    {override.overrideReason} • <span className="text-slate-400">Warden: {override.overriddenBy}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Complete Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            System State Machine Audit Trail
          </h3>
          <div className="space-y-3">
            {run.auditTrail?.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold shrink-0 text-[10px]">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{entry.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(entry.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600">{entry.reason}</p>
                  <p className="text-[10px] text-slate-400 font-mono">By: {entry.by}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. OVERRIDE ROOM / BED MODAL (With Circular (X) Standard) */}
      {/* ======================================================== */}
      {overrideStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Warden Manual Room Override
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Reassign student room placement with mandatory audit reason
                  </p>
                </div>
              </div>

              {/* Prominent Circular (X) Close Button */}
              <button
                type="button"
                onClick={() => setOverrideStudent(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Student Details */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800">{overrideStudent.studentName}</span>
                <span className="font-mono text-slate-500">{overrideStudent.studentRollNumber}</span>
              </div>
              <p className="text-slate-500">
                Currently Assigned: <span className="font-bold text-indigo-700">{overrideStudent.assignedBlockCode}</span> • Room <span className="font-bold text-slate-800">{overrideStudent.assignedRoomNumber}</span> • {overrideStudent.assignedBedLabel}
              </p>
            </div>

            {/* Override Form */}
            <form onSubmit={handleApplyOverride} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target Hostel Block
                  </label>
                  <select
                    value={overrideForm.targetBlockCode}
                    onChange={(e) => setOverrideForm({ ...overrideForm, targetBlockCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BH-01">BH-01 (Tagore Hall - Boys)</option>
                    <option value="GH-01">GH-01 (Kasturba Hall - Girls)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={overrideForm.targetFloor}
                    onChange={(e) => setOverrideForm({ ...overrideForm, targetFloor: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target Room Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. R-102"
                    value={overrideForm.targetRoomNumber}
                    onChange={(e) => setOverrideForm({ ...overrideForm, targetRoomNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target Bed Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bed A"
                    value={overrideForm.targetBedLabel}
                    onChange={(e) => setOverrideForm({ ...overrideForm, targetBedLabel: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mandatory Override Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the official justification (medical need, administrative re-allocation, special accessibility requirement, etc.). Min 8 characters."
                  value={overrideForm.overrideReason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideReason: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideStudent(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel & Return
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Warden Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FORMAL APPROVAL MODAL (With Circular (X) Standard)    */}
      {/* ======================================================== */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Authorize Warden Approval
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Formally approving this draft certifies that all student room allocations, compatibility scores, and any manual overrides have been reviewed and validated.
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Approval Notes / Sign-Off Remarks
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
              >
                {isSubmitting ? 'Approving...' : 'Certify & Approve Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. REJECTION / RETURN MODAL (With Circular (X) Standard) */}
      {/* ======================================================== */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="h-5 w-5 text-rose-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Return Draft for Revision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Returning the draft changes the status to <span className="font-bold text-rose-700">REJECTED_RETURNED</span> and notifies the allocation team to re-run or adjust quota parameters.
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mandatory Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detail what needs correction (e.g., rebalance Block A capacity, verify student special quota, etc.)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                {isSubmitting ? 'Returning...' : 'Send Back for Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. AUTHORIZED PUBLISH MODAL (With Circular (X) Standard) */}
      {/* ======================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Authorize Official Publication
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Governance Check Passed: APPROVED</p>
              <p className="text-[11px] text-emerald-800">
                Warden sign-off verified ({run.approvedBy}). Upon confirmation:
              </p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-emerald-800 pt-1">
                <li>All assigned beds in MongoDB will be permanently marked <span className="font-bold">BOOKED</span>.</li>
                <li>Student applications will transition to <span className="font-bold">ALLOCATED</span>.</li>
                <li>Official Allotment Slips will unlock on Student Portal!</li>
              </ul>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Publication Remarks
              </label>
              <textarea
                rows={2}
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
              >
                {isSubmitting ? 'Publishing...' : 'Authorize Official Publication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
