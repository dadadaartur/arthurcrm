export const BANDS = ['none', 'min', 'mid', 'top', 'ultra']
export const BAND_RANK = { none: 0, min: 1, mid: 2, top: 3, ultra: 4 }
export const BAND_LABELS = { none: 'Ниже порога', min: 'Минимум', mid: 'Средний', top: 'Топ', ultra: 'Ультра' }
export const BAND_COLORS = { none: '#f87171', min: '#f97316', mid: '#FFD700', top: '#4ade80', ultra: '#c084fc' }
export const TYPE_LABELS = {
  cumulative: 'Накопительное (сумма)', average: 'Среднее за период', ratio: 'Доля / конверсия',
  inverse: 'Инверсия (меньше — лучше)', plan: 'Процент выполнения плана', dynamics: 'Динамика (прирост)',
  binary: 'Бинарный (да/нет в %)', min_period: 'Накопит. с минимумом в днях', rating: 'Рейтинг в команде', weighted: 'Взвешенный индекс'
}

// ============================================================================
// Гибкие пороги (см. migrations/005_flexible_kpi_thresholds.sql).
//
// РАНЬШЕ у каждого показателя было ровно 4 жёстко зашитых столбца-порога
// (thr_min/thr_mid/thr_top/thr_ultra + парные energy_*/karma_*) — руководитель
// не мог задать своё число уровней. ТЕПЕРЬ показатель может хранить
// произвольный список порогов в m.thresholds (JSONB). Если он не задан —
// ничего не меняется: синтезируем те же 4 уровня из старых столбцов, как и
// раньше, — старые показатели работают без единой правки в БД.
//
// ВАЖНО: вся остальная логика в этом файле и во всём проекте должна читать
// пороги только через resolveThresholds()/bandRankOf() ниже, а не напрямую
// через m.thr_min и не через статический BAND_RANK[key] — эти два способа
// продолжают экспортироваться (используются как раскраска/подписи 4
// стандартных уровней и как дефолтный шаблон при создании показателя), но
// сравнивать «достиг ли сотрудник нужного уровня» надо через bandRankOf,
// иначе кастомные пороги с другим числом уровней или другими названиями
// будут сравниваться неправильно.
// ============================================================================

/**
 * Список порогов показателя, от самого мягкого к самому строгому.
 * m.thresholds (кастомный список) в приоритете; если не задан — 4
 * стандартных уровня из старых столбцов thr_min, thr_mid и т.д.
 *
 * ВАЖНО: энергия больше НЕ хранится и не редактируется админом (по вашей
 * просьбе от 27 августа 2026 — «не давать возможность редактировать
 * энергию»). Она всегда вычисляется по рангу строгости уровня: +1 —
 * обычным уровням, +2 — предпоследнему («топ»/«макс»), +3 — самому
 * строгому («ультра»). Работает для любого числа кастомных уровней, не
 * только для стандартных четырёх — старые столбцы energy_min/mid/top/
 * ultra и поле energy в кастомных уровнях теперь просто игнорируются.
 */
export function resolveThresholds(m) {
  let tiers
  if (Array.isArray(m?.thresholds) && m.thresholds.length > 0) {
    tiers = m.thresholds.map(t => ({
      key: t.key,
      label: t.label || t.key,
      value: Number(t.value) || 0,
      color: t.color || BAND_COLORS.mid,
      karma: Number(t.karma) || 0,
    }))
  } else {
    tiers = ['min', 'mid', 'top', 'ultra'].map(key => ({
      key,
      label: BAND_LABELS[key],
      value: Number(m?.['thr_' + key]) || 0,
      color: BAND_COLORS[key],
      karma: Number(m?.['karma_' + key]) || 0,
    }))
  }
  const inv = m?.kpi_type === 'inverse'
  const byRank = [...tiers].sort((a, b) => (inv ? b.value - a.value : a.value - b.value))
  const n = byRank.length
  const energyOf = {}
  byRank.forEach((t, idx) => {
    const rank = idx + 1
    energyOf[t.key] = rank === n ? 3 : rank === n - 1 ? 2 : 1
  })
  return tiers.map(t => ({ ...t, energy: energyOf[t.key] }))
}

/**
 * Ранг достигнутого порога: 0 — «none» (ниже всех порогов), 1 — самый
 * мягкий настроенный уровень, дальше по возрастанию строгости до N (самый
 * строгий). В отличие от статического BAND_RANK[key], работает для любого
 * числа кастомных порогов с любыми названиями — используйте эту функцию
 * везде, где нужно сравнить «дотянул ли сотрудник до уровня X» (было:
 * BAND_RANK[band] >= BAND_RANK.min, стало: bandRankOf(m, band) >=
 * bandRankOf(m, 'min')).
 */
export function bandRankOf(m, bandKey) {
  if (!bandKey || bandKey === 'none') return 0
  const inv = m?.kpi_type === 'inverse'
  const sorted = [...resolveThresholds(m)].sort((a, b) => (inv ? b.value - a.value : a.value - b.value))
  const idx = sorted.findIndex(t => t.key === bandKey)
  return idx === -1 ? 0 : idx + 1
}

export const energyFor = (m, bandKey) => {
  if (!bandKey || bandKey === 'none') return 0
  const t = resolveThresholds(m).find(x => x.key === bandKey)
  return t ? Number(t.energy) || 0 : 0
}
export const karmaFor = (m, bandKey) => {
  if (!bandKey || bandKey === 'none') return 0
  const t = resolveThresholds(m).find(x => x.key === bandKey)
  return t ? Number(t.karma) || 0 : 0
}

// Порог с учётом направления (инверсия = «меньше — лучше»). Идёт от самого
// строгого уровня к самому мягкому и возвращает первый, до которого
// «дотянулось» значение — поведенчески идентично старой версии для
// стандартных 4 уровней (просто больше не завязано на фиксированные имена
// столбцов), и корректно работает для любого числа кастомных порогов.
export function bandFor(value, m) {
  const v = Number(value)
  const inv = m?.kpi_type === 'inverse'
  const hit = (a, b) => (inv ? a <= b : a >= b)
  const sorted = [...resolveThresholds(m)].sort((a, b) => (inv ? a.value - b.value : b.value - a.value))
  for (const t of sorted) {
    if (hit(v, t.value)) return t.key
  }
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
