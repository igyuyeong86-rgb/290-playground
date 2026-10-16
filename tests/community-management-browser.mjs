import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
const base='http://127.0.0.1:5189';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const fixture={id:'future-fixture',character:'1512',region:'astropolis',at:31,title:'미래 시점 테스트 글',body:'검증용 글',created:1,seeded:1,owned:false,likes:0,comments:0,memes:[]};
let deleted=false;
await page.route('**/api/astral**',async route=>{
 const req=route.request(),url=new URL(req.url()),section=url.searchParams.get('admin');
 if(req.method()==='POST'){const b=req.postDataJSON();assert.equal(b.action,'adminDelete');assert.equal(b.kind,'comment');assert.equal(b.id,'fixture-comment');deleted=true;return route.fulfill({json:{ok:true}})}
 if(section){return route.fulfill({json:section==='session'?{admin:true}:section==='users'?{rows:[{owner:'fixture-owner',username:'test_account',character:'8002',created:1,seen:2,blocked:0,posts:1,comments:1}],total:1}:section==='comments'?{rows:deleted?[]:[{id:'fixture-comment',post:fixture.id,owner:'fixture-owner',username:'test_account',character:'8002',body:'관리할 댓글',title:fixture.title,created:1}],total:deleted?0:1}:{rows:[],total:0}})}
 return route.fulfill({json:url.searchParams.has('id')?{post:fixture,comments:[],liked:false}:{posts:Number(url.searchParams.get('at'))>=31?[fixture]:[],user:{character:'8002'},mediaEnabled:false}});
});
try{
 await page.goto(base+'/board?at=0');await page.getByRole('heading',{name:fixture.title,exact:true}).waitFor();
 assert.equal(await page.getByLabel('스토리 시점',{exact:true}).count(),0);
 assert.match(await page.locator('.post-card').first().getAttribute('href'),/at=0/);
 await page.locator('.post-card').first().click();await page.locator('.detail-card').waitFor();
 await page.goto(base+'/board?at=0');await page.getByRole('heading',{name:fixture.title,exact:true}).waitFor();
 await page.getByRole('button',{name:'캐릭터 바꾸기',exact:true}).click();
 const select=page.getByLabel('캐릭터 지역');await select.waitFor();assert.equal(await select.locator('option').count(),8);
 await select.selectOption('belobog');assert.ok(await page.locator('.roster').getByText('브로냐',{exact:true}).count());assert.equal(await page.locator('.roster').getByText('헤르타',{exact:true}).count(),0);
 await page.keyboard.press('Escape');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['herta','belobog','luofu','penacony','amphoreus','planarcadia','astropolis']){
   await page.goto(base+'/board/'+id+'?at=0');await page.locator('.hero-herta').evaluate(img=>img.decode());
   assert.equal(await page.getByLabel('스토리 시점',{exact:true}).count(),1);
   const picture=await page.locator('.hero-herta').boundingBox(),speech=await page.locator('.hero-transmission').boundingBox(),hero=await page.locator('.hero').boundingBox();
   assert.ok(picture.width>=390,'original large portrait restored');if(width>760){assert.ok(speech.width>=280,'readable speech width');assert.ok(speech.y>=hero.y&&speech.y+speech.height<=hero.y+hero.height+1,'speech inside banner');assert.ok(Number.parseFloat(await page.locator('.hero-transmission p').evaluate(e=>getComputedStyle(e).fontSize))>=14);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
   if(['herta','penacony','amphoreus','astropolis'].includes(id))await page.screenshot({path:'.wrangler/banner-'+id+'-'+width+'.png'});
  }
 }
 await page.setViewportSize({width:1200,height:900});await page.goto(base+'/admin');
 await page.getByRole('button',{name:'사용자 관리',exact:true}).click();await page.getByText('test_account',{exact:true}).waitFor();
 await page.getByRole('button',{name:'작성한 댓글 보기',exact:true}).click();await page.locator('.admin-row summary').filter({hasText:'관리할 댓글'}).waitFor();
 assert.ok((await page.getByRole('link',{name:'원문 보기'}).getAttribute('href')).includes(fixture.id));
 page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'관리 테스트':undefined));await page.getByRole('button',{name:'댓글 삭제',exact:true}).click();await page.getByText('표시할 항목이 없습니다.',{exact:true}).waitFor();assert.equal(deleted,true);
 assert.deepEqual(errors,[]);
 console.log('PASS: timeless feed/detail links, hidden time controls, regional filters, 7 restored large banners at desktop/mobile without overflow and readable desktop speech, account management and comment deletion UI');
}finally{await browser.close()}
