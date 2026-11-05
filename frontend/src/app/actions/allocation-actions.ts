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
