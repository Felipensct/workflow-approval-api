/**
 * k6 — GET /v1/approvals/inbox
 * Cenário: rampa 30s, sustentação 2min, rampa 15s.
 * Headers: X-Company-ID, X-User-ID (tenant obrigatório).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COMPANY_ID = __ENV.COMPANY_ID || 'c1000000-0000-4000-8000-000000000001';
const USER_ID = __ENV.USER_ID || 'c1000000-0000-4000-8000-000000000001';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/v1/approvals/inbox?page=1&limit=20`, {
    headers: {
      'X-Company-ID': COMPANY_ID,
      'X-User-ID': USER_ID,
    },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'body has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items) && typeof body.total === 'number';
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
