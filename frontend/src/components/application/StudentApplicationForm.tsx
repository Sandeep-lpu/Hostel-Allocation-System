'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  X,
  Upload,
  Info,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { submitApplicationAction } from '@/app/actions/application-actions';

interface StudentApplicationFormProps {
  student: any;
  existingApplication: any;
  activeCycle: any;
  availableCategories: any[];
}

export default function StudentApplicationForm({
  student,
  existingApplication,
  activeCycle,
  availableCategories,
}: StudentApplicationFormProps) {
  const [isEditing, setIsEditing] = useState(!existingApplication);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentRollNumber: student.rollNumber,
    studentName: student.name,
    gender: student.gender,
    course: existingApplication?.course || 'B.Tech Computer Science & Engineering',
    yearOfStudy: existingApplication?.yearOfStudy || 2,
    cgpa: existingApplication?.cgpa || 8.85,
    category: existingApplication?.category || 'GENERAL',
    feeCategory: existingApplication?.feeCategory || 'REGULAR',
    isSpeciallyAbled: existingApplication?.isSpeciallyAbled || false,
    guardianName: existingApplication?.guardianName || 'Ram Kumar',
    guardianMobile: existingApplication?.guardianMobile || student.mobile || '+91 9876543210',
    guardianRelation: existingApplication?.guardianRelation || 'Father',
    emergencyContact: existingApplication?.emergencyContact || student.mobile || '+91 9876543210',
    address: existingApplication?.address || 'Sector 62, Noida, Uttar Pradesh, India',
    preferences: existingApplication?.preferences?.length
      ? existingApplication.preferences
      : [
          {
            preferenceRank: 1,
            blockCode: student.gender === 'FEMALE' ? 'GH-01' : 'BH-01',
            categoryCode: availableCategories[0]?.categoryCode || 'STUDIO_AC_2S_PANTRY',
          },
          {
            preferenceRank: 2,
            blockCode: student.gender === 'FEMALE' ? 'GH-01' : 'BH-01',
            categoryCode: availableCategories[1]?.categoryCode || 'STD_AC_2S',
          },
          {
            preferenceRank: 3,
            blockCode: student.gender === 'FEMALE' ? 'GH-01' : 'BH-01',
            categoryCode: availableCategories[2]?.categoryCode || 'STD_AC_4S',
          },
        ],
    documents: existingApplication?.documents?.length
      ? existingApplication.documents
      : [
          {
            documentId: 'gov_id',
            documentName: 'Aadhaar Card / Government Photo ID',
            fileUrl: 'https://docs.university.edu/aadhaar-sample.pdf',
            verified: false,
            uploadedAt: new Date(),
          },
          {
            documentId: 'fitness_cert',
            documentName: 'University Medical Fitness Certificate',
            fileUrl: 'https://docs.university.edu/med-fitness-sample.pdf',
            verified: false,
            uploadedAt: new Date(),
          },
        ],
  });

  const handlePreferenceChange = (index: number, field: string, value: any) => {
    const updated = [...formData.preferences];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, preferences: updated });
  };

  const handleDocumentUrlChange = (index: number, url: string) => {
    const updated = [...formData.documents];
    updated[index] = { ...updated[index], fileUrl: url, uploadedAt: new Date() };
    setFormData({ ...formData, documents: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await submitApplicationAction(formData);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Your hostel application has been successfully submitted and verified against university policy!',
        });
        setIsEditing(false);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to submit application. Please check your inputs.',
        });
      }
    });
  };

  // Status Pill Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-black">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Application Verified & Approved</span>
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-black animate-pulse">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Action Required — Resubmit Documents</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-black">
            <X className="h-4 w-4 text-rose-600" />
            <span>Application Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-xs font-black">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span>Submitted & Under Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Active Cycle Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">{activeCycle?.title || 'Academic Session 2026-27'}</h2>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase">
                Active Cycle
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cycle Code: <span className="font-mono font-bold text-slate-700">{activeCycle?.cycleCode}</span> • Application Deadline: {new Date(activeCycle?.endDate || '2026-11-30').toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs">
          <Info className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>Min CGPA Requirement: {activeCycle?.eligibilityPolicy?.minCgpa || 6.0}</span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. EXISTING APPLICATION VIEW (WHEN SUBMITTED AND NOT IN EDIT MODE) */}
      {!isEditing && existingApplication && (
        <div className="space-y-6">
          {/* Top Status Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Application Tracking Number
                </span>
                <div className="flex items-center space-x-3">
                  <h3 className="font-mono text-2xl font-black text-slate-900">
                    {existingApplication.applicationNumber}
                  </h3>
                  {getStatusBadge(existingApplication.status)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Edit / Update Application
                </button>
              </div>
            </div>

            {/* Action Required Alert Box */}
            {existingApplication.status === 'ACTION_REQUIRED' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Warden Notice: Document Resubmission Needed</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {existingApplication.verificationNotes ||
                    'Please update your medical fitness or category proof to complete verification.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
                >
                  Upload Required Documents Now
                </button>
              </div>
            )}

            {/* Automated Eligibility Verification Scorecard */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>System Eligibility Audit Scorecard</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Rule-Based Evaluation</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-white p-3 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">CGPA Policy</span>
                  <div className="mt-1 flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-slate-900">{existingApplication.cgpa} (Passed &ge; 6.0)</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Programme</span>
                  <div className="mt-1 flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-slate-900">B.Tech (Eligible)</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Documents</span>
                  <div className="mt-1 flex items-center space-x-1.5 font-bold">
                    {existingApplication.eligibilityResult?.documentsPassed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-700">Pending Review</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Overall Status</span>
                  <div className="mt-1 flex items-center space-x-1.5 font-bold">
                    {existingApplication.eligibilityResult?.isOverallEligible ? (
                      <span className="text-emerald-700">Allocation Eligible</span>
                    ) : (
                      <span className="text-slate-700">In Verification</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                &ldquo;{existingApplication.eligibilityResult?.summary || 'Application undergoing administrative review.'}&rdquo;
              </p>
            </div>

            {/* Selected Preferences Summary */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ranked Hostel & Room Preferences
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {existingApplication.preferences?.map((pref: any) => (
                  <div
                    key={pref.preferenceRank}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 border border-indigo-100">
                        Choice #{pref.preferenceRank}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">{pref.blockCode}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-2">{pref.categoryCode}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Attached Verification Documents
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {existingApplication.documents?.map((doc: any) => (
                  <div
                    key={doc.documentId}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="font-bold text-slate-900">{doc.documentName}</p>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline"
                        >
                          View Document &rarr;
                        </a>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.verified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MULTI-STEP APPLICATION WIZARD (WHEN EDITING OR NEW) */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header with Cancel Button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {existingApplication ? 'Edit Hostel Application' : 'Hostel Admission Application Form'}
                </h3>
                <p className="text-xs text-slate-500">
                  Complete all 4 sections to register your preferences for the upcoming allocation run
                </p>
              </div>

              {existingApplication && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 overflow-x-auto gap-2">
              {[
                { s: 1, label: '1. Academic & Personal' },
                { s: 2, label: '2. Guardian & Emergency' },
                { s: 3, label: '3. Hostel Preferences' },
                { s: 4, label: '4. Documents & Submit' },
              ].map((item) => (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setStep(item.s)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    step === item.s
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* STEP 1: ACADEMIC & PERSONAL */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={formData.studentName}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">University Roll Number</label>
                    <input
                      type="text"
                      disabled
                      value={formData.studentRollNumber}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Course / Branch</label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Study</label>
                    <select
                      value={formData.yearOfStudy}
                      onChange={(e) => setFormData({ ...formData, yearOfStudy: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1st Year (Freshman)</option>
                      <option value={2}>2nd Year (Sophomore)</option>
                      <option value={3}>3rd Year (Junior)</option>
                      <option value={4}>4th Year (Senior)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cumulative CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.cgpa}
                      onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reservation Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="GENERAL">General / Open Category</option>
                      <option value="OBC">Other Backward Classes (OBC-NCL)</option>
                      <option value="SC">Scheduled Caste (SC)</option>
                      <option value="ST">Scheduled Tribe (ST)</option>
                      <option value="EWS">Economically Weaker Section (EWS)</option>
                      <option value="PWD">Persons with Disability (PwD)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="speciallyAbled"
                    checked={formData.isSpeciallyAbled}
                    onChange={(e) => setFormData({ ...formData, isSpeciallyAbled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="speciallyAbled" className="text-xs font-semibold text-slate-700">
                    Request Specially-Abled / Ground Floor Accessible Room Accommodation
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: GUARDIAN & EMERGENCY */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      required
                      value={formData.guardianRelation}
                      onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      value={formData.guardianMobile}
                      onChange={(e) => setFormData({ ...formData, guardianMobile: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">24x7 Emergency Contact</label>
                    <input
                      type="tel"
                      required
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Residential Address</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: PREFERENCES */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <p className="text-xs text-slate-500">
                  Select your ranked preferences in order of desirability. The Allocation Engine will attempt to satisfy Preference 1 first.
                </p>

                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <span className="rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-black uppercase">
                      Preference #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hostel Block</label>
                        <select
                          value={formData.preferences[idx]?.blockCode || (student.gender === 'FEMALE' ? 'GH-01' : 'BH-01')}
                          onChange={(e) => handlePreferenceChange(idx, 'blockCode', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                        >
                          {student.gender === 'MALE' && <option value="BH-01">BH-01 (Boys Hostel-01)</option>}
                          {student.gender === 'FEMALE' && <option value="GH-01">GH-01 (Girls Hostel-01 - Kasturba Hall)</option>}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Room Category</label>
                        <select
                          value={formData.preferences[idx]?.categoryCode}
                          onChange={(e) => handlePreferenceChange(idx, 'categoryCode', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat.categoryCode} value={cat.categoryCode}>
                              {cat.roomType} ({cat.seaterCount}-Seater) • ₹{(cat.annualFee / 1000).toFixed(0)}k/yr
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 4: DOCUMENTS & SUBMIT */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <p className="text-xs text-slate-500">
                  Provide verified cloud links or document storage URLs for identity and medical fitness verification.
                </p>

                {formData.documents.map((doc: any, idx: number) => (
                  <div key={doc.documentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">{doc.documentName}</span>
                    </div>

                    <input
                      type="url"
                      required
                      value={doc.fileUrl}
                      onChange={(e) => handleDocumentUrlChange(idx, e.target.value)}
                      placeholder="https://drive.google.com/... or cloud document link"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}

                <div className="rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Student Applicant Declaration</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    I hereby certify that all information submitted is accurate and that I agree to abide by university residential hall guidelines and fee structures.
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  &larr; Previous Step
                </button>
              ) : (
                <Link
                  href="/student/dashboard"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Back to Dashboard
                </Link>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Next Step &rarr;
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center space-x-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-black shadow-md transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isPending ? 'Submitting Application...' : 'Submit Hostel Application'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

