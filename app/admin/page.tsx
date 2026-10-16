'use client';
import {useEffect,useState} from 'react';
import {characterById} from '../../lib/astral-data';

import {MediaView,type Media} from '../media';
type Row={login?:number;username?:string;post?:string;id:string;owner:string;character:string;created:number;seen:number;blocked:number;title:string;body:string;comments:number;posts:number;reason:string;kind:string;target:string;status:string;reporter:string;media?:Media};
const date=(n:number)=>new Date(n).toLocaleString('ko-KR');
const name=(id:string)=>characterById(id)?.name||id;
const labels:Record<string,string>={posts:'게시물 관리',comments:'댓글 관리',users:'사용자 관리',reports:'신고된 게시물',trash:'휴지통',audit:'처리 기록',settings:'비밀번호 변경'};
export default function AdminPage(){
 const [access,setAccess]=useState<'loading'|'yes'|'no'>('loading');
 const [tab,setTab]=useState('posts'),[rows,setRows]=useState<Row[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[q,setQ]=useState(''),[status,setStatus]=useState('open'),[revision,setRevision]=useState(0);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 async function mutate(body:Record<string,unknown>){
  const r=await fetch('/api/astral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {error?:string;rows:Row[];total:number};
  if(r.status===401)setAccess('no');if(!r.ok)throw new Error(d.error||'요청 실패');return d;
 }
 useEffect(()=>{fetch('/api/astral?admin=session').then(async r=>{if(!r.ok){setAccess('no');return}setAccess('yes')}).catch(()=>{setAccess('no');setError('연결을 확인해 주세요.')})},[]);
 useEffect(()=>{
  if(access!=='yes'||tab==='settings')return;
  const controller=new AbortController();setLoading(true);setError('');
  const params=new URLSearchParams({admin:tab,page:String(page),q,status});
  fetch('/api/astral?'+params,{signal:controller.signal}).then(async r=>{const d=await r.json() as {error?:string;rows:Row[];total:number};if(r.status===401)setAccess('no');if(!r.ok)throw new Error(d.error);return d}).then(d=>{setRows(d.rows);setTotal(d.total)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return ()=>controller.abort();
 },[access,tab,page,q,status,revision]);
 async function act(body:Record<string,unknown>,confirmation?:string){
  if(confirmation&&!window.confirm(confirmation))return;
  if(['adminDelete','adminRestore','adminPurge'].includes(String(body.action))){const reason=window.prompt('처리 사유를 입력해 주세요.');if(!reason?.trim())return;body={...body,reason}}
  setBusy(true);setError('');setMessage('');try{await mutate(body);setMessage('처리했습니다.');setRevision(v=>v+1)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 function navigate(next:string){setRows([]);setTotal(0);setLoading(true);setTab(next);setPage(1);setQ('');setError('');setMessage('')}
 async function changePassword(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
  if(f.get('next')!==f.get('confirm')){setError('새 비밀번호 확인이 일치하지 않습니다.');return}
  setBusy(true);setError('');try{await mutate({action:'adminPassword',current:f.get('current'),next:f.get('next')});form.reset();setAccess('no');setMessage('비밀번호를 변경했습니다. 모든 관리자 세션이 종료되었으니 새 비밀번호로 로그인해 주세요.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <main className="admin-shell"><header className="admin-heading"><div><div className="section-kicker">AEONS · MODERATION</div><h1>게시판의 에이온즈</h1><p>방문자의 이야기와 신고를 한곳에서 관리합니다.</p></div><a className="outline-button" href="/">게시판으로</a></header>
 {message&&<p className="admin-notice" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
 {access==='loading'?<p>관리자 권한 확인 중…</p>:access==='no'?<section className="admin-card"><h2>관리자 로그인이 필요합니다</h2><p>게시판의 캐릭터 선택창에서 관리자 프로필로 로그인해 주세요.</p><a className="gold-button" href="/">게시판으로 돌아가기</a></section>:<>
 <nav className="admin-tabs" aria-label="관리 메뉴">{Object.entries(labels).map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>navigate(key)}>{label}</button>)}<button disabled={busy} onClick={async()=>{setBusy(true);try{await mutate({action:'adminLogout'});setAccess('no');setMessage('로그아웃했습니다.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>로그아웃</button></nav>
 <section className="admin-card"><h2>{labels[tab]}</h2>
 {tab==='settings'?<form className="admin-password" onSubmit={changePassword}><label>현재 비밀번호<input name="current" type="password" required autoComplete="current-password" minLength={6} maxLength={128}/></label><label>새 비밀번호<input name="next" type="password" required autoComplete="new-password" minLength={6} maxLength={128}/></label><label>새 비밀번호 확인<input name="confirm" type="password" required autoComplete="new-password" minLength={6} maxLength={128}/></label><p>변경하면 모든 기기의 관리자 세션이 종료됩니다.</p><button className="gold-button" disabled={busy}>비밀번호 변경</button></form>:<>
 <div className="admin-controls"><input aria-label="관리 목록 검색" placeholder={tab==='users'?'로그인 아이디 또는 사용자 ID 검색':'제목·내용 검색'} value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/>{tab==='reports'&&<select aria-label="신고 처리 상태" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="open">미처리</option><option value="resolved">처리 완료</option><option value="dismissed">기각</option><option value="all">전체</option></select>}<button className="outline-button" onClick={()=>setRevision(v=>v+1)}>새로고침</button></div>
 {tab==='trash'&&<p>숨긴 콘텐츠는 복원할 수 있습니다. 영구 삭제 후 이미지는 저장소 정리 버튼으로 제거합니다. 자동 만료는 없습니다.</p>}{tab==='trash'&&<button className="outline-button" disabled={busy} onClick={()=>act({action:'adminMaintenance'},'영구 삭제한 콘텐츠와 오래된 미완료 업로드의 이미지를 최대 10개 정리할까요?')}>삭제된 이미지 저장소 정리</button>}
 {tab==='users'&&<p className="field-note">아이디와 비밀번호로 가입한 계정을 관리합니다. 현재 접속 여부와 관계없이 등록된 계정이 표시되며, 비회원은 제외됩니다.</p>}
 {loading?<p role="status">목록을 불러오는 중…</p>:!rows.length?<p className="quiet">표시할 항목이 없습니다.</p>:<div className="admin-list">{rows.map(r=><article className="admin-row" key={r.id||r.owner}>
 {tab==='trash'||tab==='audit'?<><div className="admin-row-top"><strong>{r.title}</strong><span>{date(r.created)}</span></div><p>{r.kind} · {r.reason}</p>{tab==='trash'&&<div className="admin-actions"><button disabled={busy} onClick={()=>act({action:'adminRestore',id:r.id})}>복원</button><button disabled={busy} onClick={()=>act({action:'adminPurge',id:r.id},'영구 삭제하면 복구할 수 없습니다. 계속할까요?')}>영구 삭제</button></div>}</>:tab==='users'?<><div className="admin-row-top"><strong>{r.username}</strong><span className={'admin-badge '+(r.blocked?'warn':'')}>{r.blocked?'활동 제한':'정상'}</span></div><p>{name(r.character)}</p><code>{r.owner}</code><p>게시글 {r.posts} · 댓글 {r.comments}</p><small>가입 {date(r.created)} · 최근 작성·활동 {date(r.seen)} · 최근 로그인 {r.login?date(r.login):'기록 없음'}</small><div className="admin-actions"><button onClick={()=>{navigate('posts');setQ(r.owner)}}>작성한 글 보기</button><button onClick={()=>{navigate('comments');setQ(r.owner)}}>작성한 댓글 보기</button><button disabled={busy} onClick={()=>act({action:'adminBlock',owner:r.owner,blocked:!r.blocked},r.blocked?'이 사용자의 활동 제한을 해제할까요?':'이 사용자의 글·댓글·공감·신고 활동을 제한할까요?')}>{r.blocked?'차단 해제':'사용자 차단'}</button></div></>:<>
 <div className="admin-row-top"><strong>{tab==='comments'?'원문: ':''}{r.title}</strong><span>{date(r.created)}</span></div><p className="admin-author">{name(r.character)} {r.username&&`(${r.username})`} <code>{r.owner}</code>{tab==='posts'&&` · 댓글 ${r.comments}`}</p>
 {(tab==='posts'||tab==='comments')?<details><summary>{r.body.slice(0,160)}{r.body.length>160?'…':''}</summary><p className="admin-body">{r.body}</p><MediaView media={r.media}/></details>:<><div className="admin-row-top"><span className="admin-badge">{r.kind==='comment'?'댓글 신고':'게시글 신고'}</span><span>{r.status==='open'?'미처리':r.status==='resolved'?'처리 완료':'기각'}</span></div><p className="admin-body">{r.body}</p><div className="admin-report-reason"><b>신고 사유</b><p>{r.reason}</p><small>신고자 {r.reporter}</small></div><p className="field-note">신고 접수 당시 내용입니다. 원문이 수정·삭제되어도 기록은 남습니다.</p></>}
 <div className="admin-actions">{tab==='comments'&&<a className="outline-button" href={'/posts/'+r.post}>원문 보기</a>}<button disabled={busy} onClick={()=>act({action:'adminDelete',kind:tab==='posts'?'post':tab==='comments'?'comment':r.kind,id:tab==='reports'?r.target:r.id},'이 콘텐츠를 숨기고 휴지통으로 옮길까요?')}>{tab==='comments'||r.kind==='comment'?'댓글 삭제':'게시글 삭제'}</button>{tab==='reports'&&<><button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'resolved'})}>처리 완료</button><button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'dismissed'})}>기각</button>{r.status!=='open'&&<button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'open'})}>다시 열기</button>}</>}</div>
 </>}
 </article>)}</div>}
 <div className="pagination"><span>총 {total}개 · {page} / {Math.max(1,Math.ceil(total/25))}</span><div><button disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>이전</button><button disabled={loading||page*25>=total} onClick={()=>setPage(p=>p+1)}>다음</button></div></div>
 </>}
 </section></>}
 </main>;
}
