'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './Courses.module.css';

const groups=['All','General Studies','Aptitude and Mental Ability','Language'];

export default function CoursesPage(){
  const [data,setData]=useState(null),[error,setError]=useState(null),[group,setGroup]=useState('All'),[search,setSearch]=useState(''),[open,setOpen]=useState(null);
  useEffect(()=>{fetch('/api/courses',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||'Courses unavailable');setData(d)}).catch(e=>setError(e.message))},[]);
  const filtered=useMemo(()=>data?.subjects?.filter(s=>group==='All'||s.name===group|| (group==='Language'&&/English|Tamil|Language/i.test(s.name))).filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.chapters.some(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.lessons.some(l=>l.title.toLowerCase().includes(search.toLowerCase()))))||[],[data,group,search]);
  if(error)return <main className={styles.state}><h1>Courses unavailable</h1><p>{error}</p><Link href="/login">Sign in</Link></main>;
  if(!data)return <main className={styles.state}>Loading your syllabus…</main>;
  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.kicker}>TNPSC GROUP 2 / 2A · SYLLABUS</span><h1>Courses & Course Completion</h1><p>Long-term subject courses are separate from YASH's adaptive daily plan. Completion is calculated from verified learning units, not page views.</p></div><div className={styles.overall}><strong>{data.overallCompletion}%</strong><span>Overall completion</span><small>{data.completedUnits} / {data.totalUnits} verified units</small></div></header>
    <div className={styles.notice}><b>Courses = syllabus coverage</b><span>Today's Plan = adaptive next actions based on mastery, tests and weak areas.</span><Link href="/">Open Today's Plan →</Link></div>
    <div className={styles.controls}><div className={styles.tabs}>{groups.map(g=><button key={g} className={group===g?styles.selected:''} onClick={()=>setGroup(g)}>{g}</button>)}</div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects, chapters or lessons…" /></div>
    <section className={styles.grid}>{filtered.map(s=><article className={styles.course} key={s.id}>
      <div className={styles.courseTop}><div><span className={styles.subjectTag}>{s.name}</span><h2>{s.name}</h2></div><strong>{s.completion}%</strong></div>
      <div className={styles.bar}><span style={{width:`${s.completion}%`}}/></div><div className={styles.meta}><span>{s.completedUnits}/{s.totalUnits} units</span><span>{s.chapters.length} chapters</span></div>
      <div className={styles.chapters}>{s.chapters.slice(0,open===s.id?s.chapters.length:3).map(c=><div className={styles.chapter} key={c.id}>
        <div className={styles.chapterHead}><div><b>{c.name}</b><small>{c.lessons.length} lessons</small></div><span>{c.completion}%</span></div>
        <div className={styles.lessons}>{c.lessons.slice(0,open===s.id?c.lessons.length:4).map(l=><div className={styles.lesson} key={l.id}><div><Link href={l.href}>{l.title}</Link><small>{l.completedUnits}/{l.totalUnits} units · {l.pyqUnits} PYQs · {l.testUnits} tests</small></div><i>{l.completion}%</i></div>)}</div>
      </div>)}</div>
      <button className={styles.expand} onClick={()=>setOpen(open===s.id?null:s.id)}>{open===s.id?'Show less':'Explore full course →'}</button>
    </article>)}</section>
  </div>;
}
