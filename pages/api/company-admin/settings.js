import { supabase } from '../../../lib/supabaseClient'
import { verifyAuth, extractAccessToken } from '../../../lib/auth'

// Rate limiting: 10 запросов в минуту на пользователя
const rateLimitMap = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 минута
  const maxRequests = 10
  
  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, [])
  }
  
  const requests = rateLimitMap.get(userId).filter(time => now - time < windowMs)
  
  if (requests.length >= maxRequests) {
    return false
  }
  
  requests.push(now)
  rateLimitMap.set(userId, requests)
  return true
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Проверка авторизации
    const token = extractAccessToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' })
    }
    
    const authResult = await verifyAuth(token)
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Неверный токен' })
    }
    
    const userId = authResult.userId
    
    // Rate limiting проверка
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' })
    }
    
    // Получаем профиль пользователя
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, is_company_admin')
      .eq('user_id', userId)
      .single()
    
    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return res.status(403).json({ error: 'Доступ запрещён' })
    }
    
    // Проверяем, что пользователь - админ компании
    if (!profile.is_company_admin) {
      return res.status(403).json({ error: 'Только администратор компании может редактировать информацию' })
    }
    
    const companyId = profile.company_id
    
    if (req.method === 'GET') {
      // Получение информации о компании
      const { data: company, error: fetchError } = await supabase
        .from('companies')
        .select('id, name, description, logo_url')
        .eq('id', companyId)
        .single()
      
      if (fetchError || !company) {
        console.error('Company fetch error:', fetchError)
        return res.status(404).json({ error: 'Компания не найдена' })
      }
      
      return res.status(200).json(company)
    }
    
    if (req.method === 'PUT') {
      const { name, description, logo_url } = req.body
      
      // Валидация входных данных
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Название компании обязательно' })
      }
      
      if (name.length > 100) {
        return res.status(400).json({ error: 'Название компании не должно превышать 100 символов' })
      }
      
      if (description && description.length > 500) {
        return res.status(400).json({ error: 'Описание не должно превышать 500 символов' })
      }
      
      // Обновление компании
      const updateData = {
        name: name.trim(),
        description: description?.trim() || null,
        logo_url: logo_url || null,
        updated_at: new Date().toISOString()
      }
      
      const { data: updatedCompany, error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId)
        .select()
        .single()
      
      if (updateError) {
        console.error('Company update error:', updateError)
        
        // Маппинг ошибок БД на безопасные сообщения
        if (updateError.code === '23505') { // Unique violation
          return res.status(400).json({ error: 'Компания с таким названием уже существует' })
        }
        
        return res.status(500).json({ error: 'Ошибка при обновлении компании' })
      }
      
      // Логирование действия в audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'company_updated',
          entity_type: 'companies',
          entity_id: String(companyId),
          details: { changes: updateData }
        })
      
      return res.status(200).json({ 
        message: 'Информация о компании успешно обновлена',
        company: updatedCompany
      })
    }
    
    return res.status(405).json({ error: 'Метод не разрешён' })
    
  } catch (error) {
    console.error('Company settings error:', error)
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
