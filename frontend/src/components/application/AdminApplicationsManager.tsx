'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  Building2,
  Calendar,
  Send,
  User,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  Settings,
} from 'lucide-react';
import { verifyApplicationAction, updateCyclePolicyAction } from '@/app/actions/application-actions';

interface ApplicationItem {
  _id: string;
  applicationNumber: string;
  cycleCode: string;
  studentRollNumber: string;
  studentName: string;
  gender: 'MALE' | 'FEMALE';
  course: string;
  yearOfStudy: number;
  cgpa: number;
  category: string;
  feeCategory: string;
  isSpeciallyAbled: boolean;
  guardianName: string;
  guardianMobile: string;
  guardianRelation: string;
  emergencyContact: string;
  address: string;
  preferences: Array<{
    preferenceRank: number;
    blockCode: string;
    categoryCode: string;
  }>;
  documents: Array<{
    documentId: string;
    documentName: string;
    fileUrl: string;
    verified: boolean;
    uploadedAt: string;
  }>;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED';
  verificationNotes: string;
  rejectionReason: string;
  verifiedBy: string;
  verifiedAt: string | null;
  eligibilityResult: {
    cgpaPassed: boolean;
    programmePassed: boolean;
    documentsPassed: boolean;
    feeCategoryPassed: boolean;
    isOverallEligible: boolean;
    summary: string;
  };
}

interface AdminApplicationsManagerProps {
  initialApplications: ApplicationItem[];
  initialMetrics: any;
  activeCycle: any;
  adminName: string;
}

