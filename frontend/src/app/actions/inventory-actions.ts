'use server';

import { fetchFromBackend } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function fetchFloorMapAction(blockCode: string, floor: number) {
  try {
    const res = await fetchFromBackend<any>(`/inventory/floor-map/${blockCode}/${floor}`);
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to fetch floor bed map' };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching floor map' };
  }
}

export async function updateBedStatusAction(bedId: string, status: string, reason?: string) {
  try {
    const res = await fetchFromBackend<any>(`/inventory/bed/${bedId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });

    if (!res.ok) {
      return { success: false, error: res.error || 'Failed to update bed status' };
    }

    revalidatePath('/admin/inventory');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating bed status' };
  }
}
