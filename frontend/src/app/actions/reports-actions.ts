'use server';

import { fetchFromBackend } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function getReportsSummaryAction() {
  try {
    const res = await fetchFromBackend<any>('/reports/summary');
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to fetch executive reports' };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching reports' };
  }
}

export async function getAnnouncementsAction() {
  try {
    const res = await fetchFromBackend<any>('/reports/announcements');
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to fetch announcements' };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching announcements' };
  }
}

export async function broadcastAnnouncementAction(payload: {
  title: string;
  content: string;
  category?: string;
  targetAudience?: string;
  publishedBy?: string;
}) {
  try {
    const res = await fetchFromBackend<any>('/reports/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to broadcast announcement' };
    }

    revalidatePath('/admin/reports');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error broadcasting announcement' };
  }
}

