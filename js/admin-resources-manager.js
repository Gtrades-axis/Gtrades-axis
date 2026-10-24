import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';
import { collection, addDoc, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js';

const R2 = document.querySelector('meta[name="r2-worker-endpoint"]')?.content || 'https://r2-uploader.davidthuku574.workers.dev';
const $ = id => document.getElementById(id);
let selected = [];
let currentUser = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const safe = s => String(s||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
function notice(msg,type='ok'){const n=$('notice');n.className=`notice show ${type}`;n.textContent=msg;setTimeout(()=>n.classList.remove('show'),5000)}
function renderFiles(){ $('fileList').innerHTML = selected.map((f,i)=>`<div class="file-row"><strong>${esc(f.name)}</strong><div>${(f.size/1024/1024).toFixed(2)} MB</div><div class="progress"><div class="bar" id="bar-${i}"></div></div><div class="status" id="status-${i}">Ready</div></div>`).join(''); }
$('drop').onclick=()=> $('files').click();
$('files').onchange=e=>{ selected=[...e.target.files]; renderFiles(); };
$('clearBtn').onclick=()=>{selected=[];$('files').value='';renderFiles()};

function uploadFile(file,key,i){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('POST',`${R2.replace(/\/+$/,'')}/upload`,true);x.upload.onprogress=e=>{if(e.lengthComputable)$(`bar-${i}`).style.width=`${e.loaded/e.total*100}%`};x.onload=()=>{if(x.status>=200&&x.status<300){try{const r=x.responseText?JSON.parse(x.responseText):{};if(r.success===false)throw new Error(r.error||'Upload service rejected the file');resolve(r)}catch(err){reject(err)}}else reject(new Error(`Upload failed HTTP ${x.status}: ${x.responseText||''}`))};x.onerror=()=>reject(new Error('The upload could not be completed. Check your connection and try again.'));const fd=new FormData();fd.append('file',file);fd.append('key',key);fd.append('type','resource');fd.append('contentType',file.type||'application/octet-stream');x.send(fd)});}

$('uploadBtn').onclick=async()=>{
 if(!selected.length){notice('Choose at least one file to upload.','err');return}
 const btn=$('uploadBtn');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Uploading…';
 try{
  for(let i=0;i<selected.length;i++){
   const file=selected[i], status=$(`status-${i}`); status.textContent='Uploading…';
   try{
    const key=`resources/${Date.now()}-${i}-${safe(file.name)}`;
    const res=await uploadFile(file,key,i); const finalKey=res.key||key;
    const premium=$('access').value==='premium'; const published=$('published').value==='true';
    const baseTitle=$('title').value.trim();
    await addDoc(collection(db,'resources'),{
      title: selected.length===1 && baseTitle ? baseTitle : (baseTitle ? `${baseTitle} - ${file.name.replace(/\.[^.]+$/,'')}` : file.name.replace(/\.[^.]+$/,'')),
      name:file.name.replace(/\.[^.]+$/,''), description:$('description').value.trim(), category:$('category').value.trim()||'General',
      type:$('type').value, access:$('access').value, premiumOnly:premium, premium, published, status:published?'published':'draft',
      fileName:file.name, originalFileName:file.name, mimeType:file.type||'application/octet-stream', size:file.size,
      fileKey:finalKey, resourceKey:finalKey, resourceUrl:`${R2.replace(/\/+$/,'')}/?key=${encodeURIComponent(finalKey)}`, url:`${R2.replace(/\/+$/,'')}/?key=${encodeURIComponent(finalKey)}`,
      createdAt:serverTimestamp(), uploadedAt:serverTimestamp(), updatedAt:serverTimestamp(), uploadedBy:currentUser.uid, uploadedByEmail:currentUser.email||''
    });
    $(`bar-${i}`).style.width='100%';status.textContent='Uploaded';status.className='status ok';
   }catch(err){status.textContent=err.message;status.className='status err';throw err}
  }
  notice('Resource upload complete.'); selected=[];$('files').value=''; await loadResources();
 }catch(err){console.error(err);notice(err.message||'Upload failed.','err')}
 finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-upload"></i> Upload Selected'}
};

async function loadResources(){
 const snap=await getDocs(collection(db,'resources')); const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
 rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
 $('tbody').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.title||r.name||r.fileName||'Untitled')}</td><td><span class="pill">${esc(r.access|| (r.premiumOnly?'premium':'free'))}</span></td><td>${r.published===false?'Draft':'Published'}</td><td>${esc(r.category||'General')}</td><td><button class="icon-btn" data-toggle="${r.id}" title="Publish/Draft"><i class="fa-solid fa-eye"></i></button><button class="icon-btn" data-open="${r.id}" title="Open file"><i class="fa-solid fa-arrow-up-right-from-square"></i></button><button class="icon-btn danger" data-del="${r.id}" title="Delete record"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">No resources uploaded yet.</td></tr>';
 $('tbody').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.open);const key=r?.resourceKey||r?.fileKey;if(key)window.open(`${R2.replace(/\/+$/,'')}/?key=${encodeURIComponent(key)}`,'_blank')});
 $('tbody').querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.toggle);const p=r?.published===false;await updateDoc(doc(db,'resources',b.dataset.toggle),{published:p,status:p?'published':'draft',updatedAt:serverTimestamp()});loadResources()});
 $('tbody').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this resource record?')){await deleteDoc(doc(db,'resources',b.dataset.del));loadResources()}});
}

onAuthStateChanged(auth,async user=>{
 if(!user){location.href='/login';return}
 const me=await getDoc(doc(db,'users',user.uid)); if(!me.exists()||me.data().role!=='admin'){location.href='/access-denied';return}
 currentUser=user; await loadResources();
});
