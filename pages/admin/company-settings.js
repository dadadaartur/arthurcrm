import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CompanySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
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

    // Проверка профиля и прав администратора
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, is_company_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile || !profile.is_company_admin) {
      setMessage({ type: 'error', text: 'Доступ запрещен. Требуются права администратора.' });
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    // Загрузка данных компании
    const { data: companyData, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (error) {
      setMessage({ type: 'error', text: 'Ошибка загрузки данных компании: ' + error.message });
    } else {
      setCompany(companyData);
      setFormData({
        name: companyData.name || '',
        description: companyData.description || ''
      });
    }
    
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Информация о компании успешно обновлена!' });
      setCompany(data);
    } catch (error) {
      console.error('Error updating company:', error);
      setMessage({ type: 'error', text: 'Ошибка при сохранении: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 text-red-800 rounded-lg mt-4">
          <h2 className="text-xl font-bold">Доступ запрещен</h2>
          <p>{message.text || 'У вас нет прав для управления настройками компании.'}</p>
          <button 
            onClick={() => router.push('/admin')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Вернуться в панель администратора
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Настройки компании</h1>

        {message.text && (
          <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Название компании
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              disabled={saving}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
              Описание
            </label>
            <textarea
              id="description"
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="text-gray-500 hover:text-gray-700 font-bold py-2 px-4 rounded focus:outline-none"
            >
              Отмена
            </button>
          </div>
        </form>

        <div className="text-sm text-gray-500 mt-4">
          <p>ID компании: {company.id}</p>
          <p>Статус: <span className={`font-bold ${company.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>{company.status}</span></p>
          {company.status_reason && <p className="mt-1">Причина статуса: {company.status_reason}</p>}
        </div>
      </div>
    </Layout>
  );
}
