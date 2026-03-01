/**
 * k6 — GET inbox + POST approve
 * Cada iteracao: busca um item no inbox e aprova (ate acabar steps pendentes).
 * Cenario: rampa 30s, sustentacao 2min, rampa 15s.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COMPANY_ID = __ENV.COMPANY_ID || 'c1000000-0000-4000-8000-000000000001';
const USER_ID = __ENV.USER_ID || 'c1000000-0000-4000-8000-000000000001';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 5 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const headers = {
    'X-Company-ID': COMPANY_ID,
    'X-User-ID': USER_ID,
  };

  const inboxRes = http.get(`${BASE_URL}/v1/approvals/inbox?page=1&limit=1`, { headers });

  if (inboxRes.status !== 200) {
    check(inboxRes, { 'inbox status 200': () => false });
    sleep(1);
    return;
  }

  let body;
  try {
    body = JSON.parse(inboxRes.body);
  } catch {
    sleep(1);
    return;
  }

  if (!body.items || body.items.length === 0) {
    sleep(0.5);
    return;
  }

  const { instanceId, stepId } = body.items[0];
  const approveRes = http.post(
    `${BASE_URL}/v1/approvals/instances/${instanceId}/steps/${stepId}/approve`,
    null,
    { headers },
  );

  const ok =
    (approveRes.status >= 200 && approveRes.status < 300) ||
    [403, 404, 409, 422].includes(approveRes.status);
  if (!ok && __ITER === 0 && __VU === 1) {
    console.log(`[approve] status=${approveRes.status} body=${approveRes.body?.slice(0, 200)}`);
  }
  check(approveRes, {
    'approve 2xx ou 403/404/409/422': () => ok,
  });

  sleep(0.5);
}
