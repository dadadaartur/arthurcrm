import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import PremiumModal from '../../components/PremiumModal'
import BackArrow from '../../components/BackArrow'
import ProgressBar3D from '../../components/ProgressBar3D'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { bandFor, bandRankOf, resolveThresholds, rangeValue, BAND_COLORS, BAND_LABELS } from '../../lib/kpi'

const PROOF_LABELS = { photo: 'фотографию', video: 'видео', any: 'файл' }
const PROOF_ACCEPT = { photo: 'image/*', video: 'video/*', any: 'image/*,video/*,application/pdf' }

export default function TaskDetail() {
  const router = useRouter()
  const { showError } = useFeedback()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [autoProgress, setAutoProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitModal, setSubmitModal] = useState({ show: false, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [proofFiles, setProofFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      if (id) {
        const { data } = await supabase
          .from('task_assignments')
          .select(`id, status, started_at, deadline_at, comment, proof_urls,
            tasks( id, title, description, reward_karma, icon, requires_review,
                   requires_proof, proof_type, deadline_hours, is_auto_goal,
                   auto_goal_condition, auto_metric_id, auto_target_rank, partner_name )`)
          .eq('id', id)
          .single()
        setAssignment(data)

        // Авто-зачётное задание — подтягиваем прогресс по показателю
        // отдельно, страница деталей задания не должна знать бизнес-логику
        // расчёта показателей сама по себе, только читать готовый результат.
        if (data?.tasks?.is_auto_goal && data.tasks.auto_metric_id) {
          const today = new Date().toISOString().slice(0, 10)
          const { data: metric } = await supabase.from('kpi_metrics').select('*').eq('id', data.tasks.auto_metric_id).maybeSingle()
          if (metric) {
            const { data: entries } = await supabase.from('kpi_entries').select('value, entry_date').eq('user_id', user.id).eq('metric_id', metric.id).eq('entry_date', today)
            const rv = rangeValue(metric, entries || [])
            const currentBand = rv ? bandFor(rv.value, metric) : 'none'
            const thresholds = resolveThresholds(metric)
            const targetTier = thresholds[(data.tasks.auto_target_rank || 1) - 1]
            const { data: grantedToday } = await supabase.from('task_auto_grants').select('task_id').eq('task_id', data.tasks.id).eq('user_id', user.id).eq('grant_date', today).maybeSingle()
            setAutoProgress({
              metricName: metric.name, unit: metric.unit,
              currentValue: rv?.value ?? 0, currentBand,
              targetLabel: targetTier?.label || '', targetValue: targetTier?.value ?? null,
              achievedToday: !!grantedToday,
            })
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [id])

  const handleStart = async () => {
    if (!assignment) return
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignment.id)
    if (!error) setAssignment({ ...assignment, status: 'in_progress' })
  }

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || [])
    setProofFiles(prev => [...prev, ...files])
  }

  const removeFile = (idx) => {
    setProofFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadProofs = async () => {
    if (!proofFiles.length) return []
    const urls = []
    for (let i = 0; i < proofFiles.length; i++) {
      const file = proofFiles[i]
      setUploadProgress(`Загружаю файл ${i + 1} из ${proofFiles.length}...`)
      const ext = file.name.split('.').pop()
      const path = `task-proofs/${assignment.id}/${Date.now()}-${i}.${ext}`
      const { error } = await supabase.storage.from('task-proofs').upload(path, file, { upsert: true })
      if (error) throw new Error('Ошибка загрузки файла: ' + error.message)
      const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(path)
      urls.push(publicUrl)
    }
    setUploadProgress(null)
    return urls
  }

  const handleSubmit = async () => {
    if (!assignment || !user) return
    const requiresProof = assignment.tasks?.requires_proof
    if (requiresProof && proofFiles.length === 0) {
      showError(`Загрузите ${PROOF_LABELS[assignment.tasks?.proof_type || 'any']} перед отправкой`)
      return
    }
    setSubmitting(true)
    try {
      const urls = await uploadProofs()
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'pending_review',
          comment: submitModal.comment,
          completed_at: new Date().toISOString(),
          proof_urls: urls
        })
        .eq('id', assignment.id)
        .eq('user_id', user.id)
      if (!error) {
        setSubmitModal({ show: false, comment: '' })
        setProofFiles([])
        setAssignment({ ...assignment, status: 'pending_review', proof_urls: urls })
      } else {
        showError('Ошибка отправки: ' + error.message)
      }
    } catch (e) {
      showError(e.message)
    }
    setSubmitting(false)
  }

  if (loading || !assignment) return <LoadingScreen />
  const t = assignment.tasks

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BackArrow href="/tasks" title="Задание" />

      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)', borderColor: 'rgba(139,92,246,0.3)', display: 'flex', flexDirection: 'column', minHeight: 320 }}>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><path d="M9 11h6M9 15h4" /></svg>
          </span>
          <h1 className="text-xl font-bold text-white" style={{ lineHeight: 1.3 }}>{t.title}</h1>
        </div>

        <div style={{ marginBottom: 12 }}>
          {t.is_auto_goal ? (
            <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)' }}>Засчитывается автоматически по цели</span>
          ) : t.partner_name ? (
            <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.35)' }}>Партнёрское · {t.partner_name}</span>
          ) : (
            <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: 'rgba(160,233,255,0.1)', color: '#a0e9ff', border: '1px solid rgba(160,233,255,0.3)' }}>Проверяет руководитель</span>
          )}
        </div>

        {t.description && <p className="text-gray-400 mb-4 text-sm">{t.description}</p>}

        <div className="flex flex-wrap gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Награда:</span>
            <span className="text-yellow-400 font-semibold">+{t.reward_karma} кармиков</span>
          </div>
          {assignment.deadline_at && (
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Дедлайн:</span>
              <span className="text-white">{new Date(assignment.deadline_at).toLocaleString('ru')}</span>
            </div>
          )}
        </div>

        {t.is_auto_goal && autoProgress && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p style={{ fontSize: 12, color: '#4ade80', margin: '0 0 10px' }}>
              Ничего нажимать не нужно — система сама проверит показатель «{autoProgress.metricName}» и засчитает задание при достижении уровня «{autoProgress.targetLabel}».
            </p>
            <ProgressBar3D value={autoProgress.currentValue} marks={[{ key: 't', value: autoProgress.targetValue ?? 1 }]} height={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
              <span style={{ color: BAND_COLORS[autoProgress.currentBand] }}>Сейчас: {autoProgress.currentValue}{autoProgress.unit} ({BAND_LABELS[autoProgress.currentBand]})</span>
              {autoProgress.achievedToday && <span style={{ color: '#4ade80' }}>Выполнено сегодня</span>}
            </div>
          </div>
        )}

        {t.requires_proof && (
          <div className="mb-4 px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(160,233,255,0.08)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff' }}>
            Для выполнения нужно загрузить {PROOF_LABELS[t.proof_type || 'any']}
          </div>
        )}

        {!t.is_auto_goal && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-400">Статус:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              assignment.status === 'pending_review' ? 'bg-purple-900 text-purple-300' :
              assignment.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
              assignment.status === 'completed' ? 'bg-green-900 text-green-300' :
              assignment.status === 'rejected' ? 'bg-red-900 text-red-300' :
              'bg-gray-800 text-gray-400'
            }`}>
              {assignment.status === 'assigned' && 'Новое'}
              {assignment.status === 'in_progress' && 'В работе'}
              {assignment.status === 'pending_review' && 'На проверке'}
              {assignment.status === 'completed' && 'Выполнено'}
              {assignment.status === 'rejected' && 'Отклонено'}
            </span>
          </div>
        )}

        {assignment.proof_urls?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Прикреплённые файлы:</p>
            <div className="flex flex-wrap gap-2">
              {assignment.proof_urls.map((url, i) => {
                const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {isImage
                      ? <img src={url} alt="" className="w-20 h-20 object-cover" />
                      : <div className="w-20 h-20 flex items-center justify-center text-2xl"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {isVideo
                            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a0e9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 9l5-3v12l-5-3" /></svg>
                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0e9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>}
                        </div>
                    }
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Действие всегда прижато к низу карточки — не прыгает по высоте
            в зависимости от объёма контента выше */}
        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          {!t.is_auto_goal && assignment.status === 'assigned' && (
            <button onClick={handleStart} className="btn-gold" style={{ minWidth: 180 }}>Начать задание</button>
          )}

          {!t.is_auto_goal && assignment.status === 'in_progress' && (
            <button onClick={() => setSubmitModal({ show: true, comment: '' })} className="btn-gold" style={{ minWidth: 180 }}>
              Отправить на проверку
            </button>
          )}

          {!t.is_auto_goal && assignment.status === 'pending_review' && (
            <div className="text-center text-purple-300 py-2">Ожидает проверки руководителем</div>
          )}

          {!t.is_auto_goal && (assignment.status === 'completed' || assignment.status === 'rejected') && (
            <div className={`text-center py-2 rounded ${assignment.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              <div className="flex items-center justify-center gap-2">
                {assignment.status === 'completed'
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>}
                <span>{assignment.status === 'completed' ? 'Задание выполнено' : 'Задание отклонено'}</span>
              </div>
              {assignment.comment && <p className="text-sm mt-1 text-gray-400">Комментарий: {assignment.comment}</p>}
            </div>
          )}
        </div>
      </div>

      <PremiumModal isOpen={submitModal.show} onClose={() => !submitting && setSubmitModal({ show: false, comment: '' })}
        title="Отправить на проверку" showCloseButton={false}>
        <div className="text-left space-y-4">
          <textarea className="input-field w-full" placeholder="Комментарий (необязательно)"
            value={submitModal.comment}
            onChange={e => setSubmitModal({ ...submitModal, comment: e.target.value })}
            rows={3} />

          {t.requires_proof && (
            <div>
              <p className="text-sm text-gray-400 mb-2">
                Прикрепите {PROOF_LABELS[t.proof_type || 'any']}
                <span className="text-red-400 ml-1">*</span>
              </p>

              <div className="space-y-2">
                {proofFiles.map((f, i) => {
                  const isImage = f.type.startsWith('image/')
                  const isVideo = f.type.startsWith('video/')
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {isImage && (
                        <img src={URL.createObjectURL(f)} alt="" className="w-12 h-12 object-cover rounded" />
                      )}
                      {isVideo && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0e9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 9l5-3v12l-5-3" /></svg>}
                      {!isImage && !isVideo && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0e9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(1)} МБ</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400" style={{ background: 'none', border: 'none', padding: 4, display: 'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )
                })}
              </div>

              <input ref={fileRef} type="file" className="hidden" multiple
                accept={PROOF_ACCEPT[t.proof_type || 'any']}
                onChange={handleFilesChange} />

              <button onClick={() => fileRef.current?.click()}
                className="mt-2 w-full py-2 rounded-xl text-sm text-gray-300 transition-all"
                style={{ border: '1px dashed rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.06)' }}>
                + Добавить {PROOF_LABELS[t.proof_type || 'any']}
              </button>

              {uploadProgress && (
                <p className="text-sm text-[#a0e9ff] text-center">{uploadProgress}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => !submitting && setSubmitModal({ show: false, comment: '' })}
              className="btn-outline flex-1" disabled={submitting}>
              Отмена
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-gold flex-1">
              {submitting ? (uploadProgress || 'Отправка...') : 'Отправить'}
            </button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}
