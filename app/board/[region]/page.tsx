import Community from '../../community';
import {regions} from '../../../lib/astral-data';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{region:string}>}){const {region}=await params;if(!['general','popular','mine',...regions.map(r=>r.id)].includes(region))notFound();return <Community initialBoard={region}/>;}
