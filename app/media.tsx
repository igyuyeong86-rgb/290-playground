 'use client';
import {useState} from 'react';
export type Media={images:string[];video:string};
export const emptyMedia=():Media=>({images:[],video:''});
const imageUrl=(key:string)=>key.startsWith('data:')?key:'/api/astral?image='+encodeURIComponent(key);
async function compress(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('JPG, PNG, WebP 이미지만 가능하며 원본은 20MB 이하여야 합니다.');
 const bitmap=await createImageBitmap(file);
 try{
 if(bitmap.width*bitmap.height>40000000)throw new Error('이미지 해상도가 너무 큽니다. 4천만 화소 이하로 줄여 주세요.');
 let scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 for(let round=0;round<4;round++){
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.82-round*0.12));
 if(blob&&blob.type==='image/webp'&&blob.size<=1048576)return await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('이미지를 읽지 못했습니다.'));r.readAsDataURL(blob)});
 scale*=0.75;
 }throw new Error('이미지를 1MB 이하로 압축하지 못했어요. 더 작은 이미지를 선택해 주세요.');
 }finally{bitmap.close()}
}
export function MediaEditor({value,onChange,max=5,disabled=false,enabled=true,onProcessing}:{value:Media;onChange:(m:Media)=>void;max?:number;disabled?:boolean;enabled?:boolean;onProcessing?:(b:boolean)=>void}){
 const [processing,setProcessing]=useState(false),[error,setError]=useState('');
 return <fieldset className="media-editor" disabled={disabled||processing}><legend>이미지 · 영상 첨부</legend>
 <label>이미지 (최대 {max}장)<input type="file" accept="image/jpeg,image/png,image/webp" multiple={max>1} disabled={!enabled||value.images.length>=max} onChange={async e=>{
 const files=Array.from(e.target.files||[]);e.target.value='';setError('');if(files.length+value.images.length>max){setError(`이미지는 최대 ${max}장까지 첨부할 수 있어요.`);return}
 setProcessing(true);onProcessing?.(true);try{const results:string[]=[];for(const file of files)results.push(await compress(file));onChange({...value,images:[...value.images,...results]})}catch(e){setError((e as Error).message)}finally{setProcessing(false);onProcessing?.(false)}
 }}/></label>
 <small>{processing?'이미지를 압축하고 있어요…':enabled?'긴 변 1,920px · 장당 최대 1MB로 자동 압축 · 등록할 때 업로드':'이미지 저장소 연결 준비 중입니다. 영상 링크는 사용할 수 있어요.'}</small>
 <div className="media-previews">{value.images.map((key,i)=><div key={i}><img src={imageUrl(key)} alt={`첨부 이미지 ${i+1}`}/><button type="button" aria-label={`이미지 ${i+1} 제거`} onClick={()=>onChange({...value,images:value.images.filter((_,j)=>j!==i)})}>제거</button></div>)}</div>
 <label>유튜브 영상 링크<input type="url" value={value.video&&/^[A-Za-z0-9_-]{11}$/.test(value.video)?'https://www.youtube.com/watch?v='+value.video:value.video} onChange={e=>onChange({...value,video:e.target.value})} maxLength={2048} placeholder="https://www.youtube.com/watch?v=…"/></label>
 <small>영상은 링크로 첨부합니다. 영상 파일은 업로드하지 않습니다.</small>{error&&<p role="alert" className="form-error">{error}</p>}
 </fieldset>
}
export function MediaView({media}:{media?:Media}){
 const [playing,setPlaying]=useState(false);
 if(!media)return null;
 return <div className="attached-media"><div className="attached-images">{media.images.map((key,i)=><a key={key} href={imageUrl(key)} target="_blank" rel="noopener noreferrer" aria-label={`첨부 이미지 ${i+1} 크게 보기`}><img src={imageUrl(key)} alt={`첨부 이미지 ${i+1}`} loading="lazy"/></a>)}</div>
 {media.video&&/^[A-Za-z0-9_-]{11}$/.test(media.video)&&<div className="attached-video">{playing?<iframe title="첨부한 유튜브 영상" src={'https://www.youtube-nocookie.com/embed/'+media.video} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button type="button" className="outline-button" onClick={()=>setPlaying(true)}>▶ 유튜브 영상 불러오기</button>}<a href={'https://www.youtube.com/watch?v='+media.video} target="_blank" rel="noopener noreferrer">유튜브에서 보기</a></div>}
 </div>
}
