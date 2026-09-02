import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Security & Resilience Auditing Tests', () => {
  it('should reject invalid or malicious input payloads with HTTP 400 Bad Request', async () => {
    const res = await request(app)
      .post('/generate')
      .send({
        tenantId: '', // Invalid empty tenantId
        inputTokens: -500, // Invalid negative tokens count
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should safely resist SQL injection attempts in tenant ID and string fields', async () => {
    const sqlInjectionString = "tenant_id' OR '1'='1'; DROP TABLE Tenant; --";
    const res = await request(app)
      .get('/usage')
      .query({ tenantId: sqlInjectionString });

    // Should return 404 or 400 cleanly, without crashing or executing SQL injection
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('should include Helmet HTTP security headers on all responses', async () => {
    const res = await request(app).get('/');

    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
