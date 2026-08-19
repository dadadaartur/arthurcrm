import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { useProfile } from '../../context/ProfileContext'
import { roleLabel } from '../../lib/permissions'

function toISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
const inRange=(iso,r)=>{if(!iso)return false;if(!r.from&&!r.to)return true;const d=iso.slice(0,10);if(r.from&&d<r.from)return false;if(r.to&&d>r.to)return false;return true}

function CompanyAdminDashboard(){
  const router=useRouter()
  const {profile:myProfile}=useProfile()
  const [loading,setLoading]=useState(true)
  const [companyId,setCompanyId]=useState(null)
  const [stats,setStats]=useState({tasks:0,employees:0,goals:0,rewards:0,pendingReviews:0,pendingPurchases:0})
  const [range,setRange]=useState(()=>{const t=new Date(),f=new Date();f.setDate(f.getDate()-29);return{from:toISO(f),to:toISO(t)}})
  const [analytics,setAnalytics]=useState({doneTasks:0,karmaAwarded:0,purchases:0,circulation:0})

  useEffect(()=>{init()},[])
  const init=async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){router.push('/login');return}
    const {data:profile}=await supabase.from('profiles').select('company_id').eq('user_id',user.id).single()
    if(!profile){router.push('/');return}
    setCompanyId(profile.company_id)
    await loadCounts(profile.company_id)
    setLoading(false)
  }
  const loadCounts=async(c)=>{
    const [t,e,g,r]=await Promise.all([
      supabase.from('tasks').select('id',{count:'exact',head:true}).eq('company_id',c).eq('is_active',true),
      supabase.from('profiles').select('user_id',{count:'exact',head:true}).eq('company_id',c).is('deleted_at',null).eq('is_company_admin',false),
      supabase.from('goals').select('id',{count:'exact',head:true}).eq('company_id',c).eq('is_active',true),
      supabase.from('rewards').select('id',{count:'exact',head:true}).eq('company_id',c)
    ])
    const {data:tasks}=await supabase.from('tasks').select('id').eq('company_id',c)
    const ids=(tasks||[]).map(x=>x.id)
    let pr=0
    if(ids.length){const {count}=await supabase.from('task_assignments').select('id',{count:'exact',head:true}).in('task_id',ids).eq('status','pending_review');pr=count||0}
    const {data:emps}=await supabase.from('profiles').select('user_id').eq('company_id',c).is('deleted_at',null)
    const uids=(emps||[]).map(x=>x.user_id)
    let pp=0
    if(uids.length){const {count}=await supabase.from('purchases').select('id',{count:'exact',head:true}).in('user_id',uids).in('status',['pending','new']);pp=count||0}
    setStats({tasks:t.count||0,employees:e.count||0,goals:g.count||0,rewards:r.count||0,pendingReviews:pr,pendingPurchases:pp})
  }
  useEffect(()=>{if(companyId)loadAnalytics(companyId,range)},[companyId,range])
  const loadAnalytics=async(c,r)=>{
    const {data:tasks}=await supabase.from('tasks').select('id, reward_karma').eq('company_id',c)
    const map=Object.fromEntries((tasks||[]).map(t=>[t.id,t.reward_karma||0]))
    const ids=Object.keys(map)
    let done=0,karma=0
    if(ids.length){
      const {data}=await supabase.from('task_assignments').select('task_id, completed_at').in('task_id',ids).eq('status','completed').limit(1000)
      ;(data||[]).forEach(a=>{if(inRange(a.completed_at,r)){done++;karma+=map[a.task_id]||0}})
    }
    const {data:emps}=await supabase.from('profiles').select('user_id, karma_balance(balance)').eq('company_id',c).is('deleted_at',null)
    const circ=(emps||[]).reduce((s,e)=>s+(e.karma_balance?.balance||0),0)
    const uids=(emps||[]).map(e=>e.user_id)
    let purchases=0
    if(uids.length){
      const {data}=await supabase.from('purchases').select('created_at, status').in('user_id',uids).neq('status','rejected').limit(1000)
      ;(data||[]).forEach(p=>{if(inRange(p.created_at,r))purchases++})
    }
    setAnalytics({doneTasks:done,karmaAwarded:karma,purchases,circulation:circ})
  }
  if(loading)return <div className="flex justify-center items-center py-24"><Spinner/></div>

  const cards=[
    {title:'Команда',value:stats.employees,sub:'сотрудников',href:'/company-admin/employees',color:'#a0e9ff'},
    {title:'Задания',value:stats.tasks,sub:'активных',href:'/company-admin/tasks',color:'#FFD700'},
    {title:'Цели',value:stats.goals,sub:'поставлено',href:'/company-admin/goals',color:'#c084fc'},
    {title:'Проверки',value:stats.pendingReviews,sub:'ждут решения',href:'/company-admin/review',color:'#f97316',alert:stats.pendingReviews>0},
    {title:'Покупки',value:stats.pendingPurchases,sub:'на согласовании',href:'/company-admin/purchases',color:'#ffb3c6',alert:stats.pendingPurchases>0},
    {title:'Товары',value:stats.rewards,sub:'в магазине',href:'/company-admin/rewards',color:'#4ade80'},
    {title:'Цели и мастерство',value:null,sub:'KPI и пороги',href:'/company-admin/mastery',color:'#FFD700'},
    {title:'Результаты',value:null,sub:'аналитика',href:'/company-admin/results',color:'#a0e9ff'},
    {title:'Ресурсы',value:null,sub:'фонд и тарифы',href:'/company-admin/resources',color:'#a0e9ff'},
    {title:'Казна',value:null,sub:'эмиссия',href:'/company-admin/karma',color:'#FFD700'},
    {title:'Адаптация',value:null,sub:'планы',href:'/company-admin/onboarding',color:'#c084fc'},
  ]
  return(
    <div style={{minHeight:'100vh',background:'#000',color:'#fff',fontFamily:'Inter, sans-serif',padding:'40px 20px',position:'relative'}}>
      <div style={{position:'relative',zIndex:1,maxWidth:1200,margin:'0 auto'}}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 style={{fontSize:28,fontWeight:600,background:'linear-gradient(135deg, #a0e9ff, #ffb3c6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Панель управления</h1>
            <p className="text-sm text-gray-400 mt-1">Роль: {roleLabel(myProfile)}</p>
          </div>
          <DateRangePicker from={range.from} to={range.to} onChange={setRange}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))',gap:14,marginBottom:32}}>
          {cards.map(c=>(
            <div key={c.title} onClick={()=>router.push(c.href)}
              style={{background:'rgba(15,20,35,0.8)',backdropFilter:'blur(10px)',borderRadius:16,padding:20,cursor:'pointer',position:'relative',border:`1px solid ${c.alert?'rgba(249,115,22,0.5)':'rgba(255,255,255,0.1)'}`,transition:'all 0.25s ease'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.boxShadow=`0 0 18px ${c.color}44`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=c.alert?'rgba(249,115,22,0.5)':'rgba(255,255,255,0.1)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}>
              {c.value!==null&&<div style={{fontSize:30,fontWeight:700,color:c.color}}>{c.value}</div>}
              <div style={{fontSize:15,fontWeight:600,color:'#fff',marginTop:c.value!==null?4:0}}>{c.title}</div>
              <div style={{fontSize:12,color:'#888',marginTop:2}}>{c.sub}</div>
              {c.alert&&<span style={{position:'absolute',top:12,right:12,width:8,height:8,borderRadius:'50%',background:'#f97316',boxShadow:'0 0 8px rgba(249,115,22,0.9)',animation:'pulse 2s infinite'}}/>}
            </div>
          ))}
        </div>
        <div className="premium-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Активность за период</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:14}}>
            {[
              {v:analytics.doneTasks,l:'заданий выполнено',c:'#4ade80'},
              {v:analytics.karmaAwarded,l:'кармиков начислено',c:'#FFD700'},
              {v:analytics.purchases,l:'покупок совершено',c:'#ffb3c6'},
              {v:analytics.circulation,l:'кармиков в обороте',c:'#c084fc'},
            ].map((m,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.03)',borderRadius:12,padding:18,border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:26,fontWeight:700,color:m.c}}>{m.v}</div>
                <div style={{fontSize:13,color:'#aaa',marginTop:2}}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default withAuth(CompanyAdminDashboard,{anyStaff:true})
