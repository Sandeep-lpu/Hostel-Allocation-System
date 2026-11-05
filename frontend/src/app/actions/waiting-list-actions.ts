'use server';

import { fetchFromBackend } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function getWaitingListAction(runId?: string) {
  try {
    const url = runId ? `/allocation/waiting-list?runId=${runId}` : '/allocation/waiting-list';
    const res = await fetchFromBackend<any>(url);
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to fetch waiting list' };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching waiting list' };
  }
}

export async function getAvailableVacanciesAction(blockCode?: string) {
  try {
    const url = blockCode && blockCode !== 'ALL'
      ? `/allocation/waiting-list/vacancies?blockCode=${blockCode}`
      : '/allocation/waiting-list/vacancies';
    const res = await fetchFromBackend<any>(url);
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to fetch available vacancies' };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching vacancies' };
  }
}

export async function promoteCandidateAction(payload: {
  studentRollNumber: string;
  targetBlockCode?: string;
  targetRoomNumber?: string;
  targetBedLabel?: string;
  authorizedBy?: string;
}) {
  try {
    const res = await fetchFromBackend<any>('/allocation/waiting-list/promote', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        authorizedBy: payload.authorizedBy || 'warden@univ-delhi.ac.in',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to promote waitlist candidate' };
    }

    revalidatePath('/admin/waiting-list');
    revalidatePath('/admin/reviews');
    revalidatePath('/admin/inventory');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error promoting student' };
  }
}

export async function autoPromoteAllVacanciesAction() {
  try {
    const res = await fetchFromBackend<any>('/allocation/waiting-list/auto-promote', {
      method: 'POST',
      body: JSON.stringify({
        authorizedBy: 'chief.warden@univ-delhi.ac.in',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to execute auto-promotion' };
    }

    revalidatePath('/admin/waiting-list');
    revalidatePath('/admin/reviews');
    revalidatePath('/admin/inventory');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error executing auto-promotion' };
  }
}

export async function releaseBedAction(payload: {
  blockCode: string;
  roomNumber: string;
  bedLabel: string;
  reason: string;
  autoPromoteNext?: boolean;
}) {
  try {
    const res = await fetchFromBackend<any>('/allocation/waiting-list/release-bed', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        releasedBy: 'warden@univ-delhi.ac.in',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to release bed' };
    }

    revalidatePath('/admin/waiting-list');
    revalidatePath('/admin/inventory');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error releasing bed' };
  }
}

