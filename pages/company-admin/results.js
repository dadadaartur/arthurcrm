import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

function toISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function Spark({points,color}){
  if(!points||points.length<2)return null
  const max=Math.max(...points),min=Math.min(...points),W=140,H=40
  const pts=points.map((v,i)=>`${(i/(points.length-1))*W},${H-((v-min)/(max-min||1))*(H-8)-4}`).join(' ')
  return <svg width={W} height={H}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>
}

function ResultsAdmin(){
  const [loading,setLoading]=useState(true)
  const [metrics,setMetrics]=useState([])
  const [rows,setRows]=useState([])
  const [range,setRange]=useState(()=>{const t=new Date(),f=new Date();f.setDate(f.getDate()-29);return{from:toISO(f),to:toISO(t)}})
  const [metricFilter,setMetricFilter]=useState('')
  const [sortBy,setSortBy]=useState('energy')
  const [expanded,setExpanded]=useState(null)

  const auth=async()=>{const {data:{session}}=await supabase.auth.getSession();return {Authorization:`Bearer ${session.access_token}`}}
  const load=async()=>{
    const h=await auth()
    const params=new URLSearchParams()
    if(metricFilter)params.set('metricId',metricFilter)
    if(range.from)params.set('from',range.from)
    if(range.to)params.set('to',range.to)
    const r=await fetch(`/api/company-admin/kpi/results?${params}`,{headers:h})
    if(r.ok){const d=await r.json();setMetrics(d.metrics||[]);setRows(d.rows||[])}
    setLoading(false)
  }
  useEffect(()=>{setLoading(true);load()},[range,metricFilter])

  const metricValue=row=>{
    if(!metricFilter)return null
    const e=(row.entries||[]).find(x=>x.metric_id===Number(metricFilter))
    return e?Number(e.value):null
  }
  const sortKey=row=>sortBy==='energy'?row.energy:sortBy==='tests'?row.tests_passed:(metricValue(row)??-1)
  const sorted=[...rows].sort((a,b)=>sortKey(b)-sortKey(a))
  const podium=sorted.slice(0,3)

  if(loading)return <div className="flex justify-center items-center py-24"><Spinner/></div>
  return(
    <div style={{minHeight:'100vh',background:'#000',color:'#fff',fontFamily:'Inter, sans-serif',padding:'40px 20px'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}}>
        <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 style={{fontSize:28,fontWeight:600,background:'linear-gradient(135deg, #a0e9ff, #c084fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Результаты команды</h1>
          <DateRangePicker from={range.from} to={range.to} onChange={setRange}/>
        </div>
        <div className="flex flex-wrap gap-3 mb-8">
          <select value={metricFilter} onChange={e=>setMetricFilter(e.target.value)} className="input-field">
            <option value="">Все показатели</option>
            {metrics.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="input-field">
            <option value="energy">По энергии</option>
            <option value="metric">По значению показателя</option>
            <option value="tests">По пройденным тестам</option>
          </select>
        </div>

        {/* Пьедестал */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {podium.map((r,i)=>(
            <div key={r.user_id} className="premium-card text-center" style={{borderColor:i===0?'rgba(255,215,0,0.6)':i===1?'rgba(192,132,252,0.5)':'rgba(249,115,22,0.4)'}}>
              <div style={{fontSize:34}}>{i===0?'🥇':i===1?'🥈':'🥉'}</div>
              <div className="text-white font-semibold mt-1">{r.name}</div>
              <div className="text-sm mt-1" style={{color:'#FFD700'}}>{r.energy} энергии</div>
              {metricFilter&&<div className="text-xs text-gray-400 mt-1">{metricValue(r)??'—'} по показателю</div>}
            </div>
          ))}
        </div>

        {/* Рейтинг */}
        <div className="space-y-3">
          {sorted.map((r,idx)=>(
            <div key={r.user_id} className="premium-card" onClick={()=>setExpanded(expanded===r.user_id?null:r.user_id)} style={{cursor:'pointer'}}>
              <div className="flex items-center gap-4">
                <span className="text-gray-500 w-6 text-center font-bold">{idx+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{r.name}</div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span style={{color:'#FFD700'}}>{r.energy} энергии</span>
                    <span>{r.tests_passed} тестов</span>
                    {metricFilter&&<span>{metricValue(r)??'—'}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {(r.latest||[]).slice(0,4).map(e=>{
                    const m=metrics.find(x=>x.id===e.metric_id)
                    return <span key={e.metric_id} title={m?.name} className="text-xs px-2 py-0.5 rounded-full" style={{background:`${BAND_COLORS[e.band]}22`,color:BAND_COLORS[e.band]}}>{e.value}{m?.unit}</span>
                  })}
                </div>
              </div>
              {expanded===r.user_id&&(
                <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4" onClick={e=>e.stopPropagation()}>
                  {metrics.map(m=>{
                    const pts=(r.entries||[]).filter(e=>e.metric_id===m.id).map(e=>Number(e.value)).reverse()
                    const last=pts[pts.length-1]
                    return(
                      <div key={m.id} className="p-3 rounded-lg" style={{background:'rgba(255,255,255,0.03)'}}>
                        <div className="flex justify-between text-sm mb-1"><span className="text-white">{m.name}</span><span style={{color:BAND_COLORS[((r.latest||[]).find(x=>x.metric_id===m.id))?.band||'none']}}>{last??'—'}{m.unit}</span></div>
                        <Spark points={pts} color={BAND_COLORS.top}/>
                      </div>
                    )
                  })}
                  {metrics.length===0&&<p className="text-gray-500 text-sm">Нет данных за период</p>}
                </div>
              )}
            </div>
          ))}
          {sorted.length===0&&<div className="premium-card text-center"><p className="text-gray-400">Нет данных за выбранный период</p></div>}
        </div>
      </div>
    </div>
  )
}
export default withAuth(ResultsAdmin,{anyStaff:true})
