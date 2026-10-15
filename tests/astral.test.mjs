import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {strict as assert} from 'node:assert';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
class Statement{
 constructor(query,args=[]){this.query=query;this.args=args}
 bind(...args){return new Statement(this.query,args)}
 async first(){return sql.prepare(this.query).get(...this.args)||null}
 async all(){return {results:sql.prepare(this.query).all(...this.args)}}
 async run(){const r=sql.prepare(this.query).run(...this.args);return {meta:{last_row_id:Number(r.lastInsertRowid),changes:Number(r.changes)}}}
}
globalThis.__env={DB:{prepare:s=>new Statement(s),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}}};
const module=async(source)=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
globalThis.__extra=await module(readFileSync('lib/astral-extra.ts','utf8'));
globalThis.__data=await module(readFileSync('lib/astral-data.ts','utf8').replace("import {extraRows} from './astral-extra';",'const {extraRows}=globalThis.__extra;').replace("import roster from './astral-characters.json';",'const roster='+readFileSync('lib/astral-characters.json','utf8')+';'));
const {characters,seedPosts,regions,checkpoints}=globalThis.__data;
assert.equal(characters.length,73);assert.equal(new Set(characters.map(c=>c.id)).size,73);assert.ok(seedPosts.length>80);assert.equal(new Set(seedPosts.map(p=>p.character)).size,73);assert.equal(new Set(seedPosts.map(p=>p.id)).size,seedPosts.length);
for(const c of characters)assert.ok(existsSync('public'+c.image));
for(let at=0;at<checkpoints.length;at++){assert.ok(seedPosts.some(p=>p.at===at));for(const p of seedPosts.filter(p=>p.at===at)){assert.ok(characters.some(c=>c.id===p.character));assert.ok(regions.some(r=>r.id===p.region&&r.start<=p.at))}}
const {GET,POST}=await module(readFileSync('app/api/astral/route.ts','utf8').replace("import { env } from 'cloudflare:workers';",'const env=globalThis.__env;').replace("import {characters,regions,seedPosts,checkpoints} from '../../../lib/astral-data';",'const {characters,regions,seedPosts,checkpoints}=globalThis.__data;'));
const origin='https://astral.test';
async function get(at=21,cookie='',id=''){const r=await GET(new Request(`${origin}/api/astral?at=${at}${id?'&id='+id:''}`,{headers:{cookie}}));return {status:r.status,data:await r.json()}}
async function post(body,cookie='',ip='test'){const r=await POST(new Request(origin+'/api/astral',{method:'POST',headers:{origin,cookie,'cf-connecting-ip':ip},body:JSON.stringify({at:21,...body})}));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],header:r.headers.get('set-cookie')}}
assert.equal((await get()).data.posts.length,seedPosts.length);assert.equal((await get()).data.posts.length,seedPosts.length,'seed idempotence');
for(let at=0;at<checkpoints.length;at++)assert.equal((await get(at)).data.posts.length,seedPosts.filter(p=>p.at<=at).length);
assert.equal((await get(2,'','signal-036')).status,404);
assert.equal((await post({action:'save',title:'a',body:'b',region:'herta',at:2})).status,401);
assert.equal((await post({action:'select',character:'admin'})).status,400);
const a=await post({action:'select',character:'8002'}),b=await post({action:'select',character:'8002'});
assert.equal(a.status,200);assert.match(a.header,/HttpOnly; Secure; SameSite=Lax/);assert.notEqual(a.cookie,b.cookie);
const created=await post({action:'save',region:'herta',at:2,title:'인물 프로필과 작성 권한',body:'내가 쓴 글'},a.cookie);assert.equal(created.status,200);const id=created.data.id;
assert.equal((await post({action:'save',region:'penacony',at:5,title:'x',body:'x'},a.cookie)).status,400);
assert.equal((await post({action:'save',id,region:'herta',at:2,title:'공격',body:'공격'},b.cookie)).status,403);
assert.equal((await post({action:'delete',id},b.cookie)).status,403);
assert.equal((await post({action:'delete',id:'signal-001'},a.cookie)).status,403);
assert.equal((await get(17,b.cookie,id)).data.post.owned,false);
const switched=await post({action:'select',character:characters.find(c=>c.key==='Herta').id},a.cookie);
assert.equal((await get(17,switched.cookie,id)).data.post.owned,true);
assert.equal((await get(17,switched.cookie,id)).data.post.character,'8002','original author stays');
assert.equal((await get(17,a.cookie)).data.user,null,'old session revoked');
assert.equal((await post({action:'save',id,region:'herta',at:2,title:'수정',body:'업데이트'},switched.cookie)).status,200);
assert.equal((await post({action:'comment',id,body:'미래 댓글',at:17},b.cookie)).status,200);
assert.equal((await get(2,switched.cookie,id)).data.comments.length,0);
assert.equal((await get(2,switched.cookie,id)).data.post.comments,0);
let detail=(await get(17,switched.cookie,id)).data;assert.equal(detail.comments.length,1);
assert.equal((await post({action:'deleteComment',id,commentId:detail.comments[0].id},switched.cookie)).status,403);
assert.equal((await post({action:'deleteComment',id,commentId:detail.comments[0].id},b.cookie)).status,200);
await post({action:'like',id,liked:true},b.cookie);await post({action:'like',id,liked:true},b.cookie);
assert.equal((await get(17,b.cookie,id)).data.post.likes,1);
await post({action:'like',id,liked:false},b.cookie);assert.equal((await get(17,b.cookie,id)).data.post.likes,0);
const csrf=await POST(new Request(origin+'/api/astral',{method:'POST',headers:{origin:'https://other.test'},body:JSON.stringify({action:'select',character:'8002'})}));assert.equal(csrf.status,403);
await post({action:'comment',id,body:'cascade',at:17},b.cookie);await post({action:'like',id,liked:true},b.cookie);
assert.equal((await post({action:'delete',id},switched.cookie)).status,200);assert.equal((await get(17,'',id)).status,404);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM astral_comments').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM astral_likes').get().n,0);
let limited;for(let i=0;i<31;i++)limited=await post({action:'select',character:'8002'},'','limited');assert.match(limited.data.error,/잠시/);
console.log('PASS: 73 profile assets, all 73 profiles covered, 22 timeline boundaries, idempotent initialization, anonymous sessions, same-character ownership isolation, identity switching, edits, seed protection, comments, future-comment filtering, likes, CSRF, cascades and request limiting.');
console.log('SEEDS',seedPosts.length);
// Admin/report regression: API authorization is checked independently of UI visibility.
const secret='test-'+crypto.randomUUID(),nextSecret='next-'+crypto.randomUUID();
globalThis.__env.ADMIN_INITIAL_PASSWORD=secret;
async function adminGet(section,cookie='',extra=''){const r=await GET(new Request(origin+'/api/astral?admin='+section+extra,{headers:{cookie}}));return {status:r.status,data:await r.json()}}
assert.equal((await adminGet('posts')).status,401);
assert.equal((await post({action:'adminBlock',owner:'x',blocked:true},b.cookie)).status,401);
assert.equal((await post({action:'select',character:'__admin__'},b.cookie)).status,400);
assert.equal((await post({action:'adminLogin',password:'incorrect'},'','admin-wrong')).status,401);
const login=await post({action:'adminLogin',password:secret},'','admin-good');assert.equal(login.status,200);assert.match(login.header,/HttpOnly/);assert.match(login.header,/Secure/);assert.match(login.header,/SameSite=Strict/);
const adminCookie=login.cookie;
assert.equal((await get(21,adminCookie)).data.user.character,'__admin__');
assert.equal((await adminGet('posts',adminCookie)).status,200);
const visitor=await post({action:'select',character:'1001'},'','reporter');
const target=await post({action:'save',title:'Moderation target',body:'User content',region:'herta',at:21},visitor.cookie,'target');assert.equal(target.status,200);
assert.ok((await adminGet('posts',adminCookie)).data.rows.some(p=>p.id===target.data.id),'all story points visible');
await post({action:'comment',id:target.data.id,body:'Reported reply'},visitor.cookie,'target-comment');
const comment=(await get(21,visitor.cookie,target.data.id)).data.comments[0];
assert.equal((await post({action:'report',kind:'post',id:target.data.id,reason:'Test reason'},b.cookie,'report')).status,200);
await post({action:'report',kind:'post',id:target.data.id,reason:'duplicate'},b.cookie,'report');
await post({action:'report',kind:'comment',id:target.data.id,commentId:comment.id,reason:'Reply reason'},b.cookie,'report');
assert.equal((await post({action:'report',kind:'comment',id:target.data.id,commentId:'missing',reason:'bad'},b.cookie,'report')).status,404);
let reports=(await adminGet('reports',adminCookie)).data.rows;assert.equal(reports.length,2,'deduplicated');
assert.equal((await adminGet('reports',visitor.cookie)).status,401);
const report=reports.find(r=>r.kind==='post'),owner=report.owner;
assert.equal((await post({action:'adminBlock',owner,blocked:true},adminCookie)).status,200);
assert.equal((await post({action:'select',character:'1002'},visitor.cookie,'blocked')).status,403);
assert.equal((await post({action:'save',title:'Blocked',body:'No',region:'herta'},visitor.cookie,'blocked')).status,403);
await post({action:'adminBlock',owner,blocked:false},adminCookie);
assert.equal((await post({action:'adminDelete',kind:'comment',id:comment.id},adminCookie)).status,200);
assert.equal((await get(21,'',target.data.id)).data.comments.length,0);
assert.equal((await post({action:'adminDelete',kind:'post',id:target.data.id},adminCookie)).status,200);
assert.equal((await get(21,'',target.data.id)).status,404);
assert.equal((await post({action:'save',id:target.data.id,title:'restore',body:'no',region:'herta'},visitor.cookie,'target')).status,403);
assert.equal((await adminGet('reports',adminCookie,'&status=resolved')).data.rows.length,2);
await post({action:'adminReport',id:report.id,status:'dismissed'},adminCookie);
assert.equal((await adminGet('reports',adminCookie,'&status=dismissed')).data.rows.length,1);
const seed=seedPosts[0];await post({action:'adminDelete',kind:'post',id:seed.id},adminCookie);assert.equal((await get(21,'',seed.id)).status,404);
assert.equal((await post({action:'adminPassword',current:'incorrect',next:nextSecret},adminCookie,'pw-wrong')).status,403);
const second=await post({action:'adminLogin',password:secret},'','admin-second');
assert.equal((await post({action:'adminPassword',current:secret,next:nextSecret},adminCookie,'pw-change')).status,200);
assert.equal((await adminGet('session',adminCookie)).status,401);assert.equal((await adminGet('session',second.cookie)).status,401);
assert.equal((await post({action:'adminLogin',password:secret},'','admin-old')).status,401);
const newLogin=await post({action:'adminLogin',password:nextSecret},'','admin-new');assert.equal(newLogin.status,200);
await post({action:'select',character:'1001'},newLogin.cookie,'leave-admin');assert.equal((await adminGet('session',newLogin.cookie)).status,401);
assert.notEqual(sql.prepare('SELECT password FROM astral_admin').get().password,nextSecret,'never store plain password');
console.log('PASS: administrator auth, wrong passwords, protected endpoints, full timeline lists, report deduplication and snapshots, block/unblock, moderated deletion, seed hiding, password rotation invalidating all sessions, old-password rejection, character switch revokes admin.');
sql.close();
