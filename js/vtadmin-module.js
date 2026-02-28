/* ============================================================
   VT ADMIN PANEL — SCRIPT v2.5.1
   @domain  admin.vutruong.vn
   ============================================================ */

import { initializeApp, getApps, getApp }
  from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, setDoc,
  updateDoc, deleteDoc, query, orderBy,
  onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider,
  signInWithCredential, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';

const V = '2.5.1';
const L = {
  i:(m,...a)=>console.log(`%c[VTAdmin ${V}]`,'color:#8a5c00;font-weight:700',m,...a),
  ok:(m,...a)=>console.log(`%c[VTAdmin ${V}] ✓`,'color:#15803d;font-weight:700',m,...a),
  w:(m,...a)=>console.warn(`[VTAdmin ${V}] ⚠`,m,...a),
  e:(m,...a)=>console.error(`[VTAdmin ${V}] ✗`,m,...a),
};
console.groupCollapsed(`%c[VTAdmin v${V}] CHANGELOG`,'color:#8a5c00;font-weight:700;font-size:12px;');
console.log('v2.5.1  [CHG] _fd: datetime format HH:MM, DD/MM/YYYY | [REM] Bootstrap tooltip đã xóa | [REM] VTAdmin_SideProject đã xóa | [NEW] AdminCard: avatar to + tên + email thay thế vị trí SideProject | [CHG] SideFooter: 2 nút full-width cùng hàng');
console.log('v2.5.0  [FIX] Dropdown hoạt động ở tất cả tab (unique did per tabCtx) | [NEW] Icon badge-check cạnh tên Admin | [CHG] Tab Tất cả: Admin ghim đầu, pending mới nhất lên trước');
console.log('v2.4.0  Tab Tất cả · Nav color sync · Load more · No extra fetch');
console.log('v2.3.1  Action dropdown · FedCM · Balanced grid · Tab color sync');
console.log('v2.3.0  Films Only · Google Sans Flex · Col Grid · Toast');
console.groupEnd();
L.i(`VT Admin Panel v${V} — admin.vutruong.vn — VT Films only`);

// ── FIREBASE ──────────────────────────────────────────────────
const FILMS_CFG = {
  apiKey:           'AIzaSyCyTqNXos2w80W9o6XHj7QkLaSoSU5MiOM',
  authDomain:       'vt-films-pj.firebaseapp.com',
  projectId:        'vt-films-pj',
  storageBucket:    'vt-films-pj.firebasestorage.app',
  messagingSenderId:'891750241616',
  appId:            '1:891750241616:web:78a48d2ee8d2fd71dd0855',
};
const ADMIN_UIDS = [
  'KU6FC2SAsmaE8qIu4EGU9J422On1',   // admin@vutruong.vn
  'dNkYpISZzgdpoJ4fVQUzWAFWgVw1z',  // ...2069@gmail.com
];
const isAdmin = uid => ADMIN_UIDS.includes(uid);

const filmsApp = getApps().find(a=>a.name==='vf') ? getApp('vf') : initializeApp(FILMS_CFG,'vf');
const fAuth    = getAuth(filmsApp);
const fDb      = getFirestore(filmsApp);
L.ok('Firebase init: vf (Films)');

const LS = { AUTH:'VTAdmin_auth', FD:'VTAdmin_fd', THEME:'VTAdmin_theme' };

// ── STATE ─────────────────────────────────────────────────────
let _user=null, _fTab='all';
let _fUsers=[], _q='';
let _fUnsub=null;
const PAGE = 5;           // items per page for "all" tab
let _allPage = 1;         // current page (multiplier)

// ── HELPERS ───────────────────────────────────────────────────
const _sp  = s => { try{return s?JSON.parse(s):null;}catch{return null;} };
const _uid = u => u.uid||u.id;
const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const _av  = (url,nm) => url||`https://ui-avatars.com/api/?name=${encodeURIComponent(nm||'?')}&background=4a5272&color=fff&size=80&bold=true`;
const _fd  = ts => {
  if(!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts._ms ?? (typeof ts==='number' ? ts : NaN));
  if(isNaN(d)) return '—';
  const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0'), mo=String(d.getMonth()+1).padStart(2,'0');
  return `${hh}:${mm}, ${dd}/${mo}/${d.getFullYear()}`;
};
const _ts  = ts => ts?.toDate?.().getTime() ?? ts?._ms ?? (typeof ts==='number' ? ts : 0);
const _set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
const _ser = u => {
  const o={...u};
  ['createdAt','lastLoginAt'].forEach(k=>{ if(o[k]?.toDate) o[k]={_ms:o[k].toDate().getTime()}; });
  return o;
};

