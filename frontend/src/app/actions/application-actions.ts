'use server';

import { fetchFromBackend } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function submitApplicationAction(data: any) {
  try {
    const res = await fetchFromBackend<any>('/applications/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to submit application' };
    }

    revalidatePath('/student/application');
    revalidatePath('/student/dashboard');
    revalidatePath('/admin/applications');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error submitting application' };
  }
}

export async function verifyApplicationAction(
  applicationId: string,
  payload: {
    status: 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED';
    verificationNotes?: string;
    rejectionReason?: string;
    verifiedBy: string;
    markDocumentsVerified?: boolean;
  },
) {
  try {
    const res = await fetchFromBackend<any>(`/applications/${applicationId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to verify application' };
    }

    revalidatePath('/admin/applications');
    revalidatePath('/student/application');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying application' };
  }
}

export async function updateCyclePolicyAction(cycleData: any) {
  try {
    const res = await fetchFromBackend<any>('/applications/cycles', {
      method: 'POST',
      body: JSON.stringify(cycleData),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to update cycle policy' };
    }

    revalidatePath('/admin/applications');
    revalidatePath('/student/application');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating cycle policy' };
  }
}
