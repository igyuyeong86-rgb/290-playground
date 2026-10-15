import type { Metadata } from 'next';
import './astral.css';
export const metadata: Metadata = { title: '은하열차 통신 | 붕괴: 스타레일 팬 커뮤니티', description:'별과 별 사이, 우리들의 이야기. 캐릭터를 선택하고 여섯 세계의 스토리 시점에 맞춰 안부를 남겨 보세요.', icons:{icon:'/favicon.svg'} };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}
