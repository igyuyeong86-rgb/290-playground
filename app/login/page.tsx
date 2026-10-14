'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

function safeReturnTo(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : '/';
  } catch { return '/'; }
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identityType, setIdentityType] = useState<'아이디' | '전화번호'>('아이디');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'register' && values.password !== values.confirm) {
        throw new Error('비밀번호가 서로 다릅니다.');
      }
      const body = mode === 'register'
        ? { action: 'register', ...values }
        : { action: 'login', identity: values.identity, password: values.password };
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
      if (mode === 'register') {
        setMode('login');
        setIdentityType('아이디');
        setMessage('가입이 완료됐어요. 로그인해 주세요.');
        return;
      }
      window.location.assign(safeReturnTo(new URLSearchParams(window.location.search).get('return_to')));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="simple-page auth-page">
    <header className="simple-header"><Link className="simple-brand" href="/">290 <span>놀이터</span></Link><Link href="/">커뮤니티로 돌아가기</Link></header>
    <section className="simple-card auth-card">
      <p className="simple-kicker">290 PLAYGROUND</p>
      <h1>{mode === 'login' ? '다시 만나 반가워요' : '새 이웃으로 함께하기'}</h1>
      <p className="simple-intro">{mode === 'login' ? '로그인하고 이야기에 참여해 보세요.' : '계정을 만들고 놀이터에 참여해 보세요.'}</p>
      {mode === 'login' && <div className="simple-tabs"><button type="button" className={identityType === '아이디' ? 'active' : ''} onClick={() => setIdentityType('아이디')}>아이디</button><button type="button" className={identityType === '전화번호' ? 'active' : ''} onClick={() => setIdentityType('전화번호')}>전화번호</button></div>}
      <form onSubmit={submit}>
        {mode === 'register' ? <>
          <label>아이디<input name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" autoComplete="username" placeholder="영문으로 시작하는 3~20자" /></label>
          <label>휴대전화 번호<input name="phone" type="tel" required autoComplete="tel" maxLength={20} placeholder="010-1234-5678" /></label>
          <p className="simple-note">전화번호는 계정 확인과 로그인에 사용합니다. 문자 인증은 제공하지 않습니다.</p>
        </> : <label>{identityType}<input name="identity" type={identityType === '전화번호' ? 'tel' : 'text'} required autoComplete="username" placeholder={identityType === '전화번호' ? '가입한 전화번호' : '아이디'} /></label>}
        <label>비밀번호<input name="password" type="password" required minLength={mode === 'register' ? 8 : 1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? '8자 이상' : '비밀번호'} /></label>
        {mode === 'register' && <>
          <label>비밀번호 확인<input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" /></label>
          <label className="simple-consent"><input type="checkbox" required /><span><Link href="/privacy">개인정보 처리방침</Link> 및 <Link href="/terms">이용약관</Link>을 확인하고 회원가입에 필요한 개인정보 처리에 동의합니다.</span></label>
        </>}
        {error && <p className="simple-error" role="alert">{error}</p>}
        {message && <p className="simple-success" role="status">{message}</p>}
        <button className="simple-submit" disabled={busy}>{busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}</button>
      </form>
      <p className="simple-switch">{mode === 'login' ? '아직 계정이 없나요?' : '이미 계정이 있나요?'} <button onClick={() => { setError(''); setMessage(''); setMode(mode === 'login' ? 'register' : 'login'); }}> {mode === 'login' ? '회원가입' : '로그인'}</button></p>
    </section>
    <SimpleFooter />
  </main>;
}

function SimpleFooter() { return <footer className="simple-footer"><Link href="/privacy">개인정보 처리방침</Link><Link href="/terms">이용약관</Link><Link href="/community-rules">커뮤니티 운영원칙</Link></footer>; }
