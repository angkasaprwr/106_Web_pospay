const { prisma } = require('../../config/prisma');

const DEFAULT_HOURS = [
  { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '15:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '15:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '15:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '15:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '11:30' },
  { dayOfWeek: 6, isOpen: false, openTime: '08:00', closeTime: '12:00' },
  { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '12:00' },
];

async function list() {
  const rows = await prisma.workingHour.findMany({ orderBy: { dayOfWeek: 'asc' } });
  if (rows.length === 0) return DEFAULT_HOURS;
  return rows;
}

async function upsertMany(items) {
  const ops = items.map((it) =>
    prisma.workingHour.upsert({
      where: { dayOfWeek: it.dayOfWeek },
      update: { isOpen: it.isOpen, openTime: it.openTime, closeTime: it.closeTime },
      create: { dayOfWeek: it.dayOfWeek, isOpen: it.isOpen, openTime: it.openTime, closeTime: it.closeTime },
    }),
  );
  await prisma.$transaction(ops);
  return list();
}

function timeToMinutes(str) {
  const [h, m] = String(str).split(':').map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}

async function isWithinWorkingHours(date = new Date()) {
  const hours = await list();
  const day = date.getDay();
  const today = hours.find((h) => h.dayOfWeek === day);
  if (!today || !today.isOpen) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= timeToMinutes(today.openTime) && now <= timeToMinutes(today.closeTime);
}

async function getSummary() {
  const hours = await list();
  const weekday = hours.filter((h) => h.isOpen && h.dayOfWeek >= 1 && h.dayOfWeek <= 5);
  const isOpen = await isWithinWorkingHours();
  if (!weekday.length) {
    return { isOpen, range: '-', label: 'Jam Kerja Tidak Aktif' };
  }
  const openTime = weekday[0].openTime.replace(':', '.');
  const closeTime = weekday[0].closeTime.replace(':', '.');
  return {
    isOpen,
    range: `${openTime} - ${closeTime} WIB`,
    label: isOpen ? 'Jam Kerja Aktif' : 'Di Luar Jam Kerja',
    openTime: weekday[0].openTime,
    closeTime: weekday[0].closeTime,
  };
}

module.exports = { list, upsertMany, isWithinWorkingHours, getSummary, DEFAULT_HOURS };
