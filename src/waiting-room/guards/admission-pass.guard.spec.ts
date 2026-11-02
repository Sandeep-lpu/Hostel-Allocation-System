import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AdmissionPassGuard } from './admission-pass.guard';
import { VwrRedisService } from '../redis/redis.service';

describe('AdmissionPassGuard', () => {
  let guard: AdmissionPassGuard;
  let redisService: Partial<VwrRedisService>;

  beforeEach(() => {
    redisService = {
      evalScript: jest.fn().mockResolvedValue(1),
    };
    guard = new AdmissionPassGuard(redisService as VwrRedisService);
  });

  const createMockContext = (
    headers: Record<string, string>,
    user?: any,
    params?: any,
    body?: any,
  ): ExecutionContext => {
    const req: any = {
      headers,
      user,
      params: params || {},
      body: body || {},
      query: {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('should cryptographically sign and verify valid pass tokens in memory', () => {
    const payload = {
      studentId: 'STU-001',
      tenantId: 'tenant-test',
      sessionId: 'session-test',
      admittedAt: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = AdmissionPassGuard.signPassToken(payload);
    const verified = guard.verifyPassToken(token);

    expect(verified.studentId).toBe('STU-001');
    expect(verified.tenantId).toBe('tenant-test');
    expect(verified.sessionId).toBe('session-test');
    expect(verified.iss).toBe('hostel-vwr-engine');
  });

  it('should reject forged or tampered pass tokens', () => {
    const payload = {
      studentId: 'STU-001',
      tenantId: 'tenant-test',
      sessionId: 'session-test',
      admittedAt: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = AdmissionPassGuard.signPassToken(payload);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    expect(() => guard.verifyPassToken(tamperedToken)).toThrow(UnauthorizedException);
  });

  it('should reject expired pass tokens', async () => {
    const payload = {
      studentId: 'STU-001',
      tenantId: 'tenant-test',
      sessionId: 'session-test',
      admittedAt: Math.floor(Date.now() / 1000) - 700,
      exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
    };

    const token = AdmissionPassGuard.signPassToken(payload);
    const context = createMockContext({ 'x-admission-pass': token });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject token if studentId does not match authenticated user', async () => {
    const payload = {
      studentId: 'STU-LEGITIMATE',
      tenantId: 'tenant-test',
      sessionId: 'session-test',
      admittedAt: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = AdmissionPassGuard.signPassToken(payload);
    // Student attempting to use another student's pass
    const context = createMockContext(
      { 'x-admission-pass': token },
      { studentId: 'STU-ATTACKER' },
      { sessionId: 'session-test' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow valid student with matching identity and active session', async () => {
    const payload = {
      studentId: 'STU-AUTHORIZED',
      tenantId: 'tenant-test',
      sessionId: 'session-test',
      admittedAt: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = AdmissionPassGuard.signPassToken(payload);
    const context = createMockContext(
      { 'x-admission-pass': token },
      { studentId: 'STU-AUTHORIZED' },
      { sessionId: 'session-test' },
    );

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
  });

  it('should revoke active pass upon booking completion', async () => {
    const revoked = await guard.revokePass('tenant-test', 'session-test', 'STU-AUTHORIZED');
    expect(revoked).toBe(true);
    expect(redisService.evalScript).toHaveBeenCalled();
  });
});
