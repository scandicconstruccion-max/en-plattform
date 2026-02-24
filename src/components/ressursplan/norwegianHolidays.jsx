import { getYear, isSameDay } from 'date-fns';

// Calculate Easter for a given year using Meeus/Jones/Butcher algorithm
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getNorwegianHolidays(year) {
  const easter = getEasterDate(year);
  
  const holidays = [
    { date: new Date(year, 0, 1), name: 'Nyttårsdag' },
    { date: new Date(easter.getTime() - 3 * 24 * 60 * 60 * 1000), name: 'Skjærtorsdag' },
    { date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), name: 'Langfredag' },
    { date: easter, name: '1. påskedag' },
    { date: new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000), name: '2. påskedag' },
    { date: new Date(year, 4, 1), name: '1. mai' },
    { date: new Date(year, 4, 17), name: '17. mai' },
    { date: new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000), name: 'Kr. himmelfart' },
    { date: new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000), name: '1. pinsedag' },
    { date: new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000), name: '2. pinsedag' },
    { date: new Date(year, 11, 25), name: '1. juledag' },
    { date: new Date(year, 11, 26), name: '2. juledag' }
  ];

  return holidays;
}

export function isNorwegianHoliday(date) {
  const year = getYear(date);
  const holidays = getNorwegianHolidays(year);
  return holidays.some(holiday => isSameDay(holiday.date, date));
}

export function getHolidayName(date) {
  const year = getYear(date);
  const holidays = getNorwegianHolidays(year);
  const holiday = holidays.find(h => isSameDay(h.date, date));
  return holiday?.name || null;
}