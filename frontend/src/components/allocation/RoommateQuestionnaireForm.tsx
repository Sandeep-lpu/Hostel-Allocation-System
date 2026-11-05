'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Users2,
  Moon,
  Sun,
  Sparkles,
  BookOpen,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  ShieldCheck,
  ArrowLeft,
  Thermometer,
  Coffee,
  HeartHandshake,
  Info,
} from 'lucide-react';
import { submitRoommateQuestionnaireAction } from '@/app/actions/allocation-actions';

interface RoommateQuestionnaireFormProps {
  student: any;
  existingProfile: any;
}

export default function RoommateQuestionnaireForm({
  student,
  existingProfile,
}: RoommateQuestionnaireFormProps) {
  const [formData, setFormData] = useState({
    studentRollNumber: student.rollNumber,
    sleepSchedule: existingProfile?.sleepSchedule || 'FLEXIBLE',
    cleanliness: existingProfile?.cleanliness || 'MODERATE',
    studyHabit: existingProfile?.studyHabit || 'SILENT_STUDY',
    socialStyle: existingProfile?.socialStyle || 'BALANCED',
    roomTempPreference: existingProfile?.roomTempPreference || 'MODERATE',
    dietaryPreference: existingProfile?.dietaryPreference || 'VEGETARIAN',
    smokingDrinkingTolerant: existingProfile?.smokingDrinkingTolerant || false,
    preferredLanguages: existingProfile?.preferredLanguages || 'English, Hindi',
    hobbiesNotes: existingProfile?.hobbiesNotes || 'Coding, Badminton, Music',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await submitRoommateQuestionnaireAction(formData);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Your roommate compatibility profile has been saved! The Allocation Engine will pair you with similar-lifestyle peers.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to save compatibility questionnaire.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Compatibility Hero Notice */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
            <HeartHandshake className="h-4 w-4 text-indigo-600" />
            <span>Multi-Seater Clustering Algorithm</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Roommate Compatibility Questionnaire
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            The Phase 3 Allocation Engine uses lifestyle compatibility weighting (0–100%) to cluster compatible students in 2-Seater, 3-Seater, and 4-Seater rooms, minimizing sleep and study habit friction.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center min-w-[140px] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match Weight</span>
          <div className="text-2xl font-black text-indigo-600 mt-0.5">High Priority</div>
          <span className="text-[10px] text-slate-400">Engine Seed: Weighted</span>
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
        </div>
      )}

      {/* Main Questionnaire Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Lifestyle & Study Preferences</h2>
            <p className="text-xs text-slate-500">Answer truthfully to ensure ideal room pairing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Sleep Schedule */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Moon className="h-4 w-4 text-indigo-600" />
                <span>Sleep Schedule</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'EARLY_BIRD', label: 'Early Bird', desc: 'Sleeps < 11 PM' },
                  { value: 'NIGHT_OWL', label: 'Night Owl', desc: 'Sleeps > 1 AM' },
                  { value: 'FLEXIBLE', label: 'Flexible', desc: 'Adapts easily' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, sleepSchedule: opt.value as any })}
                    className={`rounded-2xl p-3 text-left border transition-all ${
                      formData.sleepSchedule === opt.value
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Cleanliness */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Cleanliness Standard</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'VERY_CLEAN', label: 'Very Tidy', desc: 'No clutter, daily clean' },
                  { value: 'MODERATE', label: 'Moderate', desc: 'Normal tidy space' },
                  { value: 'RELAXED', label: 'Relaxed', desc: 'Casual about mess' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, cleanliness: opt.value as any })}
                    className={`rounded-2xl p-3 text-left border transition-all ${
                      formData.cleanliness === opt.value
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Study Habit */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>Room Study Environment</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'SILENT_STUDY', label: 'Pindrop Silence', desc: 'Need quiet room' },
                  { value: 'BACKGROUND_MUSIC', label: 'Soft Music', desc: 'Headphones/chill' },
                  { value: 'GROUP_STUDY', label: 'Group Discussion', desc: 'Collaborative' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, studyHabit: opt.value as any })}
                    className={`rounded-2xl p-3 text-left border transition-all ${
                      formData.studyHabit === opt.value
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Room Temperature */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Thermometer className="h-4 w-4 text-rose-500" />
                <span>Room AC Temperature</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'AC_COLD', label: 'Chilly AC', desc: 'Below 20°C preferred' },
                  { value: 'MODERATE', label: 'Comfortable', desc: '22°C - 24°C ideal' },
                  { value: 'FAN_WARM', label: 'Warm / Fan', desc: 'Avoid excessive AC' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, roomTempPreference: opt.value as any })}
                    className={`rounded-2xl p-3 text-left border transition-all ${
                      formData.roomTempPreference === opt.value
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary Preference
              </label>
              <select
                value={formData.dietaryPreference}
                onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VEGETARIAN">Vegetarian (Mess option compatible)</option>
                <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                <option value="EGGETARIAN">Eggetarian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Spoken Languages
              </label>
              <input
                type="text"
                value={formData.preferredLanguages}
                onChange={(e) => setFormData({ ...formData, preferredLanguages: e.target.value })}
                placeholder="English, Hindi, Bengali, Tamil, etc."
                className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hobbies, Interests & Roommate Notes
            </label>
            <input
              type="text"
              value={formData.hobbiesNotes}
              onChange={(e) => setFormData({ ...formData, hobbiesNotes: e.target.value })}
              placeholder="e.g. Competitive programming, early gym sessions, gaming tournaments"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center space-x-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-xs font-black shadow-md transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isPending ? 'Saving Profile...' : 'Save Compatibility Questionnaire'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

