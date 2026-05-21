import { useEffect } from 'react'

export default function CRM() {
  useEffect(() => {
    // Листопад и кнопка ветра
    const leafContainer = document.getElementById('leafContainer')
    const windButton = document.getElementById('windButton')
    let leafInterval = null

    function createLeaf() {
      const leaf = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      leaf.setAttribute("viewBox", "0 0 30 30")
      leaf.classList.add("leaf")
      leaf.style.left = Math.random() * 100 + "%"
      const duration = 8 + Math.random() * 4
      leaf.style.animationDuration = duration + "s"
      const size = Math.random() * 22 + 18
      leaf.setAttribute("width", size)
      leaf.setAttribute("height", size)
      const colors = ['#7AC78F', '#4CAF6A', '#A3E0B0', '#F4B860', '#F28B82', '#FFD700']
      const fill = colors[Math.floor(Math.random() * colors.length)]
      leaf.innerHTML = `
        <path d="M15 3C15 3 7 9 7 16C7 23 15 26 15 26C15 26 23 23 23 16C23 9 15 3 15 3Z" 
              fill="${fill}" opacity="0.8" stroke="#4CAF6A" stroke-width="1.5"/>
        <line x1="15" y1="26" x2="15" y2="29" stroke="#4CAF6A" stroke-width="1.5"/>
      `
      leafContainer.appendChild(leaf)
      setTimeout(() => {
        if (leaf.parentNode) leaf.remove()
      }, duration * 1000 + 500)
    }

    function startLeafFall(durationMs, frequencyMs = 180) {
      if (leafInterval) clearInterval(leafInterval)
      leafInterval = setInterval(createLeaf, frequencyMs)
      setTimeout(() => {
        clearInterval(leafInterval)
        leafInterval = null
      }, durationMs)
    }

    function scheduleNextLeafFall() {
      const minDelay = 15 * 60 * 1000
      const maxDelay = 25 * 60 * 1000
      const delay = minDelay + Math.random() * (maxDelay - minDelay)
      setTimeout(() => {
        startLeafFall(10000, 180)
        scheduleNextLeafFall()
      }, delay)
    }

    // Приветственный листопад
    startLeafFall(5000, 200)
    const nextScheduleTimeout = setTimeout(() => {
      scheduleNextLeafFall()
    }, 5000)

    // Кнопка ручного вызова ветра
    windButton.addEventListener('click', () => {
      if (leafInterval) {
        clearInterval(leafInterval)
        leafInterval = null
      }
      startLeafFall(10000, 150)
      clearTimeout(window._leafSchedule)
      window._leafSchedule = setTimeout(() => {
        scheduleNextLeafFall()
      }, 10000)
    })

    return () => {
      clearInterval(leafInterval)
      clearTimeout(nextScheduleTimeout)
      clearTimeout(window._leafSchedule)
      // Очистка листьев
      if (leafContainer) leafContainer.innerHTML = ''
    }
  }, [])

  return (
    <div className="crm-wrapper">
      {/* Глобальные стили ТОЛЬКО для этой страницы (переопределяем body) */}
      <style jsx global>{`
        body {
          background: #F8FCF9 !important;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          color: #1F2E23;
        }
        .crm-wrapper {
          display: flex;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
        :root {
          --bg-primary: #F8FCF9;
          --bg-panel: #FFFFFF;
          --bg-sidebar: #F2F9F4;
          --text-primary: #1F2E23;
          --text-secondary: #5B7465;
          --accent-mint: #7AC78F;
          --accent-green: #4CAF6A;
          --accent-amber: #F4B860;
          --accent-coral: #F28B82;
          --border-light: #E5F0E8;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.03);
          --shadow-md: 0 6px 20px rgba(0,0,0,0.05);
          --radius-lg: 24px;
          --radius-md: 16px;
        }
        .leaf-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        .leaf {
          position: absolute;
          top: -60px;
          animation: fall linear forwards;
          opacity: 0.7;
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .sidebar {
          width: 280px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-light);
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          z-index: 2;
          position: relative;
        }
        .user-panel { display: flex; align-items: center; gap: 14px; margin-bottom: 32px; }
        .avatar-svg { width: 52px; height: 52px; }
        .username { font-weight: 700; font-size: 18px; }
        .user-role { font-size: 12px; color: var(--text-secondary); }
        .balance { display: flex; flex-direction: column; gap: 12px; }
        .balance-item {
          background: white;
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
        }
        .balance-icon svg { width: 32px; height: 32px; }
        .balance-info { display: flex; flex-direction: column; }
        .balance-value { font-size: 20px; font-weight: 700; }
        .karma-color { color: #4CAF6A; } .energy-color { color: #F4B860; } .rubles-color { color: #F28B82; }
        .balance-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
        .main-content {
          flex: 1;
          display: flex;
          gap: 24px;
          padding: 32px 36px;
          overflow-y: auto;
          z-index: 2;
          position: relative;
        }
        .left-col {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .panel {
          background: var(--bg-panel);
          border-radius: var(--radius-lg);
          padding: 24px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }
        .panel h3 {
          font-weight: 600;
          font-size: 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .funnel-stage {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .stage-name {
          width: 130px;
          font-size: 14px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stage-bar {
          flex: 1;
          height: 16px;
          background: #F0F7F2;
          border-radius: 8px;
          overflow: hidden;
          margin: 0 12px;
        }
        .stage-fill {
          height: 100%;
          border-radius: 8px;
          background: linear-gradient(90deg, #A3E0B0, #4CAF6A);
        }
        .stage-count { font-weight: 600; font-size: 14px; }
        .activity-item {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-light);
          gap: 12px;
        }
        .activity-text { flex: 1; font-size: 14px; }
        .activity-highlight { font-weight: 600; }
        .activity-time { font-size: 12px; color: var(--text-secondary); }
        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .action-btn {
          background: white;
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          padding: 12px 20px;
          border-radius: 14px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          box-shadow: var(--shadow-sm);
          transition: 0.2s;
        }
        .action-btn:hover { border-color: var(--accent-mint); background: #F8FCF9; }
        .action-btn.primary { background: var(--accent-green); border-color: var(--accent-green); color: white; }
        .action-btn.primary:hover { background: #43A05E; }
        .wind-btn {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-light);
          border-radius: 30px;
          box-shadow: var(--shadow-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          transition: 0.2s;
          color: var(--accent-green);
        }
        .wind-btn:hover {
          background: white;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .wind-btn svg {
          width: 28px;
          height: 28px;
          pointer-events: none;
        }
        /* Планета Земля в углу */
        .planet-label {
          position: fixed;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #F28B82, #F4B860, #7AC78F, #4CAF6A, #A3E0B0);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 800;
          font-size: 20px;
          text-shadow: 0 0 10px rgba(255,255,255,0.5);
          z-index: 1000;
          animation: planetGlow 3s infinite alternate;
        }
        @keyframes planetGlow {
          0% { filter: drop-shadow(0 0 6px rgba(74,207,108,0.6)); }
          100% { filter: drop-shadow(0 0 12px rgba(244,184,96,0.8)); }
        }
      `}</style>

      {/* Листопад */}
      <div className="leaf-container" id="leafContainer" />

      {/* Кнопка вызова ветра */}
      <div className="wind-btn" id="windButton" title="Вызвать лёгкий ветер">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C12 2 6 7 6 12C6 17 12 20 12 20C12 20 18 17 18 12C18 7 12 2 12 2Z" strokeLinecap="round"/>
          <line x1="12" y1="20" x2="12" y2="22" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Надпись "Моя любимая планета Земля" */}
      <div className="planet-label">Моя любимая планета Земля</div>

      {/* Сайдбар */}
      <div className="sidebar">
        <div className="user-panel">
          <svg className="avatar-svg" viewBox="0 0 52 52" fill="none">
            <rect width="52" height="52" rx="16" fill="url(#av-grad)"/>
            <circle cx="26" cy="20" r="8" fill="white" opacity="0.9"/>
            <ellipse cx="26" cy="40" rx="14" ry="8" fill="white" opacity="0.7"/>
            <defs>
              <linearGradient id="av-grad" x1="0" y1="0" x2="52" y2="52">
                <stop offset="0%" stopColor="#A3E0B0"/>
                <stop offset="100%" stopColor="#4CAF6A"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="username">Артур</div>
            <div className="user-role">Менеджер</div>
          </div>
        </div>
        <div className="balance">
          <div className="balance-item">
            <div className="balance-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 4C16 4 8 10 8 18C8 26 16 28 16 28C16 28 24 26 24 18C24 10 16 4 16 4Z" stroke="#4CAF6A" strokeWidth="2" fill="#A3E0B0" fillOpacity="0.3"/>
                <path d="M13 12L16 15L19 12" stroke="#4CAF6A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="balance-info"><span className="balance-value karma-color">1 250</span><span className="balance-label">Кармики</span></div>
          </div>
          <div className="balance-item">
            <div className="balance-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M18 4L10 16H16L14 28L24 13H17L18 4Z" stroke="#F4B860" strokeWidth="2" fill="#F4B860" fillOpacity="0.2"/>
              </svg>
            </div>
            <div className="balance-info"><span className="balance-value energy-color">340</span><span className="balance-label">Энергия</span></div>
          </div>
          <div className="balance-item">
            <div className="balance-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="#F28B82" strokeWidth="2"/>
                <text x="16" y="21" textAnchor="middle" fill="#F28B82" fontSize="14" fontWeight="700">₽</text>
              </svg>
            </div>
            <div className="balance-info"><span className="balance-value rubles-color">15 200</span><span className="balance-label">Бонус (₽)</span></div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="main-content">
        <div className="left-col">
          <div className="actions">
            <button className="action-btn primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Новая сделка
            </button>
            <button className="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 6L16 2V6H22ZM22 6L16 10V6H22ZM16 6H10C5 6 2 9 2 14C2 18 5 20 10 20H16" stroke="#4CAF6A" strokeWidth="2"/></svg>
              Звонок
            </button>
            <button className="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#F4B860" strokeWidth="2"/><path d="M8 9H16M8 13H14" stroke="#F4B860" strokeWidth="2"/></svg>
              Письмо
            </button>
            <button className="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#F28B82" strokeWidth="2"/><path d="M8 12L11 15L16 9" stroke="#F28B82" strokeWidth="2" strokeLinecap="round"/></svg>
              Встреча
            </button>
          </div>
          <div className="panel">
            <h3>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M2 4H22L15 12V18L9 20V12L2 4Z" stroke="#4CAF6A" strokeWidth="2" strokeLinejoin="round"/></svg>
              Воронка продаж
            </h3>
            <div className="funnel-stage"><span className="stage-name"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#A3E0B0" strokeWidth="2"/></svg>Новые</span><div className="stage-bar"><div className="stage-fill" style={{width:'80%'}}></div></div><span className="stage-count">12 сделок</span></div>
            <div className="funnel-stage"><span className="stage-name"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" stroke="#A3E0B0" strokeWidth="2"/></svg>Квалификация</span><div className="stage-bar"><div className="stage-fill" style={{width:'55%'}}></div></div><span className="stage-count">8 сделок</span></div>
            <div className="funnel-stage"><span className="stage-name"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 6H16L12 10L16 14H4L8 10L4 6Z" stroke="#A3E0B0" strokeWidth="2"/></svg>Предложение</span><div className="stage-bar"><div className="stage-fill" style={{width:'40%'}}></div></div><span className="stage-count">5 сделок</span></div>
            <div className="funnel-stage"><span className="stage-name"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#A3E0B0" strokeWidth="2"/><path d="M7 10H13M10 7V13" stroke="#A3E0B0" strokeWidth="2"/></svg>Переговоры</span><div className="stage-bar"><div className="stage-fill" style={{width:'25%'}}></div></div><span className="stage-count">3 сделки</span></div>
            <div className="funnel-stage"><span className="stage-name"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 10L9 13L14 7" stroke="#4CAF6A" strokeWidth="2" strokeLinecap="round"/></svg>Закрыто</span><div className="stage-bar"><div className="stage-fill" style={{width:'15%'}}></div></div><span className="stage-count">2 сделки</span></div>
          </div>
          <div className="panel" style={{flex:1}}>
            <h3>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 20L10 14L14 18L20 8M20 8H15M20 8V13" stroke="#7AC78F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Активность команды
            </h3>
            <div className="activity-item"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 6L16 2V6H22ZM22 6L16 10V6H22ZM16 6H10C5 6 2 9 2 14C2 18 5 20 10 20H16" stroke="#4CAF6A" strokeWidth="2"/></svg><div className="activity-text">Петров позвонил клиенту и получил <span className="activity-highlight" style={{color:'#4CAF6A'}}>+5 кармиков</span></div><div className="activity-time">5 мин назад</div></div>
            <div className="activity-item"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 12L10 16L18 8" stroke="#F4B860" strokeWidth="2" strokeLinecap="round"/></svg><div className="activity-text">Иванова закрыла сделку на 500 000 ₽ и получила <span className="activity-highlight" style={{color:'#4CAF6A'}}>+50 кармиков</span> <span className="activity-highlight" style={{color:'#F28B82'}}>+5 000 ₽</span></div><div className="activity-time">12 мин назад</div></div>
            <div className="activity-item"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#A3E0B0" strokeWidth="2"/><path d="M8 9H16M8 13H14" stroke="#A3E0B0" strokeWidth="2"/></svg><div className="activity-text">Сидоров ответил на письмо клиента <span className="activity-highlight" style={{color:'#4CAF6A'}}>+3 кармика</span></div><div className="activity-time">22 мин назад</div></div>
          </div>
        </div>
        <div className="right-col">
          <div className="panel" style={{flex:1, display:'flex', flexDirection:'column'}}>
            <h3>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L16 8L12 14L8 8L12 2Z" fill="#A3E0B0" opacity="0.6"/><path d="M12 8V20" stroke="#4CAF6A" strokeWidth="2" strokeLinecap="round"/></svg>
              Цели на сегодня
            </h3>
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:14}}><span>📞 Звонки</span><span>4/5</span></div>
                <div style={{height:8, background:'#F0F7F2', borderRadius:4, marginTop:4}}><div style={{width:'80%', height:'100%', background:'linear-gradient(90deg, #F4B860, #F28B82)', borderRadius:4}}></div></div>
              </div>
              <div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:14}}><span>✉️ Письма</span><span>2/3</span></div>
                <div style={{height:8, background:'#F0F7F2', borderRadius:4, marginTop:4}}><div style={{width:'66%', height:'100%', background:'linear-gradient(90deg, #F4B860, #F28B82)', borderRadius:4}}></div></div>
              </div>
              <div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:14}}><span>🤝 Встречи</span><span>1/2</span></div>
                <div style={{height:8, background:'#F0F7F2', borderRadius:4, marginTop:4}}><div style={{width:'50%', height:'100%', background:'linear-gradient(90deg, #F4B860, #F28B82)', borderRadius:4}}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
