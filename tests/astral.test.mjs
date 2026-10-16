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
globalThis.__data=await module(readFileSync('lib/astral-data.ts','utf8').replace("import storyPosts from './astral-story-posts.json';",'const storyPosts='+readFileSync('lib/astral-story-posts.json','utf8')+';').replace("import {extraRows} from './astral-extra';",'const {extraRows}=globalThis.__extra;').replace("import roster from './astral-characters.json';",'const roster='+readFileSync('lib/astral-characters.json','utf8')+';'));
const {characters,seedPosts,regions,checkpoints}=globalThis.__data;
assert.equal(characters.length,83);assert.equal(new Set(characters.map(c=>c.id)).size,83);assert.ok(seedPosts.length>80);assert.equal(new Set(seedPosts.map(p=>p.character)).size,81);assert.equal(new Set(seedPosts.map(p=>p.id)).size,seedPosts.length);
for(const c of characters)assert.ok(existsSync('public'+c.image));
for(let at=0;at<checkpoints.length;at++){assert.ok(seedPosts.some(p=>p.at===at));for(const p of seedPosts.filter(p=>p.at===at)){assert.ok(characters.some(c=>c.id===p.character));assert.ok(regions.some(r=>r.id===p.region&&r.start<=p.at))}}
const routeSource=readFileSync('app/api/astral/route.ts','utf8').replace("import { env } from 'cloudflare:workers';",'const env=globalThis.__env;').replace("import {characters,regions,seedPosts,checkpoints} from '../../../lib/astral-data';",'const {characters,regions,seedPosts,checkpoints}=globalThis.__data;');
let {GET,POST}=await module(routeSource);
const origin='https://astral.test';
async function get(at=31,cookie='',id=''){const r=await GET(new Request(`${origin}/api/astral?at=${at}${id?'&id='+id:''}`,{headers:{cookie}}));return {status:r.status,data:await r.json()}}
async function post(body,cookie='',ip='test'){const r=await POST(new Request(origin+'/api/astral',{method:'POST',headers:{origin,cookie,'cf-connecting-ip':ip},body:JSON.stringify({at:21,...body})}));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],header:r.headers.get('set-cookie')}}
assert.equal((await get()).data.posts.length,seedPosts.length);
assert.equal(seedPosts.length,137);assert.ok(!seedPosts.some(p=>['8001','8002'].includes(p.character)));
const additions=JSON.parse(readFileSync('lib/astral-story-posts.json','utf8'));assert.equal(additions.length,54);
for(const p of additions){assert.equal((await get(Math.max(0,p.at-1),'',p.id)).status,p.at?404:200);assert.equal((await get(p.at,'',p.id)).status,200)}
// Upgrade an existing DB: retire only editorial Trailblazer rows and their dependent data.
for(const [id,owner,seeded] of [['signal-004','editorial',1],['profile-8001','editorial',1],['visitor-retained','visitor',0]])sql.prepare('INSERT INTO astral_posts(id,owner,character,region,at,title,body,created,seeded) VALUES (?,?,?, ?,21,?,?,0,?)').run(id,owner,'8001','herta','Legacy title','Legacy body',seeded);
sql.prepare("INSERT INTO astral_comments VALUES ('legacy-comment','signal-004','visitor','8001','comment',21,0)").run();
sql.prepare("INSERT INTO astral_likes VALUES ('signal-004','visitor')").run();
({GET,POST}=await module(routeSource+'\nexport const migrationRun=1;'));
assert.equal((await get(0,'','visitor-retained')).status,200);
assert.equal((await get()).data.posts.length,seedPosts.length+1);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM astral_posts WHERE id IN ('signal-004','profile-8001')").get().n,0);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM astral_comments WHERE id='legacy-comment'").get().n,0);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM astral_likes WHERE post='signal-004'").get().n,0);
sql.prepare("DELETE FROM astral_posts WHERE id='visitor-retained'").run();
assert.equal((await get()).data.posts.length,seedPosts.length,'seed idempotence');
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
assert.equal((await get(2,switched.cookie,id)).data.comments.length,1);
assert.equal((await get(2,switched.cookie,id)).data.post.comments,1);
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
console.log('PASS: 83 profile assets, 81 non-Trailblazer authors covered, 32 timeline boundaries, idempotent initialization, anonymous sessions, same-character ownership isolation, identity switching, edits, seed protection, comments, visitor comments across all story points, likes, CSRF, cascades and request limiting.');
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
const free=await post({action:'save',region:'general',at:undefined,title:'Free discussion',body:'No region or time'},b.cookie,'free');assert.equal(free.status,200);
assert.equal((await get(0,'',free.data.id)).data.post.region,'general');
assert.equal((await post({action:'save',region:'notice',title:'Unauthorized',body:'No'},b.cookie,'notice-denied')).status,403);
assert.equal((await post({action:'save',id:free.data.id,region:'notice',title:'Unauthorized move',body:'No'},b.cookie,'notice-denied')).status,403);
const notice=await post({action:'save',region:'notice',at:undefined,title:'Announcement',body:'Welcome'},adminCookie,'notice');assert.equal(notice.status,200);
for(const point of [0,21])assert.equal((await get(point,'',notice.data.id)).status,200);
assert.equal((await post({action:'save',id:notice.data.id,region:'notice',title:'Updated',body:'New announcement'},adminCookie,'notice')).status,200);
assert.equal((await post({action:'delete',id:notice.data.id},b.cookie,'notice-denied')).status,403);
await post({action:'delete',id:notice.data.id},adminCookie,'notice');
await post({action:'delete',id:free.data.id},b.cookie,'free');

