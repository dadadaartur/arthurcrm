import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

// Задания от партнёров (п.11 ТЗ). Создаёт супер-админ площадки
// (arturgalkin.ru@mail.ru — как и любой супер-админ, попадает под
// isSuperAdmin) или модератор, которому явно выдано право
// manage_partner_tasks через /platform-admin (вкладка «Модераторы») —
// та же модель гибких прав, что уже была построена для остальной
// платформенной админки, никакой новой инфраструктуры под это не нужно.
//
// Задание создаётся сразу для каждой выбранной компании (или для всех
// активных компаний) и назначается всем её сотрудникам — переиспользует
// ту же логику массового назначения, что и обычное создание задания в
// company-admin/tasks.js, просто с полями partner_name/reward_type/
// reward_config и без явного company-admin контекста.
export default async function handler(req, res) {
  const ctx = await requirePlatformStaff(req, res, { permission: 'manage_partner_tasks' })
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await a.from('tasks').select('*').not('partner_name', 'is', null).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  if (req.method === 'PATCH') {
    const { id, title, description, rewardKarma, deadlineDate, deadlineTime, imageUrl } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Не указано задание' })
    const patch = {}
    if (title !== undefined) patch.title = title.trim()
    if (description !== undefined) patch.description = description || null
    if (rewardKarma !== undefined) patch.reward_karma = Number(rewardKarma) || 0
    if (deadlineDate !== undefined) patch.deadline_at = deadlineDate ? new Date(`${deadlineDate}T${deadlineTime || '23:59:59'}`).toISOString() : null
    if (imageUrl !== undefined) patch.image_url = imageUrl || null
    const { error } = await a.from('tasks').update(patch).eq('id', id).not('partner_name', 'is', null)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'POST') {
    const { title, description, partnerName, rewardKarma, enableUnlock, unlockKey, enableBoost, boostPercent, boostDurationDays, enablePrize, prizeLabel, prizeDescription, deadlineDate, deadlineTime, companyIds, applyToAllCompanies, imageUrl } = req.body || {}
    if (!title?.trim() || !partnerName?.trim()) return res.status(400).json({ error: 'Укажите название задания и партнёра' })
    if (!applyToAllCompanies && (!companyIds || companyIds.length === 0)) return res.status(400).json({ error: 'Выберите хотя бы одну компанию или «все компании»' })

    let targetCompanyIds = companyIds || []
    if (applyToAllCompanies) {
      const { data: companies } = await a.from('companies').select('id').eq('status', 'active')
      targetCompanyIds = (companies || []).map(c => c.id)
    }
    if (targetCompanyIds.length === 0) return res.status(400).json({ error: 'Нет ни одной подходящей компании' })

    // Комбо-награды (пункт 3 фидбека от 1 сентября 2026) — раньше
    // reward_type допускал только ОДИН тип за раз (радио-кнопка), нельзя
    // было скомбинировать буст + приз, например. bonus_rewards — массив,
    // каждый чекбокс независимо добавляет свой элемент.
    const bonusRewards = []
    if (enableUnlock && unlockKey?.trim()) bonusRewards.push({ type: 'unlock', unlockKey: unlockKey.trim() })
    if (enableBoost && Number(boostPercent) > 0) bonusRewards.push({ type: 'boost', percent: Number(boostPercent), durationDays: Number(boostDurationDays) || 30 })
    if (enablePrize && prizeLabel?.trim()) bonusRewards.push({ type: 'prize', label: prizeLabel.trim(), description: prizeDescription?.trim() || null })

    const deadlineAt = deadlineDate ? new Date(`${deadlineDate}T${deadlineTime || '23:59:59'}`).toISOString() : null
    const created = []
    for (const companyId of targetCompanyIds) {
      const { data: task, error: taskErr } = await a.from('tasks').insert({
        company_id: companyId, title: title.trim(), description: description || null,
        reward_karma: Number(rewardKarma) || 0, task_type: 'one_time', frequency: 'once', target_role: 'all',
        requires_review: true, requires_proof: false, proof_type: 'any', is_active: true, is_archived: false, deadline_at: deadlineAt,
        partner_name: partnerName.trim(), reward_type: 'karma', reward_config: null,
        bonus_rewards: bonusRewards.length ? bonusRewards : null,
        image_url: imageUrl || null,
      }).select().single()
      if (taskErr || !task) continue
      created.push(task)


      const { data: emps } = await a.from('profiles').select('user_id').eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
      if (emps?.length) {
        await a.from('task_assignments').insert(emps.map(e => ({ task_id: task.id, user_id: e.user_id, status: 'assigned', deadline_at: deadlineAt })))
        await a.from('notifications').insert(emps.map(e => ({ user_id: e.user_id, message: `Новое задание от партнёра «${partnerName.trim()}»: ${title.trim()}`, link: '/tasks' })))
      }
    }
    return res.status(200).json({ success: true, companiesReached: created.length })
  }

  res.status(405).end()
}
