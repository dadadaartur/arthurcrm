// Склонения по правилам русского языка:
// getPlural(5, ['задание', 'задания', 'заданий']) → 'заданий'
export function getPlural(n, forms) {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (d > 1 && d < 5) return forms[1]
  if (d === 1) return forms[0]
  return forms[2]
}

// Длительность в человекочитаемом виде: '1 ч 25 мин', '45 мин', 'меньше минуты'
export function formatDuration(ms) {
  if (!ms || ms < 0) return '—'
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'меньше минуты'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}