assert.equal((await get(21,adminCookie)).data.user.character,'__admin__');
assert.equal((await adminGet('posts',adminCookie)).status,200);
const visitor=await post({action:'select',character:'1001'},'','reporter');
const target=await post({action:'save',title:'Moderation target',body:'User content',region:'herta',at:21},visitor.cookie,'target');assert.equal(target.status,200);
assert.equal((await get(0,'',target.data.id)).status,200,'visitor post visible before its background date');
assert.ok((await get(0)).data.posts.some(p=>p.id===target.data.id));
assert.equal((await post({action:'like',id:target.data.id,liked:true,at:0},b.cookie,'early-like')).status,200);
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
// Media storage and notice visibility regression.
const objects=new Map();
globalThis.__env.MEDIA={put:async(key,data)=>{objects.set(key,data)},get:async key=>objects.has(key)?{body:objects.get(key)}:null,delete:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key)}};
const loginMedia=await post({action:'adminLogin',password:nextSecret},'','media-admin');assert.equal(loginMedia.status,200);
const mc=loginMedia.cookie;
const image='data:image/webp;base64,'+'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
const payload={images:[image]};
const mp=await post({action:'save',title:'Media test',body:'Image and video',region:'general',media:payload},mc,'media');assert.equal(mp.status,200,JSON.stringify(mp.data));
let md=(await get(0,mc,mp.data.id)).data.post;
assert.equal(md.media.video,undefined);assert.equal(md.media.images.length,1);assert.equal(objects.size,1);
const originalKey=md.media.images[0];
const served=await GET(new Request(origin+'/api/astral?image='+originalKey));assert.equal(served.status,200);assert.equal(served.headers.get('content-disposition'),'inline');
assert.equal((await post({action:'save',title:'Foreign image',body:'No',region:'general',media:md.media},b.cookie,'foreign')).status,400);
assert.equal((await post({action:'save',title:'Too many',body:'No',region:'general',media:{images:Array(6).fill(image),video:''}},mc,'media')).status,400);
assert.equal((await post({action:'save',title:'Bad video',body:'No',region:'general',media:{images:[],video:'https://evil.test/watch?v=dQw4w9WgXcQ'}},mc,'media')).status,400);
assert.equal((await post({action:'save',title:'Forged header',body:'No',region:'general',media:{images:['data:image/webp;base64,'+Buffer.from('RIFF0000WEBPVP8 <script>').toString('base64')]}},mc,'forged')).status,400);
assert.equal((await post({action:'save',title:'Bad image',body:'No',region:'general',media:{images:['data:image/webp;base64,SGVsbG8='],video:''}},mc,'media')).status,400);
const oversized='data:image/webp;base64,'+Buffer.concat([Buffer.from('RIFF0000WEBPVP8 '),Buffer.alloc(1048576)]).toString('base64');
assert.equal((await post({action:'save',title:'Large',body:'No',region:'general',media:{images:[oversized],video:''}},mc,'large')).status,400);
sql.prepare("INSERT INTO astral_media VALUES ('quota','none','none','quota',8000000000,?,0)").run(Date.now());
assert.equal((await post({action:'save',title:'Quota',body:'No',region:'general',media:payload},mc,'quota')).status,400);sql.prepare("DELETE FROM astral_media WHERE key='quota'").run();
const originalPut=globalThis.__env.MEDIA.put;globalThis.__env.MEDIA.put=async()=>{throw new Error('storage unavailable')};
assert.equal((await post({action:'save',title:'Failure',body:'No',region:'general',media:payload},mc,'failure')).status,400);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM astral_media WHERE committed=0').get().n,0);globalThis.__env.MEDIA.put=originalPut;
assert.equal((await post({action:'comment',id:mp.data.id,body:'Picture reply',media:payload},b.cookie,'media-reply')).status,200);
let cd=(await get(0,mc,mp.data.id)).data.comments[0];assert.equal(cd.media.images.length,1);
assert.equal((await post({action:'comment',id:mp.data.id,body:'Too many',media:{images:[image,image],video:''}},b.cookie,'media-reply')).status,400);
assert.equal((await post({action:'deleteComment',id:mp.data.id,commentId:cd.id},b.cookie,'media-reply')).status,200);assert.equal(objects.size,1);
assert.equal((await post({action:'save',id:mp.data.id,title:'Updated media',body:'Updated',region:'general',media:{images:md.media.images,video:''}},mc,'media')).status,200);assert.equal(objects.size,1);
assert.equal((await post({action:'save',id:mp.data.id,title:'Removed media',body:'Updated',region:'general',media:{images:[],video:''}},mc,'media')).status,200);assert.equal(objects.size,0);
assert.equal((await GET(new Request(origin+'/api/astral?image='+originalKey))).status,404);
const np=await post({action:'save',title:'Notice with image',body:'Notice',region:'notice',media:payload},mc,'notice-media');assert.equal(np.status,200);
assert.ok(!(await get()).data.posts.some(p=>p.id===np.data.id));
const nr=await GET(new Request(origin+'/api/astral?at=0&board=notice'));const nd=await nr.json();assert.ok(nd.posts.some(p=>p.id===np.data.id));assert.ok(nd.posts.every(p=>p.region==='notice'));
assert.equal((await post({action:'report',kind:'post',id:np.data.id,reason:'No notice reporting'},b.cookie,'notice-report')).status,403);
assert.equal((await post({action:'comment',id:np.data.id,body:'Notice reply'},b.cookie,'notice-reply')).status,200);
const nc=(await get(0,mc,np.data.id)).data.comments[0];assert.equal((await post({action:'report',kind:'comment',id:np.data.id,commentId:nc.id,reason:'Comment still reportable'},b.cookie,'notice-report')).status,200);
await post({action:'adminDelete',kind:'post',id:np.data.id},mc,'delete-media');assert.equal(objects.size,0);
delete globalThis.__env.MEDIA;
assert.equal((await post({action:'save',title:'No binding',body:'No',region:'general',media:payload},mc,'missing-bucket')).status,400);
assert.equal((await post({action:'save',title:'Video only',body:'Yes',region:'general',media:{images:[],video:'https://www.youtube.com/shorts/dQw4w9WgXcQ'}},mc,'video')).status,400);
console.log('PASS: notice-only feed, notice report denial, reply reports, image ownership, image/count/size validation, quota, upload failure cleanup, edits/deletes/moderation cleanup, private media serving, video attachment rejection, missing storage handling.');


