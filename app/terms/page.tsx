import Link from 'next/link';

export const metadata = { title: '이용약관 | 290의 놀이터', description: '290의 놀이터 이용에 필요한 기본 약관을 안내합니다.' };

export default function TermsPage() {
  return <main className="simple-page document-page"><header className="simple-header"><Link className="simple-brand" href="/">290 <span>놀이터</span></Link><Link href="/">커뮤니티로 돌아가기</Link></header>
    <article className="simple-card policy-card"><p className="simple-kicker">TERMS</p><h1>이용약관</h1><p className="simple-intro">290의 놀이터는 일상과 이야기를 나누는 커뮤니티입니다. 서비스를 이용할 때 아래 내용을 지켜주세요.</p><p className="policy-date">시행일: 2026년 10월 14일</p>
      <section><h2>1. 서비스</h2><p>운영자는 회원가입·로그인, 게시글·댓글 작성, 공감 및 조회 기능을 제공합니다. 서비스는 현재 제공되는 기능과 운영 환경에 따라 변경되거나 중단될 수 있습니다.</p></section>
      <section><h2>2. 계정과 보안</h2><p>이용자는 정확한 정보를 입력하고 계정과 비밀번호를 안전하게 관리해야 합니다. 계정 도용이 의심되면 비밀번호를 변경하고 운영자에게 알려주세요. 타인의 계정을 사용하거나 계정 정보를 공유해서는 안 됩니다.</p></section>
      <section><h2>3. 게시물</h2><p>게시물의 권리는 작성자에게 있습니다. 이용자는 게시물과 댓글을 올릴 권한이 있고, 서비스 운영·표시·백업에 필요한 범위에서 이를 저장하고 사이트에 표시하도록 허락합니다. 게시물 작성자는 게시판 기능으로 내용을 수정하거나 삭제할 수 있습니다.</p></section>
      <section><h2>4. 금지 행위와 운영 조치</h2><p>불법 콘텐츠, 타인의 권리 침해, 개인정보 노출, 사칭, 스팸·광고 도배, 서비스 보안을 해치거나 정상 이용을 방해하는 행위를 금지합니다. 운영자는 신고 또는 확인된 위반 내용에 대해 게시물 삭제, 계정 이용 제한 등 필요한 조치를 할 수 있습니다.</p></section>
      <section><h2>5. 서비스 변경 및 책임</h2><p>운영자는 점검·장애·보안 문제나 운영상 필요에 따라 서비스 일부를 변경하거나 중단할 수 있습니다. 법령이 허용하는 범위에서 서비스의 일시적 장애로 발생한 손해에 대한 책임을 제한합니다. 고의 또는 중대한 과실이 있는 경우에는 관련 법령을 따릅니다.</p></section>
      <section><h2>6. 약관 변경과 문의</h2><p>약관을 변경하면 적용일과 주요 변경 내용을 사이트에 게시합니다. 이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다. 문의는 사이트 운영자에게 연락해 주세요.</p></section>
      <p className="policy-note">서비스 운영자의 법적 명칭·주소·연락처가 확정되면 이 약관에 반영해 주세요.</p>
    </article><SimpleFooter /></main>;
}

function SimpleFooter() { return <footer className="simple-footer"><Link href="/privacy">개인정보 처리방침</Link><Link href="/terms">이용약관</Link><Link href="/community-rules">커뮤니티 운영원칙</Link></footer>; }
