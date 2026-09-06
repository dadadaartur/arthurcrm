import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Новости компании (пункт 1 фидбека от 2 сентября 2026) — создаёт
// админ, видят все сотрудники компании. Картинка/видео/ссылка на
// материал в самом Кармическом банке — всё необязательно, можно
// комбинировать любые из них с текстом.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'POST') {
    if (!ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании может публиковать новости' })
    const { title, content, imageUrl, videoUrl, linkUrl, linkLabel } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите заголовок' })
    const { error } = await a.from('company_news').insert({
      company_id: companyId, title: title.trim(), content: content || null,
      image_url: imageUrl || null, video_url: videoUrl || null,
      link_url: linkUrl || null, link_label: linkLabel || null,
      created_by: ctx.user.id,
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    if (!ctx.profile.is_company_admin) return res.status(403).json({ error: 'Нет прав' })
    const { id } = req.body || {}
    const { error } = await a.from('company_news').delete().eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  const { data: news } = await a.from('company_news').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30)
  res.status(200).json({ news: news || [] })
}