// Expansion must preserve timeline gating while allowing every new profile.
for(const id of ['1501','1504','1505','1506','1507','1508','1509','1510','1512','1513']){
 assert.ok(characters.some(c=>c.id===id));
 const selected=await post({action:'select',character:id},'', 'expansion-'+id);assert.equal(selected.status,200);
}
for(const p of seedPosts.filter(p=>p.id.startsWith('v45-signal-'))){
 assert.notEqual((await get(p.at-1,'',p.id)).status,200);
 assert.equal((await get(p.at,'',p.id)).status,200);
}
assert.equal(checkpoints.length,32);
assert.equal(globalThis.__data.transmissionAt(31).character.id,'1512');
assert.equal(globalThis.__data.transmissionAt(0).character.id,'1013');
console.log('PASS: 4.5 character selection, editorial time gates, 32 checkpoints, dynamic banners');


{
// Account ownership, credential rotation and public names.
let accountRequest=0;
const accountPost=(body,cookie='')=>post(body,cookie,'account-test-'+(++accountRequest));
const readAccount=async cookie=>{const r=await GET(new Request(origin+'/api/astral?account=1',{headers:{cookie}}));return (await r.json()).account};
assert.equal(await readAccount(''),null);
const guest=await accountPost({action:'select',character:'8002'});
const guestPost=await accountPost({action:'save',region:'general',title:'Account migration',body:'Retain my ownership'},guest.cookie);
const reg=await accountPost({action:'accountRegister',username:'Captain_One',password:'Fixture-password-123'},guest.cookie);
assert.equal(reg.status,200);assert.match(reg.header,/HttpOnly; SameSite=Lax.*Secure/);
assert.equal((await readAccount(reg.cookie)).username,'captain_one');
assert.equal((await get(0,reg.cookie,guestPost.data.id)).data.post.owned,true);
assert.equal((await get(0,guest.cookie)).data.user,null,'guest token revoked after adoption');
const stored=sql.prepare('SELECT * FROM astral_accounts WHERE username=?').get('captain_one');
assert.notEqual(stored.password,'Fixture-password-123');assert.equal(stored.password.length,64);
assert.equal((await accountPost({action:'accountRegister',username:'CAPTAIN_ONE',password:'Another-password-123'})).status,409);
assert.equal((await accountPost({action:'accountLogin',username:'captain_one',password:'Wrong-password-123'})).status,401);
assert.equal((await accountPost({action:'accountNames',male:'A',female:'B'})).status,401);
assert.equal((await accountPost({action:'accountNames',male:'나의 카일',female:'나의 별'},reg.cookie)).status,200);
const publicNamed=(await get(0,'',guestPost.data.id)).data.post;
assert.equal(publicNamed.displayName,'나의 별');assert.ok(!JSON.stringify(publicNamed).includes('captain_one'));assert.ok(!('male' in publicNamed));assert.ok(!('owner' in publicNamed));
const other=await accountPost({action:'accountRegister',username:'captain_two',password:'Another-password-123'});
const otherPost=await accountPost({action:'save',region:'general',title:'Second owner',body:'Independent name'},other.cookie);
assert.equal((await get(0,reg.cookie,otherPost.data.id)).data.post.displayName,'스텔레');
assert.equal((await accountPost({action:'save',id:guestPost.data.id,region:'general',title:'Hijack',body:'No'},other.cookie)).status,403);
assert.equal((await accountPost({action:'select',character:'8001'},reg.cookie)).data.user.displayName,'나의 카일');
const reply=await accountPost({action:'comment',id:guestPost.data.id,body:'Public custom name'},reg.cookie);assert.equal(reply.status,200);
assert.equal((await get(0,'',guestPost.data.id)).data.comments[0].displayName,'나의 카일');
const second=await accountPost({action:'accountLogin',username:'CAPTAIN_ONE',password:'Fixture-password-123'});assert.equal(second.status,200);
assert.equal((await get(0,second.cookie,guestPost.data.id)).data.post.owned,true);
assert.equal((await accountPost({action:'accountCredentials',username:'changed_one',currentPassword:'Wrong-password-123',password:''},reg.cookie)).status,401);
assert.equal((await accountPost({action:'accountCredentials',username:'captain_two',currentPassword:'Fixture-password-123',password:''},reg.cookie)).status,409);
const rename=await accountPost({action:'accountCredentials',username:'changed_one',currentPassword:'Fixture-password-123',password:''},reg.cookie);assert.equal(rename.status,200);
assert.equal(await readAccount(second.cookie),null);assert.equal(await readAccount(reg.cookie),null);
assert.equal((await accountPost({action:'accountLogin',username:'captain_one',password:'Fixture-password-123'})).status,401);
assert.equal((await accountPost({action:'accountLogin',username:'changed_one',password:'Fixture-password-123'})).status,200);
const rotate=await accountPost({action:'accountCredentials',username:'changed_one',currentPassword:'Fixture-password-123',password:'New-fixture-password-456'},rename.cookie);assert.equal(rotate.status,200);
assert.equal(await readAccount(rename.cookie),null);
assert.equal((await accountPost({action:'accountLogin',username:'changed_one',password:'Fixture-password-123'})).status,401);
assert.equal((await accountPost({action:'accountLogin',username:'changed_one',password:'New-fixture-password-456'})).status,200);
await accountPost({action:'accountNames',male:'',female:''},rotate.cookie);
assert.equal((await get(0,'',guestPost.data.id)).data.post.displayName,'스텔레');
assert.equal((await get(0,'',guestPost.data.id)).data.comments[0].displayName,'카일루스');
await accountPost({action:'accountLogout'},rotate.cookie);assert.equal(await readAccount(rotate.cookie),null);
sql.prepare('UPDATE astral_users SET blocked=1 WHERE owner=?').run(stored.owner);
assert.equal((await accountPost({action:'accountLogin',username:'changed_one',password:'New-fixture-password-456'})).status,403);
const csrf=await POST(new Request(origin+'/api/astral',{method:'POST',headers:{origin:'https://other.test'},body:JSON.stringify({action:'accountRegister',username:'evil',password:'Fixture-password-123'})}));assert.equal(csrf.status,403);
let limited;for(let i=0;i<11;i++)limited=await post({action:'accountLogin',username:'missing_account',password:'Fixture-password-123'},'','account-rate');
assert.equal(limited.status,400);assert.match(limited.data.error,/잠시/);
console.log('PASS: account registration/adoption, hashing, login, private IDs, per-author names, cross-device ownership, credentials, duplicate IDs, session invalidation, logout, blocking, CSRF, rate limit');

}
// Cloudinary: use a deterministic mock service; never contact a real account.
{
 const savedFetch=globalThis.fetch,cloudObjects=new Map(),calls=[];
 Object.assign(globalThis.__env,{CLOUDINARY_CLOUD_NAME:'fixture-cloud',CLOUDINARY_API_KEY:'fixture-key',CLOUDINARY_API_SECRET:'fixture-secret'});
 let failUpload=false,failDelete=false;
 globalThis.fetch=async(url,options)=>{
  const u=new URL(url);calls.push(u);
  if(u.hostname==='res.cloudinary.com'){
   assert.equal(options.redirect,'manual','Cloudflare Workers does not support redirect:error');
   assert.ok(u.pathname.startsWith('/fixture-cloud/image/upload/astral/'));
   const id=u.pathname.split('/image/upload/')[1].replace(/\.webp$/,'');
   return cloudObjects.has(id)?new Response(cloudObjects.get(id),{headers:{'Content-Type':'image/webp'}}):new Response('',{status:404});
  }
  assert.equal(u.hostname,'api.cloudinary.com');assert.equal(options.method,'POST');
  const form=options.body;assert.equal(form.get('api_key'),'fixture-key');assert.equal(form.get('api_secret'),null);
  const entries=[...form.entries()].filter(([k])=>!['file','api_key','signature'].includes(k)).sort(([a],[b])=>a.localeCompare(b));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(entries.map(([k,v])=>`${k}=${v}`).join('&')+'fixture-secret'));
  assert.equal(form.get('signature'),Buffer.from(digest).toString('hex'));
  const id=form.get('public_id');assert.match(id,/^astral\/[0-9a-f-]{36}$/);
  if(u.pathname.endsWith('/upload')){
   if(failUpload)return Response.json({error:{message:'fixture-secret must not leak'}},{status:401});
   assert.equal(form.get('overwrite'),'false');assert.equal(form.get('file').type,'image/webp');
   cloudObjects.set(id,new Uint8Array(await form.get('file').arrayBuffer()));
   return Response.json({public_id:id,format:'webp'});
  }
  assert.ok(u.pathname.endsWith('/destroy'));assert.equal(form.get('invalidate'),'true');
  if(failDelete)return new Response('',{status:503});
  return Response.json({result:cloudObjects.delete(id)?'ok':'not found'});
 };
 let n=0;const send=(body,cookie)=>post(body,cookie,'cloud-'+n++);
 const owner=(await send({action:'select',character:'8002'})).cookie;
 const other=(await send({action:'select',character:'8001'})).cookie;
 const create=()=>send({action:'save',title:'Cloud image',body:'Image',region:'general',media:payload},owner);
 try{
  delete globalThis.__env.CLOUDINARY_API_SECRET;
  assert.equal((await get()).data.mediaEnabled,false);
  globalThis.__env.CLOUDINARY_API_SECRET='fixture-secret';
  assert.equal((await get()).data.mediaEnabled,true);
  const created=await create();assert.equal(created.status,200,JSON.stringify(created.data));
  const id=created.data.id,media=(await get(0,'',id)).data.post.media,key=media.images[0];
  assert.match(key,/^cld-/);assert.equal(cloudObjects.size,1);
  const read=await GET(new Request(origin+'/api/astral?image='+key));assert.equal(read.status,200);
  assert.equal(Buffer.from(await read.arrayBuffer()).toString('base64'),image.split(',')[1]);
  assert.equal((await send({action:'save',title:'Foreign',body:'Image',region:'general',media},other)).status,400);
  assert.equal((await send({action:'delete',id},other)).status,403);assert.equal(cloudObjects.size,1);
  const uploads=calls.filter(u=>u.pathname.endsWith('/upload')).length;
  assert.equal((await send({action:'save',id,title:'Kept',body:'Image',region:'general',media},owner)).status,200);
  assert.equal(calls.filter(u=>u.pathname.endsWith('/upload')).length,uploads,'retained image does not upload twice');
  assert.equal((await send({action:'comment',id,body:'Image comment',media:payload},other)).status,200);
  const reply=(await get(0,'',id)).data.comments[0];assert.equal(cloudObjects.size,2);
  await send({action:'deleteComment',id,commentId:reply.id},other);assert.equal(cloudObjects.size,1);
  failDelete=true;await send({action:'delete',id},owner);
  assert.equal((await GET(new Request(origin+'/api/astral?image='+key))).status,404);
  assert.ok(sql.prepare('SELECT 1 FROM astral_media WHERE key=?').get(key),'failed cleanup remains queued');
  failDelete=false;await send({action:'select',character:'8002'});
  assert.equal(cloudObjects.size,0);assert.equal(sql.prepare('SELECT 1 FROM astral_media WHERE key=?').get(key),undefined);
  failUpload=true;
  const failed=await create();assert.equal(failed.status,400);assert.ok(!JSON.stringify(failed.data).includes('fixture-secret'));
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM astral_media WHERE committed=0').get().n,0);
  failUpload=false;
  sql.prepare("INSERT INTO astral_media VALUES ('quota-cloud','none','none','quota',1000000000,?,0)").run(Date.now());
  assert.match((await create()).data.error,/1GB/);sql.prepare("DELETE FROM astral_media WHERE key='quota-cloud'").run();
  const visible=await create();assert.equal(visible.status,200);
  const admin=(await send({action:'adminLogin',password:nextSecret})).cookie;
  await send({action:'adminDelete',kind:'post',id:visible.data.id},admin);assert.equal(cloudObjects.size,0);
  console.log('PASS: Cloudinary signed upload/delivery/delete, partial settings, ownership, edits, replies, moderation, cleanup retry, failure rollback, secret redaction and quota');
 }finally{
  globalThis.fetch=savedFetch;
  for(const key of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])delete globalThis.__env[key];
 }
}


