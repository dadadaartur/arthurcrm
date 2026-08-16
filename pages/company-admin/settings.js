import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function CompanySettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState({ name: '', description: '', logo_url: '' })
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCompany()
  }, [])

  const loadCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, is_company_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile || !profile.is_company_admin) {
        router.push('/company-admin')
        return
      }

      const { data: companyData, error: fetchError } = await supabase
        .from('companies')
        .select('id, name, description, logo_url')
        .eq('id', profile.company_id)
        .single()

      if (fetchError) throw fetchError

      setCompany(companyData)
    } catch (err) {
      console.error('Ошибка загрузки:', err)
      setError('Не удалось загрузить данные компании')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Нет сессии')
      }

      const response = await fetch('/api/company-admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(company)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении')
      }

      setMessage('Информация о компании успешно обновлена!')
      setCompany(result.company)
    } catch (err) {
      console.error('Ошибка сохранения:', err)
      setError(err.message || 'Не удалось сохранить изменения')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setCompany(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return <div className="flex justify-center items-center py-24"><Spinner text="Загрузка настроек..." /></div>
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      color: '#fff', 
      fontFamily: 'Inter, sans-serif', 
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a1f3a 100%)'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 8,
          background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Настройки компании</h1>
        
        <p style={{ color: '#aaa', marginBottom: 32 }}>Измените основную информацию о вашей компании</p>

        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: 20,
            borderRadius: 8,
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            color: '#4ade80'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: 20,
            borderRadius: 8,
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            color: '#f87171'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(15, 20, 35, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: 32,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Название компании */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: '#a0e9ff'
            }}>
              Название компании *
            </label>
            <input
              type="text"
              name="name"
              value={company.name}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Введите название компании"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(10, 22, 40, 0.6)',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FFD700'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
            />
            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Максимум 100 символов
            </p>
          </div>

          {/* Описание */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: '#a0e9ff'
            }}>
              Описание
            </label>
            <textarea
              name="description"
              value={company.description || ''}
              onChange={handleChange}
              maxLength={500}
              rows={4}
              placeholder="Краткое описание деятельности компании"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(10, 22, 40, 0.6)',
                color: '#fff',
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FFD700'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
            />
            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Максимум 500 символов (необязательно)
            </p>
          </div>

          {/* Логотип (URL) */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: '#a0e9ff'
            }}>
              URL логотипа
            </label>
            <input
              type="url"
              name="logo_url"
              value={company.logo_url || ''}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(10, 22, 40, 0.6)',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FFD700'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
            />
            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Прямая ссылка на изображение (PNG, JPG, SVG)
            </p>
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: saving 
                  ? 'rgba(255, 215, 0, 0.5)' 
                  : 'linear-gradient(135deg, #FFD700, #f97316)',
                color: '#0a1628',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: saving ? 'none' : '0 4px 15px rgba(255, 215, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)'
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/company-admin')}
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default withAuth(CompanySettings)
