 'use client';
import {useEffect,useRef,useState} from 'react';

const IDLE_MS=180_000;
const SEEN_KEY='astral-silver-wolf-visited-v1';
let seenInThisPage=false;

// A purely visual cameo: no account, content, or API mutations.
export default function SilverWolfEasterEgg({blocked=false}:{blocked?:boolean}){
 const [phase,setPhase]=useState<'idle'|'connecting'|'connected'|'leaving'>('idle');
 const dialog=useRef<HTMLDialogElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(blocked||phase!=='idle'||seenInThisPage)return;
  try{if(sessionStorage.getItem(SEEN_KEY))return}catch{}
  let timer:ReturnType<typeof setTimeout>|undefined;
  const pause=()=>{if(timer)clearTimeout(timer)};
  const writing=()=>!!document.querySelector('dialog[open]')||!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea')).some(el=>el.value.trim()&&el.getClientRects().length>0);
  const arm=()=>{pause();if(document.visibilityState!=='visible'||!document.hasFocus())return;timer=setTimeout(()=>{if(document.visibilityState!=='visible'||!document.hasFocus()||writing()){arm();return}seenInThisPage=true;try{sessionStorage.setItem(SEEN_KEY,'1')}catch{}previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setPhase('connecting')},IDLE_MS)};
  const events=['pointermove','pointerdown','keydown','scroll','touchstart','input','focusin'] as const;
  events.forEach(event=>window.addEventListener(event,arm,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',arm);window.addEventListener('focus',arm);window.addEventListener('blur',pause);arm();
  return()=>{pause();events.forEach(event=>window.removeEventListener(event,arm,true));document.removeEventListener('visibilitychange',arm);window.removeEventListener('focus',arm);window.removeEventListener('blur',pause)};
 },[blocked,phase]);
 useEffect(()=>{
  if(phase==='idle')return;
  const el=dialog.current;if(!el)return;
  if(!el.open)el.showModal();
  if(phase==='connecting'){const timer=setTimeout(()=>setPhase('connected'),1400);return()=>clearTimeout(timer)}
  if(phase==='leaving'){const timer=setTimeout(()=>{el.close();setPhase('idle');previousFocus.current?.focus({preventScroll:true})},650);return()=>clearTimeout(timer)}
 },[phase]);
 useEffect(()=>{const dismissHidden=()=>{if(document.visibilityState!=='visible'){dialog.current?.close();setPhase('idle')}};document.addEventListener('visibilitychange',dismissHidden);return()=>document.removeEventListener('visibilitychange',dismissHidden)},[]);
 useEffect(()=>{if(blocked&&phase!=='idle'){dialog.current?.close();setPhase('idle')}},[blocked,phase]);
 const dismiss=()=>{if(phase!=='idle'&&phase!=='leaving')setPhase('leaving')};
 return <dialog ref={dialog} className="silver-wolf-cameo" data-phase={phase} aria-labelledby="silver-wolf-title" aria-describedby="silver-wolf-line" onCancel={e=>{e.preventDefault();dismiss()}} onClick={dismiss}>
  <div className="sw-grid" aria-hidden="true"/><div className="sw-terminal">
   <div className="sw-status"><span/> {phase==='connecting'?'외부 접속 감지…':phase==='leaving'?'CONNECTION CLOSED':'PLAYER 02 CONNECTED'}<span className="sw-number">SW / 1006</span></div>
   <div className="sw-content"><div className="sw-avatar"><img src="/characters/1006.png" alt="은랑" width="160" height="160"/><span aria-hidden="true">LV. ???</span></div><div className="sw-message"><p className="sw-kicker">STELLARON HUNTERS · SILVER WOLF</p><h2 id="silver-wolf-title">잠깐, 이 화면 좀 빌릴게.</h2><div id="silver-wolf-line" aria-live="polite"><p>{phase==='leaving'?'벌써 돌아왔네. 그럼 다음에 봐.':'자리 비웠어? 보안이 너무 허술하길래 잠깐 들어왔지.'}</p>{phase!=='leaving'&&<p>걱정 마. 저장 파일은 안 건드렸으니까.</p>}</div></div></div>
   <div className="sw-footer"><span>✦ 은랑이 남긴 작은 장난</span><button type="button" onClick={dismiss}>돌아왔어 · 닫기 <span aria-hidden="true">↵</span></button></div><p className="sw-hint">화면을 클릭하거나 Esc를 누르면 원래 화면으로 돌아갑니다.</p>
  </div>
 </dialog>;
}
