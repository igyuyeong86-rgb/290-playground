import { env } from 'cloudflare:workers';
import {characters,regions,seedPosts,checkpoints} from '../../../lib/astral-data';
export const dynamic='force-dynamic';
const db=()=>env.DB!;
const bucket=()=>(env as unknown as {MEDIA?:R2Bucket}).MEDIA;
const tables=[
 "CREATE TABLE IF NOT EXISTS astral_accounts (owner TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, male TEXT NOT NULL DEFAULT '', female TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL)",
 'CREATE TABLE IF NOT EXISTS astral_account_sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL, version INTEGER NOT NULL, expires INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS astral_account_sessions_owner ON astral_account_sessions(owner)',

 'CREATE TABLE IF NOT EXISTS astral_media (key TEXT PRIMARY KEY, target TEXT NOT NULL, parent TEXT NOT NULL, owner TEXT NOT NULL, bytes INTEGER NOT NULL, created INTEGER NOT NULL, committed INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS astral_videos (target TEXT PRIMARY KEY, video TEXT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS astral_media_target ON astral_media(target)',

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
  const retired="SELECT id FROM astral_posts WHERE seeded=1 AND owner='editorial' AND character IN ('8001','8002')";
  await db().batch([
   db().prepare(`UPDATE astral_reports SET status='resolved' WHERE post IN (${retired}) AND status='open'`),
   db().prepare(`DELETE FROM astral_comments WHERE post IN (${retired})`),
   db().prepare(`DELETE FROM astral_likes WHERE post IN (${retired})`),
   db().prepare(`DELETE FROM astral_posts WHERE id IN (${retired})`)
  ]);
  await db().batch(seedPosts.map((p,i)=>db().prepare('INSERT OR IGNORE INTO astral_posts (id,owner,character,region,at,title,body,memes,source,created,seeded) VALUES (?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET at=excluded.at,title=excluded.title,body=excluded.body WHERE astral_posts.seeded=1 AND astral_posts.owner=\'editorial\'').bind(p.id,'editorial',p.character,p.region,p.at,p.title,p.body,JSON.stringify(p.memes),p.source,1700000000000+i*60000)));
 })().catch(e=>{ready=undefined;throw e});
 await ready;
}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
type Session={owner:string;character:string;admin?:boolean;username?:string;male?:string;female?:string;version?:number};
async function session(req:Request){if(await administrator(req))return {owner:'__admin__',character:'__admin__',admin:true};const account=await accountSession(req);if(account)return account;const token=req.headers.get('cookie')?.match(/(?:^|;\s*)astral_session=([^;]+)/)?.[1];return token?db().prepare('SELECT owner,character FROM astral_sessions WHERE token=? AND expires>?').bind(await hash(token),Date.now()).first<Session>():null}
function checkpoint(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<0||n>=checkpoints.length)throw new Error('스토리 시점을 선택해 주세요.');return n}
function field(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('입력 내용의 길이를 확인해 주세요.');return v.trim()}
async function limit(req:Request,kind:string,max:number){
 const key=await hash((req.headers.get('cf-connecting-ip')||'local')+':'+kind),now=Date.now();
 await db().prepare('INSERT INTO astral_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END').bind(key,now+60000,now,now,now+60000).run();
 const row=await db().prepare('SELECT count FROM astral_limits WHERE key=?').bind(key).first<{count:number}>();
 if(row!.count>max)throw new Error('잠시 후 다시 시도해 주세요. 요청이 너무 빠릅니다.');
}
function publicPost(p:any,me:Session|null){const {owner,male,female,...rest}=p;return {...rest,displayName:authorName(p.character,male,female),memes:JSON.parse(p.memes),owned:!!me&&owner===me.owner&&!p.seeded}}
const selectPost='SELECT p.*, a.male,a.female, (SELECT COUNT(*) FROM astral_likes l WHERE l.post=p.id) AS likes, (SELECT COUNT(*) FROM astral_comments c WHERE c.post=p.id) AS comments FROM astral_posts p LEFT JOIN astral_accounts a ON a.owner=p.owner';
export async function GET(req:Request){try{
 await init();const url=new URL(req.url);if(url.searchParams.has('account'))return json({account:accountView(await accountSession(req))});if(url.searchParams.has('image'))return serveImage(url);if(url.searchParams.has('admin'))return adminRead(req,url);const at=checkpoint(url.searchParams.get('at')??2),me=await session(req),id=url.searchParams.get('id');
 if(id){
  const p=await db().prepare(selectPost+' WHERE p.id=? AND (p.seeded=0 OR p.at<=?) AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id)').bind(id,at).first<any>();
  if(!p)return json({error:'이 시점에는 볼 수 없는 게시글입니다.'},404);
  const cs=await db().prepare('SELECT c.id,c.character,c.body,c.created,c.owner,a.male,a.female FROM astral_comments c LEFT JOIN astral_accounts a ON a.owner=c.owner WHERE c.post=? ORDER BY c.created,c.id').bind(id).all<any>();
  const liked=me?!!await db().prepare('SELECT 1 FROM astral_likes WHERE post=? AND owner=?').bind(id,me.owner).first():false;
  return json({post:{...publicPost(p,me),media:await readMedia(id)},comments:await Promise.all(cs.results.map(async({owner,male,female,...c})=>({...c,displayName:authorName(c.character,male,female),owned:owner===me?.owner,media:await readMedia(c.id)}))),liked});
 }
 const posts=await db().prepare(selectPost+" WHERE p.region"+(url.searchParams.get('board')==='notice'?"='notice'":"!='notice'")+' AND (p.seeded=0 OR p.at<=?) AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id) ORDER BY p.created DESC LIMIT 1000').bind(at).all<any>();
 return json({posts:posts.results.map(p=>publicPost(p,me)),mediaEnabled:!!bucket(),user:visitorView(me)});
 }catch(e){return json({error:e instanceof Error&&/시점/.test(e.message)?e.message:'통신을 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},500)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(Number(req.headers.get('content-length')||0)>7100000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const raw=await boundedBody(req,7100000);if(raw.length>7100000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const b=JSON.parse(raw);await init();await cleanupMedia();
 if(typeof b.action==='string'&&b.action.startsWith('account'))return await accountWrite(req,b);
 if(typeof b.action==='string'&&b.action.startsWith('admin'))return await adminWrite(req,b);
 const me=await session(req),now=Date.now();
 if(me&&!me.admin&&await db().prepare('SELECT 1 FROM astral_users WHERE owner=? AND blocked=1').bind(me.owner).first())return json({error:'이 사용자는 활동이 제한되었습니다.'},403);
 if(b.action==='select'){
  const c=characters.find(c=>c.id===b.character);if(!c)return json({error:'캐릭터를 선택해 주세요.'},400);
  await limit(req,'select',30);
  const signedAccount=me?.admin?await accountSession(req):me;
  if(signedAccount?.username){await db().prepare('UPDATE astral_users SET character=?,seen=? WHERE owner=?').bind(c.id,now,signedAccount.owner).run();const response=json({ok:true,user:visitorView({...signedAccount,character:c.id})});if(me?.admin){await revokeAdmin(req);response.headers.append('Set-Cookie',adminCookie(req,'',0))}return response;}

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
 const unrestricted=b.action==='save'&&['general','notice'].includes(b.region);
 const at=unrestricted?0:checkpoint(b.at);
 if(b.action==='save'){
  const title=field(b.title,100),body=field(b.body,6000),region=unrestricted?{id:b.region,start:0}:regions.find(r=>r.id===b.region);
  if(b.region==='notice'&&!me.admin)return json({error:'공지는 관리자만 작성할 수 있습니다.'},403);
  if(!region||at<region.start)return json({error:'지역과 게시글 시점을 맞춰 주세요.'},400);
  await limit(req,'write',20);
  if(b.id){
   const p=await db().prepare('SELECT owner,seeded FROM astral_posts WHERE id=? AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=astral_posts.id)').bind(b.id).first<any>();
   if(!p||p.owner!==me.owner||p.seeded)return json({error:'본인이 작성한 글만 수정할 수 있어요.'},403);
   await saveWithMedia(b.media,me,b.id,b.id,5,[db().prepare('UPDATE astral_posts SET title=?,body=?,region=?,at=? WHERE id=?').bind(title,body,region.id,at,b.id)]);return json({id:b.id});
  }
  const id=crypto.randomUUID();await saveWithMedia(b.media,me,id,id,5,[db().prepare('INSERT INTO astral_posts (id,owner,character,region,at,title,body,created) VALUES (?,?,?,?,?,?,?,?)').bind(id,me.owner,me.character,region.id,at,title,body,now)]);return json({id});
 }
 const id=field(b.id,100),p=await db().prepare('SELECT owner,seeded,at,title,body,character,region FROM astral_posts WHERE id=? AND (seeded=0 OR at<=?) AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=astral_posts.id)').bind(id,at).first<any>();
 if(!p)return json({error:'게시글을 찾을 수 없거나 현재 시점에서 볼 수 없어요.'},404);
 if(b.action==='report'){
  if(p.region==='notice'&&b.kind==='post')return json({error:'공지글은 신고할 수 없습니다.'},403);
  await limit(req,'report',5);
  const kind=b.kind;if(kind!=='post'&&kind!=='comment')return json({error:'신고 대상을 확인해 주세요.'},400);
  const target=kind==='post'?id:field(b.commentId,100);
  const item=kind==='post'?p:await db().prepare('SELECT owner,character,body FROM astral_comments WHERE id=? AND post=?').bind(target,id).first<any>();
  if(!item)return json({error:'신고 대상을 찾을 수 없어요.'},404);
  await db().prepare('INSERT OR IGNORE INTO astral_reports(id,reporter,kind,target,post,owner,character,title,body,reason,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),me.owner,kind,target,id,item.owner,item.character,p.title,item.body,field(b.reason,1000),now).run();
  return json({ok:true});
 }
 if(b.action==='delete'){
  if(p.owner!==me.owner||p.seeded)return json({error:'본인이 작성한 글만 삭제할 수 있어요.'},403);
  await db().batch([db().prepare('DELETE FROM astral_comments WHERE post=?').bind(id),db().prepare('DELETE FROM astral_likes WHERE post=?').bind(id),db().prepare('DELETE FROM astral_posts WHERE id=?').bind(id)]);await cleanupMedia();return json({ok:true});
 }
 if(b.action==='comment'){await limit(req,'comment',30);const cid=crypto.randomUUID();await saveWithMedia(b.media,me,cid,id,1,[db().prepare('INSERT INTO astral_comments (id,post,owner,character,body,at,created) VALUES (?,?,?,?,?,?,?)').bind(cid,id,me.owner,me.character,field(b.body,2000),at,now)]);return json({ok:true})}
 if(b.action==='deleteComment'){
  const c=await db().prepare('SELECT owner FROM astral_comments WHERE id=? AND post=?').bind(field(b.commentId,100),id).first<any>();
  if(!c||c.owner!==me.owner)return json({error:'댓글 삭제 권한이 없어요.'},403);
  await db().prepare('DELETE FROM astral_comments WHERE id=? AND post=?').bind(b.commentId,id).run();await cleanupMedia();return json({ok:true});
 }
 if(b.action==='like'){await limit(req,'like',60);if(typeof b.liked!=='boolean')return json({error:'공감 상태가 올바르지 않아요.'},400);await db().prepare(b.liked?'INSERT OR IGNORE INTO astral_likes(post,owner) VALUES (?,?)':'DELETE FROM astral_likes WHERE post=? AND owner=?').bind(id,me.owner).run();return json({ok:true})}
 return json({error:'알 수 없는 요청입니다.'},400);
 }catch(e){return json({error:e instanceof Error&&/입력|시점|잠시|이미지|첨부|유튜브|저장소/.test(e.message)?e.message:'요청을 처리하지 못했어요. 다시 시도해 주세요.'},400)}}

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
 return json({rows:section==='posts'?await Promise.all(rows.results.map(async(r:any)=>({...r,media:await readMedia(r.id)}))):rows.results,total:count?.total||0,page});
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
  await cleanupMedia();return json({ok:true});
 }
 if(b.action==='adminReport'){
  if(!['resolved','dismissed','open'].includes(b.status))return json({error:'처리 상태를 확인해 주세요.'},400);
  await db().prepare('UPDATE astral_reports SET status=? WHERE id=?').bind(b.status,field(b.id,100)).run();return json({ok:true});
 }
 return json({error:'알 수 없는 관리자 요청입니다.'},400);
}

// Media is uploaded only when submitting a post/reply, so cancelling a draft stores nothing.
async function boundedBody(req:Request,max:number){
 const reader=req.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('첨부 요청이 너무 큽니다.')}chunks.push(value)}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}return new TextDecoder().decode(data);
}
function videoId(value:unknown){
 if(!value)return '';if(typeof value!=='string'||value.length>2048)throw new Error('유튜브 링크를 확인해 주세요.');
 if(/^[A-Za-z0-9_-]{11}$/.test(value))return value;
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))throw 0;
 const host=u.hostname.toLowerCase();let id='';
 if(host==='youtu.be')id=u.pathname.slice(1);
 else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v')||'':/^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:'';
 if(/^[A-Za-z0-9_-]{11}$/.test(id))return id;
 }catch{}throw new Error('올바른 유튜브 영상 링크를 입력해 주세요.');
}
async function readMedia(target:string){
 const rows=await db().prepare('SELECT key FROM astral_media WHERE target=? AND committed=1 ORDER BY created,key').bind(target).all<{key:string}>();
 const video=await db().prepare('SELECT video FROM astral_videos WHERE target=?').bind(target).first<{video:string}>();
 return {images:rows.results.map(r=>r.key),video:video?.video||''};
}
async function eraseMedia(keys:string[]){
 if(!keys.length||!bucket())return;
 await bucket()!.delete(keys);
 await db().batch(keys.map(key=>db().prepare('DELETE FROM astral_media WHERE key=?').bind(key)));
}
async function cleanupMedia(){
 try{
 const rows=await db().prepare(`SELECT key FROM astral_media m WHERE
 (committed=0 AND created<?) OR (committed=1 AND (
 NOT EXISTS(SELECT 1 FROM astral_posts p WHERE p.id=m.parent)
 OR EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=m.parent)
 OR (m.target!=m.parent AND NOT EXISTS(SELECT 1 FROM astral_comments c WHERE c.id=m.target)))) LIMIT 50`).bind(Date.now()-86400000).all<{key:string}>();
 await eraseMedia(rows.results.map(r=>r.key));
 await db().prepare('DELETE FROM astral_videos WHERE NOT EXISTS(SELECT 1 FROM astral_posts WHERE id=target) AND NOT EXISTS(SELECT 1 FROM astral_comments WHERE id=target)').run();
 }catch{/* Retain quota reservations and retry cleanup on the next mutation. */}
}
async function saveWithMedia(input:any,me:Session,target:string,parent:string,max:number,ops:D1PreparedStatement[]){
 if(input===undefined){await db().batch(ops);return}
 if(!input||!Array.isArray(input.images)||input.images.length>max)throw new Error(`이미지는 최대 ${max}장까지 첨부할 수 있습니다.`);
 const video=videoId(input.video),old=await readMedia(target),kept:string[]=[],fresh:{key:string;data:Uint8Array}[]=[];
 for(const item of input.images){
 if(typeof item!=='string')throw new Error('이미지를 확인해 주세요.');
 if(old.images.includes(item)){if(!kept.includes(item))kept.push(item);continue}
 if(!item.startsWith('data:image/webp;base64,')||item.length>1400000)throw new Error('이미지는 압축된 WebP 형식으로 첨부해 주세요.');
 let data:Uint8Array;try{data=Uint8Array.from(atob(item.slice(23)),c=>c.charCodeAt(0))}catch{throw new Error('이미지 데이터가 올바르지 않습니다.')}
 const ascii=(a:number,b:number)=>String.fromCharCode(...data.slice(a,b));
 if(data.length>1048576||data.length<20||ascii(0,4)!=='RIFF'||ascii(8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(ascii(12,16)))throw new Error('이미지 형식 또는 1MB 제한을 확인해 주세요.');
 fresh.push({key:crypto.randomUUID()+'.webp',data});
 }
 if(fresh.length&&!bucket())throw new Error('이미지 저장소 연결이 필요합니다. 유튜브 링크와 글은 이용할 수 있어요.');
 const reserved:string[]=[];
 try{
 for(const item of fresh){
 // One conditional INSERT atomically reserves space, including in-flight uploads.
 const result=await db().prepare('INSERT INTO astral_media(key,target,parent,owner,bytes,created) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM astral_media)+?<=8000000000').bind(item.key,target,parent,me.owner,item.data.length,Date.now(),item.data.length).run();
 if(!result.meta.changes)throw new Error('이미지 저장소가 8GB 한도에 도달했습니다.');reserved.push(item.key);
 await bucket()!.put(item.key,item.data,{httpMetadata:{contentType:'image/webp'}});
 }
 const desired=[...kept,...reserved];
 await db().batch([...ops,...reserved.map(key=>db().prepare('UPDATE astral_media SET committed=1 WHERE key=?').bind(key)),
 ...old.images.filter(key=>!desired.includes(key)).map(key=>db().prepare('UPDATE astral_media SET committed=0,created=0 WHERE key=?').bind(key)),
 db().prepare('INSERT INTO astral_videos(target,video) VALUES (?,?) ON CONFLICT(target) DO UPDATE SET video=excluded.video').bind(target,video)]);
 }catch(e){try{await eraseMedia(reserved)}catch{}throw e}
 await cleanupMedia();
}
async function serveImage(url:URL){
 const key=url.searchParams.get('image')||'';
 const row=await db().prepare(`SELECT m.key FROM astral_media m JOIN astral_posts p ON p.id=m.parent WHERE m.key=? AND m.committed=1
 AND NOT EXISTS(SELECT 1 FROM astral_hidden h WHERE h.post=p.id)
 AND (m.target=m.parent OR EXISTS(SELECT 1 FROM astral_comments c WHERE c.id=m.target))`).bind(key).first();
 if(!row||!bucket())return new Response('Not found',{status:404});
 const object=await bucket()!.get(key);if(!object)return new Response('Not found',{status:404});
 return new Response(object.body,{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=300','Content-Security-Policy':"default-src 'none'"}});
}

// Registered users retain a stable owner ID across devices and credential changes.
const accountToken=(req:Request)=>req.headers.get('cookie')?.match(/(?:^|;\s*)astral_account=([^;]+)/)?.[1];
function accountCookie(req:Request,token:string,age=2592000){return `astral_account=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`}
async function accountSession(req:Request){
 const token=accountToken(req);if(!token)return null;
 return db().prepare('SELECT a.owner,a.username,a.male,a.female,a.version,u.character FROM astral_account_sessions s JOIN astral_accounts a ON a.owner=s.owner AND a.version=s.version JOIN astral_users u ON u.owner=a.owner WHERE s.token=? AND s.expires>?').bind(await hash(token),Date.now()).first<Session>();
}
function authorName(id:string,male?:string,female?:string){return id==='8001'?(male||'카일루스'):id==='8002'?(female||'스텔레'):characters.find(c=>c.id===id)?.name||(id==='__admin__'?'게시판의 에이온즈':'알 수 없는 캐릭터')}
function visitorView(me:Session|null){return me?{character:me.character,admin:!!me.admin,account:!!me.username,username:me.username,male:me.male||'',female:me.female||'',displayName:authorName(me.character,me.male,me.female)}:null}
function accountView(me:Session|null){return me?{username:me.username,male:me.male||'',female:me.female||'',character:me.character}:null}
function usernameField(v:unknown){if(typeof v!=='string')throw new Error('입력할 아이디를 확인해 주세요.');const value=v.trim().normalize('NFC').toLowerCase();if(!/^[a-z0-9가-힣_]{3,24}$/.test(value))throw new Error('입력할 아이디는 한글·영문·숫자·밑줄 3~24자로 정해 주세요.');return value}
function userPassword(v:unknown){if(typeof v!=='string'||v.length<8||v.length>128)throw new Error('입력할 비밀번호는 8~128자로 정해 주세요.');return v}
function trailblazerName(v:unknown){if(typeof v!=='string'||v.trim().length>20||/[\u0000-\u001f\u007f]/.test(v))throw new Error('입력할 개척자 이름은 20자 이내로 정해 주세요.');return v.trim()}
async function issueAccount(req:Request,owner:string,version:number){
 const token=crypto.randomUUID()+crypto.randomUUID();
 const result=await db().prepare('INSERT INTO astral_account_sessions(token,owner,version,expires) SELECT ?,owner,version,? FROM astral_accounts WHERE owner=? AND version=?').bind(await hash(token),Date.now()+2592000000,owner,version).run();
 if(!result.meta.changes)return json({error:'로그인 정보가 변경되었습니다. 다시 로그인해 주세요.'},401);
 const response=json({ok:true},200,{'Set-Cookie':accountCookie(req,token)});
 response.headers.append('Set-Cookie',`astral_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${new URL(req.url).protocol==='https:'?'; Secure':''}`);
 await revokeAdmin(req);response.headers.append('Set-Cookie',adminCookie(req,'',0));
 return response;
}
async function accountWrite(req:Request,b:any){
 if(b.action==='accountLogout'){
  const token=accountToken(req);if(token)await db().prepare('DELETE FROM astral_account_sessions WHERE token=?').bind(await hash(token)).run();
  return json({ok:true},200,{'Set-Cookie':accountCookie(req,'',0)});
 }
 await limit(req,'account',10);
 await db().prepare('DELETE FROM astral_account_sessions WHERE expires<?').bind(Date.now()).run();
 if(b.action==='accountRegister'){
  const current=await session(req);if(current?.username)return json({error:'이미 로그인되어 있습니다.'},400);
  const username=usernameField(b.username),password=userPassword(b.password);
  if(await db().prepare('SELECT 1 FROM astral_accounts WHERE username=?').bind(username).first())return json({error:'이미 사용 중인 아이디입니다.'},409);
  if(current&&!current.admin&&await db().prepare('SELECT 1 FROM astral_users WHERE owner=? AND blocked=1').bind(current.owner).first())return json({error:'이 사용자는 활동이 제한되었습니다.'},403);
  const owner=current&&!current.admin?current.owner:crypto.randomUUID(),character=current&&!current.admin?current.character:'8002',salt=crypto.randomUUID(),now=Date.now();
  try{await db().batch([
   db().prepare('INSERT INTO astral_accounts(owner,username,salt,password,created) VALUES (?,?,?,?,?)').bind(owner,username,salt,await passwordHash(password,salt),now),
   db().prepare('INSERT INTO astral_users(owner,character,created,seen) VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET seen=excluded.seen').bind(owner,character,now,now),
   db().prepare('DELETE FROM astral_sessions WHERE owner=?').bind(owner)
  ])}catch(e){if(String(e).includes('UNIQUE'))return json({error:'이미 가입된 정보입니다. 다른 아이디를 사용하거나 로그인해 주세요.'},409);throw e}
  return issueAccount(req,owner,1);
 }
 if(b.action==='accountLogin'){
  const username=usernameField(b.username),password=userPassword(b.password);
  const a=await db().prepare('SELECT a.*,u.blocked FROM astral_accounts a JOIN astral_users u ON u.owner=a.owner WHERE a.username=?').bind(username).first<any>();
  const candidate=await passwordHash(password,a?.salt||'unknown-account-fixed-work');
  if(!a||!equalHash(candidate,a.password))return json({error:'아이디 또는 비밀번호가 올바르지 않습니다.'},401);
  if(a.blocked)return json({error:'이 사용자는 활동이 제한되었습니다.'},403);
  const old=accountToken(req);if(old)await db().prepare('DELETE FROM astral_account_sessions WHERE token=?').bind(await hash(old)).run();
  return issueAccount(req,a.owner,a.version);
 }
 const me=await accountSession(req);if(!me)return json({error:'사용자 로그인이 필요합니다.'},401);
 if(b.action==='accountNames'){
  await db().prepare('UPDATE astral_accounts SET male=?,female=? WHERE owner=? AND version=?').bind(trailblazerName(b.male),trailblazerName(b.female),me.owner,me.version).run();return json({ok:true});
 }
 if(b.action==='accountCredentials'){
  const a=await db().prepare('SELECT * FROM astral_accounts WHERE owner=? AND version=?').bind(me.owner,me.version).first<any>();
  if(!a||!equalHash(await passwordHash(userPassword(b.currentPassword),a.salt),a.password))return json({error:'현재 비밀번호가 올바르지 않습니다.'},401);
  const username=usernameField(b.username),newPassword=b.password===''?null:userPassword(b.password);
  if(await db().prepare('SELECT 1 FROM astral_accounts WHERE username=? AND owner!=?').bind(username,me.owner).first())return json({error:'이미 사용 중인 아이디입니다.'},409);
  const salt=newPassword?crypto.randomUUID():a.salt,password=newPassword?await passwordHash(newPassword,salt):a.password;
  let result;
  try{result=await db().prepare('UPDATE astral_accounts SET username=?,salt=?,password=?,version=version+1 WHERE owner=? AND version=?').bind(username,salt,password,me.owner,a.version).run()}catch(e){if(String(e).includes('UNIQUE'))return json({error:'이미 사용 중인 아이디입니다.'},409);throw e}
  if(!result.meta.changes)return json({error:'정보가 변경되었습니다. 다시 로그인해 주세요.'},409);
  await db().prepare('DELETE FROM astral_account_sessions WHERE owner=? AND version<=?').bind(me.owner,a.version).run();
  return issueAccount(req,me.owner,a.version+1);
 }
 return json({error:'알 수 없는 계정 요청입니다.'},400);
}
