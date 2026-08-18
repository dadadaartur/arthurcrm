import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'

const PROOF_LABELS = { photo: 'фотографию', video: 'видео', any: 'файл' }
const PROOF_ACCEPT = { photo: 'image/*', video: 'video/*', any: 'image/*,video/*,application/pdf' }

export default function TaskDetail() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [assignment, setAssignment] = useState(null)
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
                   requires_proof, proof_type, deadline_hours )`)
          .eq('id', id)
          .single()
        setAssignment(data)
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
      alert(`Загрузите ${PROOF_LABELS[assignment.tasks?.proof_type || 'any']} перед отправкой`)
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
        alert('Ошибка отправки: ' + error.message)
      }
    } catch (e) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  if (loading || !assignment) return <div className="flex justify-center items-center py-8"><Spinner /></div>
  const t = assignment.tasks

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button onClick={() => router.push('/tasks')} className="text-gray-400 hover:text-white mb-6 text-sm">← Назад к заданиям</button>

      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)', borderColor: 'rgba(139,92,246,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{t.icon || '📋'}</span>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>

        <p className="text-gray-400 mb-4">{t.description}</p>

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

        {/* Значок "нужно медиа" */}
        {t.requires_proof && (
          <div className="mb-4 px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }}>
            Для выполнения нужно загрузить {PROOF_LABELS[t.proof_type || 'any']}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
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

        {/* Загруженные файлы (уже отправленные) */}
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
                          {isVideo ? '🎬' : '📎'}
                        </div>
                    }
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {assignment.status === 'assigned' && (
          <button onClick={handleStart} className="btn-gold w-full">Начать задание</button>
        )}

        {assignment.status === 'in_progress' && (
          <button onClick={() => setSubmitModal({ show: true, comment: '' })} className="btn-gold w-full">
            Отправить на проверку
          </button>
        )}

        {assignment.status === 'pending_review' && (
          <div className="text-center text-purple-300 py-2">Ожидает проверки руководителем</div>
        )}

        {(assignment.status === 'completed' || assignment.status === 'rejected') && (
          <div className={`text-center py-2 rounded ${assignment.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {assignment.status === 'completed' ? '✅ Задание выполнено' : '❌ Задание отклонено'}
            {assignment.comment && <p className="text-sm mt-1 text-gray-400">Комментарий: {assignment.comment}</p>}
          </div>
        )}
      </div>

      {/* Модальное окно сабмита с загрузкой файлов */}
      <PremiumModal isOpen={submitModal.show} onClose={() => !submitting && setSubmitModal({ show: false, comment: '' })}
        title="Отправить на проверку" showCloseButton={false}>
        <div className="text-left space-y-4">
          <textarea className="input-field w-full" placeholder="Комментарий (необязательно)"
            value={submitModal.comment}
            onChange={e => setSubmitModal({ ...submitModal, comment: e.target.value })}
            rows={3} />

          {/* Блок загрузки файлов — показывается только если задание требует медиа */}
          {t.requires_proof && (
            <div>
              <p className="text-sm text-gray-400 mb-2">
                Прикрепите {PROOF_LABELS[t.proof_type || 'any']}
                <span className="text-orange-400 ml-1">*</span>
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
                      {isVideo && <span className="text-2xl">🎬</span>}
                      {!isImage && !isVideo && <span className="text-2xl">📎</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(1)} МБ</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  )
                })}
              </div>

              <input ref={fileRef} type="file" className="hidden" multiple
                accept={PROOF_ACCEPT[t.proof_type || 'any']}
                onChange={handleFilesChange} />

              <button onClick={() => fileRef.current?.click()}
                className="mt-2 w-full py-2 rounded-xl text-sm text-gray-300 transition-all"
                style={{ border: '1px dashed rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.06)' }}>
                + Добавить {PROOF_LABELS[t.proof_type || 'any']}
              </button>

              {uploadProgress && (
                <p className="text-sm text-orange-400 text-center">{uploadProgress}</p>
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