{
 const first=await GET(new Request(origin+'/api/astral?at=0&board=all'));
 const last=await GET(new Request(origin+'/api/astral?at=31&board=all'));
 const early=await first.json(),late=await last.json();
 assert.deepEqual(early.posts.map(p=>p.id),late.posts.map(p=>p.id),'all board ignores story point');
 assert.ok(early.posts.some(p=>p.seeded&&p.at===31));
 assert.ok(early.posts.every(p=>p.region!=='notice'),'notices stay in notices tab');
 const future=early.posts.find(p=>p.seeded&&p.at===31);
 assert.equal((await GET(new Request(origin+'/api/astral?at=0&board=all&id='+future.id))).status,200);
 assert.equal((await GET(new Request(origin+'/api/astral?at=0&board=herta&id='+future.id))).status,404);
 const token=crypto.randomUUID();
 const version=sql.prepare('SELECT version FROM astral_admin WHERE id=1').get().version;
 const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 sql.prepare('INSERT INTO astral_admin_sessions(token,expires,version) VALUES (?,?,?)').run(digest,Date.now()+60000,version);
 const cookie='astral_admin='+token;
 const read=async(section,suffix='')=>{const r=await GET(new Request(origin+'/api/astral?admin='+section+suffix,{headers:{cookie}}));assert.equal(r.status,200);return r.json()};
 const users=await read('users');
 assert.equal(users.total,sql.prepare('SELECT COUNT(*) AS n FROM astral_accounts').get().n);
 assert.ok(users.rows.length>0);assert.ok(users.rows.every(r=>r.username&&!('password' in r)&&!('salt' in r)));
 const filtered=await read('users','&q='+encodeURIComponent(users.rows[0].username));assert.ok(filtered.rows.some(r=>r.owner===users.rows[0].owner));
 assert.equal((await GET(new Request(origin+'/api/astral?admin=comments'))).status,401);
 const sample=sql.prepare('SELECT owner,character FROM astral_users LIMIT 1').get();
 const cid=crypto.randomUUID();
 sql.prepare('INSERT INTO astral_comments(id,post,owner,character,body,at,created) VALUES (?,?,?,?,?,?,?)').run(cid,future.id,sample.owner,sample.character,'moderation fixture unique',31,Date.now());
 const comments=await read('comments','&q=moderation%20fixture%20unique');
 assert.equal(comments.total,1);assert.equal(comments.rows[0].post,future.id);assert.equal(comments.rows[0].title,future.title);
 assert.equal((await post({action:'adminDelete',kind:'comment',id:cid},cookie,'moderation-fixture')).status,200);
 assert.equal((await read('comments','&q=moderation%20fixture%20unique')).total,0);
 for(const c of characters){assert.ok(globalThis.__data.characterRegions[c.id].length);for(const r of globalThis.__data.characterRegions[c.id])assert.ok(regions.some(x=>x.id===r));}
 console.log('PASS: timeless all feed/detail, region gates retained, notice isolation, account-only admin list/search without credentials, protected comment list and deletion, region roster coverage');
}

sql.close();
