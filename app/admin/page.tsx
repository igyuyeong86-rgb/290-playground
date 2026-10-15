'use client';
import {useEffect,useState} from 'react';
import {characterById} from '../../lib/astral-data';

type Row={id:string;owner:string;character:string;created:number;seen:number;blocked:number;title:string;body:string;comments:number;posts:number;reason:string;kind:string;target:string;status:string;reporter:string};
const date=(n:number)=>new Date(n).toLocaleString('ko-KR');
const name=(id:string)=>characterById(id)?.name||id;
const labels:Record<string,string>={posts:'게시물 관리',users:'사용자 관리',reports:'신고된 게시물',settings:'비밀번호 변경'};
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
  setBusy(true);setError('');setMessage('');try{await mutate(body);setMessage('처리했습니다.');setRevision(v=>v+1)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 function navigate(next:string){setTab(next);setPage(1);setQ('');setError('');setMessage('')}
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
 <div className="admin-controls"><input aria-label="관리 목록 검색" placeholder={tab==='users'?'사용자 ID 또는 캐릭터 ID 검색':'제목·내용 검색'} value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/>{tab==='reports'&&<select aria-label="신고 처리 상태" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="open">미처리</option><option value="resolved">처리 완료</option><option value="dismissed">기각</option><option value="all">전체</option></select>}<button className="outline-button" onClick={()=>setRevision(v=>v+1)}>새로고침</button></div>
 {tab==='users'&&<p className="field-note">사용자는 브라우저 식별자 기준입니다. 같은 캐릭터도 서로 다른 사용자이며, 쿠키를 지우면 새 사용자로 인식될 수 있습니다.</p>}
 {loading?<p role="status">목록을 불러오는 중…</p>:!rows.length?<p className="quiet">표시할 항목이 없습니다.</p>:<div className="admin-list">{rows.map(r=><article className="admin-row" key={r.id||r.owner}>
 {tab==='users'?<><div className="admin-row-top"><strong>{name(r.character)}</strong><span className={'admin-badge '+(r.blocked?'warn':'')}>{r.blocked?'활동 제한':'정상'}</span></div><code>{r.owner}</code><p>게시글 {r.posts} · 댓글 {r.comments}</p><small>첫 활동 {date(r.created)} · 최근 활동 {date(r.seen)}</small><div className="admin-actions"><button onClick={()=>{navigate('posts');setQ(r.owner)}}>작성한 글 보기</button><button disabled={busy} onClick={()=>act({action:'adminBlock',owner:r.owner,blocked:!r.blocked},r.blocked?'이 사용자의 활동 제한을 해제할까요?':'이 사용자의 글·댓글·공감·신고 활동을 제한할까요?')}>{r.blocked?'차단 해제':'사용자 차단'}</button></div></>:<>
 <div className="admin-row-top"><strong>{r.title}</strong><span>{date(r.created)}</span></div><p className="admin-author">{name(r.character)} <code>{r.owner}</code>{tab==='posts'&&` · 댓글 ${r.comments}`}</p>
 {tab==='posts'?<details><summary>{r.body.slice(0,160)}{r.body.length>160?'…':''}</summary><p className="admin-body">{r.body}</p></details>:<><div className="admin-row-top"><span className="admin-badge">{r.kind==='comment'?'댓글 신고':'게시글 신고'}</span><span>{r.status==='open'?'미처리':r.status==='resolved'?'처리 완료':'기각'}</span></div><p className="admin-body">{r.body}</p><div className="admin-report-reason"><b>신고 사유</b><p>{r.reason}</p><small>신고자 {r.reporter}</small></div><p className="field-note">신고 접수 당시 내용입니다. 원문이 수정·삭제되어도 기록은 남습니다.</p></>}
 <div className="admin-actions"><button disabled={busy} onClick={()=>act({action:'adminDelete',kind:tab==='posts'?'post':r.kind,id:tab==='posts'?r.id:r.target},'이 콘텐츠를 게시판에서 삭제할까요?')}>{tab==='reports'&&r.kind==='comment'?'댓글 삭제':'게시글 삭제'}</button>{tab==='reports'&&<><button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'resolved'})}>처리 완료</button><button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'dismissed'})}>기각</button>{r.status!=='open'&&<button disabled={busy} onClick={()=>act({action:'adminReport',id:r.id,status:'open'})}>다시 열기</button>}</>}</div>
 </>}
 </article>)}</div>}
 <div className="pagination"><span>총 {total}개 · {page} / {Math.max(1,Math.ceil(total/25))}</span><div><button disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>이전</button><button disabled={loading||page*25>=total} onClick={()=>setPage(p=>p+1)}>다음</button></div></div>
 </>}
 </section></>}
 </main>;
}
