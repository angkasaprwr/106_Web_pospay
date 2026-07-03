import { api } from './api';

const ARREAR_STATUSES = ['UNPAID', 'OVERDUE', 'PARTIAL'];

function buildArrearsMap(bills) {
  const map = {};
  bills.forEach((b) => {
    if (!ARREAR_STATUSES.includes(b.status)) return;
    const sid = b.studentId || b.student?.id;
    if (!sid) return;
    if (!map[sid]) map[sid] = { amount: 0, count: 0 };
    map[sid].amount += Math.max(0, Number(b.amount) - Number(b.paidAmount || 0) - Number(b.discount || 0));
    map[sid].count += 1;
  });
  return map;
}

export async function fetchTunggakanStats() {
  const [billsRes, pendingRes, approvedRes] = await Promise.all([
    api.get('/bills?limit=100'),
    api.get('/dispensations?status=PENDING&limit=1&page=1'),
    api.get('/dispensations?status=APPROVED&limit=100'),
  ]);
  const arrears = buildArrearsMap(billsRes.data.data);
  const studentIds = Object.keys(arrears);
  const totalNominal = studentIds.reduce((s, id) => s + arrears[id].amount, 0);
  const approvedStudents = new Set(approvedRes.data.data.map((d) => d.studentId));
  return {
    totalStudents: studentIds.length,
    totalNominal,
    pendingDisp: pendingRes.data.meta?.total || 0,
    approvedStudents: approvedStudents.size,
  };
}
