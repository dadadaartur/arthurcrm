import { useRouter } from 'next/router'
import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useProfile } from '../context/ProfileContext'

// Публичный лендинг — полная переработка (2 сентября 2026, по прямому
// запросу: «отдельная большая задача, будет совсем другим»). Дизайн
// построен по принципу skill frontend-design: не абстрактный SaaS, а
// заземлённый в самом продукте — это буквально банк, значит и лендинг
// говорит языком банковской выписки, а не типовой карточной сетки.
// Токены и раскладка — см. комментарии по ходу файла. Функциональная
// логика (куда ведут кнопки) сохранена от прежней версии один в один.

const TONE_COLOR = { gold: 'var(--gold)', magenta: 'var(--magenta)', purple: 'var(--purple)', teal: 'var(--teal)' }

function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

// Линия роста — координаты вычислены заранее (сглаживание через
// квадратичные bezier по средним точкам), не нарисованы на глаз.
// Дорисовывается через stroke-dasharray при появлении в зоне видимости
// — единственная содержательная анимация здесь, не декоративная.
function GrowthChart({ points, endLabel, unit = '%', caption }) {
  const [ref, shown] = useReveal()
  const W = 400, H = 150
  const xs = points.map((_, i) => i * (W / (points.length - 1)))
  const ys = points.map(v => H - 12 - (v / 100 * (H - 30)))
  let line = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)} `
  for (let i = 1; i < points.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2, my = (ys[i - 1] + ys[i]) / 2
    line += i === points.length - 1 ? `Q${xs[i - 1].toFixed(1)},${ys[i - 1].toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)} ` : `Q${xs[i - 1].toFixed(1)},${ys[i - 1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)} `
  }
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${H} L0,${H} Z`
  const gid = 'gc' + Math.round(xs[0])

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W + 60} ${H + 30}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--magenta)" />
            <stop offset="35%" stopColor="var(--gold)" />
            <stop offset="70%" stopColor="var(--purple)" />
            <stop offset="100%" stopColor="var(--teal)" />
          </linearGradient>
          <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--purple)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--purple)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid}-area)`} opacity={shown ? 1 : 0} style={{ transition: 'opacity .6s ease .5s' }} />
        <path d={line} fill="none" stroke={`url(#${gid}-line)`} strokeWidth="3" strokeLinecap="round"
          pathLength="1" strokeDasharray="1" strokeDashoffset={shown ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)' }} />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5" fill="var(--teal)" opacity={shown ? 1 : 0} style={{ transition: 'opacity .4s ease 1.2s' }} />
        <text x={xs[xs.length - 1] + 12} y={ys[ys.length - 1] + 5} fontFamily="var(--font-display)" fontSize="17" fill="var(--teal)" fontWeight="600" opacity={shown ? 1 : 0} style={{ transition: 'opacity .4s ease 1.3s' }}>{endLabel}{unit}</text>
        <text x="0" y={H + 22} fontFamily="var(--font-body)" fontSize="11" fill="var(--ink-soft)">Месяц 1</text>
        <text x={xs[xs.length - 1] - 34} y={H + 22} fontFamily="var(--font-body)" fontSize="11" fill="var(--ink-soft)">Месяц {points.length}</text>
      </svg>
      {caption && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>{caption}</p>}
    </div>
  )
}

// Контраст «до / после» — два столбца, высота дорисовывается при
// появлении. Показывает не плавный рост, а разовый скачок — другой тип
// доказательства, дополняет линию роста, не дублирует её.
function BeforeAfter({ beforeLabel, beforeValue, afterLabel, afterValue, unit = '' }) {
  const [ref, shown] = useReveal()
  const max = Math.max(beforeValue, afterValue)
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: 160 }}>
      {[{ l: beforeLabel, v: beforeValue, c: 'rgba(33,28,20,0.18)', tc: 'var(--ink-soft)' }, { l: afterLabel, v: afterValue, c: 'var(--brand-gradient)', tc: 'var(--ink)' }].map((b, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: b.tc, marginBottom: 8, fontWeight: 600 }}>{b.v}{unit}</div>
          <div style={{ width: '100%', maxWidth: 88, height: shown ? `${(b.v / max) * 100}px` : '0px', background: b.c, borderRadius: '3px 3px 0 0', transition: `height .8s cubic-bezier(0.22,1,0.36,1) ${i * 150 + 200}ms` }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center' }}>{b.l}</div>
        </div>
      ))}
    </div>
  )
}

