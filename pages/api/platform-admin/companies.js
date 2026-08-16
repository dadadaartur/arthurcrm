import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requirePlatformStaff(req, res)
  if (!ctx) return

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { status, search } = req.query

  let query = supabaseAdmin
    .from('companies')
    .select('id, name, description, logo_url, status, status_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: companies, error } = await query
  if (error) return res.status(500).json({ error: 'Ошибка загрузки списка компаний' })

  // Подтягиваем количество сотрудников по каждой компании одним запросом.
  const companyIds = (companies || []).map(c => c.id)
  let counts = {}
  if (companyIds.length) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .in('company_id', companyIds)
      .is('deleted_at', null)
    counts = (profiles || []).reduce((acc, p) => {
      acc[p.company_id] = (acc[p.company_id] || 0) + 1
      return acc
    }, {})
  }

  res.status(200).json((companies || []).map(c => ({ ...c, employeeCount: counts[c.id] || 0 })))
}
