export const BANDS = ['none', 'min', 'mid', 'top', 'ultra']
export const BAND_RANK = { none: 0, min: 1, mid: 2, top: 3, ultra: 4 }
export const BAND_LABELS = { none: 'Ниже порога', min: 'Минимум', mid: 'Средний', top: 'Топ', ultra: 'Ультра' }
export const BAND_COLORS = { none: '#f87171', min: '#f97316', mid: '#FFD700', top: '#4ade80', ultra: '#c084fc' }
export const TYPE_LABELS = {
  cumulative: 'Накопительное (сумма)', average: 'Среднее за период', ratio: 'Доля / конверсия',
  inverse: 'Инверсия (меньше — лучше)', plan: 'Процент выполнения плана', dynamics: 'Динамика (прирост)',
  binary: 'Бинарный (да/нет в %)', min_period: 'Накопит. с минимумом в днях', rating: 'Рейтинг в команде', weighted: 'Взвешенный индекс'
}
export const energyFor = (m, b) => (b === 'none' ? 0 : Number(m['energy_' + b]) || 0)
export const karmaFor = (m, b) => (b === 'none' ? 0 : Number(m['karma_' + b]) || 0)

// Порог с учётом направления (инверсия = «меньше — лучше»)
export function bandFor(value, m) {
  const v = Number(value)
  const inv = m.kpi_type === 'inverse'
  const hit = (a, b) => (inv ? a <= b : a >= b)
  if (hit(v, Number(m.thr_ultra))) return 'ultra'
  if (hit(v, Number(m.thr_top))) return 'top'
  if (hit(v, Number(m.thr_mid))) return 'mid'
  if (hit(v, Number(m.thr_min))) return 'min'
  return 'none'
}

// Расчёт значения показателя за произвольный период по его типу.
// Возвращает { value, scale, gate }: scale — во сколько раз растянуть пороги,
// gate=false — провален обязательный дневной минимум.
export function rangeValue(m, entries) {
  const list = (entries || []).map(e => Number(e.value))
  if (!list.length) return null
  const days = new Set((entries || []).map(e => e.entry_date)).size || 1
  const sum = list.reduce((s, v) => s + v, 0)
  const avg = sum / list.length
  const r2 = x => Math.round(x * 100) / 100
  switch (m.kpi_type) {
    case 'average': case 'ratio': case 'plan': case 'rating': case 'weighted': case 'inverse':
      return { value: r2(avg), scale: 1 }
    case 'dynamics': {
      const first = list[0] || 0
      return { value: first ? r2(((list[list.length - 1] - first) / first) * 100) : 0, scale: 1 }
    }
    case 'min_period': {
      const ok = list.every(v => bandFor(v, m) !== 'none')
      return { value: sum, scale: days, gate: ok }
    }
    default: // cumulative, binary
      return { value: sum, scale: days }
  }
}