// ── THEME ─────────────────────────────────────────────────────
function _applyTheme(t) {
  const th=t||localStorage.getItem(LS.THEME)||'light';
  document.documentElement.setAttribute('data-vta-theme',th);
  localStorage.setItem(LS.THEME,th);
  const ic=th==='dark'?'fa-sun':'fa-moon';
  ['VTA_ThemeIconAuth','VTA_ThemeIconSide'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.className=`fad ${ic}`;
  });
}
window.VTA_toggleTheme = () => _applyTheme(
  document.documentElement.getAttribute('data-vta-theme')==='dark' ? 'light' : 'dark'
);
_applyTheme();

// ── TOAST ─────────────────────────────────────────────────────
const _TT = {
  success:{ cls:'VTAToastSuccess', icon:'fa-circle-check',         c:'var(--VTA-green)' },
  error:  { cls:'VTAToastError',   icon:'fa-circle-xmark',         c:'var(--VTA-red)'   },
  warning:{ cls:'VTAToastWarning', icon:'fa-triangle-exclamation', c:'var(--VTA-gold)'  },
  info:   { cls:'VTAToastInfo',    icon:'fa-circle-info',           c:'var(--VTA-blue)'  },
};
function _toast(title, msg, type='info', ms=3500) {
  const stack=document.getElementById('VTA_ToastStack'); if(!stack) return;
  const cfg=_TT[type]||_TT.info, tid='T_'+Date.now();
  const el=document.createElement('div');
  el.className=`VTAdmin_Toast ${cfg.cls}`; el.id=tid;
  el.innerHTML=`<i class="fad ${cfg.icon} VTAdmin_ToastIcon" style="color:${cfg.c};"></i>
    <div class="VTAdmin_ToastBody">
      <div class="VTAdmin_ToastTitle">${_esc(title)}</div>
      ${msg?`<div class="VTAdmin_ToastMsg">${msg}</div>`:''}
    </div>
    <button class="VTAdmin_ToastClose" onclick="VTA_closeToast('${tid}')" type="button"><i class="fad fa-xmark"></i></button>`;
  stack.appendChild(el);
  setTimeout(()=>VTA_closeToast(tid), ms);
}
window.VTA_closeToast = function(tid) {
  const el=document.getElementById(tid); if(!el) return;
  el.classList.add('VTAToastOut');
  setTimeout(()=>el.remove(), 320);
};

// ── NO-FLASH CACHE ────────────────────────────────────────────
(function(){
  const c=_sp(localStorage.getItem(LS.AUTH));
  const ok=c&&isAdmin(c.uid)&&Date.now()-c.ts<7*86400000;
  if(ok){
    _showApp(c);
    const fc=_sp(localStorage.getItem(LS.FD));
    if(fc?.d){ _fUsers=fc.d; _renderFilms(); }
    L.ok('No-flash: loaded from cache');
  } else {
    const ct=document.getElementById('VTA_Container');
    if(ct){ ct.remove(); L.i('VTA_Container removed — no valid cache'); }
  }
})();

