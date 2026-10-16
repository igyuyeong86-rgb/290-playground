import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:5188';
try{
 await page.goto(base+'/board/astropolis?at=31');
 await page.locator('.post-card').first().waitFor();
 assert.equal(await page.locator('.post-card').count(),5);
 assert.equal(await page.getByLabel('스토리 시점',{exact:true}).locator('option').count(),32);
 assert.equal(await page.locator('.hero-herta').getAttribute('alt'),'로빈·서머레토 캐릭터 일러스트');
 await page.waitForFunction(()=>[...document.images].filter(i=>i.getBoundingClientRect().height>0).every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:'outputs/expansion45-desktop.png',fullPage:true});
 await page.getByLabel('스토리 시점',{exact:true}).selectOption('21');
 await page.getByRole('heading',{name:'아직 도착하지 않은 세계예요'}).waitFor();
 await page.goto(base+'/posts/v45-signal-28?at=31');await page.locator('.detail-card').waitFor();
 await page.goto(base+'/posts/v45-signal-28?at=30');await page.getByRole('heading',{name:'게시글을 볼 수 없어요'}).waitFor();
 const response=await page.request.post(base+'/api/astral',{headers:{origin:base},data:{action:'select',character:'1513'}});assert.equal(response.status(),200);
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/board/astropolis?at=31');await page.locator('.post-card').first().waitFor();
 assert.ok((await page.locator('.profile-button').innerText()).includes('어벤츄린·웨이브'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'outputs/expansion45-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 4.5 board, 32 choices, portraits, time gate, deep links, new identity, mobile overflow, browser errors');
}finally{await browser.close()}
