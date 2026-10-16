 'use client';
import {useRef,useState} from 'react';
export type Media={images:string[]};
export const emptyMedia=():Media=>({images:[]});
const imageUrl=(key:string)=>key.startsWith('data:')?key:'/api/astral?image='+encodeURIComponent(key);
async function compress(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('JPG, PNG, WebP 이미지만 가능하며 원본은 20MB 이하여야 합니다.');
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(file.type==='image/png'&&png||file.type==='image/jpeg'&&jpeg||file.type==='image/webp'&&webp))throw new Error('실제 JPG, PNG, WebP 이미지 파일만 첨부할 수 있습니다.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file)}catch{throw new Error('이미지를 읽을 수 없습니다. 정상적인 JPG, PNG, WebP 파일을 선택해 주세요.')}
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
 const picker=useRef<HTMLInputElement>(null);
 return <fieldset className="media-editor" disabled={disabled||processing}><legend>이미지 첨부</legend>
 <button type="button" className="outline-button add-image-button" disabled={!enabled||value.images.length>=max} onClick={()=>picker.current?.click()}>＋ 이미지 첨부</button>
 <input ref={picker} aria-label={`이미지 선택 (최대 ${max}장)`} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple={max>1} disabled={!enabled||value.images.length>=max} onChange={async e=>{
 const files=Array.from(e.target.files||[]);e.target.value='';setError('');if(files.length+value.images.length>max){setError(`이미지는 최대 ${max}장까지 첨부할 수 있어요.`);return}
 setProcessing(true);onProcessing?.(true);try{const results:string[]=[];for(const file of files)results.push(await compress(file));onChange({...value,images:[...value.images,...results]})}catch(e){setError((e as Error).message)}finally{setProcessing(false);onProcessing?.(false)}
 }}/>
 <small>{processing?'이미지를 압축하고 있어요…':enabled?'JPG · PNG · WebP만 허용 · 장당 최대 1MB로 자동 압축 · 게시글에서 바로 보기':'이미지 저장소 연결 준비 중입니다. 글은 그대로 작성할 수 있어요.'}</small>
 <div className="media-previews">{value.images.map((key,i)=><div key={i}><img src={imageUrl(key)} alt={`첨부 이미지 ${i+1}`}/><button type="button" aria-label={`이미지 ${i+1} 제거`} onClick={()=>onChange({...value,images:value.images.filter((_,j)=>j!==i)})}>제거</button></div>)}</div>
 {error&&<p role="alert" className="form-error">{error}</p>}
 </fieldset>
}
export function MediaView({media}:{media?:Media}){
 const viewer=useRef<HTMLDialogElement>(null),[selected,setSelected]=useState(0);
 if(!media)return null;
 return <div className="attached-media"><div className="attached-images">{media.images.map((key,i)=><button type="button" key={key} onClick={()=>{setSelected(i);viewer.current?.showModal()}} aria-label={`첨부 이미지 ${i+1} 크게 보기`}><img src={imageUrl(key)} alt={`첨부 이미지 ${i+1}`} loading="lazy"/></button>)}</div>
 <dialog ref={viewer} className="image-viewer" aria-label="첨부 이미지 확대 보기" onClick={e=>{if(e.target===e.currentTarget)viewer.current?.close()}}>
  <button type="button" className="image-viewer-close" autoFocus onClick={()=>viewer.current?.close()}>닫기 ×</button>
  {media.images[selected]&&<img src={imageUrl(media.images[selected])} alt={`확대한 첨부 이미지 ${selected+1}`}/>}
 </dialog>
 </div>
}
