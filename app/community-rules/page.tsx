import Link from 'next/link';

export const metadata = { title: '커뮤니티 운영원칙 | 290의 놀이터', description: '모두가 편안하게 참여할 수 있도록 290의 놀이터가 함께 지키는 약속입니다.' };

export default function CommunityRulesPage() {
  return <main className="simple-page document-page"><header className="simple-header"><Link className="simple-brand" href="/">290 <span>놀이터</span></Link><Link href="/">커뮤니티로 돌아가기</Link></header>
    <article className="simple-card policy-card"><p className="simple-kicker">COMMUNITY</p><h1>커뮤니티 운영원칙</h1><p className="simple-intro">서로 다른 사람들이 안전하고 편안하게 이야기할 수 있도록 함께 지켜주세요.</p>
      <section><h2>서로 존중하기</h2><p>생각이 달라도 사람을 공격하거나 괴롭히지 말고, 위협·혐오·차별 표현을 올리지 않습니다.</p></section>
      <section><h2>개인정보 보호하기</h2><p>본인이나 다른 사람의 전화번호, 주소, 비밀번호, 계정 정보 등 사적인 정보를 게시하지 않습니다.</p></section>
      <section><h2>알맞은 내용 올리기</h2><p>주제에 맞는 게시판을 이용하고, 같은 내용을 반복해서 올리거나 무관한 광고·스팸을 게시하지 않습니다.</p></section>
      <section><h2>권리와 법 지키기</h2><p>저작권·초상권 등 다른 사람의 권리를 침해하거나 불법 행위를 조장하는 콘텐츠를 게시하지 않습니다.</p></section>
      <section><h2>운영 조치</h2><p>운영자는 위반 게시물이나 댓글을 숨기거나 삭제할 수 있으며, 반복되거나 심각한 위반에는 계정 이용 제한을 적용할 수 있습니다.</p></section>
      <p className="policy-note">문제 있는 게시물을 발견하면 운영자에게 알려주세요. 사이트의 게시물 작성 기능은 공개 게시판에 글을 남기므로, 비밀이 필요한 개인정보나 문의 내용을 게시글에 적지 마세요.</p>
    </article><footer className="simple-footer"><Link href="/privacy">개인정보 처리방침</Link><Link href="/terms">이용약관</Link><Link href="/community-rules">커뮤니티 운영원칙</Link></footer></main>;
}