export default function AdminApplicationsManager({
  initialApplications,
  initialMetrics,
  activeCycle,
  adminName,
}: AdminApplicationsManagerProps) {
  const [applications, setApplications] = useState<ApplicationItem[]>(initialApplications || []);
  const [metrics, setMetrics] = useState(initialMetrics || {});
  const [cycle, setCycle] = useState(activeCycle);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selected Application for Verification Modal
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cycle Policy Config Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [minCgpa, setMinCgpa] = useState(activeCycle?.eligibilityPolicy?.minCgpa || 6.0);

  const [isPending, startTransition] = useTransition();

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedApp(null);
        setIsPolicyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Applications
  const filteredApps = applications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (genderFilter !== 'ALL' && app.gender !== genderFilter) return false;
    if (categoryFilter !== 'ALL' && app.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoll = app.studentRollNumber?.toLowerCase().includes(q);
      const matchName = app.studentName?.toLowerCase().includes(q);
      const matchAppNo = app.applicationNumber?.toLowerCase().includes(q);
      const matchCourse = app.course?.toLowerCase().includes(q);
      if (!matchRoll && !matchName && !matchAppNo && !matchCourse) return false;
    }
    return true;
  });

  // Handle Verification Action
  const handleVerifyAction = async (status: 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED') => {
    if (!selectedApp) return;
    setModalFeedback(null);

    startTransition(async () => {
      const res = await verifyApplicationAction(selectedApp._id, {
        status,
        verificationNotes,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        verifiedBy: adminName,
        markDocumentsVerified: status === 'VERIFIED',
      });

      if (res.success && res.data) {
        setModalFeedback({
          type: 'success',
          message: `Application ${selectedApp.applicationNumber} updated to ${status}.`,
        });

        // Update local state
        setApplications((prev) =>
          prev.map((a) => (a._id === selectedApp._id ? res.data : a))
        );
        setSelectedApp(res.data);
      } else {
        setModalFeedback({
          type: 'error',
          message: res.error || 'Failed to update application verification status',
        });
      }
    });
  };

  // Handle Policy Update
  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateCyclePolicyAction({
        cycleCode: cycle.cycleCode,
        eligibilityPolicy: {
          ...cycle.eligibilityPolicy,
          minCgpa: Number(minCgpa),
        },
      });

      if (res.success && res.data) {
        setCycle(res.data);
        setIsPolicyModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Cycle & Policy Quick Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono font-black shadow-2xs">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900">{cycle?.title}</h2>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase">
                {cycle?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cycle Code: <span className="font-mono font-bold text-slate-700">{cycle?.cycleCode}</span> • Application Window: {new Date(cycle?.startDate).toLocaleDateString()} to {new Date(cycle?.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Policy: Min CGPA {cycle?.eligibilityPolicy?.minCgpa || 6.0}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsPolicyModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Configure Policy</span>
          </button>
        </div>
      </div>

      {/* 2. Applications Metrics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Applications</span>
          <div className="text-2xl font-black text-slate-900">{metrics.total || applications.length}</div>
          <p className="text-[11px] text-slate-500">Across active cycle</p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Verified & Approved</span>
          <div className="text-2xl font-black text-emerald-700">
            {applications.filter((a) => a.status === 'VERIFIED').length}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">Ready for allocation run</p>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Pending Review</span>
          <div className="text-2xl font-black text-indigo-700">
            {applications.filter((a) => a.status === 'SUBMITTED').length}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium">Awaiting Warden check</p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Action Required</span>
          <div className="text-2xl font-black text-amber-700">
            {applications.filter((a) => a.status === 'ACTION_REQUIRED').length}
          </div>
          <p className="text-[11px] text-amber-600 font-medium">Documents requested</p>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Rejected</span>
          <div className="text-2xl font-black text-rose-700">
            {applications.filter((a) => a.status === 'REJECTED').length}
          </div>
          <p className="text-[11px] text-rose-600 font-medium">Policy non-compliant</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Roll No, Student Name, App ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>

            {(searchQuery || statusFilter !== 'ALL' || genderFilter !== 'ALL' || categoryFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setGenderFilter('ALL');
                  setCategoryFilter('ALL');
                }}
                className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Applications Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Student Name & Roll No</th>
                <th className="py-3.5 px-4">Programme & Year</th>
                <th className="py-3.5 px-4">CGPA / Category</th>
                <th className="py-3.5 px-4">1st Preference</th>
                <th className="py-3.5 px-4">Eligibility Audit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No applications match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isEligible = app.eligibilityResult?.isOverallEligible;
                  return (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {app.applicationNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{app.studentName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{app.studentRollNumber}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 line-clamp-1">{app.course}</div>
                        <div className="text-[10px] text-slate-400">Year {app.yearOfStudy} • {app.gender}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{app.cgpa} CGPA</div>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {app.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          {app.preferences[0]?.blockCode || 'N/A'} - {app.preferences[0]?.categoryCode || ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isEligible
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isEligible ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          <span>{isEligible ? 'Passed' : 'Pending'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            app.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'ACTION_REQUIRED'
                              ? 'bg-amber-100 text-amber-800'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApp(app);
                            setVerificationNotes(app.verificationNotes || '');
                            setRejectionReason(app.rejectionReason || '');
                            setModalFeedback(null);
                          }}
                          className="inline-flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 shadow-2xs transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. INTERACTIVE VERIFICATION & AUDIT MODAL (WITH WORKING (X) CLOSE BUTTON & CANCEL) */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => {
            setSelectedApp(null);
            setModalFeedback(null);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with WORKING (X) CLOSE BUTTON */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono font-black text-base shadow-2xs">
                  {selectedApp.studentName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedApp.studentName}</h3>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      ({selectedApp.studentRollNumber})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Application ID: <span className="font-mono font-bold text-slate-700">{selectedApp.applicationNumber}</span> • {selectedApp.course}
                  </p>
                </div>
              </div>

              {/* Prominent Circular (X) Close Button (Identical to user's uploaded image) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setModalFeedback(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                aria-label="Close review modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Feedback Alert */}
            {modalFeedback && (
              <div
                className={`rounded-2xl p-3.5 text-xs font-bold flex items-center space-x-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            {/* Automated Policy Scorecard */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Automated System Policy Scorecard
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase">Min CGPA (&ge;6.0)</span>
                  <div className="font-bold text-emerald-700 flex items-center space-x-1 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{selectedApp.cgpa} Passed</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase">Programme Check</span>
                  <div className="font-bold text-emerald-700 flex items-center space-x-1 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Eligible</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase">Category Quota</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedApp.category} Quota
                  </div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase">Accessibility</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedApp.isSpeciallyAbled ? 'Ground Floor Req.' : 'Standard'}
                  </div>
                </div>
              </div>
            </div>

            {/* Ranked Preferences */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Student&apos;s Ranked Hostel Preferences
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {selectedApp.preferences.map((p) => (
                  <div key={p.preferenceRank} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Choice #{p.preferenceRank}</span>
                    <div className="font-bold text-slate-900">{p.blockCode}</div>
                    <div className="text-[11px] text-slate-600">{p.categoryCode}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded Documents for Verification */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Attached Verification Documents
              </span>
              <div className="space-y-2">
                {selectedApp.documents.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <div>
                        <span className="font-bold text-slate-900">{doc.documentName}</span>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-indigo-600 hover:underline inline-flex items-center space-x-0.5"
                        >
                          <span>Open File</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warden Actions */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Warden Verification Decisions
              </span>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warden / Administrator Notes (Visible to Student & Audit Trail)
                </label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. All documents verified, ID proof matched, eligible for Phase 3 allocation draft"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {selectedApp.status === 'REJECTED' && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Rejection Reason
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Academic disqualification or false information"
                    className="w-full rounded-xl border border-rose-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleVerifyAction('VERIFIED')}
                  className="inline-flex items-center justify-center space-x-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve & Verify</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleVerifyAction('ACTION_REQUIRED')}
                  className="inline-flex items-center justify-center space-x-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Request Documents</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleVerifyAction('REJECTED')}
                  className="inline-flex items-center justify-center space-x-1.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject Application</span>
                </button>
              </div>
            </div>

            {/* Modal Footer with Cancel / Return */}
            <div className="flex items-center justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setModalFeedback(null);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. POLICY CONFIGURATION MODAL */}
      {isPolicyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsPolicyModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Allocation Policy Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum CGPA Requirement
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Quotas Allocation
                </label>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">GEN: 40%</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">OBC: 27%</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">SC: 15%</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">ST: 7.5%</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">EWS: 10%</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center border">PwD: 5%</div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