// ── MODAL FACTORY ─────────────────────────────────────────────
function _modal(o) {
  const id='VTM_'+Date.now(), el=document.createElement('div');
  el.className='modal fade VTAdmin_Modal'+(o.noClose?' VTAdmin_NoClose':'');
  el.id=id; el.tabIndex=-1;
  el.setAttribute('aria-labelledby',id+'_t'); el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="modal-dialog modal-dialog-centered ${o.size||''}">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="${id}_t">${o.title||''}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">${o.body||''}</div>
      ${o.footer?`<div class="modal-footer">${o.footer}</div>`:''}
    </div></div>`;
  document.body.appendChild(el);
  const bsM=new bootstrap.Modal(el,{backdrop:o.static?'static':true,keyboard:!o.noClose});
  el.addEventListener('hidden.bs.modal',()=>{bsM.dispose();el.remove();});
  bsM.show();
  return {el,modal:bsM};
}
function _confirm(o) {
  return new Promise(res=>{
    const {el,modal}=_modal({
      title:o.title||'Xác nhận', body:o.body||'', static:true,
      footer:`<button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${o.cancel||'Huỷ'}</button>
              <button type="button" class="btn ${o.btnCls||'btn-danger'} btn-sm" id="VTM_OK">${o.ok||'Xác nhận'}</button>`,
    });
    el.querySelector('#VTM_OK').onclick=()=>{modal.hide();res(true);};
    el.addEventListener('hidden.bs.modal',()=>res(false),{once:true});
  });
}

// ── AUTH ──────────────────────────────────────────────────────
window.VTA_handleOneTap = async function(resp) {
  document.getElementById('VTA_AuthLoading')?.classList.remove('d-none');
  try {
    await signInWithCredential(fAuth, GoogleAuthProvider.credential(resp.credential));
  } catch(e) {
    document.getElementById('VTA_AuthLoading')?.classList.add('d-none');
    _modal({
      title:`<i class="fad fa-circle-xmark me-2" style="color:var(--VTA-red);"></i>Đăng nhập thất bại`,
      body:`<p style="font-size:.9375rem;color:var(--VTA-text-sub);">${_esc(e.message)}</p>`,
      footer:`<button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Đóng</button>`,
    });
  }
};
window.VTA_signOut = async function() {
  const ok=await _confirm({
    title:'<i class="fad fa-right-from-bracket me-2"></i>Đăng xuất',
    body:'<p style="font-size:.9375rem;color:var(--VTA-text-sub);">Bạn chắc chắn muốn đăng xuất?</p>',
    ok:'Đăng xuất', btnCls:'btn-danger',
  });
  if(!ok) return;
  localStorage.removeItem(LS.AUTH);
  try{await signOut(fAuth);}catch{}
  location.reload();
};
window.VTA_forceSignOut = async function() {
  localStorage.removeItem(LS.AUTH);
  try{await signOut(fAuth);}catch{}
  location.reload();
};

// ── AUTH STATE ────────────────────────────────────────────────
onAuthStateChanged(fAuth, async user => {
  L.i('Auth state:', user?user.uid:'null');
  if(!user){
    localStorage.removeItem(LS.AUTH);
    document.getElementById('VTA_Container')?.remove();
    document.getElementById('VTA_AuthScreen').style.display='flex';
    return;
  }
  if(!isAdmin(user.uid)){
    document.getElementById('VTA_Container')?.remove();
    localStorage.removeItem(LS.AUTH);
    _showAccessDenied(user); return;
  }
  _user=user;
  localStorage.setItem(LS.AUTH,JSON.stringify({uid:user.uid,name:user.displayName,email:user.email,photo:user.photoURL,ts:Date.now()}));
  if(!document.getElementById('VTA_Container')){ L.ok('First login — reloading'); location.reload(); return; }
  _showApp({uid:user.uid,name:user.displayName,email:user.email,photo:user.photoURL});
  await _ensureFilmsAdminDoc(user);
  _listenFilms();
});

function _showApp(c) {
  const a=document.getElementById('VTA_AuthScreen'); if(a) a.style.display='none';
  const ct=document.getElementById('VTA_Container');
  if(ct){ ct.classList.remove('d-none'); ct.style.display='flex'; }
  const av=document.getElementById('VTA_AdminAvatar'), nm=document.getElementById('VTA_AdminName'), em=document.getElementById('VTA_AdminEmail');
  if(av) av.src=_av(c.photo,c.name);
  if(nm) nm.textContent=c.name||'Admin';
  if(em) em.textContent=c.email||'';
}
function _showAccessDenied(u) {
  document.getElementById('VTA_AuthScreen').style.display='none';
  _modal({
    title:'<i class="fad fa-shield-xmark me-2" style="color:var(--VTA-red);"></i>Truy cập bị từ chối',
    static:true, noClose:true,
    body:`<div class="text-center py-2">
      <div class="VTAdmin_DeniedIcon mb-3"><i class="fad fa-circle-xmark"></i></div>
      <p class="VTAdmin_DeniedDesc">Tài khoản <strong>${_esc(u.email||u.uid)}</strong> không có quyền Admin.</p>
      <div class="VTAdmin_DeniedUid">UID: ${_esc(u.uid)}</div>
    </div>`,
    footer:`<button type="button" class="btn btn-danger" onclick="VTA_forceSignOut()"><i class="fad fa-right-from-bracket me-2"></i>Đăng xuất</button>`,
  });
}
async function _ensureFilmsAdminDoc(user) {
  try {
    const ref=doc(fDb,'users',user.uid), snap=await getDoc(ref);
    if(!snap.exists()){
      await setDoc(ref,{ uid:user.uid, email:user.email, displayName:user.displayName||'Admin', photoURL:user.photoURL||null, provider:'google', role:'admin', verifiedUser:true, createdAt:serverTimestamp(), lastLoginAt:serverTimestamp() });
      L.ok('Films admin doc created');
    } else { await updateDoc(ref,{lastLoginAt:serverTimestamp()}); }
  } catch(e){ L.w('ensureFilmsAdminDoc:',e.message); }
}

// ── DATA LISTENER ─────────────────────────────────────────────
function _listenFilms() {
  if(_fUnsub) _fUnsub();
  _fUnsub=onSnapshot(
    query(collection(fDb,'users'),orderBy('createdAt','desc')),
    snap=>{
      _fUsers=snap.docs.map(d=>({id:d.id,...d.data()}));
      localStorage.setItem(LS.FD,JSON.stringify({d:_fUsers.map(_ser),ts:Date.now()}));
      _renderFilms();
    },
    err=>{
      L.e('Films listener:',err.message);
      if(err.code==='permission-denied') _toast('Lỗi quyền truy cập','Kiểm tra Films Firestore Rules và admin document.','error',6000);
    }
  );
}

// ── STATUS LOGIC ──────────────────────────────────────────────
function _fStatus(u) {
  const v=u.verifiedUser;
  if(v===true||v==='true') return 'approved';
  if(v==='revoked')        return 'revoked';
  if(v==='rejected')       return 'rejected';
  return 'pending';
}

// ── SHARED GRID HEADER (function declaration — hoisted) ───────
function _gridHdr() {
  return `<div class="VTAdmin_GridHeader">
    <div class="VTAdmin_ColLabel"></div>
    <div class="VTAdmin_ColLabel">Người dùng</div>
    <div class="VTAdmin_ColLabel VTAdmin_ColUID">UID</div>
    <div class="VTAdmin_ColLabel VTAdmin_ColStatus">Trạng thái</div>
    <div class="VTAdmin_ColLabel VTAdmin_ColJoined">Đăng nhập lần đầu</div>
    <div class="VTAdmin_ColLabel VTAdmin_ColLogin">Đăng nhập cuối</div>
    <div class="VTAdmin_ColLabel" style="text-align:right;">Hành động</div>
  </div>`;
}

// ── RENDER: ALL TAB (admin ghim đầu → pending mới nhất → còn lại mới nhất) ──
function _renderAllTab() {
  const el=document.getElementById('VTA_FBody_all'); if(!el) return;
  let users=[..._fUsers];
  if(_q){
    const q=_q.toLowerCase();
    users=users.filter(u=>(u.displayName||'').toLowerCase().includes(q)
                         ||(u.email||'').toLowerCase().includes(q)
                         ||(_uid(u)||'').toLowerCase().includes(q));
  }
  // 1) Admin luôn ghim đầu, 2) Pending mới nhất (createdAt desc), 3) Còn lại mới nhất
  users.sort((a,b)=>{
    const aA=isAdmin(_uid(a)), bA=isAdmin(_uid(b));
    if(aA!==bA) return aA?-1:1;
    const aP=_fStatus(a)==='pending', bP=_fStatus(b)==='pending';
    if(aP!==bP) return aP?-1:1;
    return _ts(b.createdAt)-_ts(a.createdAt);
  });
  const total=users.length;
  if(!total){
    el.innerHTML=`<div class="VTA_Empty"><i class="fad fa-inbox VTA_EmptyIcon"></i><div class="VTA_EmptyText">Không có tài khoản nào</div></div>`;
    return;
  }
  const shown=users.slice(0,_allPage*PAGE), remaining=total-shown.length;
  el.innerHTML=`${_gridHdr()}<div class="VTAdmin_UserGrid">${shown.map(u=>_fRow(u,_fStatus(u),'all')).join('')}</div>
    ${remaining>0?`<div class="VTA_LoadMoreWrap">
      <button class="VTA_Btn VTA_BtnGhost" onclick="VTA_loadMoreAll()" type="button">
        <i class="fad fa-chevron-down me-1"></i>Xem thêm (còn ${remaining})
      </button></div>`:''}`;
}

// ── RENDER: STATUS TABS + ALL ─────────────────────────────────
function _renderFilms() {
  const cnt={pending:0,approved:0,rejected:0,revoked:0};
  _fUsers.forEach(u=>cnt[_fStatus(u)]++);
  const total=_fUsers.length;

  // Counts
  _set('VTA_FS_T',total); _set('VTA_FS_P',cnt.pending); _set('VTA_FS_A',cnt.approved); _set('VTA_FS_R',cnt.rejected+cnt.revoked);
  _set('VTA_FilmsTotal',total); _set('VTA_FilmsPend',cnt.pending); _set('VTA_FilmsAppr',cnt.approved);
  _set('VTA_TC_All',total); _set('VTA_TC_FP',cnt.pending); _set('VTA_TC_FA',cnt.approved); _set('VTA_TC_FJ',cnt.rejected); _set('VTA_TC_FV',cnt.revoked);
  _set('VTA_AllBadge',total); _set('VTA_PendBadge',cnt.pending); _set('VTA_ApprBadge',cnt.approved); _set('VTA_RejBadge',cnt.rejected); _set('VTA_RevBadge',cnt.revoked);

  // Status tabs
  ['pending','approved','rejected','revoked'].forEach(st=>{
    const el=document.getElementById(`VTA_FBody_${st}`); if(!el) return;
    let users=_fUsers.filter(u=>_fStatus(u)===st);
    if(_q){
      const q=_q.toLowerCase();
      users=users.filter(u=>(u.displayName||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)||(_uid(u)||'').toLowerCase().includes(q));
    }
    el.innerHTML=users.length
      ? `${_gridHdr()}<div class="VTAdmin_UserGrid">${users.map(u=>_fRow(u,st,st)).join('')}</div>`
      : `<div class="VTA_Empty"><i class="fad fa-inbox VTA_EmptyIcon"></i><div class="VTA_EmptyText">Không có tài khoản nào</div></div>`;
  });

  // All tab — reset page on data refresh
  _allPage=1;
  _renderAllTab();
}

// ── ROW RENDERER ──────────────────────────────────────────────
// tabCtx: chuỗi định danh tab ('all','pending','approved','rejected','revoked')
// → đảm bảo dropdown ID duy nhất trong DOM, tránh getElementById nhầm tab ẩn
function _fRow(u, st, tabCtx) {
  const uid=_uid(u), name=u.displayName||'Unknown', em=u.email||'', av=_av(u.photoURL,name);
  const adminUser=isAdmin(uid);
  const bmap={
    pending: `<span class="VTA_Badge VTA_Pending"><i class="fad fa-clock"></i>Chờ duyệt</span>`,
    approved:`<span class="VTA_Badge VTA_Approved"><i class="fad fa-circle-check"></i>Đã duyệt</span>`,
    rejected:`<span class="VTA_Badge VTA_Rejected"><i class="fad fa-ban"></i>Từ chối</span>`,
    revoked: `<span class="VTA_Badge VTA_Revoked"><i class="fad fa-lock"></i>Thu hồi</span>`,
  };
  let acts='';
  if(adminUser){
    acts=`<span class="VTA_Badge VTA_AdminBadge"><i class="fad fa-shield-check"></i>Admin</span>`;
  } else {
    // did duy nhất per tab: tránh getElementById tìm nhầm phần tử ở tab khác
    const did=`dd_${tabCtx}_${uid.replace(/[^a-zA-Z0-9]/g,'_')}`;
    let items='';
    if(st==='pending'){
      items=`<button class="VTA_DropItem VTA_DropApprove" onclick="VTA_fAct('approve','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-check fa-fw"></i>Duyệt</button>
             <button class="VTA_DropItem VTA_DropReject"  onclick="VTA_fAct('reject','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-xmark fa-fw"></i>Từ chối</button>`;
    } else if(st==='approved'){
      items=`<button class="VTA_DropItem VTA_DropRevoke" onclick="VTA_fAct('revoke','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-lock fa-fw"></i>Thu hồi</button>`;
    } else if(st==='rejected'){
      items=`<button class="VTA_DropItem VTA_DropApprove" onclick="VTA_fAct('approve','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-rotate-left fa-fw"></i>Duyệt lại</button>
             <div class="VTA_DropDivider"></div>
             <button class="VTA_DropItem VTA_DropDelete"  onclick="VTA_fDeleteModal('${_esc(uid)}','${_esc(name)}','${_esc(em)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-trash fa-fw"></i>Xóa</button>`;
    } else if(st==='revoked'){
      items=`<button class="VTA_DropItem VTA_DropApprove" onclick="VTA_fAct('approve','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-rotate-left fa-fw"></i>Phục hồi</button>
             <button class="VTA_DropItem VTA_DropReject"  onclick="VTA_fAct('reject','${_esc(uid)}','${_esc(name)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-xmark fa-fw"></i>Từ chối</button>
             <div class="VTA_DropDivider"></div>
             <button class="VTA_DropItem VTA_DropDelete"  onclick="VTA_fDeleteModal('${_esc(uid)}','${_esc(name)}','${_esc(em)}');VTA_closeDropdown('${did}')" type="button"><i class="fad fa-trash fa-fw"></i>Xóa</button>`;
    }
    if(items) acts=`<div class="VTA_ActWrap" id="${did}">
      <button class="VTA_ActTrigger" onclick="VTA_toggleDropdown('${did}')" title="Hành động" type="button"><i class="fad fa-ellipsis-vertical"></i></button>
      <div class="VTA_ActDropdown">${items}</div></div>`;
  }
  // Icon badge-check bên cạnh tên Admin (tooltip Bootstrap)
  const nameHtml=adminUser
    ? `${_esc(name)}&nbsp;<i class="fad fa-badge-check text-primary small"></i>`
    : _esc(name);
  return `<div class="VTAdmin_UserCard">
    <div class="VTAdmin_CellAvatar">
      <img alt="${_esc(name)}" class="VTA_UAvatar rounded-circle" loading="lazy" src="${_esc(av)}"
        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4a5272&color=fff&size=80&bold=true'"/>
    </div>
    <div class="VTAdmin_CellUser"><div class="VTA_UName">${nameHtml}</div><div class="VTA_UEmail">${_esc(em)}</div></div>
    <div class="VTAdmin_CellUID VTAdmin_ColUID"><div class="VTA_UUid">${_esc(uid)}</div></div>
    <div class="VTAdmin_CellStatus VTAdmin_ColStatus">${bmap[st]||''}</div>
    <div class="VTAdmin_CellDate VTAdmin_ColJoined">${_fd(u.createdAt)}</div>
    <div class="VTAdmin_CellDate VTAdmin_ColLogin VTAdmin_CellLogin">${_fd(u.lastLoginAt)}</div>
    <div class="VTAdmin_CellActions">${acts}</div>
  </div>`;
}

// ── ACTIONS ───────────────────────────────────────────────────
window.VTA_fAct = async function(action, uid, name) {
  if(isAdmin(uid)){ _toast('Không được phép','Không thể thực hiện hành động này với tài khoản Admin.','warning'); return; }
  const map={
    approve:{ field:true,       label:'Đã duyệt',   type:'success' },
    reject: { field:'rejected', label:'Đã từ chối', type:'warning' },
    revoke: { field:'revoked',  label:'Đã thu hồi', type:'info'    },
  };
  const m=map[action]; if(!m) return;
  try{ await updateDoc(doc(fDb,'users',uid),{verifiedUser:m.field}); _toast(m.label,name||uid,m.type); }
  catch(e){ _toast('Lỗi',e.message,'error',5000); }
};

window.VTA_approveAll = async function() {
  const pend=_fUsers.filter(u=>_fStatus(u)==='pending'&&!isAdmin(_uid(u)));
  if(!pend.length){ _toast('Thông báo','Không có tài khoản nào đang chờ duyệt.','info'); return; }
  const ok=await _confirm({
    title:'<i class="fad fa-check-double me-2"></i>Duyệt tất cả',
    body:`<p style="font-size:.9375rem;color:var(--VTA-text-sub);">Xác nhận duyệt <strong>${pend.length}</strong> tài khoản đang chờ?</p>`,
    ok:'Duyệt tất cả', btnCls:'btn-success',
  });
  if(!ok) return;
  let n=0;
  for(const u of pend){ try{await updateDoc(doc(fDb,'users',_uid(u)),{verifiedUser:true});n++;}catch{} }
  _toast('Duyệt tất cả',`Đã duyệt ${n}/${pend.length} tài khoản.`,'success');
};

window.VTA_fDeleteModal = function(uid, name, em) {
  if(isAdmin(uid)){ _toast('Không được phép','Không thể xóa tài khoản Admin.','warning'); return; }
  _confirm({
    title:'<i class="fad fa-trash me-2" style="color:var(--VTA-red);"></i>Xóa tài khoản',
    body:`<p style="font-size:.9375rem;color:var(--VTA-text-sub);margin-bottom:.875rem;">Xác nhận xóa tài khoản sau:</p>
      <div class="VTA_DeleteUserCard">
        <div class="VTA_DeleteUserName">${_esc(name)}</div>
        <div class="VTA_DeleteUserEmail">${_esc(em)}</div>
        <div class="VTA_UUid mt-1">${_esc(uid)}</div>
      </div>
      <div class="VTA_WarnBox"><i class="fad fa-triangle-exclamation me-2" style="color:var(--VTA-red);"></i>
        Tài khoản này sẽ bị xóa và <b>không thể khôi phục</b>.
      </div>`,
    ok:'<i class="fad fa-trash me-1"></i>Xóa tài khoản', static:true,
  }).then(async ok=>{
    if(!ok) return;
    try{ await deleteDoc(doc(fDb,'users',uid)); _toast('Đã xóa',`Tài khoản ${name} đã được xóa.`,'success'); }
    catch(e){ _toast('Lỗi',e.message,'error',5000); }
  });
};

// ── ACTION DROPDOWN ───────────────────────────────────────────
window.VTA_toggleDropdown = function(did) {
  const wrap=document.getElementById(did); if(!wrap) return;
  const dd=wrap.querySelector('.VTA_ActDropdown'); if(!dd) return;
  const open=dd.classList.contains('VTA_Open');
  document.querySelectorAll('.VTA_ActDropdown.VTA_Open').forEach(d=>d.classList.remove('VTA_Open'));
  if(!open) dd.classList.add('VTA_Open');
};
window.VTA_closeDropdown = function(did) {
  document.getElementById(did)?.querySelector('.VTA_ActDropdown')?.classList.remove('VTA_Open');
};
document.addEventListener('click',e=>{
  if(!e.target.closest('.VTA_ActWrap'))
    document.querySelectorAll('.VTA_ActDropdown.VTA_Open').forEach(d=>d.classList.remove('VTA_Open'));
});

// ── LOAD MORE ─────────────────────────────────────────────────
window.VTA_loadMoreAll = function() { _allPage++; _renderAllTab(); };

// ── NAVIGATION ────────────────────────────────────────────────
window.VTA_filmsTab = function(tab) {
  _fTab=tab;
  ['all','pending','approved','rejected','revoked'].forEach(t=>{
    document.getElementById(`VTA_TabBtn_${t}`)?.classList.toggle('VTA_Active',t===tab);
    document.getElementById(`VTA_Nav_${t}`)?.classList.toggle('VTA_Active',t===tab);
    document.getElementById(`VTA_FTab_${t}`)?.classList.toggle('VTA_Active',t===tab);
  });
  _set('VTA_PageTitle',{all:'Tất cả',pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',revoked:'Thu hồi'}[tab]||'VT Films');
  _set('VTA_PageSub',{
    all:     'VT Films — Toàn bộ tài khoản',
    pending: 'VT Films — Duyệt quyền truy cập',
    approved:'VT Films — Tài khoản đang hoạt động',
    rejected:'VT Films — Tài khoản bị từ chối',
    revoked: 'VT Films — Tài khoản bị thu hồi',
  }[tab]||'');
  VTA_closeSidebar();
};

window.VTA_search   = v => { _q=(v||'').trim(); _renderFilms(); };
window.VTA_refresh  = function() {
  const ic=document.getElementById('VTA_RefreshIcon');
  if(ic) ic.className='fad fa-rotate fa-spin';
  localStorage.removeItem(LS.FD);
  _listenFilms();
  setTimeout(()=>{ if(ic) ic.className='fad fa-rotate'; },1500);
};
window.VTA_toggleSidebar = () => { document.getElementById('VTA_Sidebar')?.classList.toggle('VTA_Open'); document.getElementById('VTA_Overlay')?.classList.toggle('VTA_Open'); };
window.VTA_closeSidebar  = () => { document.getElementById('VTA_Sidebar')?.classList.remove('VTA_Open'); document.getElementById('VTA_Overlay')?.classList.remove('VTA_Open'); };

L.ok(`Ready v${V}`);
