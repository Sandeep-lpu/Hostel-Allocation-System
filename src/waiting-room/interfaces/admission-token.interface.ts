/**
 * Admission JWT Payload structure
 * Issued when a student passes through the Leaky Bucket Turnstile.
 * Verified completely in-memory by AdmissionPassGuard without database hits.
 */
export interface AdmissionTokenPayload {
  studentId: string;
  tenantId: string;
  sessionId: string;
  admittedAt: number; // Unix timestamp in seconds
  exp: number;        // Unix timestamp in seconds (strict 10-minute TTL)
  iat: number;        // Issued at
  iss: string;        // Issuer
  nonce: string;      // Unique token nonce preventing replay
}

export interface StoredAdmissionPass {
  token: string;
  studentId: string;
  tenantId: string;
  sessionId: string;
  admittedAt: number;
  expiresAt: number;
}
