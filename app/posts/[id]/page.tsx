import type {Metadata} from 'next';
import {publicMetadata} from '../../api/astral/route';
import {characterById,checkpoints} from '../../../lib/astral-data';
import Community from '../../community';
import {regions} from '../../../lib/astral-data';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string}>}){
 const {id}=await params;const {from}=await searchParams;
 const board=from&&['all','general','notice','popular','mine',...regions.map(r=>r.id)].includes(from)?from:'all';
 return <Community postId={id} initialBoard={board}/>;
}

export async function generateMetadata({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{at?:string;from?:string}>}):Promise<Metadata>{
 const {id}=await params,query=await searchParams;const point=Number(query.at??checkpoints.length-1);const at=Number.isInteger(point)&&point>=0&&point<checkpoints.length?point:checkpoints.length-1;
 try{const post=await publicMetadata(id,['all','general'].includes(query.from||'')?checkpoints.length-1:at);if(!post)return {title:'게시글을 볼 수 없어요 | 은하열차 통신',robots:{index:false,follow:false}};
 const base='https://playgroundandsandboxof290.xyz',image=post.image?base+'/api/astral?image='+encodeURIComponent(post.image):base+(characterById(post.character)?.image||'/favicon.svg');const title=post.title+' | 은하열차 통신',description=post.body.replace(/\s+/g,' ').slice(0,160);
 return {title,description,openGraph:{title,description,type:'article',images:[{url:image}]},twitter:{card:'summary',title,description,images:[image]}};
 }catch{return {title:'은하열차 통신',robots:{index:false}}}
}
