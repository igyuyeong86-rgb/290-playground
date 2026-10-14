import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const categories=['자유게시판','질문·답변','정보공유','가입인사','공지사항'];
const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
async function digest(v:string){return hex(await crypto.subtle.digest('SHA-256',enc.encode(v)))}
async function password(v:string,salt:string){const k=await crypto.subtle.importKey('raw',enc.encode(v),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},k,256))}
function same(a:string,b:string){let x=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return x===0}
function json(data:any,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
const db=()=>env.DB!;
async function user(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)play_session=([^;]+)/)?.[1];if(!token)return null;return db().prepare('SELECT user_id AS id, username FROM sessions WHERE token=? AND expires>?').bind(await digest(token),Date.now()).first<{id:string,username:string}>()}
async function throttle(req:Request,identity:string){const key=await digest((req.headers.get('cf-connecting-ip')||'local')+':'+identity);const now=Date.now();await db().prepare('INSERT INTO attempts (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END').bind(key,now+900000,now,now,now+900000).run();const row=await db().prepare('SELECT count FROM attempts WHERE key=?').bind(key).first<{count:number}>();if(row!.count>15)throw new Error('시도가 너무 많습니다. 15분 후 다시 시도해 주세요.')}
function field(v:unknown,max:number,min=1){if(typeof v!=='string'||v.trim().length<min||v.length>max)throw new Error('입력 내용의 길이를 확인해 주세요.');return v.trim()}
async function details(id:number,me:any){const post=await db().prepare('SELECT p.*, (SELECT COUNT(*) FROM likes WHERE post_id=p.id) AS likes FROM posts p WHERE p.id=?').bind(id).first();if(!post)return json({error:'게시글을 찾을 수 없습니다.'},404);const c=await db().prepare('SELECT id,author_id,author,body,created FROM comments WHERE post_id=? ORDER BY id').bind(id).all();const liked=me?await db().prepare('SELECT 1 FROM likes WHERE post_id=? AND user_id=?').bind(id,me.id).first():null;return json({post,comments:c.results,liked:!!liked})}
export async function GET(req:Request){try{const me=await user(req);const url=new URL(req.url);if(url.searchParams.has('id'))return details(Number(url.searchParams.get('id')),me);const rows=await db().prepare('SELECT p.id,p.title,p.category,p.author_id,p.author,p.created,p.updated,p.views,p.pinned,(SELECT COUNT(*) FROM comments WHERE post_id=p.id) AS comments,(SELECT COUNT(*) FROM likes WHERE post_id=p.id) AS likes FROM posts p ORDER BY p.pinned DESC,p.id DESC LIMIT 1000').all();const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const stats=await db().prepare('SELECT (SELECT COUNT(*) FROM posts) AS posts,(SELECT COUNT(*) FROM members)+1 AS members,(SELECT COUNT(*) FROM posts WHERE created>=?) AS today').bind(new Date(day+'T00:00:00+09:00').getTime()).first();return json({user:me?{...me,admin:me.id==='admin'}:null,posts:rows.results,stats})}catch{return json({error:'데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},500)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(Number(req.headers.get('content-length')||0)>50000)return json({error:'입력 내용이 너무 깁니다.'},413);
 const raw=await req.text();if(raw.length>50000)return json({error:'입력 내용이 너무 깁니다.'},413);const b=JSON.parse(raw);const action=b.action;const now=Date.now();let me=await user(req);
 if(action==='register'||action==='login'){
  await throttle(req,'auth');
  if(action==='register'){
   const username=field(b.username,20,3).toLowerCase();if(!/^[a-z][a-z0-9_]{2,19}$/.test(username)||username==='admin')return json({error:'아이디는 영문으로 시작하는 3~20자의 영문·숫자·밑줄이어야 합니다.'},400);
   const phone=field(b.phone,20).replace(/\D/g,'');if(!/^01[016789]\d{7,8}$/.test(phone))return json({error:'올바른 휴대전화 번호를 입력해 주세요.'},400);
   const pw=field(b.password,128,8);const salt=crypto.randomUUID();
   try{await db().prepare('INSERT INTO members (id,username,phone,password,salt,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),username,phone,await password(pw,salt),salt,now).run()}catch{return json({error:'이미 사용 중인 아이디 또는 전화번호입니다.'},409)}
   return json({ok:true});
  }
  const identity=field(b.identity,40).toLowerCase();const pw=field(b.password,128);
  if(identity==='admin'){
   const secret=(env as any).ADMIN_PASSWORD;if(!secret)return json({error:'관리자 설정이 완료되지 않았습니다.'},503);
   if(same(await digest(pw),await digest(secret)))me={id:'admin',username:'admin'};else me=null;
  }else{const member=await db().prepare('SELECT * FROM members WHERE username=? OR phone=?').bind(identity,identity.replace(/\D/g,'')).first<any>();if(member&&same(await password(pw,member.salt),member.password))me={id:member.id,username:member.username};else{if(!member)await password(pw,'dummy-salt');me=null}}
  if(!me)return json({error:'아이디·전화번호 또는 비밀번호를 확인해 주세요.'},401);
  const token=crypto.randomUUID()+crypto.randomUUID();await db().prepare('INSERT INTO sessions(token,user_id,username,expires) VALUES (?,?,?,?)').bind(await digest(token),me.id,me.username,now+604800000).run();
  await db().batch([db().prepare('DELETE FROM sessions WHERE expires<?').bind(now),db().prepare('DELETE FROM attempts WHERE expires<?').bind(now)]);
  return json({ok:true},200,{'Set-Cookie':`play_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`});
 }
 if(action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)play_session=([^;]+)/)?.[1];if(token)await db().prepare('DELETE FROM sessions WHERE token=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':'play_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})}
 if(!me)return json({error:'로그인이 필요합니다.'},401);
 if(action==='save'){
  const title=field(b.title,120);const body=field(b.body,20000);const category=field(b.category,20);if(!categories.includes(category))return json({error:'게시판을 선택해 주세요.'},400);if(category==='공지사항'&&me.id!=='admin')return json({error:'관리자만 공지를 작성할 수 있습니다.'},403);
  if(b.id){const old=await db().prepare('SELECT author_id FROM posts WHERE id=?').bind(b.id).first<any>();if(!old)return json({error:'삭제된 게시글입니다.'},404);if(old.author_id!==me.id&&me.id!=='admin')return json({error:'수정 권한이 없습니다.'},403);await db().prepare('UPDATE posts SET title=?,body=?,category=?,updated=? WHERE id=?').bind(title,body,category,now,b.id).run();return json({id:b.id})}
  await throttle(req,'write:'+me.id);const result=await db().prepare('INSERT INTO posts(title,body,category,author_id,author,created,updated,pinned) VALUES (?,?,?,?,?,?,?,?)').bind(title,body,category,me.id,me.username,now,now,category==='공지사항'?1:0).run();return json({id:result.meta.last_row_id});
 }
 const id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)return json({error:'올바르지 않은 게시글입니다.'},400);
 const post=await db().prepare('SELECT author_id,pinned FROM posts WHERE id=?').bind(id).first<any>();if(!post)return json({error:'삭제된 게시글입니다.'},404);
 if(action==='delete'){if(post.author_id!==me.id&&me.id!=='admin')return json({error:'삭제 권한이 없습니다.'},403);await db().batch([db().prepare('DELETE FROM comments WHERE post_id=?').bind(id),db().prepare('DELETE FROM likes WHERE post_id=?').bind(id),db().prepare('DELETE FROM posts WHERE id=?').bind(id)]);return json({ok:true})}
 if(action==='pin'){if(me.id!=='admin')return json({error:'관리자 권한이 필요합니다.'},403);await db().prepare('UPDATE posts SET pinned=? WHERE id=?').bind(post.pinned?0:1,id).run();return json({ok:true})}
 if(action==='comment'){await throttle(req,'comment:'+me.id);await db().prepare('INSERT INTO comments(post_id,author_id,author,body,created) VALUES (?,?,?,?,?)').bind(id,me.id,me.username,field(b.body,2000),now).run();return details(id,me)}
 if(action==='deleteComment'){const c=await db().prepare('SELECT author_id FROM comments WHERE id=? AND post_id=?').bind(b.commentId,id).first<any>();if(!c||(c.author_id!==me.id&&me.id!=='admin'))return json({error:'삭제 권한이 없습니다.'},403);await db().prepare('DELETE FROM comments WHERE id=?').bind(b.commentId).run();return details(id,me)}
 if(action==='like'){if(b.liked)await db().prepare('INSERT OR IGNORE INTO likes(post_id,user_id) VALUES (?,?)').bind(id,me.id).run();else await db().prepare('DELETE FROM likes WHERE post_id=? AND user_id=?').bind(id,me.id).run();return details(id,me)}
 if(action==='view'){await db().prepare('UPDATE posts SET views=views+1 WHERE id=?').bind(id).run();return json({ok:true})}
 return json({error:'알 수 없는 요청입니다.'},400);
 }catch(e){return json({error:e instanceof Error&&/입력|시도/.test(e.message)?e.message:'요청을 처리하지 못했습니다. 다시 시도해 주세요.'},400)}}
