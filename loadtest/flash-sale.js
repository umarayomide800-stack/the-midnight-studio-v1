import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000';
const slotId = __ENV.SLOT_ID || 'replace-with-staging-slot-id';
const categoryId = __ENV.TICKET_CATEGORY_ID || 'replace-with-staging-category-id';

export const options = {
  scenarios: {
    flash_sale: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 20, duration: '30s' },
        { target: 60, duration: '60s' },
        { target: 0, duration: '15s' }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
    hold_conflicts: ['count>0']
  }
};

const holdConflicts = new Counter('hold_conflicts');
const holdSuccessRate = new Rate('hold_success_rate');
const holdLatency = new Trend('hold_latency');

export default function () {
  const shows = http.get(`${baseUrl}/api/v1/shows`);
  check(shows, { 'shows responds': (response) => response.status === 200 });

  const availability = http.get(`${baseUrl}/api/v1/shows/the-black-salt-oath/timeslots?date=${__ENV.DATE || '2026-10-31'}`);
  check(availability, { 'availability responds': (response) => response.status === 200 });

  const startedAt = Date.now();
  const hold = http.post(`${baseUrl}/api/v1/bookings/hold-slot`, JSON.stringify({
    slotId,
    customerName: `Load Test ${__VU}-${__ITER}`,
    customerEmail: `load-${__VU}-${__ITER}@example.test`,
    tickets: [{ ticketCategoryId: categoryId, quantity: 1 }]
  }), { headers: { 'Content-Type': 'application/json' } });
  holdLatency.add(Date.now() - startedAt);
  holdSuccessRate.add(hold.status === 201);
  if (hold.status === 409) holdConflicts.add(1);
  check(hold, { 'hold is accepted or capacity-limited': (response) => response.status === 201 || response.status === 409 });
  sleep(1);
}
