'use client';

import Link from 'next/link';
import { useState } from 'react';

const defaultXss = '<script>alert("XSS")</script>';
const defaultSql = "' OR '1'='1";

export default function SecurityLabPage() {
  const [xss, setXss] = useState(defaultXss);
  const [showSimulation, setShowSimulation] = useState(false);
  const [sql, setSql] = useState(defaultSql);

  return <main className="simple-page document-page">
    <header className="simple-header"><Link className="simple-brand" href="/">290 <span>놀이터</span></Link><Link href="/">커뮤니티로 돌아가기</Link></header>
    <article className="simple-card policy-card security-card">
      <p className="simple-kicker">SECURITY LAB · SIMULATION</p>
      <h1>보안 실습실</h1>
      <p className="simple-intro">아래 예시는 공격이 발생했을 때의 모습을 설명하기 위한 시뮬레이션입니다. 입력값은 사이트 서버로 전송되지 않고 브라우저에서만 표시됩니다.</p>
      <div className="lab-callout"><b>안전 모드</b><span>실제 HTML이나 SQL을 실행하지 않습니다. 실제 게시글, 로그인, 데이터베이스에는 아무 영향도 주지 않습니다.</span></div>
      <section><h2>1. 저장형 XSS가 위험한 이유</h2><p>사이트가 사용자 입력을 HTML로 실행하면 악성 스크립트가 다른 방문자의 브라우저에서 동작할 수 있습니다. 이 실습은 입력을 실행하지 않고 상황만 보여줍니다.</p>
        <label className="lab-label">테스트 문자열<textarea value={xss} onChange={event => { setXss(event.target.value); setShowSimulation(false); }} rows={3} maxLength={300} /></label>
        <div className="lab-actions"><button className="simple-submit lab-button" onClick={() => setShowSimulation(true)}>취약한 출력 상황 시뮬레이션</button><button className="lab-secondary" onClick={() => { setXss(defaultXss); setShowSimulation(false); }}>예시 복원</button></div>
        {showSimulation && <div className="lab-result" role="status"><b>시뮬레이션 결과</b><p>실제 취약점이라면 이 입력이 HTML로 해석되어 스크립트가 실행될 수 있습니다. 이 페이지에서는 실행 대신 이 안내 상자만 표시합니다.</p><code>{xss || '(입력 없음)'}</code></div>}
        <div className="lab-safe"><b>안전한 처리</b><p>게시글은 HTML로 렌더링하지 않고 일반 텍스트로 표시해야 합니다. 입력 검증과 출력 위치에 맞는 인코딩을 함께 적용하세요.</p></div>
      </section>
      <section><h2>2. SQL 인젝션과 매개변수화</h2><p>사용자 입력을 SQL 문장에 직접 이어 붙이면 검색 조건이 바뀔 수 있습니다. 아래는 문자열을 화면에만 표시하며 데이터베이스 쿼리를 보내지 않습니다.</p>
        <label className="lab-label">로그인 아이디 예시<input value={sql} onChange={event => setSql(event.target.value)} maxLength={100} /></label>
        <div className="lab-code"><span>위험한 방식의 예 (실행하지 않음)</span><code>{`SELECT * FROM members WHERE username = '${sql.replaceAll("'", "''")}'`}</code></div>
        <div className="lab-code"><span>안전한 방식의 예</span><code>SELECT * FROM members WHERE username = ? <em>→ 입력값은 별도 매개변수로 전달</em></code></div>
      </section>
      <section><h2>3. 운영 사이트 점검 원칙</h2><ul><li>실제 계정·게시글 대신 테스트 계정과 샘플 데이터만 사용합니다.</li><li>입력을 HTML로 실행하지 말고, 취약한 처리가 있는지 안전한 테스트 환경에서 확인합니다.</li><li>문제가 발견되면 출력 시 이스케이프하고 SQL에는 매개변수 바인딩을 사용합니다.</li></ul></section>
    </article>
    <footer className="simple-footer"><Link href="/privacy">개인정보 처리방침</Link><Link href="/terms">이용약관</Link><Link href="/community-rules">커뮤니티 운영원칙</Link></footer>
  </main>;
}
