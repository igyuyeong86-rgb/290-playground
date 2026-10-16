import Community from '../../community';
import {regions} from '../../../lib/astral-data';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string}>}){
 const {id}=await params;const {from}=await searchParams;
 const board=from&&['all','general','notice','popular','mine',...regions.map(r=>r.id)].includes(from)?from:'all';
 return <Community postId={id} initialBoard={board}/>;
}
