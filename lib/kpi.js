export const BANDS = ['none', 'min', 'mid', 'top', 'ultra']
export const BAND_RANK = { none: 0, min: 1, mid: 2, top: 3, ultra: 4 }
export const BAND_LABELS = { none: 'Ниже порога', min: 'Минимум', mid: 'Средний', top: 'Топ', ultra: 'Ультра' }
export const BAND_COLORS = { none: '#f87171', min: '#f97316', mid: '#FFD700', top: '#4ade80', ultra: '#c084fc' }

export function bandFor(value, m) {
  const v = Number(value)
  if (v >= Number(m.thr_ultra)) return 'ultra'
  if (v >= Number(m.thr_top)) return 'top'
  if (v >= Number(m.thr_mid)) return 'mid'
  if (v >= Number(m.thr_min)) return 'min'
  return 'none'
}
export const energyFor = (m, b) => (b === 'none' ? 0 : Number(m['energy_' + b]) || 0)
export const karmaFor = (m, b) => (b === 'none' ? 0 : Number(m['karma_' + b]) || 0)
