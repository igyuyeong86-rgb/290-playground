import { env } from 'cloudflare:workers';
import {characters,regions,seedPosts,checkpoints} from '../../../lib/astral-data';
export const dynamic='force-dynamic';
const db=()=>env.DB!;
const tables=[
 'CREATE TABLE IF NOT EXISTS astral_sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL, character TEXT NOT NULL, expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS astral_posts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, character TEXT NOT NULL, region TEXT NOT NULL, at INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, memes TEXT NOT NULL DEFAULT \'[]\', source TEXT NOT NULL DEFAULT \'\', created INTEGER NOT NULL, seeded INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS astral_comments (id TEXT PRIMARY KEY, post TEXT NOT NULL, owner TEXT NOT NULL, character TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL, created INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS astral_likes (post TEXT NOT NULL, owner TEXT NOT NULL, PRIMARY KEY(post,owner))',
 'CREATE TABLE IF NOT EXISTS astral_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS astral_posts_at ON astral_posts(at)',
 'CREATE INDEX IF NOT EXISTS astral_comments_post ON astral_comments(post,at)',
];
let ready:Promise<void>|undefined;
async function init(){
 if(!ready)ready=(async()=>{
  await db().batch(tables.map(s=>db().prepare(s)));
  await db().batch(seedPosts.map((p,i)=>db().prepare('INSERT OR IGNORE INTO astral_posts (id,owner,character,region,at,title,body,memes,source,created,seeded) VALUES (?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET at=excluded.at,title=excluded.title,body=excluded.body WHERE astral_posts.seeded=1 AND astral_posts.owner=\'editorial\'').bind(p.id,'editorial',p.character,p.region,p.at,p.title,p.body,JSON.stringify(p.memes),p.source,1700000000000+i*60000)));
 })().catch(e=>{ready=undefined;throw e});
 await ready;
}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
type Session={owner:string;character:string};
async function session(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)astral_session=([^;]+)/)?.[1];return token?db().prepare('SELECT owner,character FROM astral_sessions WHERE token=? AND expires>?').bind(await hash(token),Date.now()).first<Session>():null}
function checkpoint(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<0||n>=checkpoints.length)throw new Error('스토리 시점을 선택해 주세요.');return n}
function field(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('입력 내용의 길이를 확인해 주세요.');return v.trim()}
async function limit(req:Request,kind:string,max:number){
 const key=await hash((req.headers.get('cf-connecting-ip')||'local')+':'+kind),now=Date.now();
 await db().prepare('INSERT INTO astral_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END').bind(key,now+60000,now,now,now+60000).run();
 const row=await db().prepare('SELECT count FROM astral_limits WHERE key=?').bind(key).first<{count:number}>();
 if(row!.count>max)throw new Error('잠시 후 다시 시도해 주세요. 요청이 너무 빠릅니다.');
}
function publicPost(p:any,me:Session|null){const {owner,...rest}=p;return {...rest,memes:JSON.parse(p.memes),owned:!!me&&owner===me.owner&&!p.seeded}}
const selectPost='SELECT p.*, (SELECT COUNT(*) FROM astral_likes l WHERE l.post=p.id) AS likes, (SELECT COUNT(*) FROM astral_comments c WHERE c.post=p.id AND c.at<=?) AS comments FROM astral_posts p';
export async function GET(req:Request){try{
 await init();const url=new URL(req.url),at=checkpoint(url.searchParams.get('at')??2),me=await session(req),id=url.searchParams.get('id');
 if(id){
  const p=await db().prepare(selectPost+' WHERE p.id=? AND p.at<=?').bind(at,id,at).first<any>();
  if(!p)return json({error:'이 시점에는 볼 수 없는 게시글입니다.'},404);
  const cs=await db().prepare('SELECT id,character,body,created,owner FROM astral_comments WHERE post=? AND at<=? ORDER BY created,id').bind(id,at).all<any>();
  const liked=me?!!await db().prepare('SELECT 1 FROM astral_likes WHERE post=? AND owner=?').bind(id,me.owner).first():false;
  return json({post:publicPost(p,me),comments:cs.results.map(({owner,...c})=>({...c,owned:owner===me?.owner})),liked});
 }
 const posts=await db().prepare(selectPost+' WHERE p.at<=? ORDER BY p.created DESC LIMIT 1000').bind(at,at).all<any>();
 return json({posts:posts.results.map(p=>publicPost(p,me)),user:me?{character:me.character}:null});
 }catch(e){return json({error:e instanceof Error&&/시점/.test(e.message)?e.message:'통신을 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},500)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(Number(req.headers.get('content-length')||0)>40000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const raw=await req.text();if(raw.length>40000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const b=JSON.parse(raw);await init();const me=await session(req),now=Date.now();
 if(b.action==='select'){
  const c=characters.find(c=>c.id===b.character);if(!c)return json({error:'캐릭터를 선택해 주세요.'},400);
  await limit(req,'select',30);
  const old=req.headers.get('cookie')?.match(/(?:^|;\s*)astral_session=([^;]+)/)?.[1];
  const token=crypto.randomUUID()+crypto.randomUUID(),owner=me?.owner||crypto.randomUUID();
  const ops=[db().prepare('INSERT INTO astral_sessions (token,owner,character,expires) VALUES (?,?,?,?)').bind(await hash(token),owner,c.id,now+2592000000),db().prepare('DELETE FROM astral_sessions WHERE expires<?').bind(now)];
  if(old)ops.push(db().prepare('DELETE FROM astral_sessions WHERE token=?').bind(await hash(old)));
  await db().batch(ops);
  const secure=new URL(req.url).protocol==='https:'?'; Secure':'';
  return json({ok:true,user:{character:c.id}},200,{'Set-Cookie':`astral_session=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=2592000`});
 }
 if(!me)return json({error:'먼저 사용할 캐릭터를 선택해 주세요.'},401);
 const at=checkpoint(b.at);
 if(b.action==='save'){
  const title=field(b.title,100),body=field(b.body,6000),region=regions.find(r=>r.id===b.region);
  if(!region||at<region.start)return json({error:'지역과 게시글 시점을 맞춰 주세요.'},400);
  await limit(req,'write',20);
  if(b.id){
   const p=await db().prepare('SELECT owner,seeded FROM astral_posts WHERE id=?').bind(b.id).first<any>();
   if(!p||p.owner!==me.owner||p.seeded)return json({error:'이 브라우저에서 작성한 글만 수정할 수 있어요.'},403);
   await db().prepare('UPDATE astral_posts SET title=?,body=?,region=?,at=? WHERE id=?').bind(title,body,region.id,at,b.id).run();return json({id:b.id});
  }
  const id=crypto.randomUUID();await db().prepare('INSERT INTO astral_posts (id,owner,character,region,at,title,body,created) VALUES (?,?,?,?,?,?,?,?)').bind(id,me.owner,me.character,region.id,at,title,body,now).run();return json({id});
 }
 const id=field(b.id,100),p=await db().prepare('SELECT owner,seeded,at FROM astral_posts WHERE id=? AND at<=?').bind(id,at).first<any>();
 if(!p)return json({error:'게시글을 찾을 수 없거나 현재 시점에서 볼 수 없어요.'},404);
 if(b.action==='delete'){
  if(p.owner!==me.owner||p.seeded)return json({error:'이 브라우저에서 작성한 글만 삭제할 수 있어요.'},403);
  await db().batch([db().prepare('DELETE FROM astral_comments WHERE post=?').bind(id),db().prepare('DELETE FROM astral_likes WHERE post=?').bind(id),db().prepare('DELETE FROM astral_posts WHERE id=?').bind(id)]);return json({ok:true});
 }
 if(b.action==='comment'){await limit(req,'comment',30);await db().prepare('INSERT INTO astral_comments (id,post,owner,character,body,at,created) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,me.owner,me.character,field(b.body,2000),at,now).run();return json({ok:true})}
 if(b.action==='deleteComment'){
  const c=await db().prepare('SELECT owner FROM astral_comments WHERE id=? AND post=?').bind(field(b.commentId,100),id).first<any>();
  if(!c||c.owner!==me.owner)return json({error:'댓글 삭제 권한이 없어요.'},403);
  await db().prepare('DELETE FROM astral_comments WHERE id=? AND post=?').bind(b.commentId,id).run();return json({ok:true});
 }
 if(b.action==='like'){await limit(req,'like',60);if(typeof b.liked!=='boolean')return json({error:'공감 상태가 올바르지 않아요.'},400);await db().prepare(b.liked?'INSERT OR IGNORE INTO astral_likes(post,owner) VALUES (?,?)':'DELETE FROM astral_likes WHERE post=? AND owner=?').bind(id,me.owner).run();return json({ok:true})}
 return json({error:'알 수 없는 요청입니다.'},400);
 }catch(e){return json({error:e instanceof Error&&/입력|시점|잠시/.test(e.message)?e.message:'요청을 처리하지 못했어요. 다시 시도해 주세요.'},400)}}
