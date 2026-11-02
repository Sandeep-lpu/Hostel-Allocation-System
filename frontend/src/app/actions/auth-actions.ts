'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { fetchFromBackend } from '@/lib/api';
import {
  setStudentCookies,
  setAdminCookies,
  clearStudentCookies,
  clearAdminCookies,
} from '@/lib/auth-cookies';

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Authenticate Student by Roll Number or Campus Email
 */
export async function studentLoginAction(
  _prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const identifier = formData.get('identifier')?.toString()?.trim();
  const passwordOrPin = formData.get('passwordOrPin')?.toString()?.trim();

  if (!identifier) {
    return {
      success: false,
      error: 'Please enter your University Roll Number or Registered Email.',
    };
  }

  const result = await fetchFromBackend<any>('/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier,
      passwordOrPin: passwordOrPin || undefined,
    }),
  });

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      error:
        result.error ||
        'Student authentication failed. Please verify your roll number in MongoDB.',
    };
  }

  const { token, student } = result.data;
  await setStudentCookies(token, student);

  revalidatePath('/student/dashboard');
  redirect('/student/dashboard');
}

/**
 * Server Action: Authenticate Administrator or Warden
 */
export async function adminLoginAction(
  _prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const email = formData.get('email')?.toString()?.trim();
  const password = formData.get('password')?.toString()?.trim();

  if (!email) {
    return { success: false, error: 'Please enter your official administrator email.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  const result = await fetchFromBackend<any>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      error:
        result.error ||
        'Invalid administrator credentials. Please check your official email and password.',
    };
  }

  const { token, admin } = result.data;
  await setAdminCookies(token, admin);

  revalidatePath('/admin/dashboard');
  redirect('/admin/dashboard');
}

/**
 * Server Action: Logout
 */
export async function logoutAction(portal: 'student' | 'admin') {
  if (portal === 'student') {
    await clearStudentCookies();
    revalidatePath('/student/login');
    redirect('/student/login');
  } else {
    await clearAdminCookies();
    revalidatePath('/admin/login');
    redirect('/admin/login');
  }
}

/**
 * Server Action: Live Connection Probe for Database, Redis, and NestJS Backend
 */
export async function checkDatabaseHealthAction() {
  const result = await fetchFromBackend<any>('/auth/test-connection', {
    method: 'GET',
  });
  return result;
}

