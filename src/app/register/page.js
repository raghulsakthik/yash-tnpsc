'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Could not create your account.'); return; }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Unable to reach YASH right now. Please try again.');
    } finally { setSubmitting(false); }
  }

  return (
    <main style={styles.page}>
      <div style={styles.ambient} />
      <section style={styles.shell}>
        <div style={styles.brandRow}>
          <div style={styles.logo}>Y</div>
          <div><div style={styles.brand}>YASH</div><div style={styles.brandSub}>Adaptive Learning</div></div>
        </div>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Start your journey</div>
          <h1 style={styles.title}>Build your learning path.</h1>
          <p style={styles.subtitle}>Create your account. YASH will use your progress and performance to shape what you learn next.</p>
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Your name<input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></label>
            <label style={styles.label}>Email address<input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label style={styles.label}>Password<div style={styles.passwordWrap}><input style={{ ...styles.input, paddingRight: 72 }} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a secure password" autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword(v => !v)} style={styles.showButton}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            {error && <div role="alert" style={styles.error}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ ...styles.primaryButton, opacity: submitting ? .7 : 1 }}>{submitting ? 'Creating account…' : 'Create learner account'}</button>
          </form>
          <div style={styles.divider}><span style={styles.line} /><small>ALREADY A LEARNER?</small><span style={styles.line} /></div>
          <Link href="/login" style={styles.secondaryButton}>Sign in instead</Link>
        </div>
        <p style={styles.footer}>By creating an account, you can build a persistent adaptive learning profile and continue across sessions.</p>
      </section>
    </main>
  );
}

const styles = {
  page:{minHeight:'100vh',position:'relative',overflow:'hidden',background:'#fff8f5',color:'#1c1917',fontFamily:"'Plus Jakarta Sans', Inter, system-ui, sans-serif",display:'grid',placeItems:'center',padding:'32px 18px'},
  ambient:{position:'fixed',width:520,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(251,146,60,.16),rgba(251,146,60,0) 68%)',top:-220,left:-170,pointerEvents:'none'},
  shell:{width:'100%',maxWidth:460,position:'relative'},
  brandRow:{display:'flex',alignItems:'center',gap:11,marginBottom:22,paddingLeft:4},
  logo:{width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#ea580c,#f59e0b)',color:'#fff',fontWeight:900,fontSize:18,boxShadow:'0 8px 20px rgba(234,88,12,.2)'},
  brand:{fontWeight:900,letterSpacing:'.12em',fontSize:15},brandSub:{color:'#a39a92',fontSize:9,marginTop:2,letterSpacing:'.08em',textTransform:'uppercase'},
  card:{background:'#fff',border:'1px solid #eadfd7',borderRadius:24,padding:'32px 30px',boxShadow:'0 22px 60px rgba(78,50,30,.10)'},
  eyebrow:{color:'#ea580c',fontWeight:800,letterSpacing:'.13em',textTransform:'uppercase',fontSize:10,marginBottom:9},
  title:{fontFamily:'Epilogue, Plus Jakarta Sans, system-ui, sans-serif',fontSize:'clamp(27px,6vw,38px)',lineHeight:1.1,letterSpacing:'-.035em',margin:0,fontWeight:750},
  subtitle:{color:'#78716c',fontSize:12,lineHeight:1.65,margin:'12px 0 24px'},form:{display:'grid',gap:16},label:{display:'grid',gap:7,color:'#44403c',fontSize:11,fontWeight:800},
  input:{boxSizing:'border-box',width:'100%',height:48,border:'1px solid #e5e0d6',borderRadius:11,background:'#fffdfb',color:'#1c1917',padding:'0 14px',outline:'none',fontSize:13,fontFamily:'inherit'},passwordWrap:{position:'relative'},
  showButton:{position:'absolute',right:9,top:9,height:30,border:0,background:'#fff7ed',color:'#c2410c',borderRadius:7,padding:'0 9px',fontWeight:800,fontSize:10,cursor:'pointer'},
  error:{background:'#fff1f0',border:'1px solid #fecaca',color:'#b42318',borderRadius:10,padding:'10px 12px',fontSize:11,lineHeight:1.5},primaryButton:{border:0,height:48,borderRadius:11,background:'#ea580c',color:'#fff',fontWeight:850,fontSize:12,cursor:'pointer',boxShadow:'0 8px 18px rgba(234,88,12,.2)'},
  divider:{display:'flex',alignItems:'center',gap:9,margin:'23px 0 14px',color:'#a8a29e',fontSize:9,fontWeight:800,letterSpacing:'.08em'},line:{height:1,background:'#eee7df',flex:1},secondaryButton:{display:'grid',placeItems:'center',height:46,borderRadius:11,border:'1px solid #e5e0d6',background:'#f7f5f0',color:'#292524',textDecoration:'none',fontSize:11,fontWeight:800},footer:{textAlign:'center',color:'#a39a92',fontSize:9,lineHeight:1.6,margin:'16px 18px 0'}
};
