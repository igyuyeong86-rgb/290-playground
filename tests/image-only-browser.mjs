import {chromium} from 'file:///C:/Users/igyuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
const base='http://127.0.0.1:5189';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let saved;
try{
 await page.goto(base);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');x.fillStyle='#bfa575';x.fillRect(0,0,320,180);return c.toDataURL('image/png')});
 const post={id:'image-browser-fixture',character:'8002',region:'general',at:0,title:'이미지 전용 검증',body:'미리보기',created:Date.now(),seeded:0,owned:true,likes:0,comments:0,memes:[],media:{images:[png],video:'dQw4w9WgXcQ'}};
 await page.route('**/api/astral?**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='POST'){saved=req.postDataJSON();return route.fulfill({json:{id:post.id}})}
  return route.fulfill({json:url.searchParams.has('id')?{post,comments:[],liked:false}:{posts:[post],user:{character:'8002'},mediaEnabled:true}});
 });
 await page.goto(base+'/posts/'+post.id+'?at=0');
 const inline=page.locator('.detail-card .attached-images img').first();await inline.waitFor();await inline.evaluate(img=>img.decode());
 assert.equal(await page.locator('iframe').count(),0);
 assert.equal(await page.getByText('유튜브 영상 불러오기').count(),0);
 const viewer=page.getByRole('dialog',{name:'첨부 이미지 확대 보기'});
 await page.getByRole('button',{name:'첨부 이미지 1 크게 보기',exact:true}).click();await viewer.waitFor();
 assert.equal(page.url(),base+'/posts/'+post.id+'?at=0');assert.equal(page.context().pages().length,1);
 await page.keyboard.press('Escape');assert.equal(await viewer.isVisible(),false);
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'첨부 이미지 1 크게 보기',exact:true}).click();await viewer.waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await viewer.getByRole('button',{name:'닫기 ×'}).click();
 await page.goto(base+'/board?at=0');
 await page.getByRole('heading',{name:post.title,exact:true}).waitFor();
 await page.getByRole('button',{name:'글쓰기',exact:true}).click();
 const editor=page.locator('dialog[open]');await editor.getByRole('heading',{name:'새로운 이야기를 남겨요'}).waitFor();
 assert.equal(await editor.locator('input[type=url]').count(),0);
 const input=editor.locator('input[type=file]');assert.equal(await input.isVisible(),false);
 const [chooser]=await Promise.all([page.waitForEvent('filechooser'),editor.getByRole('button',{name:'＋ 이미지 첨부',exact:true}).click()]);
 await chooser.setFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<script>alert(1)</script>')});
 await editor.getByRole('alert').filter({hasText:'실제 JPG'}).waitFor();
 assert.equal(await editor.locator('.media-previews img').count(),0);
 await input.setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
 await editor.locator('.media-previews img').waitFor();
 await editor.locator('input[name=title]').fill('이미지 전용 검증');await editor.locator('textarea[name=body]').fill('이미지');
 await editor.getByRole('button',{name:'신호 보내기',exact:true}).click();
 await page.waitForURL('**/posts/image-browser-fixture**');
 assert.equal(saved.media.video,undefined);assert.ok(saved.media.images[0].startsWith('data:image/webp;base64,'));
 assert.deepEqual(errors,[]);
 console.log('PASS: inline display, same-page enlargement, Escape/close, mobile layout, plus file picker, fake PNG rejection, WebP preview/submission, removed legacy video rendering');
}finally{await browser.close()}
