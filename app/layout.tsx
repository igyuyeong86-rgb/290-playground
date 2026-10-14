import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '290의 놀이터 | 함께 나누는 이야기', description:'일상도, 질문도, 좋은 정보도. 누구나 편하게 이야기를 나누는 290의 놀이터.' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}
