import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
import {mkdirSync} from 'node:fs';
const base='http://127.0.0.1:5185';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let id;const context=await browser.newContext({viewport:{width:1440,height:1050}});
async function post(body){const r=await context.request.post(base+'/api/astral',{headers:{origin:base},data:body});assert.equal(r.status(),200,await r.text());return r.json()}
try{
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('.post-card').first().waitFor();assert.equal(await page.getByText('헤르타 · 창작 메시지',{exact:true}).count(),0);assert.equal(await page.locator('.post-type').filter({hasText:'창작'}).count(),0);
 await page.getByLabel('스토리 시점',{exact:true}).selectOption('0');await page.getByLabel('게시글 검색').fill('실패한 실험 기록도 보내');await page.getByText('수신된 이야기가 없어요').waitFor();
 await page.getByLabel('스토리 시점',{exact:true}).selectOption('1');await page.getByRole('heading',{name:'실패한 실험 기록도 보내',exact:true}).click();await page.locator('.detail-card').waitFor();
 assert.ok(!(await page.locator('.detail-card').innerText()).includes('창작'));await page.getByRole('button',{name:'게시판으로 돌아가기'}).click();
 await post({action:'select',character:'8002'});id=(await post({action:'save',region:'planarcadia',at:21,title:'시점 무관 이용자 글 검증',body:'모든 스토리 시점에서 보이는 방문자 글'})).id;
 await post({action:'comment',id,at:21,body:'나중 시점에서 작성한 이용자 댓글'});
 await page.reload({waitUntil:'networkidle'});await page.getByLabel('스토리 시점',{exact:true}).selectOption('0');await page.getByLabel('게시글 검색').fill('시점 무관 이용자 글 검증');await page.getByRole('heading',{name:'시점 무관 이용자 글 검증',exact:true}).click();
 await page.getByText('모든 시점 공개',{exact:true}).waitFor();await page.getByText('나중 시점에서 작성한 이용자 댓글',{exact:true}).waitFor();
 await page.getByRole('button',{name:'게시판으로 돌아가기'}).click();await page.getByLabel('게시글 검색').fill('');await page.getByLabel('스토리 시점',{exact:true}).selectOption('21');
 mkdirSync('outputs/story-qa',{recursive:true});await page.screenshot({path:'outputs/story-qa/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/story-qa/mobile.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: story unlock/search, no creation labels in banner/list/detail, visitor post and comment visible at earlier story point, desktop/mobile no overflow.');
}finally{if(id)await post({action:'delete',id,at:0});await browser.close()}
