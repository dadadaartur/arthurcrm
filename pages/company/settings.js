import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Layout from '../../components/Layout';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function CompanySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    logo_url: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkAccessAndLoadData();
  }, []);

  async function checkAccessAndLoadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Проверяем профиль и права
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, is_company_admin')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile || !profile.is_company_admin) {
        setMessage({ type: 'error', text: 'Доступ запрещен. Только администраторы компании могут менять настройки.' });
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Загружаем данные компании
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, description, logo_url')
        .eq('id', profile.company_id)
        .single();

      if (companyError) throw companyError;

      setCompanyData(company);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки данных' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
        .single();

      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          description: companyData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.company_id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Настройки успешно сохранены!' });
      
      setTimeout(() => {
         router.push('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setMessage({ type: 'error', text: 'Не удалось сохранить изменения.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Layout><div className="p-8">Загрузка...</div></Layout>;
  if (!isAdmin) return <Layout><div className="p-8 text-red-600">{message.text}</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Настройки компании</h1>
        
        {message.text && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название компании</label>
            <input
              type="text"
              required
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ООО Ромашка"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              rows="4"
              value={companyData.description || ''}
              onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Кратко о деятельности компании..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
