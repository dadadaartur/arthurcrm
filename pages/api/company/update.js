import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Разрешаем только PUT запросы
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    // Получаем пользователя из токена
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Неверный токен' });
    }

    const { companyId, name, description, logo_url } = req.body;

    // Валидация входных данных
    if (!companyId || !name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Название компании обязательно' });
    }

    // Проверяем, что пользователь является администратором компании
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, is_company_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_company_admin) {
      return res.status(403).json({ error: 'Только администратор компании может изменять настройки' });
    }

    // Проверяем, что компания принадлежит пользователю
    if (profile.company_id !== parseInt(companyId)) {
      return res.status(403).json({ error: 'Несоответствие компании' });
    }

    // Обновляем данные компании
    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (logo_url !== undefined) {
      updateData.logo_url = logo_url.trim();
    }

    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Ошибка обновления компании:', updateError);
      return res.status(500).json({ error: 'Ошибка обновления компании: ' + updateError.message });
    }

    // Логируем действие в audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'company_update',
      entity_type: 'companies',
      entity_id: String(companyId),
      details: {
        name: updateData.name,
        description: updateData.description,
        logo_url: updateData.logo_url
      }
    });

    return res.status(200).json(updatedCompany);
  } catch (error) {
    console.error('Ошибка в API обновления компании:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
