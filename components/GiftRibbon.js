import { useState, useRef, useMemo } from 'react'

// «Лента подарков» — вертикальная 3D-прокрутка вместо колеса (по вашей
// просьбе от 31 августа 2026, было «мультяшно», плюс колесо технически
// не крутилось при весе приза 0 — деление на totalWeight давало NaN, и
// CSS просто тихо не применял поворот). Результат всегда уже известен
// от сервера (та же защита от читерства, что была у колеса, эндпоинт
// /api/wheel/spin не переименовывал — это внутреннее имя таблицы, не
// видно пользователю) — лента только красиво докручивается до уже
// определившегося приза.
const ITEM_H = 76
const VIEWPORT_H = ITEM_H * 4.5
const REPEATS = 18 // достаточно длинная лента для долгой явной прокрутки

export default function GiftRibbon({ prizes, onSpin, spinning, result }) {
  const [offset, setOffset] = useState(0)

  // Длинная повторяющаяся лента — устойчива к любым весам призов,
  // порядок выпадения определяется не позицией в ленте (это чистая
  // анимация), а prizeId, который уже вернул сервер.
  const reel = useMemo(() => {
    const arr = []
    for (let i = 0; i < REPEATS; i++) arr.push(...prizes)
    return arr
  }, [prizes])

  const spinTo = (prizeId) => {
    // Берём вхождение приза ближе к концу ленты — гарантирует долгую,
    // явную прокрутку независимо от того, где приз стоит в исходном
    // списке.
    const targetRunStart = prizes.length * (REPEATS - 3)
    let targetIndex = reel.findIndex((p, i) => i >= targetRunStart && p.id === prizeId)
    if (targetIndex === -1) targetIndex = reel.findIndex(p => p.id === prizeId)
    const centerOffset = VIEWPORT_H / 2 - ITEM_H / 2
    setOffset(-(targetIndex * ITEM_H) + centerOffset)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <div style={{ position: 'relative', width: 280, height: VIEWPORT_H, borderRadius: 20, overflow: 'hidden', background: 'var(--bg-page)', border: '1px solid var(--border-gold)', boxShadow: 'inset 0 0 24px rgba(15,23,42,0.06)' }}>
        {/* Окно выбора — фиксированная полоса по центру */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_H, transform: 'translateY(-50%)', borderTop: '2px solid #8a6208', borderBottom: '2px solid #8a6208', background: 'rgba(138,98,8,0.06)', zIndex: 3, pointerEvents: 'none' }} />
        {/* Указатели слева/справа на окно выбора */}
        <div style={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', zIndex: 4, width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '10px solid #8a6208' }} />
        <div style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', zIndex: 4, width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '10px solid #8a6208' }} />

        {/* Сама лента */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          transform: `translateY(${offset}px)`,
          transition: spinning ? 'transform 4.2s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'none',
        }}>
          {reel.map((p, i) => (
            <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${p.color}22`, border: `1px solid ${p.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color }} />}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
            </div>
          ))}
        </div>

        {/* Затухание по краям — ощущение глубины без сложных 3D-трансформов */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'linear-gradient(180deg, var(--bg-page) 0%, transparent 30%, transparent 70%, var(--bg-page) 100%)' }} />
      </div>

      {result ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {result.avatar_url && (
            <img src={result.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', border: `2px solid ${result.color || 'var(--accent-gold)'}` }} />
          )}
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Ваш подарок:</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: result.color || 'var(--accent-gold)' }}>{result.label}</div>
            {result.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 240 }}>{result.description}</div>}
          </div>
        </div>
      ) : (
        <button
          onClick={() => { onSpin(spinTo) }}
          disabled={spinning}
          className="btn-gold"
          style={{ minWidth: 180, opacity: spinning ? 0.6 : 1, cursor: spinning ? 'default' : 'pointer' }}
        >
          {spinning ? 'Крутится...' : 'Прокрутить ленту'}
        </button>
      )}
    </div>
  )
}
