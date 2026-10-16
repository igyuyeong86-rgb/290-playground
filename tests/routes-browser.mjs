import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
const base='http://127.0.0.1:5187';const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/board/belobog?at=5');await page.locator('.post-card').first().waitFor();assert.equal(await page.getByLabel('스토리 시점',{exact:true}).inputValue(),'5');
 const link=await page.locator('.post-card').first().getAttribute('href');const title=await page.locator('.post-card h3').first().innerText();await page.locator('.post-card').first().click();await page.locator('.detail-card').waitFor();assert.equal(new URL(page.url()).pathname,new URL(link,base).pathname);
 await page.reload();await page.locator('.detail-card').waitFor();assert.equal(await page.locator('.detail-card h1').innerText(),title);
 await page.goBack();await page.locator('.post-card').first().waitFor();assert.equal(new URL(page.url()).pathname,'/board/belobog');
 const fresh=await browser.newPage();await fresh.goto(base+link);await fresh.locator('.detail-card').waitFor();assert.equal(await fresh.locator('.detail-card h1').innerText(),title);await fresh.close();
 await page.goto(base+'/posts/story-expansion-21?at=0');await page.getByRole('heading',{name:'게시글을 볼 수 없어요'}).waitFor();assert.equal(await page.locator('.detail-card').count(),0);
 await page.getByLabel('스토리 시점',{exact:true}).selectOption('21');await page.locator('.detail-card').waitFor();assert.match(page.url(),/at=21/);
 await page.goto(base+'/posts/nonexistent?at=21');await page.getByRole('heading',{name:'게시글을 볼 수 없어요'}).waitFor();await page.getByRole('button',{name:'게시판으로 돌아가기'}).click();await page.locator('.post-card').first().waitFor();assert.equal(new URL(page.url()).pathname,'/board');
 await page.goto(base+'/notices');await page.locator('.feed-heading h2').waitFor();assert.match(await page.locator('.feed-heading h2').innerText(),/공지/);
 const bad=await page.goto(base+'/board/not-a-world');assert.equal(bad.status(),404);await page.getByRole('heading',{name:'페이지를 찾을 수 없어요'}).waitFor();
 await context.request.post(base+'/api/astral',{headers:{origin:base},data:{action:'select',character:'8002'}});
 await page.goto(base+'/board?at=0');await page.getByRole('button',{name:'글쓰기',exact:true}).click();await page.locator('dialog input[name=title]').fill('주소 이동 테스트');await page.locator('dialog textarea[name=body]').fill('작성 후 고유 주소 확인');await page.getByRole('button',{name:'신호 보내기',exact:true}).click();await page.locator('.detail-card').waitFor();assert.match(new URL(page.url()).pathname,/^\/posts\//);
 await page.getByRole('button',{name:'삭제',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'삭제하기',exact:true}).click();await page.waitForURL(/\/board\?at=0/);
 assert.deepEqual(errors,[]);console.log('PASS: regional route, post links, refresh, back, fresh-browser sharing, timeline gate, missing post, notices route, invalid-board 404, create/delete URL transitions.');
}finally{await browser.close()}
