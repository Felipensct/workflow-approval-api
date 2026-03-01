/**
 * k6 — GET /v1/instances/:id/timeline
 * Setup: obtém lista de instance IDs (instâncias existentes).
 * Cenário: rampa 30s, sustentação 2min, rampa 15s.
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

export function setup() {
  const headers = {
    'X-Company-ID': COMPANY_ID,
    'X-User-ID': USER_ID,
  };
  const res = http.get(`${BASE_URL}/v1/instances?limit=100`, { headers });
  if (res.status !== 200) {
    return { instanceIds: [] };
  }
  try {
    const body = JSON.parse(res.body);
    const list = Array.isArray(body) ? body : body.data || body.items || [];
    const ids = list.map((i) => i.id).filter(Boolean);
    return { instanceIds: ids.length ? ids : [] };
  } catch {
    return { instanceIds: [] };
  }
}

export default function (data) {
  const instanceIds = data.instanceIds || [];
  if (instanceIds.length === 0) {
    sleep(1);
    return;
  }

  const id = instanceIds[__VU % instanceIds.length];
  const res = http.get(`${BASE_URL}/v1/instances/${id}/timeline`, {
    headers: {
      'X-Company-ID': COMPANY_ID,
      'X-User-ID': USER_ID,
    },
  });

  check(res, {
    'status 200 ou 404': (r) => r.status === 200 || r.status === 404,
    'body valido (200)': (r) => {
      if (r.status !== 200) return true;
      try {
        const b = JSON.parse(r.body);
        return Array.isArray(b.steps);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
