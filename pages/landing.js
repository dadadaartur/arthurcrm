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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: r.tone === 'gold' ? 'var(--gold)' : 'var(--forest)', flexShrink: 0, marginLeft: 20 }}>{r.value}</div>
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
          --gold: #B8863B;
          --forest: #1F4D3A;
          --wine: #6B2737;
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
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(34px, 4.4vw, 56px)', lineHeight: 1.12, letterSpacing: '-0.01em', maxWidth: 640 }}>
              Заведите команде счёт,<br />работать на который хочется каждый день
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: 490, marginTop: 26 }}>
              «Кармический банк» переводит рабочие задачи и показатели в кармики, уровни и награды —
              то, что сотрудник видит и чувствует каждый день, а не раз в год на аттестации.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 36, flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/create-company')} className="ldg-btn-primary">Создать компанию</button>
              <a href="#mechanism" className="ldg-btn-ghost">Как это устроено</a>
            </div>
          </div>

          <div className="ldg-hero-visual" style={{ opacity: heroShown ? 1 : 0, transform: heroShown ? 'translateY(0) scale(1)' : 'translateY(18px) scale(.98)', transition: 'opacity .7s ease .15s, transform .7s ease .15s' }}>
            <div style={{ background: 'var(--panel)', borderRadius: 4, padding: 30, boxShadow: '0 30px 60px -20px rgba(33,28,20,0.25)', border: '1px solid rgba(33,28,20,0.08)' }}>
              <div style={{ fontSize: 11, letterSpacing: 0.4, color: 'var(--ink-soft)', marginBottom: 18 }}>Выписка команды за сентябрь</div>
              {[
                { n: 'И. Ковалёва', v: '+340', t: 'gold' },
                { n: 'А. Петров', v: '+295', t: 'gold' },
                { n: 'Отдел продаж', v: 'Уровень 4 → 5', t: 'forest' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderTop: i === 0 ? '1px solid rgba(33,28,20,0.1)' : '1px solid rgba(33,28,20,0.06)', fontSize: 14.5 }}>
                  <span>{r.n}</span>
                  <span style={{ fontWeight: 600, color: r.t === 'gold' ? 'var(--gold)' : 'var(--forest)' }}>{r.v}</span>
                </div>
              ))}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(33,28,20,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Выполнение задач за месяц</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)' }}>87%</span>
              </div>
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
          <Ledger rows={[
            { label: 'Доля выполнения заданий', note: 'по команде за выбранный период', value: '87%', tone: 'forest' },
            { label: 'Среднее время выполнения', note: 'от назначения до зачёта', value: '4 ч', tone: 'forest' },
            { label: 'Отстающих по показателю SLA', note: 'система сама предложила задание для них', value: '5 / 30', tone: 'gold' },
            { label: 'Кармиков выдано за месяц', note: 'из них 40% — за автоматически зачтённые цели', value: '12 480', tone: 'gold' },
          ]} />
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
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>«SLA новой заявки» — <span style={{ color: 'var(--wine)', fontWeight: 600 }}>5 из 30</span> менеджеров заметно отстают от команды</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Смирнов А.', 'Титова О.', 'Гулиев Р.', '+2'].map((n, i) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 20, background: 'rgba(107,39,55,0.08)', color: 'var(--wine)', border: '1px solid rgba(107,39,55,0.2)' }}>{n}</span>
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
                { l: '+500 кармиков', c: 'var(--forest)' },
                { l: 'Сертификат', c: 'var(--wine)' },
              ].map((p, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(251,247,238,0.05)', border: `1px solid ${p.c}55`, borderRadius: 4, padding: '18px 10px', textAlign: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 11.5, color: 'rgba(251,247,238,0.85)' }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600, marginBottom: 12 }}>Собственная витрина наград</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 28, marginBottom: 16, lineHeight: 1.25 }}>Кармики тратятся на то, что выбрала сама компания</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              Дополнительный выходной, сертификат партнёра, повышающий буст к начислениям — руководитель сам наполняет магазин под свою команду. Достижение уровня открывает «ленту подарков»: премиальный розыгрыш с честным взвешенным выбором приза, без иллюзии случайности, которая на деле ничего не решает.
            </p>
          </div>
        </div>

        <div className="ldg-feature-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--wine)', fontWeight: 600, marginBottom: 12 }}>Мотивация, которая не отпускает до конца</p>
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
              <div style={{ width: '67%', height: '100%', background: 'var(--wine)' }} />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--wine)', marginTop: 12 }}>Осталось 10 — время почти вышло</p>
          </div>
        </div>
      </section>

      {/* ───────── ФИНАЛЬНЫЙ ПРИЗЫВ — тёмная секция, симметрично
          открывающей проблеме, закрывает композицию страницы. ───────── */}
      <section style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '110px 48px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 440, fontSize: 'clamp(28px, 3.6vw, 44px)', maxWidth: 620, margin: '0 auto 22px', lineHeight: 1.25 }}>
          Первая выписка команды готова через несколько минут после регистрации
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(251,247,238,0.6)', maxWidth: 480, margin: '0 auto 40px' }}>
          Без внедрения на месяцы и без обязательств — заведите компанию, настройте первые показатели и назначьте первое задание уже сегодня.
        </p>
        <button onClick={() => router.push('/create-company')} className="ldg-btn-primary" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>Создать компанию</button>
      </section>

      <footer style={{ padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '1px solid rgba(33,28,20,0.08)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Кармический банк</span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>© {new Date().getFullYear()} — система мотивации команды</span>
      </footer>
    </div>
  )
}
