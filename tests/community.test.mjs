import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { strict as assert } from 'node:assert';
import ts from 'typescript';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0000_mighty_toro.sql','utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args}
 bind(...args){return new Statement(this.sql,args)}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}
 async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {meta:{last_row_id:Number(result.lastInsertRowid),changes:result.changes}}}
}
globalThis.__testEnv={DB:{prepare:sql=>new Statement(sql),batch:async ss=>{sqlite.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}},ADMIN_PASSWORD:'test-admin-only'};
let source=readFileSync('app/api/community/route.ts','utf8').replace("import { env } from 'cloudflare:workers';",'const env=globalThis.__testEnv;');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {GET,POST}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const origin='https://test.local';
async function post(body,cookie='',ip='1'){const r=await POST(new Request(origin+'/api/community',{method:'POST',headers:{origin,cookie,'cf-connecting-ip':ip,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],header:r.headers.get('set-cookie')}}
async function get(cookie='',id=''){const r=await GET(new Request(origin+'/api/community'+(id?'?id='+id:''),{headers:{cookie}}));return {status:r.status,data:await r.json()}}
assert.equal((await get()).data.posts.length,0);
assert.equal((await post({action:'save',title:'test',body:'test',category:'자유게시판'})).status,401);
assert.equal((await post({action:'login',identity:'admin',password:'wrong'})).status,401);
const admin=await post({action:'login',identity:'admin',password:'test-admin-only'});assert.equal(admin.status,200);assert.match(admin.header,/HttpOnly; Secure; SameSite=Lax/);assert.equal((await get(admin.cookie)).data.user.admin,true);
const reg={action:'register',username:'tester',phone:'010-1234-5678',password:'test-pass123'};
assert.equal((await post(reg)).status,200);assert.equal((await post(reg)).status,409);
const saved=sqlite.prepare('SELECT * FROM members').get();assert.notEqual(saved.password,reg.password);assert.equal(saved.password.length,64);
const login=await post({action:'login',identity:'010-1234-5678',password:reg.password});assert.equal(login.status,200);
assert.equal((await post({action:'save',title:'Notice',body:'body',category:'공지사항'},login.cookie)).status,403);
const created=await post({action:'save',title:'Hello',body:'My first story',category:'자유게시판'},login.cookie);assert.equal(created.status,200);const id=created.data.id;
assert.equal((await post({action:'register',username:'other',phone:'010-2222-3333',password:'other-pass123'})).status,200);
const other=await post({action:'login',identity:'other',password:'other-pass123'});
assert.equal((await post({action:'save',id,title:'attack',body:'x',category:'자유게시판'},other.cookie)).status,403);
assert.equal((await post({action:'delete',id},other.cookie)).status,403);
assert.equal((await post({action:'pin',id},other.cookie)).status,403);
assert.equal((await post({action:'save',id,title:'Edited',body:'updated',category:'자유게시판'},login.cookie)).status,200);
assert.equal((await post({action:'like',id,liked:true},other.cookie)).data.post.likes,1);
assert.equal((await post({action:'like',id,liked:true},other.cookie)).data.post.likes,1);
const comment=await post({action:'comment',id,body:'Nice post!'},other.cookie);assert.equal(comment.data.comments.length,1);
assert.equal((await post({action:'deleteComment',id,commentId:comment.data.comments[0].id},login.cookie)).status,403);
assert.equal((await post({action:'pin',id},admin.cookie)).status,200);
assert.equal((await get()).data.posts[0].pinned,1);
assert.equal((await post({action:'delete',id},admin.cookie)).status,200);
assert.equal((await get('',id)).status,404);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get().n,0);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM likes').get().n,0);
const csrf=await POST(new Request(origin+'/api/community',{method:'POST',headers:{origin:'https://evil.test',cookie:admin.cookie},body:JSON.stringify({action:'logout'})}));assert.equal(csrf.status,403);
assert.equal((await post({action:'logout'},login.cookie)).status,200);assert.equal((await get(login.cookie)).data.user,null);
let last;for(let i=0;i<16;i++)last=await post({action:'login',identity:'admin',password:'wrong'},'','rate-test');assert.match(last.data.error,/15분/);
console.log('PASS: registration, phone login, password hashing, admin login, sessions, CSRF, permissions, post edit/delete, comments, idempotent likes, pinning, cascades, logout and rate limiting.');
sqlite.close();
