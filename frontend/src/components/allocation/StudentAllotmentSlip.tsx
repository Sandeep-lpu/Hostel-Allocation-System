'use client';

import React from 'react';
import {
  Printer,
  ShieldCheck,
  Building2,
  Bed,
  CheckCircle2,
  Calendar,
  User,
  QrCode,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface StudentAllotmentSlipProps {
  student: {
    name: string;
    rollNumber: string;
    gender: string;
    email: string;
    mobile?: string;
    programme?: string;
    category?: string;
  };
  assignment: {
    assignedBlockCode: string;
    assignedFloor: number;
    assignedRoomNumber: string;
    assignedBedLabel: string;
    compatibilityScore?: number;
    roommates?: { name: string; rollNumber: string }[];
    allocationExplanation?: string;
  };
  academicSession?: string;
  issuedAt?: string;
}

export default function StudentAllotmentSlip({
  student,
  assignment,
  academicSession = '2026-27 (Fall Semester)',
  issuedAt = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
}: StudentAllotmentSlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const hostelName =
    assignment.assignedBlockCode === 'GH-01'
      ? 'Kasturba Hall of Residence (Girls Hostel)'
      : 'Rabindranath Tagore Hall of Residence (Boys Hostel)';

  return (
    <div className="space-y-6">
      {/* Print Trigger Button (Hidden when printing) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm print:hidden">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            Official Residential Allotment Pass
          </h2>
          <p className="text-xs text-slate-500">
            Carry this verified allotment pass and your University identity card during hostel check-in.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Print Pass / Save as PDF</span>
        </button>
      </div>

      {/* The Printable Allotment Slip Document */}
      <div className="bg-white border-2 border-slate-300 rounded-3xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-5 text-center space-y-1">
          <div className="inline-flex items-center justify-center space-x-2">
            <span className="text-xs font-black tracking-widest text-indigo-700 uppercase">
              University of Delhi • Office of the Dean, Student Welfare
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            Hostel Room Allotment Slip & Resident Pass
          </h1>
          <p className="text-xs font-mono font-semibold text-slate-600">
            Academic Session: {academicSession} • Issued on: {issuedAt}
          </p>
          <div className="pt-1 flex items-center justify-center space-x-2 text-[10px] font-mono text-emerald-700 font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Cryptographically Verified Allotment Record • Token: PASS-{student.rollNumber}-2026</span>
          </div>
        </div>

        {/* 2-Column Student & Allotment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Left: Student Identity */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Resident Identity Record
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                {student.gender}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{student.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roll / Registration No:</span>
                <span className="font-mono font-black text-slate-900">{student.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Programme / Course:</span>
                <span className="font-semibold text-slate-800">{student.programme || 'B.Tech CSE'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Social Category Quota:</span>
                <span className="font-mono font-bold text-slate-800">{student.category || 'GENERAL'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Email:</span>
                <span className="font-mono text-slate-700">{student.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Contact:</span>
                <span className="font-mono text-slate-700">{student.mobile || '+91 98765 43210'}</span>
              </div>
            </div>
          </div>

          {/* Right: Residential Allocation Details */}
          <div className="rounded-2xl border border-indigo-200 p-5 space-y-3 bg-indigo-50/30">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                2. Designated Accommodation
              </span>
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
                CONFIRMED
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hostel Name:</span>
                <span className="font-bold text-slate-900">{hostelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Block Code:</span>
                <span className="font-mono font-black text-indigo-700">{assignment.assignedBlockCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Floor:</span>
                <span className="font-bold text-slate-900">Floor {assignment.assignedFloor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Allocated Room:</span>
                <span className="font-mono font-black text-lg text-slate-900">
                  {assignment.assignedRoomNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Designated Bed:</span>
                <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {assignment.assignedBedLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dining Plan:</span>
                <span className="font-semibold text-slate-800">Three Meals Daily (Subscribed)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roommate Section */}
        {assignment.roommates && assignment.roommates.length > 0 && (
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">Assigned Roommate(s)</span>
              {assignment.compatibilityScore && (
                <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {assignment.compatibilityScore}% Compatibility Rating
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignment.roommates.map((rm) => (
                <div key={rm.rollNumber} className="bg-white p-2 rounded-xl border border-slate-200 flex justify-between font-mono">
                  <span className="font-bold text-slate-800">{rm.name}</span>
                  <span className="text-slate-500">({rm.rollNumber})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check-In Instructions */}
        <div className="rounded-2xl border border-slate-200 p-4 text-[11px] text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-900 uppercase tracking-wide">
            Important Check-In Instructions & Resident Rules:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
            <li>Physical reporting and biometric verification starts from <strong>15th July 2026</strong> at the Hostel Caretaker Office.</li>
            <li>Possession of designated bed and room keys will be handed over upon presenting this physical signed slip.</li>
            <li>Subletting, unauthorized exchange of beds, or altering room electrical infrastructure is strictly prohibited.</li>
            <li>Residents must adhere to university quiet hours (10:00 PM – 6:00 AM) and campus safety protocols.</li>
          </ol>
        </div>

        {/* Signatures & Verification Seal Block */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-200 items-end text-center text-xs">
          {/* Student Sign */}
          <div className="space-y-8">
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p className="font-bold text-slate-800">Resident Signature</p>
          </div>

          {/* Barcode / Seal */}
          <div className="space-y-1 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-300 font-mono text-slate-400">
              <QrCode className="h-10 w-10 text-slate-800" />
            </div>
            <span className="font-mono text-[9px] text-slate-500">SCAN AT GATE FOR ACCESS</span>
          </div>

          {/* Warden Sign */}
          <div className="space-y-8">
            <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center">
              <span className="font-mono text-[10px] text-indigo-700 italic font-bold">
                [Digitally Signed by Chief Warden]
              </span>
            </div>
            <p className="font-bold text-slate-800">Hostel Warden & Seal</p>
          </div>
        </div>
      </div>
    </div>
  );
}

