'use client';
import {useEffect,useRef,useState} from 'react';
type Cue='receipt'|'loan';
const names=['receipt','loan'] as const;
const labels:Record<string,string[]>={zh:['音效','开启到账提示音','试听工程回款','试听贷款到账'],en:['Sound','Enable cash alerts','Preview project receipt','Preview loan deposit'],es:['Sonido','Activar avisos de caja','Escuchar cobro de obra','Escuchar préstamo'],fr:['Son','Activer les alertes de trésorerie','Écouter un règlement','Écouter un prêt'],hi:['ध्वनि','नकदी अलर्ट चालू करें','परियोजना भुगतान सुनें','ऋण प्राप्ति सुनें']};
export default function CashSounds({state,language}:any){
 const [enabled,setEnabled]=useState(true), [unavailable,setUnavailable]=useState(false);
 const ctx=useRef<AudioContext|null>(null), cache=useRef<Partial<Record<Cue,Promise<AudioBuffer>>>>({}), end=useRef(0), mute=useRef(false), generation=useRef(0);
 const cursor=useRef({scope:'',receipt:0,loan:0});const l=labels[language]||labels.en;
 function unlock(){try{if(!ctx.current)ctx.current=new AudioContext();if(ctx.current.state==='suspended')void ctx.current.resume().catch(()=>{});return ctx.current;}catch{return null;}}
 async function play(cues:readonly Cue[],preview=false){
  const audio=ctx.current,gen=generation.current;if(!audio||(!preview&&(mute.current||audio.state!=='running')))return;
  try{const buffers=await Promise.all(cues.map(c=>cache.current[c]??=(async()=>{try{const r=await fetch('/sounds/'+c+'.wav');if(!r.ok)throw Error();return await audio.decodeAudioData(await r.arrayBuffer());}catch(e){delete cache.current[c];throw e;}})()));
   if(gen!==generation.current||(!preview&&mute.current))return;
   for(const buffer of buffers){const src=audio.createBufferSource();src.buffer=buffer;src.connect(audio.destination);const when=Math.max(audio.currentTime,end.current);src.start(when);end.current=when+buffer.duration+.045;}
   if(preview)setUnavailable(false);
  }catch{if(preview)setUnavailable(true);}
 }
 useEffect(()=>{try{mute.current=localStorage.getItem('fmg-cash-muted')==='1';setEnabled(!mute.current);}catch{}
  function interact(){if(!mute.current)unlock();}
  window.addEventListener('pointerdown',interact);window.addEventListener('keydown',interact);
  return()=>{generation.current++;window.removeEventListener('pointerdown',interact);window.removeEventListener('keydown',interact);void ctx.current?.close().catch(()=>{});ctx.current=null;cache.current={};end.current=0;};
 },[]);
 const scope=state?.me&&!state.host?[state.code,state.round,state.me.id].join(':'):'';
 const receipt=state?.me?.cashSoundCounts?.receipt||0,loan=state?.me?.cashSoundCounts?.loan||0;
 useEffect(()=>{const prev=cursor.current;if(prev.scope!==scope){generation.current++;cursor.current={scope,receipt,loan};return;}
  const next={receipt,loan};const cues=names.filter(c=>next[c]>prev[c]);cursor.current={scope,receipt:Math.max(prev.receipt,receipt),loan:Math.max(prev.loan,loan)};
  if(scope&&cues.length&&!document.hidden)void play(cues);
 },[scope,receipt,loan]);
 return <details className="cash-sound-menu"><summary>{l[0]} {enabled?'♪':'×'}</summary><div><label><input type="checkbox" checked={enabled} onChange={e=>{const on=e.target.checked;mute.current=!on;generation.current++;setEnabled(on);if(on)unlock();try{localStorage.setItem('fmg-cash-muted',on?'0':'1');}catch{}}}/>{l[1]}</label>{names.map((c,i)=><button key={c} type="button" onClick={()=>{if(unlock())void play([c],true);else setUnavailable(true);}}>{l[i+2]} ▷</button>)}{unavailable&&<small role="status">{language==='zh'?'此浏览器暂时无法播放':'Audio unavailable'}</small>}</div></details>;
}
