import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CompanySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', logo_url: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  async function checkAuthAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Проверка профиля и прав администратора компании
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, is_company_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_company_admin) {
      setMessage({ type: 'error', text: 'Доступ запрещен. Требуются права администратора компании.' });
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    // Загрузка данных компании
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (companyError) {
      setMessage({ type: 'error', text: 'Ошибка загрузки данных компании: ' + companyError.message });
      setLoading(false);
      return;
    }

    setCompany(companyData);
    setFormData({
      name: companyData.name || '',
      description: companyData.description || '',
      logo_url: companyData.logo_url || ''
    });
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Обновление компании через API для безопасности
      const { data, error } = await fetch('/api/company/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          logo_url: formData.logo_url.trim()
        }),
      }).then(res => res.json());

      if (error) {
        throw new Error(error);
      }

      setMessage({ type: 'success', text: 'Данные компании успешно обновлены!' });
      setCompany(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка обновления: ' + err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Настройки компании</h1>
        
        {message.text && (
          <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {!isAdmin ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
            <p className="font-bold">Доступ запрещен</p>
            <p>Только администратор компании может изменять настройки.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название компании *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL логотипа
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
