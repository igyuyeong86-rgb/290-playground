import { env } from 'cloudflare:workers';
import {characters,regions,seedPosts,checkpoints} from '../../../lib/astral-data';
export const dynamic='force-dynamic';
const db=()=>env.DB!;
const tables=[
 'CREATE TABLE IF NOT EXISTS astral_admin (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, password TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1)',
 'CREATE TABLE IF NOT EXISTS astral_admin_sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, version INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS astral_users (owner TEXT PRIMARY KEY, character TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL, blocked INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS astral_hidden (post TEXT PRIMARY KEY, created INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS astral_reports (id TEXT PRIMARY KEY, reporter TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, post TEXT NOT NULL, owner TEXT NOT NULL, character TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'open\', created INTEGER NOT NULL, UNIQUE(reporter,kind,target))',
 'CREATE INDEX IF NOT EXISTS astral_reports_status ON astral_reports(status,created)',

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
  await db().batch([
   db().prepare("INSERT OR IGNORE INTO astral_users(owner,character,created,seen) SELECT owner,character,MIN(created),MAX(created) FROM astral_posts WHERE seeded=0 AND owner!='__admin__' GROUP BY owner"),
   db().prepare("INSERT OR IGNORE INTO astral_users(owner,character,created,seen) SELECT owner,character,MIN(created),MAX(created) FROM astral_comments WHERE owner!='__admin__' GROUP BY owner"),
   db().prepare("INSERT OR IGNORE INTO astral_users(owner,character,created,seen) SELECT owner,character,?,? FROM astral_sessions WHERE expires>? ORDER BY expires ASC").bind(Date.now(),Date.now(),Date.now())
  ]);
  await db().batch(seedPosts.map((p,i)=>db().prepare('INSERT OR IGNORE INTO astral_posts (id,owner,character,region,at,title,body,memes,source,created,seeded) VALUES (?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET at=excluded.at,title=excluded.title,body=excluded.body WHERE astral_posts.seeded=1 AND astral_posts.owner=\'editorial\'').bind(p.id,'editorial',p.character,p.region,p.at,p.title,p.body,JSON.stringify(p.memes),p.source,1700000000000+i*60000)));
 })().catch(e=>{ready=undefined;throw e});
 await ready;
}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
type Session={owner:string;character:string;admin?:boolean};
async function session(req:Request){if(await administrator(req))return {owner:'__admin__',character:'__admin__',admin:true};const token=req.headers.get('cookie')?.match(/(?:^|;\s*)astral_session=([^;]+)/)?.[1];return token?db().prepare('SELECT owner,character FROM astral_sessions WHERE token=? AND expires>?').bind(await hash(token),Date.now()).first<Session>():null}
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
 await init();const url=new URL(req.url);if(url.searchParams.has('admin'))return adminRead(req,url);const at=checkpoint(url.searchParams.get('at')??2),me=await session(req),id=url.searchParams.get('id');
 if(id){
  const p=await db().prepare(selectPost+' WHERE p.id=? AND p.at<=? AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id)').bind(at,id,at).first<any>();
  if(!p)return json({error:'이 시점에는 볼 수 없는 게시글입니다.'},404);
  const cs=await db().prepare('SELECT id,character,body,created,owner FROM astral_comments WHERE post=? AND at<=? ORDER BY created,id').bind(id,at).all<any>();
  const liked=me?!!await db().prepare('SELECT 1 FROM astral_likes WHERE post=? AND owner=?').bind(id,me.owner).first():false;
  return json({post:publicPost(p,me),comments:cs.results.map(({owner,...c})=>({...c,owned:owner===me?.owner})),liked});
 }
 const posts=await db().prepare(selectPost+' WHERE p.at<=? AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id) ORDER BY p.created DESC LIMIT 1000').bind(at,at).all<any>();
 return json({posts:posts.results.map(p=>publicPost(p,me)),user:me?{character:me.character,admin:!!me.admin}:null});
 }catch(e){return json({error:e instanceof Error&&/시점/.test(e.message)?e.message:'통신을 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},500)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(Number(req.headers.get('content-length')||0)>40000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const raw=await req.text();if(raw.length>40000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const b=JSON.parse(raw);await init();
 if(typeof b.action==='string'&&b.action.startsWith('admin'))return await adminWrite(req,b);
 const me=await session(req),now=Date.now();
 if(me&&!me.admin&&await db().prepare('SELECT 1 FROM astral_users WHERE owner=? AND blocked=1').bind(me.owner).first())return json({error:'이 사용자는 활동이 제한되었습니다.'},403);
 if(b.action==='select'){
  const c=characters.find(c=>c.id===b.character);if(!c)return json({error:'캐릭터를 선택해 주세요.'},400);
  await limit(req,'select',30);
  const old=req.headers.get('cookie')?.match(/(?:^|;\s*)astral_session=([^;]+)/)?.[1];
  const token=crypto.randomUUID()+crypto.randomUUID(),owner=me?.admin?crypto.randomUUID():(me?.owner||crypto.randomUUID());
  const ops=[db().prepare('INSERT INTO astral_sessions (token,owner,character,expires) VALUES (?,?,?,?)').bind(await hash(token),owner,c.id,now+2592000000),db().prepare('DELETE FROM astral_sessions WHERE expires<?').bind(now)];
  if(old)ops.push(db().prepare('DELETE FROM astral_sessions WHERE token=?').bind(await hash(old)));
  ops.push(db().prepare('INSERT INTO astral_users(owner,character,created,seen) VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET character=excluded.character,seen=excluded.seen').bind(owner,c.id,now,now));
  await db().batch(ops);
  const secure=new URL(req.url).protocol==='https:'?'; Secure':'';
  const response=json({ok:true,user:{character:c.id}},200,{'Set-Cookie':`astral_session=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=2592000`});
  if(me?.admin){await revokeAdmin(req);response.headers.append('Set-Cookie',adminCookie(req,'',0))}return response;
 }
 if(!me)return json({error:'먼저 사용할 캐릭터를 선택해 주세요.'},401);
 if(!me.admin)await db().prepare('UPDATE astral_users SET seen=? WHERE owner=?').bind(now,me.owner).run();
 const at=checkpoint(b.at);
 if(b.action==='save'){
  const title=field(b.title,100),body=field(b.body,6000),region=regions.find(r=>r.id===b.region);
  if(!region||at<region.start)return json({error:'지역과 게시글 시점을 맞춰 주세요.'},400);
  await limit(req,'write',20);
  if(b.id){
   const p=await db().prepare('SELECT owner,seeded FROM astral_posts WHERE id=? AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=astral_posts.id)').bind(b.id).first<any>();
   if(!p||p.owner!==me.owner||p.seeded)return json({error:'이 브라우저에서 작성한 글만 수정할 수 있어요.'},403);
   await db().prepare('UPDATE astral_posts SET title=?,body=?,region=?,at=? WHERE id=?').bind(title,body,region.id,at,b.id).run();return json({id:b.id});
  }
  const id=crypto.randomUUID();await db().prepare('INSERT INTO astral_posts (id,owner,character,region,at,title,body,created) VALUES (?,?,?,?,?,?,?,?)').bind(id,me.owner,me.character,region.id,at,title,body,now).run();return json({id});
 }
 const id=field(b.id,100),p=await db().prepare('SELECT owner,seeded,at,title,body,character FROM astral_posts WHERE id=? AND at<=? AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=astral_posts.id)').bind(id,at).first<any>();
 if(!p)return json({error:'게시글을 찾을 수 없거나 현재 시점에서 볼 수 없어요.'},404);
 if(b.action==='report'){
  await limit(req,'report',5);
  const kind=b.kind;if(kind!=='post'&&kind!=='comment')return json({error:'신고 대상을 확인해 주세요.'},400);
  const target=kind==='post'?id:field(b.commentId,100);
  const item=kind==='post'?p:await db().prepare('SELECT owner,character,body FROM astral_comments WHERE id=? AND post=? AND at<=?').bind(target,id,at).first<any>();
  if(!item)return json({error:'신고 대상을 찾을 수 없어요.'},404);
  await db().prepare('INSERT OR IGNORE INTO astral_reports(id,reporter,kind,target,post,owner,character,title,body,reason,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),me.owner,kind,target,id,item.owner,item.character,p.title,item.body,field(b.reason,1000),now).run();
  return json({ok:true});
 }
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

// Administrator privileges are separate from selectable character identities.
const adminToken=(req:Request)=>req.headers.get('cookie')?.match(/(?:^|;\s*)astral_admin=([^;]+)/)?.[1];
function adminCookie(req:Request,token:string,age=28800){return `astral_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`}
async function administrator(req:Request){
 const token=adminToken(req);if(!token)return null;
 return db().prepare('SELECT s.version FROM astral_admin_sessions s JOIN astral_admin a ON a.id=1 AND a.version=s.version WHERE s.token=? AND s.expires>?').bind(await hash(token),Date.now()).first<{version:number}>();
}
async function revokeAdmin(req:Request){const token=adminToken(req);if(token)await db().prepare('DELETE FROM astral_admin_sessions WHERE token=?').bind(await hash(token)).run()}
async function passwordHash(value:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
function equalHash(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function passwordField(v:unknown){if(typeof v!=='string'||v.length<6||v.length>128)throw new Error('입력할 비밀번호는 6~128자여야 합니다.');return v}
async function adminRead(req:Request,url:URL){
 if(!await administrator(req))return json({error:'관리자 로그인이 필요합니다.'},401);
 const section=url.searchParams.get('admin')||'posts';
 const page=Math.max(1,Math.floor(Number(url.searchParams.get('page'))||1));
 const offset=(Math.min(page,100000)-1)*25;
 const q='%'+(url.searchParams.get('q')||'').slice(0,100)+'%';
 if(section==='session')return json({admin:true,name:'게시판의 에이온즈'});
 let where='',from='',args:unknown[]=[],selection='';
 if(section==='posts'){
  where="p.seeded=0 AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id) AND (p.title LIKE ? OR p.body LIKE ? OR p.character LIKE ? OR p.owner LIKE ?)";
  args=[q,q,q,q];from='astral_posts p';selection='p.id,p.owner,p.character,p.title,p.body,p.created,(SELECT COUNT(*) FROM astral_comments c WHERE c.post=p.id) AS comments';
 }else if(section==='users'){
  where='(u.owner LIKE ? OR u.character LIKE ?)';args=[q,q];from='astral_users u';
  selection='u.*,(SELECT COUNT(*) FROM astral_posts p WHERE p.owner=u.owner AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id)) AS posts,(SELECT COUNT(*) FROM astral_comments c WHERE c.owner=u.owner AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=c.post)) AS comments';
 }else if(section==='reports'){
  const status=url.searchParams.get('status')||'open';
  if(!['open','resolved','dismissed','all'].includes(status))return json({error:'잘못된 처리 상태입니다.'},400);
  where='(r.title LIKE ? OR r.body LIKE ? OR r.reason LIKE ?)'+(status==='all'?'':' AND r.status=?');args=[q,q,q,...(status==='all'?[]:[status])];from='astral_reports r';selection='r.*';
 }else return json({error:'관리 메뉴를 확인해 주세요.'},400);
 const count=await db().prepare(`SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`).bind(...args).first<{total:number}>();
 const rows=await db().prepare(`SELECT ${selection} FROM ${from} WHERE ${where} ORDER BY ${section==='users'?'u.seen':section==='reports'?'r.created':'p.created'} DESC LIMIT 25 OFFSET ?`).bind(...args,offset).all();
 return json({rows:rows.results,total:count?.total||0,page});
}
async function adminWrite(req:Request,b:any){
 if(b.action==='adminLogin'){
  await limit(req,'admin-login',5);
  const value=passwordField(b.password);
  let account=await db().prepare('SELECT * FROM astral_admin WHERE id=1').first<any>();
  if(!account){
   const initial=(env as unknown as {ADMIN_INITIAL_PASSWORD?:string}).ADMIN_INITIAL_PASSWORD;
   if(!initial)return json({error:'서버의 초기 관리자 비밀번호 설정이 필요합니다.'},503);
   const salt=crypto.randomUUID();const expected=await passwordHash(initial,salt);
   if(!equalHash(await passwordHash(value,salt),expected))return json({error:'비밀번호가 올바르지 않습니다.'},401);
   await db().prepare('INSERT OR IGNORE INTO astral_admin(id,salt,password,version) VALUES (1,?,?,1)').bind(salt,expected).run();
   account=await db().prepare('SELECT * FROM astral_admin WHERE id=1').first<any>();
  }
  if(!equalHash(await passwordHash(value,account.salt),account.password))return json({error:'비밀번호가 올바르지 않습니다.'},401);
  await revokeAdmin(req);
  const token=crypto.randomUUID()+crypto.randomUUID();
  await db().batch([db().prepare('INSERT INTO astral_admin_sessions(token,expires,version) VALUES (?,?,?)').bind(await hash(token),Date.now()+28800000,account.version),db().prepare('DELETE FROM astral_admin_sessions WHERE expires<?').bind(Date.now())]);
  return json({ok:true,user:{character:'__admin__',admin:true}},200,{'Set-Cookie':adminCookie(req,token)});
 }
 const admin=await administrator(req);if(!admin)return json({error:'관리자 로그인이 필요합니다.'},401);
 if(b.action==='adminLogout'){await revokeAdmin(req);return json({ok:true},200,{'Set-Cookie':adminCookie(req,'',0)})}
 if(b.action==='adminPassword'){
  await limit(req,'admin-password',5);
  const current=passwordField(b.current),next=passwordField(b.next);
  const account=await db().prepare('SELECT * FROM astral_admin WHERE id=1').first<any>();
  if(!equalHash(await passwordHash(current,account.salt),account.password))return json({error:'현재 비밀번호가 올바르지 않습니다.'},403);
  const salt=crypto.randomUUID(),password=await passwordHash(next,salt);
  const result=await db().prepare('UPDATE astral_admin SET salt=?,password=?,version=version+1 WHERE id=1 AND version=?').bind(salt,password,admin.version).run();
  if(!result.meta.changes)return json({error:'비밀번호가 이미 변경되었습니다. 다시 로그인해 주세요.'},409);
  await db().prepare('DELETE FROM astral_admin_sessions WHERE version<=?').bind(admin.version).run();
  return json({ok:true},200,{'Set-Cookie':adminCookie(req,'',0)});
 }
 if(b.action==='adminBlock'){
  const owner=field(b.owner,100);if(typeof b.blocked!=='boolean')return json({error:'차단 상태를 확인해 주세요.'},400);
  const target=await db().prepare('SELECT owner FROM astral_users WHERE owner=?').bind(owner).first();if(!target)return json({error:'사용자를 찾을 수 없습니다.'},404);
  await db().prepare('UPDATE astral_users SET blocked=? WHERE owner=?').bind(b.blocked?1:0,owner).run();return json({ok:true});
 }
 if(b.action==='adminDelete'){
  const id=field(b.id,100);
  if(b.kind==='post'){
   if(!await db().prepare('SELECT id FROM astral_posts WHERE id=?').bind(id).first())return json({error:'이미 삭제된 게시글입니다.'},404);
   await db().batch([db().prepare('INSERT OR IGNORE INTO astral_hidden(post,created) VALUES (?,?)').bind(id,Date.now()),db().prepare("UPDATE astral_reports SET status='resolved' WHERE post=? AND status='open'").bind(id)]);
  }else if(b.kind==='comment'){
   await db().batch([db().prepare('DELETE FROM astral_comments WHERE id=?').bind(id),db().prepare("UPDATE astral_reports SET status='resolved' WHERE kind='comment' AND target=? AND status='open'").bind(id)]);
  }else return json({error:'삭제 대상을 확인해 주세요.'},400);
  return json({ok:true});
 }
 if(b.action==='adminReport'){
  if(!['resolved','dismissed','open'].includes(b.status))return json({error:'처리 상태를 확인해 주세요.'},400);
  await db().prepare('UPDATE astral_reports SET status=? WHERE id=?').bind(b.status,field(b.id,100)).run();return json({ok:true});
 }
 return json({error:'알 수 없는 관리자 요청입니다.'},400);
}
