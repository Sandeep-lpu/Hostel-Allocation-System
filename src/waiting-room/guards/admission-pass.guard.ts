import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { VwrRedisService } from '../redis/redis.service';
import { VWR_CONSTANTS } from '../constants/waiting-room.constants';
import { AdmissionTokenPayload } from '../interfaces/admission-token.interface';
import { REVOKE_ADMISSION_PASS_LUA } from '../lua/waiting-room.lua';

/**
 * Stateless Admission Gatekeeper Guard
 *
 * Distributed Systems Rationale:
 * Protects high-contention `/api/v1/booking/*` endpoints during high-traffic surges (10,000+ students).
 * 1. Zero Database Hits: Verifies HMAC-SHA256 signature and expiration entirely in RAM.
 * 2. Identity & Session Binding: Guarantees that token.studentId === request.studentId and
 *    token.sessionId === request.sessionId, preventing students from trading or selling admission passes.
 * 3. Immediate Active Pass Revocation: Provides helper method to evict active pass upon checkout.
 */
@Injectable()
export class AdmissionPassGuard implements CanActivate {
  private readonly logger = new Logger(AdmissionPassGuard.name);

  constructor(private readonly redisService: VwrRedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    // 1. Extract pass from header, cookie, or authorization bearer
    const passToken = this.extractToken(req);
    if (!passToken) {
      throw new UnauthorizedException(
        'Missing admission pass. You must enter through the Virtual Waiting Room (header: x-admission-pass).',
      );
    }

    // 2. Cryptographic signature verification in memory (HMAC-SHA256)
    const payload = this.verifyPassToken(passToken);

    // 3. Check expiration
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowEpochSeconds) {
      throw new UnauthorizedException(
        `Admission pass expired at ${new Date(payload.exp * 1000).toISOString()}. Please re-enter the waiting room.`,
      );
    }

    // 4. Validate Student Identity Binding
    const incomingStudentId =
      req.user?.studentId ||
      req.headers?.['x-student-id'] ||
      req.body?.studentId ||
      req.query?.studentId ||
      req.params?.studentId;

    if (incomingStudentId && incomingStudentId !== payload.studentId) {
      this.logger.warn(
        `Token theft / mismatch detected! Token student: ${payload.studentId}, Request student: ${incomingStudentId}`,
      );
      throw new ForbiddenException(
        'Admission pass token does not match the authenticated student identity.',
      );
    }

    // 5. Validate Session Binding
    const incomingSessionId =
      req.params?.sessionId ||
      req.body?.sessionId ||
      req.query?.sessionId ||
      req.headers?.['x-session-id'];

    if (incomingSessionId && incomingSessionId !== payload.sessionId) {
      throw new ForbiddenException(
        'Admission pass is not valid for this booking session.',
      );
    }

    // 6. Attach verified admission pass to request context
    req.admissionPass = payload;
    if (!req.user) {
      req.user = { studentId: payload.studentId, tenantId: payload.tenantId };
    }

    return true;
  }

  /**
   * Extract token from Fastify or Express request headers / cookies
   */
  private extractToken(req: any): string | null {
    if (req.headers?.['x-admission-pass']) {
      return req.headers['x-admission-pass'];
    }

    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (req.cookies?.admission_pass) {
      return req.cookies.admission_pass;
    }

    if (req.query?.admissionPass) {
      return req.query.admissionPass;
    }

    return null;
  }

  /**
   * Fast, In-Memory Cryptographic Token Verifier (HMAC-SHA256)
   */
  public verifyPassToken(token: string): AdmissionTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed admission pass token structure.');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const content = `${headerB64}.${payloadB64}`;

    // Compute expected HMAC-SHA256
    const hmac = crypto.createHmac('sha256', VWR_CONSTANTS.JWT_SECRET);
    hmac.update(content);
    const expectedSignature = hmac.digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signatureB64);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid admission pass signature. Cryptographic check failed.');
    }

    try {
      const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      return JSON.parse(decodedJson) as AdmissionTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid admission pass payload encoding.');
    }
  }

  /**
   * Cryptographically Sign an Admission Pass
   */
  public static signPassToken(
    payload: Omit<AdmissionTokenPayload, 'iat' | 'iss' | 'nonce'>,
    secret: string = VWR_CONSTANTS.JWT_SECRET,
  ): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const fullPayload: AdmissionTokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: 'hostel-vwr-engine',
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const content = `${headerB64}.${payloadB64}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(content);
    const signatureB64 = hmac.digest('base64url');

    return `${content}.${signatureB64}`;
  }

  /**
   * Revoke / Consume an active pass upon successful booking completion.
   * Atomically evicts the student from the active set and deletes their admission key,
   * immediately freeing up a slot for the next student in line.
   */
  public async revokePass(tenantId: string, sessionId: string, studentId: string): Promise<boolean> {
    const activeSetKey = VWR_CONSTANTS.KEYS.ACTIVE_SET(tenantId, sessionId);
    const activeExpKey = VWR_CONSTANTS.KEYS.ACTIVE_EXPIRY_ZSET(tenantId, sessionId);
    const passKey = VWR_CONSTANTS.KEYS.ADMISSION_PASS(tenantId, sessionId, studentId);

    const result = await this.redisService.evalScript<number>(
      REVOKE_ADMISSION_PASS_LUA,
      [activeSetKey, activeExpKey, passKey],
      [studentId],
    );

    this.logger.log(`Admission pass revoked for student: ${studentId} in session: ${sessionId}`);
    return result > 0;
  }
}
