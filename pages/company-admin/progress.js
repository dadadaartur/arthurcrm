import { useState } from 'react'
import BackArrow from '../../components/BackArrow'
import LevelPathModal from '../../components/LevelPathModal'
import { withAuth } from '../../components/withAuth'

function ProgressAdmin() {
  const [open, setOpen] = useState(true)
  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Архитектура прогресса" extra={
          <button onClick={() => setOpen(true)} style={{ marginLeft: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '7px 16px', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: 12 }}>Открыть редактор</button>
        } />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 700 }}>
          Здесь вы настраиваете уровни роста сотрудников: название, порог энергии, цвет и описание.
          Сотрудники видят этот путь в «Моих целях» и на главной — понимают, какой у них уровень сейчас и что нужно для следующего.
        </p>
      </div>
      <LevelPathModal open={open} onClose={() => setOpen(false)} energy={0} canEdit />
    </div>
  )
}
export default withAuth(ProgressAdmin, { adminOnly: true })
