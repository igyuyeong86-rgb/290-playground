import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
import {readFileSync,mkdirSync} from 'node:fs';
const base='http://127.0.0.1:5186';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function api(body){const r=await ctx.request.post(base+'/api/astral',{headers:{origin:base},data:{at:0,...body}});assert.equal(r.status(),200,await r.text());return r.json()}
let postId,noticeId;
try{
 await page.goto(base,{waitUntil:'networkidle'});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2200;c.height=1200;const x=c.getContext('2d');x.fillStyle='#a98d59';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1]});
 await api({action:'select',character:'8002'});await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'글쓰기',exact:true}).click();
 await page.locator('dialog input[name=title]').fill('첨부 기능 브라우저 검증');await page.locator('dialog textarea[name=body]').fill('이미지와 유튜브 링크 확인');
 await page.locator('dialog input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.locator('dialog .media-previews img').waitFor();
 await page.getByLabel('유튜브 영상 링크',{exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');
 await page.getByRole('button',{name:'신호 보내기',exact:true}).click();await page.locator('.detail-card h1').filter({hasText:'첨부 기능 브라우저 검증'}).waitFor();
 const image=page.locator('.detail-card>.attached-media img');await image.waitFor();await image.evaluate(img=>img.decode());assert.ok(await image.evaluate(img=>img.naturalWidth<=1920));
 const list=await (await ctx.request.get(base+'/api/astral?at=0')).json();postId=list.posts.find(p=>p.title==='첨부 기능 브라우저 검증').id;
 await page.getByRole('button',{name:'유튜브 영상 불러오기'}).click();assert.match(await page.locator('iframe').getAttribute('src'),/youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
 await page.locator('#reply').fill('이미지 댓글 검증');await page.locator('.reply-form input[type=file]').setInputFiles({name:'reply.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('.reply-form .media-previews img').waitFor();await page.getByRole('button',{name:'답장 보내기'}).click();await page.locator('.comment .attached-images img').waitFor();
 mkdirSync('outputs/media-qa',{recursive:true});await page.screenshot({path:'outputs/media-qa/desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/media-qa/mobile.png'});
 const secret=readFileSync('.dev.vars','utf8').match(/ADMIN_INITIAL_PASSWORD\s*=\s*"?([^"\r\n]+)/)[1];await api({action:'adminLogin',password:secret});
 noticeId=(await api({action:'save',title:'공지 전용 검증',body:'공지 내용',region:'notice',media:{images:[],video:''}})).id;
 await page.setViewportSize({width:1440,height:1000});await page.reload({waitUntil:'networkidle'});await page.getByLabel('게시글 검색').fill('공지 전용 검증');assert.equal(await page.locator('.post-card').count(),0);
 await page.locator('.sidebar').getByRole('button',{name:'공지',exact:true}).click();await page.getByRole('heading',{name:'공지 전용 검증',exact:true}).click();await page.locator('.detail-card').waitFor();assert.equal(await page.getByRole('button',{name:'게시글 신고',exact:true}).count(),0);
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: browser image compression/upload/render, YouTube embed, comment image, mobile overflow, notice-only list and no report button.');
}finally{if(noticeId)await api({action:'delete',id:noticeId});if(postId)await api({action:'adminDelete',kind:'post',id:postId});await browser.close()}