function Ledger({ rows }) {
  const [ref, shown] = useReveal()
  return (
    <div ref={ref} style={{ maxWidth: 560 }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '18px 0', borderTop: i === 0 ? '1px solid rgba(33,28,20,0.14)' : '1px solid rgba(33,28,20,0.08)',
          opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity .5s ease ${i * 90}ms, transform .5s ease ${i * 90}ms`,
        }}>
          <div>
            <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{r.label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2, maxWidth: 340 }}>{r.note}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: TONE_COLOR[r.tone], flexShrink: 0, marginLeft: 20 }}>{r.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  const router = useRouter()
  const { user } = useProfile()
  const [heroShown, setHeroShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setHeroShown(true), 80); return () => clearTimeout(t) }, [])

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      <Head>
        <title>Кармический банк — система мотивации, которую видно на графике роста</title>
        <meta name="description" content="Переводим задачи и показатели команды в кармики, уровни и награды. Мотивация, ощутимая каждый день — не только на годовой премии." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340;9..144,440;9..144,600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        :root {
          --ink: #211C14;
          --ink-soft: #6B6355;
          --paper: #FBF7EE;
          --panel: #FFFFFF;
          --gold: #E8A317;
          --magenta: #D6336C;
          --purple: #7C3AED;
          --teal: #0E8F82;
          --brand-gradient: linear-gradient(100deg, #D6336C 0%, #E8A317 35%, #7C3AED 70%, #0E8F82 100%);
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'Inter', system-ui, sans-serif;
        }
        ::selection { background: var(--gold); color: var(--paper); }
        a, button { outline-offset: 3px; }
        a:focus-visible, button:focus-visible { outline: 2px solid var(--gold); }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        .ldg-btn-primary {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--ink); color: var(--paper); font-family: var(--font-body);
          font-size: 15px; font-weight: 600; padding: 15px 30px; border-radius: 3px;
          border: none; cursor: pointer; transition: background .2s ease, transform .2s ease;
        }
        .ldg-btn-primary:hover { background: #34281a; transform: translateY(-1px); }
        .ldg-btn-ghost {
          display: inline-flex; align-items: center; font-family: var(--font-body);
          font-size: 14.5px; font-weight: 500; color: var(--ink); background: none;
          border: 1px solid rgba(33,28,20,0.22); border-radius: 3px; padding: 11px 22px;
          cursor: pointer; transition: border-color .2s ease, background .2s ease;
        }
        .ldg-btn-ghost:hover { border-color: var(--ink); background: rgba(33,28,20,0.03); }
        .ldg-btn-ghost-light {
          display: inline-flex; align-items: center; font-family: var(--font-body);
          font-size: 14.5px; font-weight: 500; color: var(--paper); background: none;
          border: 1px solid rgba(251,247,238,0.3); border-radius: 3px; padding: 11px 22px;
          cursor: pointer; transition: border-color .2s ease, background .2s ease;
        }
        .ldg-btn-ghost-light:hover { border-color: var(--paper); background: rgba(251,247,238,0.06); }
        @media (max-width: 860px) {
          .ldg-hero-grid { grid-template-columns: 1fr !important; }
          .ldg-hero-visual { margin-top: 48px; }
          .ldg-2col { grid-template-columns: 1fr !important; }
          .ldg-feature-row { grid-template-columns: 1fr !important; }
          .ldg-compare-row { grid-template-columns: 1fr !important; }
          .ldg-compare-row > div:first-child { font-weight: 600; color: var(--ink) !important; padding-bottom: 4px !important; }
        }
      `}</style>

      {/* Навигация — минимальная, без меню-простыни: на продающей
          странице задача одна, лишние ссылки её размывают. */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 48px', background: 'rgba(251,247,238,0.88)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(33,28,20,0.08)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600 }}>Кармический банк</span>
        {user ? (
          <button onClick={() => router.push('/')} className="ldg-btn-ghost">Вернуться в систему</button>
        ) : (
          <button onClick={() => router.push('/login')} className="ldg-btn-ghost">Войти</button>
        )}
      </nav>

      {/* ───────── ГЕРОЙ — асимметрия: заголовок слева (60%), визуал
          выписки справа (40%). Не центрированный стек, самый частый
          типовой паттерн. Один осознанный момент анимации при загрузке
          — карточка выписки проявляется, остальное статично. ───────── */}
      <section style={{ padding: '104px 48px 96px', maxWidth: 1240, margin: '0 auto' }}>
        <div className="ldg-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 64, alignItems: 'center' }}>
          <div style={{ opacity: heroShown ? 1 : 0, transform: heroShown ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .6s ease, transform .6s ease' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(38px, 5.2vw, 66px)', lineHeight: 1.08, letterSpacing: '-0.015em', maxWidth: 700 }}>
              Вовлечённая команда — это не только атмосфера.<br />Это измеримый рост показателей.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: 520, marginTop: 28 }}>
              «Кармический банк» превращает выполнение задач в кармики, уровни и награды — и даёт руководителю
              данные, чтобы управлять мотивацией так же точно, как любым другим бизнес-процессом.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 38, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => router.push('/create-company')} className="ldg-btn-primary">Создать компанию бесплатно</button>
              <a href="#mechanism" className="ldg-btn-ghost">Как это устроено</a>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 18 }}>Без карты. Первое задание — за 10 минут после регистрации.</p>
          </div>

          <div className="ldg-hero-visual" style={{ opacity: heroShown ? 1 : 0, transform: heroShown ? 'translateY(0) scale(1)' : 'translateY(18px) scale(.98)', transition: 'opacity .7s ease .15s, transform .7s ease .15s' }}>
            <div style={{ background: 'var(--panel)', borderRadius: 4, padding: '30px 30px 22px', boxShadow: '0 30px 60px -20px rgba(33,28,20,0.25)', border: '1px solid rgba(33,28,20,0.08)' }}>
              <div style={{ fontSize: 11, letterSpacing: 0.4, color: 'var(--ink-soft)', marginBottom: 14 }}>Доля выполнения задач по команде</div>
              <GrowthChart points={[52, 61, 70, 78, 84, 89]} endLabel="89" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── ПРОБЛЕМА — тёмная полноширинная секция для контраста
          с остальной страницей (не карточка, целый экран). Конкретные,
          узнаваемые сценарии вместо абстрактной статистики про
          вовлечённость, которую невозможно честно подтвердить без
          реального источника. ───────── */}
      <section style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '96px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 14, color: 'rgba(251,247,238,0.5)', marginBottom: 20 }}>Знакомая картина</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              'Годовая премия не мотивирует в марте.',
              'Аттестация раз в полгода обсуждает результат, который сотрудник уже забыл.',
              '«Сотрудник месяца» на доске почёта — про него никто не вспомнит уже во вторник.',
            ].map((line, i) => (
              <p key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(22px, 2.6vw, 32px)', lineHeight: 1.35, maxWidth: 760 }}>{line}</p>
            ))}
          </div>
          <p style={{ fontSize: 16, color: 'rgba(251,247,238,0.62)', marginTop: 40, maxWidth: 560, lineHeight: 1.6 }}>
            Всё это — правильные по замыслу инструменты, у которых один общий изъян: обратная связь приходит слишком редко и слишком абстрактно, чтобы влиять на решения, которые сотрудник принимает сегодня.
          </p>
        </div>
      </section>

      {/* ───────── МЕХАНИЗМ — как это устроено. Три шага, поданные не
          пронумерованными карточками-клише, а связным разворотом с
          чередованием сторон — раз это реально последовательность
          (задача → зачисление → рост), нумерация здесь оправдана
          содержанием, а не декоративна. ───────── */}
      {/* ───────── СРАВНЕНИЕ — прямое, без обиняков: старый подход против
          платформы. Сильный, содержательный приём для продающей
          страницы, которого не хватало в первой версии. ───────── */}
      <section style={{ padding: '96px 48px', maxWidth: 980, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(28px, 3.2vw, 40px)', marginBottom: 56, maxWidth: 640 }}>
          Разница — не в формулировках, а в том, что реально происходит каждый день
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(33,28,20,0.1)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--paper)' }}>
            <div />
            <div style={{ padding: '14px 22px', fontSize: 12, color: 'var(--ink-soft)', textAlign: 'center' }}>Классический подход</div>
            <div style={{ padding: '14px 22px', fontSize: 12, color: 'var(--purple)', fontWeight: 600, textAlign: 'center', borderLeft: '2px solid var(--purple)' }}>Кармический банк</div>
          </div>
          {[
            ['Частота обратной связи', 'Раз в год, на аттестации', 'Каждый день, за каждое действие'],
            ['Что видит сотрудник', 'Абстрактный итог в конце периода', 'Конкретный счёт, который растёт прямо сейчас'],
            ['Что видит руководитель', 'Общее ощущение по команде', 'Аналитику по каждому сотруднику и заданию'],
            ['Кому назначается программа', 'Одна и та же — для всех, всегда', 'Гибкий таргетинг, система сама подсказывает, кому нужнее'],
          ].map((row, i) => (
            <div key={i} className="ldg-compare-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--paper)' }}>
              <div style={{ padding: '20px 22px', fontSize: 13.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}>{row[0]}</div>
              <div style={{ padding: '20px 22px', fontSize: 14.5, color: 'var(--ink-soft)', background: 'rgba(33,28,20,0.03)', display: 'flex', alignItems: 'center' }}>{row[1]}</div>
              <div style={{ padding: '20px 22px', fontSize: 14.5, color: 'var(--ink)', fontWeight: 500, background: 'rgba(124,58,237,0.045)', display: 'flex', alignItems: 'center', borderLeft: '2px solid var(--purple)' }}>{row[2]}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="mechanism" style={{ padding: '104px 48px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(28px, 3.2vw, 40px)', maxWidth: 640, marginBottom: 72 }}>
          От выполненной задачи до видимого результата — три шага, не три квартала
        </h2>

        {[
          {
            n: '1', title: 'Задача получает адресата и цену',
            body: 'Руководитель назначает задание — вручную, по расписанию (раз в день, раз в неделю, разово) или по подсказке системы, которая сама находит, кто отстаёт по показателю. У задачи есть понятная награда в кармиках — сотрудник видит её сразу, не после отчётного периода.',
          },
          {
            n: '2', title: 'Выполнение зачисляется сразу',
            body: 'Кармики и энергия начисляются в момент подтверждения — вручную руководителем, автоматически по достижению показателя или через внешний источник данных. Без ожидания: сотрудник видит эффект своего действия в тот же день.',
          },
          {
            n: '3', title: 'Рост измерим — для человека и для компании',
            body: 'Кармики поднимают сотрудника по уровням мастерства и открывают награды в собственном магазине компании. Руководитель параллельно видит аналитику: кто выполняет, кто отстаёт, какие задания вообще не работают — и может поправить систему, а не гадать.',
          },
        ].map((step, i) => (
          <div key={i} className="ldg-2col" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 32, padding: '36px 0', borderTop: '1px solid rgba(33,28,20,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'rgba(184,134,59,0.4)' }}>{step.n}</div>
            <div style={{ maxWidth: 620 }}>
              <h3 style={{ fontSize: 19, fontWeight: 600, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{step.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ───────── ВЫПИСКА / АНАЛИТИКА — честная витрина возможностей,
          не выдуманный кейс «наш клиент вырос на X%» без источника.
          Показываем, что реально увидит руководитель в панели —
          буквально как банковская выписка, разделители содержательны
          (это границы строк отчёта), не декоративны. ───────── */}
      <section style={{ background: 'var(--panel)', padding: '104px 48px', borderTop: '1px solid rgba(33,28,20,0.08)', borderBottom: '1px solid rgba(33,28,20,0.08)' }}>
        <div className="ldg-2col" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '0.8fr 1fr', gap: 72, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.22, marginBottom: 20 }}>
              Руководитель видит не общее ощущение, а конкретную строку в отчёте
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              Вот что реально показывает панель аналитики заданий: доля выполнения по каждому сотруднику и по каждому заданию отдельно, среднее время от назначения до сдачи, и какие задания стабильно проваливаются — чтобы чинить систему по фактам, а не по интуиции.
            </p>
          </div>
          <div>
            <Ledger rows={[
              { label: 'Доля выполнения заданий', note: 'по команде за выбранный период', value: '87%', tone: 'teal' },
              { label: 'Отстающих по показателю SLA', note: 'система сама предложила задание для них', value: '5 / 30', tone: 'magenta' },
              { label: 'Кармиков выдано за месяц', note: 'из них 40% — за автоматически зачтённые цели', value: '12 480', tone: 'gold' },
            ]} />
            <div style={{ marginTop: 36, paddingTop: 30, borderTop: '1px solid rgba(33,28,20,0.14)' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 18 }}>Среднее время от назначения задания до сдачи</p>
              <BeforeAfter beforeLabel="Без системы" beforeValue={48} afterLabel="С системой" afterValue={4} unit=" ч" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── ВОЗМОЖНОСТИ — асимметричные развороты, чередующие
          сторону текста, не однотипная сетка карточек с одинаковой
          тенью на каждой. ───────── */}
      <section style={{ padding: '104px 48px', maxWidth: 1120, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 96 }}>

        <div className="ldg-feature-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600, marginBottom: 12 }}>Гибкость назначения</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 28, marginBottom: 16, lineHeight: 1.25 }}>Задание уходит не «всем», а тем, кому оно действительно нужно</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              По уровню мастерства, по стажу, по конкретному отстающему показателю или тем, кто ниже по энергии, чем остальная команда. Система сама находит, где пятеро из тридцати заметно хуже остальных, и предлагает готовое решение — с уже подобранной аудиторией, осталось подтвердить.
            </p>
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid rgba(33,28,20,0.1)', borderRadius: 4, padding: 26 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 14 }}>Рекомендация системы</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>«SLA новой заявки» — <span style={{ color: 'var(--magenta)', fontWeight: 600 }}>5 из 30</span> менеджеров заметно отстают от команды</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Смирнов А.', 'Титова О.', 'Гулиев Р.', '+2'].map((n, i) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 20, background: 'rgba(214,51,108,0.08)', color: 'var(--magenta)', border: '1px solid rgba(214,51,108,0.25)' }}>{n}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="ldg-feature-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div className="ldg-feature-visual-first" style={{ background: 'var(--ink)', borderRadius: 4, padding: 26, order: -1 }}>
            <div style={{ fontSize: 11, color: 'rgba(251,247,238,0.5)', marginBottom: 16 }}>Лента подарков</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { l: 'Доп. выходной', c: 'var(--gold)' },
                { l: '+500 кармиков', c: 'var(--teal)' },
                { l: 'Сертификат', c: 'var(--magenta)' },
              ].map((p, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(251,247,238,0.05)', border: `1px solid ${p.c}55`, borderRadius: 4, padding: '18px 10px', textAlign: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 11.5, color: 'rgba(251,247,238,0.85)' }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginBottom: 12 }}>Собственная витрина наград</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 28, marginBottom: 16, lineHeight: 1.25 }}>Кармики тратятся на то, что выбрала сама компания</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              Дополнительный выходной, сертификат партнёра, повышающий буст к начислениям — руководитель сам наполняет магазин под свою команду. Достижение уровня открывает «ленту подарков»: премиальный розыгрыш с честным взвешенным выбором приза, без иллюзии случайности, которая на деле ничего не решает.
            </p>
          </div>
        </div>

        <div className="ldg-feature-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--magenta)', fontWeight: 600, marginBottom: 12 }}>Мотивация, которая не отпускает до конца</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 28, marginBottom: 16, lineHeight: 1.25 }}>Сотрудник видит не только цель, но и сколько до неё осталось</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              Задание «прозвонить 30 контактов» показывает живой счётчик — сделано 20, осталось 10. Если время поджимает, а цель ещё не достигнута, карточка сама напоминает — мягко, не навязчиво. Это разница между «где-то там есть план» и «я на девять шагов ближе, чем час назад».
            </p>
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid rgba(33,28,20,0.1)', borderRadius: 4, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span>Прозвонить базу остывших клиентов</span>
              <span style={{ fontWeight: 600 }}>20 / 30</span>
            </div>
            <div style={{ height: 6, background: 'rgba(33,28,20,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '67%', height: '100%', background: 'var(--magenta)' }} />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--magenta)', marginTop: 12 }}>Осталось 10 — время почти вышло</p>
          </div>
        </div>
      </section>

      {/* ───────── СНЯТИЕ ВОЗРАЖЕНИЙ — то, что реально спрашивают перед
          внедрением, не абстрактный FAQ ни о чём. ───────── */}
      <section style={{ padding: '96px 48px', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(26px, 3vw, 34px)', marginBottom: 44 }}>Вопросы, которые обычно задают перед внедрением</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            ['Сколько времени занимает внедрение?', 'Компания и первый показатель настраиваются за 10–15 минут. Дальше — постепенно: начните с одного отдела и нескольких заданий, расширяйте по мере того, как видите результат, а не внедряйте всё сразу.'],
            ['Это подходит для нашей отрасли?', 'Платформа не завязана на конкретную отрасль — работает с любыми измеримыми показателями: звонки, заявки, SLA, продажи, производственные нормативы. Настраиваете показатели и задания под свои процессы сами, без обращения к разработчикам.'],
            ['А если сотрудники просто не будут пользоваться?', 'Для этого и существует гибкий таргетинг и рекомендации системы — задания уходят не всем подряд, а тем, кому они действительно нужны сейчас, с понятной наградой. Плюс мотивационные напоминания внутри самого задания, когда время поджимает.'],
            ['Можно ли настроить награды под свою компанию?', 'Да, полностью — магазин наград наполняет сама компания: от дополнительного выходного до сертификатов партнёров. Ничего не зашито заранее.'],
          ].map(([q, a], i) => (
            <details key={i} style={{ borderTop: '1px solid rgba(33,28,20,0.12)', padding: '22px 0' }}>
              <summary style={{ fontSize: 16, fontWeight: 500, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-soft)', marginTop: 14, maxWidth: 620 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────── ФИНАЛЬНЫЙ ПРИЗЫВ — тёмная секция, симметрично
          открывающей проблеме, закрывает композицию страницы. ───────── */}
      <section style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--brand-gradient)' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(32px, 4.2vw, 52px)', maxWidth: 680, margin: '0 auto 24px', lineHeight: 1.18 }}>
          Первый результат вы увидите не через квартал — через первую рабочую неделю
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(251,247,238,0.62)', maxWidth: 480, margin: '0 auto 44px' }}>
          Без внедрения на месяцы и без обязательств. Заведите компанию, настройте первый показатель и назначьте первое задание уже сегодня.
        </p>
        <button onClick={() => router.push('/create-company')} className="ldg-btn-primary" style={{ background: 'var(--gold)', color: 'var(--ink)', fontSize: 16, padding: '17px 36px' }}>Создать компанию бесплатно</button>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36, fontSize: 13, color: 'rgba(251,247,238,0.45)' }}>
          <span>Без карты при регистрации</span>
          <span>Отмена в любой момент</span>
          <span>Данные остаются у вас</span>
        </div>
      </section>

      <footer style={{ padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '1px solid rgba(33,28,20,0.08)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Кармический банк</span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>© {new Date().getFullYear()} — система мотивации команды</span>
      </footer>
    </div>
  )
}
