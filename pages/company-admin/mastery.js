import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'
import { BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const emptyForm={name:'',unit:'%',thr_min:5,thr_mid:10,thr_top:15,thr_ultra:20,energy_min:10,energy_mid:20,energy_top:30,energy_ultra:50,karma_min:1,karma_mid:3,karma_top:5,karma_ultra:10,description:'',advice:''}
const NUM_KEYS=['thr_min','thr_mid','thr_top','thr_ultra','energy_min','energy_mid','energy_top','energy_ultra','karma_min','karma_mid','karma_top','karma_ultra']

function MasteryAdmin(){
  const [loading,setLoading]=useState(true)
  const [metrics,setMetrics]=useState([])
  const [employees,setEmployees]=useState([])
  const [form,setForm]=useState(emptyForm)
  const [msg,setMsg]=useState('')
  const [expanded,setExpanded]=useState(null)
  const [trainings,setTrainings]=useState({})
  const [tForm,setTForm]=useState({title:'',type:'video',url:'',content:'',test_questions:'',recommend_below:'min'})
  const [manual,setManual]=useState({date:new Date().toISOString().slice(0,10),metricId:'',values:{}})

  const auth=async()=>{const {data:{session}}=await supabase.auth.getSession();return {Authorization:`Bearer ${session.access_token}`}}
  const load=async()=>{
    const h=await auth()
    const r=await fetch('/api/company-admin/kpi/metrics',{headers:h})
    if(r.ok)setMetrics(await r.json())
    const {data:{user}}=await supabase.auth.getUser()
    const {data:prof}=await supabase.from('profiles').select('company_id').eq('user_id',user.id).single()
    const {data:emps}=await supabase.from('profiles').select('user_id, display_name, email, first_name, last_name').eq('company_id',prof.company_id).is('deleted_at',null).eq('is_company_admin',false)
    setEmployees(emps||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const createMetric=async(e)=>{e.preventDefault();const h=await auth()
    const nums={};NUM_KEYS.forEach(k=>nums[k]=Number(form[k])||0)
    const res=await fetch('/api/company-admin/kpi/metrics',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({...form,...nums})})
    setMsg(res.ok?'Показатель создан':'Ошибка создания')
    if(res.ok)setForm(emptyForm)
    load()
  }
  const delMetric=async(id)=>{const h=await auth();await fetch('/api/company-admin/kpi/metrics',{method:'DELETE',headers:h,body:JSON.stringify({id})});load()}
  const loadTrainings=async(mid)=>{const h=await auth();const r=await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`,{headers:h});if(r.ok)setTrainings(t=>({...t,[mid]:await r.json()}))}
  const addTraining=async(mid)=>{const h=await auth();let tq=null
    if(tForm.type==='test'){try{tq=JSON.parse(tForm.test_questions||'[]')}catch{setMsg('Неверный JSON теста');return}}
    await fetch('/api/company-admin/kpi/trainings',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({metric_id:mid,title:tForm.title,type:tForm.type,url:tForm.url||null,content:tForm.content||null,test_questions:tq,recommend_below:tForm.recommend_below})})
    setTForm({title:'',type:'video',url:'',content:'',test_questions:'',recommend_below:'min'})
    loadTrainings(mid)
  }
  const delTraining=async(id,mid)=>{const h=await auth();await fetch('/api/company-admin/kpi/trainings',{method:'DELETE',headers:h,body:JSON.stringify({id})});loadTrainings(mid)}
  const loadManual=async()=>{if(!manual.metricId)return
    const {data}=await supabase.from('kpi_entries').select('*').eq('metric_id',manual.metricId).eq('entry_date',manual.date)
    const vals={};(data||[]).forEach(e=>vals[e.user_id]=e.value)
    setManual(m=>({...m,values:vals}))
  }
  useEffect(()=>{if(manual.metricId)loadManual()},[manual.metricId,manual.date])
  const saveManual=async()=>{const h=await auth()
    const entries=employees.filter(e=>manual.values[e.user_id]!==''&&manual.values[e.user_id]!=null).map(e=>({metricId:Number(manual.metricId),userId:e.user_id,value:Number(manual.values[e.user_id])}))
    const res=await fetch('/api/company-admin/kpi/entries',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({date:manual.date,entries})})
    setMsg(res.ok?'Результаты сохранены — энергия и кармики начислены':'Ошибка сохранения')
  }
  if(loading)return <div className="flex justify-center items-center py-24"><Spinner/></div>
  const empName=e=>[e.first_name,e.last_name].filter(Boolean).join(' ')||e.display_name||e.email

  return(
    <div style={{minHeight:'100vh',background:'#000',color:'#fff',fontFamily:'Inter, sans-serif',padding:'40px 20px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
        <h1 style={{fontSize:28,fontWeight:600,background:'linear-gradient(135deg, #FFD700, #c084fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:8}}>Управление целями и мастерством</h1>
        <p className="text-sm text-gray-400 mb-6">Показатели KPI, пороги уровней, энергия/кармики и тренинги</p>
        {msg&&<div className="mb-4 p-3 rounded-xl" style={{background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ade80'}}>{msg}</div>}

        {/* Ручной контроль */}
        <div className="premium-card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">Ручной контроль (результаты за день)</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <input type="date" value={manual.date} onChange={e=>setManual(m=>({...m,date:e.target.value}))} className="input-field"/>
            <select value={manual.metricId} onChange={e=>setManual(m=>({...m,metricId:e.target.value}))} className="input-field">
              <option value="">Выберите показатель</option>
              {metrics.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={saveManual} className="btn-gold">Сохранить результаты</button>
          </div>
          {manual.metricId&&(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {employees.map(e=>(
                <div key={e.user_id} className="flex items-center gap-3 p-2 rounded-lg" style={{background:'rgba(255,255,255,0.03)'}}>
                  <span className="text-sm text-white flex-1 truncate">{empName(e)}</span>
                  <input type="number" step="0.1" value={manual.values[e.user_id]??''} onChange={ev=>setManual(m=>({...m,values:{...m.values,[e.user_id]:ev.target.value}}))} className="input-field" style={{width:110}} placeholder="%"/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Новый показатель */}
        <div className="premium-card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">Новый показатель</h3>
          <form onSubmit={createMetric} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400">Название</label><input className="input-field w-full" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Конверсия лид → встреча" required/></div>
            <div><label className="text-xs text-gray-400">Единица</label><select className="input-field w-full" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option></select></div>
            <div className="grid grid-cols-4 gap-2 md:col-span-2">
              {['thr_min','thr_mid','thr_top','thr_ultra'].map((k,i)=><div key={k}><label className="text-xs" style={{color:BAND_COLORS[['min','mid','top','ultra'][i]]}}>{BAND_LABELS[['min','mid','top','ultra'][i]]}</label><input type="number" step="0.1" className="input-field w-full" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
            </div>
            <div className="grid grid-cols-4 gap-2 md:col-span-2">
              {['energy_min','energy_mid','energy_top','energy_ultra'].map((k,i)=><div key={k}><label className="text-xs text-gray-400">Энергия {BAND_LABELS[['min','mid','top','ultra'][i]]}</label><input type="number" className="input-field w-full" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
            </div>
            <div className="grid grid-cols-4 gap-2 md:col-span-2">
              {['karma_min','karma_mid','karma_top','karma_ultra'].map((k,i)=><div key={k}><label className="text-xs text-gray-400">Кармики {BAND_LABELS[['min','mid','top','ultra'][i]]}</label><input type="number" className="input-field w-full" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
            </div>
            <div><label className="text-xs text-gray-400">Описание (как считается)</label><textarea className="input-field w-full" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div><label className="text-xs text-gray-400">Советы для выполнения</label><textarea className="input-field w-full" rows={2} value={form.advice} onChange={e=>setForm({...form,advice:e.target.value})}/></div>
            <div className="md:col-span-2"><button type="submit" className="btn-gold">Добавить показатель</button></div>
          </form>
        </div>

        {/* Список показателей + тренинги */}
        <div className="space-y-4">
          {metrics.map(m=>(
            <div key={m.id} className="premium-card">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-semibold">{m.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    <span style={{color:BAND_COLORS.min}}>мин {m.thr_min}{m.unit}</span> · <span style={{color:BAND_COLORS.mid}}>средн {m.thr_mid}{m.unit}</span> · <span style={{color:BAND_COLORS.top}}>топ {m.thr_top}{m.unit}</span> · <span style={{color:BAND_COLORS.ultra}}>ультра {m.thr_ultra}{m.unit}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setExpanded(expanded===m.id?null:m.id);loadTrainings(m.id)}} className="btn-outline text-xs px-3 py-1.5">{expanded===m.id?'Свернуть':'Тренинги'}</button>
                  <button onClick={()=>delMetric(m.id)} className="text-xs text-red-400">Удалить</button>
                </div>
              </div>
              {expanded===m.id&&(
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  {(trainings[m.id]||[]).map(t=>(
                    <div key={t.id} className="flex justify-between items-center p-2 rounded-lg" style={{background:'rgba(255,255,255,0.03)'}}>
                      <span className="text-sm text-white">{t.type==='video'?'🎬':t.type==='test'?'📝':'📄'} {t.title}</span>
                      <button onClick={()=>delTraining(t.id,m.id)} className="text-xs text-red-400">Удалить</button>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input className="input-field" placeholder="Название тренинга" value={tForm.title} onChange={e=>setTForm({...tForm,title:e.target.value})}/>
                    <select className="input-field" value={tForm.type} onChange={e=>setTForm({...tForm,type:e.target.value})}><option value="video">Видео</option><option value="text">Текст</option><option value="test">Тест</option></select>
                    <input className="input-field" placeholder="URL видео" value={tForm.url} onChange={e=>setTForm({...tForm,url:e.target.value})}/>
                    <select className="input-field" value={tForm.recommend_below} onChange={e=>setTForm({...tForm,recommend_below:e.target.value})}><option value="min">Рекомендовать ниже «мин»</option><option value="mid">ниже «средн»</option><option value="top">ниже «топ»</option></select>
                    <textarea className="input-field md:col-span-2" rows={2} placeholder="Текст тренинга ИЛИ JSON теста: [{&quot;q&quot;:&quot;Вопрос&quot;,&quot;options&quot;:[&quot;A&quot;,&quot;B&quot;],&quot;correct&quot;:0}]" value={tForm.type==='test'?tForm.test_questions:tForm.content} onChange={e=>setTForm(tForm.type==='test'?{...tForm,test_questions:e.target.value}:{...tForm,content:e.target.value})}/>
                    <button onClick={()=>addTraining(m.id)} className="btn-gold text-sm">Добавить тренинг</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {metrics.length===0&&<div className="premium-card text-center"><p className="text-gray-400">Показателей пока нет — создайте первый выше</p></div>}
        </div>
      </div>
    </div>
  )
}
export default withAuth(MasteryAdmin,{adminOnly:true})
