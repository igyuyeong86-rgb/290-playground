'use client';
import {useEffect,useState} from 'react';
type Account={username:string;male:string;female:string;character:string};
export default function AccountPanel({settings=false}:{settings?:boolean}){
 const [account,setAccount]=useState<Account|null>(null),[loading,setLoading]=useState(true),[register,setRegister]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function refresh(){const r=await fetch('/api/astral?account=1');const d=await r.json() as {account:Account|null;error?:string};if(!r.ok)throw Error(d.error||'계정 정보를 불러오지 못했어요.');setAccount(d.account)}
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>,action:string){
  e.preventDefault();const form=e.currentTarget;setBusy(true);setError('');setMessage('');
  try{const values=Object.fromEntries(new FormData(form));const r=await fetch('/api/astral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...values})});const d=await r.json() as {account:Account|null;error?:string};if(!r.ok)throw Error(d.error||'저장하지 못했어요.');
   if(action==='accountLogin'||action==='accountRegister'){window.location.assign('/account');return}
   form.reset();await refresh();setMessage(action==='accountNames'?'개척자 이름을 저장했어요. 기존 글과 댓글에도 적용됩니다.':'로그인 정보를 변경했어요. 다른 기기의 로그인은 해제되었습니다.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function logout(){setBusy(true);setError('');try{const r=await fetch('/api/astral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'accountLogout'})});if(!r.ok)throw Error('로그아웃하지 못했어요.');window.location.assign('/login')}catch(e){setError((e as Error).message);setBusy(false)}}
 return <main className="info-page account-page"><a href="/board">← 은하열차 통신</a><div className="section-kicker">YOUR PERSONAL CABIN</div><h1>{settings?'내 개인 페이지':register?'회원가입':'로그인'}</h1>
 {error&&<p className="account-feedback error" role="alert">{error}</p>}{message&&<p className="account-feedback" role="status">{message}</p>}
 {loading?<p role="status">계정 정보를 확인하고 있어요.</p>:account?settings?<>
  <div className="account-summary"><p><b>{account.username}</b>님, 반가워요.</p><a href="/board/mine">내가 쓴 글 보기 →</a><button className="outline-button" disabled={busy} onClick={logout}>로그아웃</button></div>
  <section><h2>개척자 이름</h2><p>내가 남긴 글·댓글에서 다른 사람에게도 이 이름이 보입니다. 다른 계정의 개척자 이름은 바뀌지 않습니다.</p>
   <form key={'names:'+account.male+':'+account.female} onSubmit={e=>submit(e,'accountNames')}>
    <label>남자 개척자 이름<input name="male" maxLength={20} defaultValue={account.male} placeholder="카일루스" autoComplete="off"/></label>
    <label>여자 개척자 이름<input name="female" maxLength={20} defaultValue={account.female} placeholder="스텔레" autoComplete="off"/></label>
    <p className="field-note">20자 이내 · 빈칸으로 저장하면 카일루스 / 스텔레로 돌아갑니다.</p><button className="gold-button" disabled={busy}>이름 저장</button>
   </form>
  </section>
  <section><h2>아이디·비밀번호 변경</h2><p>변경하려면 현재 비밀번호를 입력해 주세요. 아이디를 바꿔도 작성한 글은 그대로 유지됩니다.</p>
   <form key={'credentials:'+account.username} onSubmit={e=>submit(e,'accountCredentials')}>
    <label>아이디<input name="username" required minLength={3} maxLength={24} defaultValue={account.username} autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>
    <p className="field-note">한글·영문·숫자·밑줄 3~24자 · 영문 대소문자는 구별하지 않습니다.</p>
    <label>현재 비밀번호<input type="password" name="currentPassword" required minLength={8} maxLength={128} autoComplete="current-password"/></label>
    <label>새 비밀번호<input type="password" name="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="변경하지 않으려면 비워 두세요"/></label>
    <p className="field-note">비밀번호 8~128자 · 저장하면 다른 기기의 로그인이 해제됩니다.</p><button className="gold-button" disabled={busy}>로그인 정보 변경</button>
   </form>
  </section>
 </>:<><p>{account.username} 계정으로 로그인되어 있어요.</p><a className="gold-button" href="/account">개인 페이지로 이동</a></>:settings?<><p>로그인하면 계정과 개척자 이름을 관리할 수 있어요.</p><a className="gold-button" href="/login">로그인 / 회원가입</a></>:<>
  <p>{register?'아이디와 비밀번호만으로 가입하세요. 현재 브라우저에서 비회원으로 작성한 글도 계정에 연결됩니다.':'어떤 기기에서든 내 계정으로 이야기를 이어 가세요.'}</p>
  <form key={String(register)} onSubmit={e=>submit(e,register?'accountRegister':'accountLogin')}>
   <label>아이디<input name="username" required minLength={3} maxLength={24} autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>
   {register&&<p className="field-note">한글·영문·숫자·밑줄 3~24자 · 영문 대소문자는 구별하지 않습니다.</p>}
   <label>비밀번호<input type="password" name="password" required minLength={8} maxLength={128} autoComplete={register?'new-password':'current-password'}/></label>
   {register&&<p className="field-note">8~128자. 이메일을 수집하지 않으므로 자동 비밀번호 찾기는 제공하지 않습니다.</p>}
   <button className="gold-button" disabled={busy}>{busy?'처리 중…':register?'계정 만들기':'로그인'}</button>
  </form>
  <button className="outline-button" disabled={busy} onClick={()=>{setRegister(!register);setError('')}}>{register?'이미 계정이 있어요 · 로그인':'처음 오셨나요? · 회원가입'}</button>
  <p><a href="/board">가입 없이 캐릭터를 선택하고 둘러보기 →</a></p>
 </>}
 </main>
}
