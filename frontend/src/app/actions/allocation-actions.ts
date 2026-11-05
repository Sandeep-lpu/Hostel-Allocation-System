'use server';

import { fetchFromBackend } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function runAllocationEngineAction(cycleCode: string, randomSeed: number = 42, initiatedBy: string = 'Admin Allocation Officer') {
  try {
    const res = await fetchFromBackend<any>('/allocation/run', {
      method: 'POST',
      body: JSON.stringify({ cycleCode, randomSeed, initiatedBy }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Allocation engine failed to generate draft' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error triggering allocation engine' };
  }
}

export async function submitRoommateQuestionnaireAction(formData: any) {
  try {
    const res = await fetchFromBackend<any>('/allocation/roommate-questionnaire', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to submit questionnaire' };
    }

    revalidatePath('/student/roommates');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error submitting questionnaire' };
  }
}

export async function submitForWardenReviewAction(runId: string) {
  try {
    const res = await fetchFromBackend<any>(`/allocation/runs/${runId}/submit-review`, {
      method: 'POST',
      body: JSON.stringify({ submittedBy: 'admin@univ-delhi.ac.in' }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to submit for Warden review' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error submitting for Warden review' };
  }
}

export async function overrideStudentAssignmentAction(
  runId: string,
  payload: {
    studentRollNumber: string;
    targetBlockCode: string;
    targetFloor?: number;
    targetRoomNumber: string;
    targetBedLabel: string;
    overrideReason: string;
    wardenEmail?: string;
  },
) {
  try {
    const res = await fetchFromBackend<any>(`/allocation/runs/${runId}/override`, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        wardenEmail: payload.wardenEmail || 'warden.north@univ-delhi.ac.in',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to apply Warden override' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error applying Warden override' };
  }
}

export async function approveAllocationAction(runId: string, notes?: string) {
  try {
    const res = await fetchFromBackend<any>(`/allocation/runs/${runId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        wardenEmail: 'chief.warden@univ-delhi.ac.in',
        approvalNotes: notes || 'Reviewed allocations and approved room placements.',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to approve allocation run' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error approving allocation run' };
  }
}

export async function rejectAllocationAction(runId: string, rejectionReason: string) {
  try {
    const res = await fetchFromBackend<any>(`/allocation/runs/${runId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        wardenEmail: 'chief.warden@univ-delhi.ac.in',
        rejectionReason,
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to reject and return draft' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error rejecting draft' };
  }
}

export async function publishAllocationAction(runId: string, notes?: string) {
  try {
    const res = await fetchFromBackend<any>(`/allocation/runs/${runId}/publish`, {
      method: 'POST',
      body: JSON.stringify({
        publishedBy: 'dean.student.affairs@univ-delhi.ac.in',
        publishNotes: notes || 'Authorized official publication of hostel room allotments.',
      }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to publish allocation' };
    }

    revalidatePath('/admin/allocation');
    revalidatePath('/admin/reviews');
    revalidatePath('/admin/inventory');
    revalidatePath('/student/dashboard');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error publishing allocation' };
  }
}
