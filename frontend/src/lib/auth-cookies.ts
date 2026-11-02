import { cookies } from 'next/headers';

export const COOKIE_STUDENT_TOKEN = 'hostel_student_token';
export const COOKIE_STUDENT_SESSION = 'hostel_student_session';
export const COOKIE_ADMIN_TOKEN = 'hostel_admin_token';
export const COOKIE_ADMIN_SESSION = 'hostel_admin_session';

export interface StudentSessionData {
  id: string;
  studentId: string;
  rollNumber: string;
  name: string;
  email: string;
  gender: string;
  mobile: string;
  currentAllocation?: any;
}

export interface AdminSessionData {
  email: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
}

export async function setStudentCookies(token: string, sessionData: StudentSessionData) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_STUDENT_TOKEN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  cookieStore.set(COOKIE_STUDENT_SESSION, JSON.stringify(sessionData), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export async function getStudentSession(): Promise<{ token: string | null; student: StudentSessionData | null }> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_STUDENT_TOKEN)?.value || null;
  const rawSession = cookieStore.get(COOKIE_STUDENT_SESSION)?.value;
  let student: StudentSessionData | null = null;
  if (rawSession) {
    try {
      student = JSON.parse(rawSession);
    } catch {
      student = null;
    }
  }
  return { token, student };
}

export async function clearStudentCookies() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_STUDENT_TOKEN);
  cookieStore.delete(COOKIE_STUDENT_SESSION);
}

export async function setAdminCookies(token: string, sessionData: AdminSessionData) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_ADMIN_TOKEN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  });
  cookieStore.set(COOKIE_ADMIN_SESSION, JSON.stringify(sessionData), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function getAdminSession(): Promise<{ token: string | null; admin: AdminSessionData | null }> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_ADMIN_TOKEN)?.value || null;
  const rawSession = cookieStore.get(COOKIE_ADMIN_SESSION)?.value;
  let admin: AdminSessionData | null = null;
  if (rawSession) {
    try {
      admin = JSON.parse(rawSession);
    } catch {
      admin = null;
    }
  }
  return { token, admin };
}

export async function clearAdminCookies() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_ADMIN_TOKEN);
  cookieStore.delete(COOKIE_ADMIN_SESSION);
}

