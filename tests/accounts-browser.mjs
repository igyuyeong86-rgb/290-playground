import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1360,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:5189',username='qa_'+Date.now(),updated=username+'_n',password='Browser-fixture-123';
try{
 await page.goto(base+'/login');await page.getByRole('button',{name:'처음 오셨나요? · 회원가입'}).click();
 await page.getByLabel('아이디',{exact:true}).fill(username);await page.getByLabel('비밀번호',{exact:true}).fill(password);
 await page.getByRole('button',{name:'계정 만들기'}).click();await page.waitForURL('**/account');await page.getByLabel('남자 개척자 이름').waitFor();
 await page.getByLabel('남자 개척자 이름').fill('은하의 카일');await page.getByLabel('여자 개척자 이름').fill('나만의 스텔레');await page.getByRole('button',{name:'이름 저장'}).click();await page.getByRole('status').filter({hasText:'개척자 이름을 저장'}).waitFor();
 await page.reload();await page.getByLabel('여자 개척자 이름').waitFor();assert.equal(await page.getByLabel('여자 개척자 이름').inputValue(),'나만의 스텔레');
 await page.screenshot({path:'outputs/account-desktop.png',fullPage:true});
 await page.goto(base+'/board?at=31');await page.locator('.post-card').first().waitFor();assert.match(await page.locator('.profile-button').innerText(),/나만의 스텔레/);
 await page.getByRole('button',{name:'글쓰기',exact:true}).click();await page.locator('dialog input[name=title]').fill('계정 이름 브라우저 검사');await page.locator('dialog textarea[name=body]').fill('테스트 후 삭제할 게시물입니다.');await page.getByRole('button',{name:'신호 보내기',exact:true}).click();await page.locator('.detail-card').waitFor();
 const postURL=page.url();assert.equal(await page.locator('.author-line b').innerText(),'나만의 스텔레');
 const guest=await browser.newContext();const guestPage=await guest.newPage();await guestPage.goto(postURL);await guestPage.locator('.detail-card').waitFor();assert.equal(await guestPage.locator('.author-line b').innerText(),'나만의 스텔레');assert.equal(await guestPage.getByRole('button',{name:'수정',exact:true}).count(),0);await guest.close();
 await page.goto(base+'/account');await page.getByLabel('현재 비밀번호').waitFor();await page.getByLabel('아이디',{exact:true}).fill(updated);await page.getByLabel('현재 비밀번호').fill(password);await page.getByLabel('새 비밀번호').fill(password+'-new');await page.getByRole('button',{name:'로그인 정보 변경'}).click();await page.getByRole('status').filter({hasText:'로그인 정보를 변경'}).waitFor();
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.waitForURL('**/login');await page.getByLabel('아이디',{exact:true}).fill(updated);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('alert').waitFor();
 await page.getByLabel('비밀번호',{exact:true}).fill(password+'-new');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.waitForURL('**/account');await page.getByLabel('여자 개척자 이름').waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/account-mobile.png',fullPage:true});
 await page.goto(postURL);await page.locator('.detail-card').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'삭제',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'삭제하기',exact:true}).click();await page.waitForURL(/\/board\?at=31/);
 assert.deepEqual(errors,[]);console.log('PASS: signup, saved personal names, public author name, ownership, credential change, logout, old password rejection, new login, mobile layout');
}finally{await browser.close()}
