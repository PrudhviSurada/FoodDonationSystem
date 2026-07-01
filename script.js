/* =========================================================
   SHARE FOOD, SHARE HOPE v2 — Application Logic
   Roles: Donor (user) · NGO · Volunteer
   Storage: localStorage (data) | sessionStorage (session)
   ========================================================= */

/* ── 1. STORAGE KEYS & HELPERS ──────────────────────────── */
const SFSH = { USERS:'sfsh_users', DONATIONS:'sfsh_donations', NOTIFS:'sfsh_notifications' };

function getUsers()      { return JSON.parse(localStorage.getItem(SFSH.USERS)||'[]'); }
function saveUsers(u)    { localStorage.setItem(SFSH.USERS, JSON.stringify(u)); }
function getDonations()  { return JSON.parse(localStorage.getItem(SFSH.DONATIONS)||'[]'); }
function saveDonations(d){ localStorage.setItem(SFSH.DONATIONS, JSON.stringify(d)); }
function getNotifs()     { return JSON.parse(localStorage.getItem(SFSH.NOTIFS)||'[]'); }
function saveNotifs(n)   { localStorage.setItem(SFSH.NOTIFS, JSON.stringify(n)); }

function generateId(p='ID'){return p+'-'+Date.now().toString(36).toUpperCase()+Math.floor(Math.random()*900+100);}
function escapeHtml(s){if(!s&&s!==0)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function formatDateTime(v){if(!v)return'—';const d=new Date(v);if(isNaN(d))return v;return d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function timeAgo(v){const diff=Date.now()-new Date(v);if(diff<60000)return'just now';if(diff<3600000)return Math.floor(diff/60000)+' min ago';if(diff<86400000)return Math.floor(diff/3600000)+' hr ago';return Math.floor(diff/86400000)+' days ago';}

/* ── 2. TOAST ───────────────────────────────────────────── */
function showToast(msg,type='success'){
  let c=document.getElementById('toastContainer');
  if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container position-fixed bottom-0 end-0 p-3';document.body.appendChild(c);}
  const icons={success:'bi-check-circle-fill',danger:'bi-x-circle-fill',warning:'bi-exclamation-triangle-fill',info:'bi-info-circle-fill'};
  const el=document.createElement('div');
  el.className=`toast align-items-center text-bg-${type} border-0`;
  el.setAttribute('role','alert');
  el.innerHTML=`<div class="d-flex"><div class="toast-body d-flex align-items-center gap-2"><i class="bi ${icons[type]||icons.info}"></i>${escapeHtml(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  c.appendChild(el);
  const t=new bootstrap.Toast(el,{delay:3500});t.show();
  el.addEventListener('hidden.bs.toast',()=>el.remove());
}

/* ── 3. NOTIFICATIONS ───────────────────────────────────── */
function addNotification(userId,message,donationId,type='info'){
  if(!userId)return;
  const n=getNotifs();
  n.unshift({id:generateId('NTF'),userId,donationId:donationId||null,message,type,read:false,createdAt:new Date().toISOString()});
  saveNotifs(n.slice(0,120));
}
function getUserNotifs(userId){return getNotifs().filter(n=>n.userId===userId);}
function getUnreadCount(userId){return getNotifs().filter(n=>n.userId===userId&&!n.read).length;}
function markAllRead(userId){saveNotifs(getNotifs().map(n=>n.userId===userId?{...n,read:true}:n));}

function renderNotifBadge(userId){
  const badge=document.getElementById('notifBadge');
  if(!badge)return;
  const c=getUnreadCount(userId);
  badge.textContent=c;
  badge.style.display=c>0?'inline-block':'none';
}

function renderNotifDropdown(userId){
  const el=document.getElementById('notifDropdownList');
  if(!el)return;
  markAllRead(userId);
  renderNotifBadge(userId);
  const notifs=getUserNotifs(userId).slice(0,10);
  if(!notifs.length){el.innerHTML='<li class="px-3 py-3 text-muted small text-center">No notifications yet</li>';return;}
  el.innerHTML=notifs.map(n=>`
    <li class="notif-item ${n.read?'':'unread'} px-3 py-2">
      <div class="d-flex gap-2 align-items-start">
        <i class="bi bi-bell text-warning mt-1 flex-shrink-0"></i>
        <div><div class="small fw-semibold">${escapeHtml(n.message)}</div><div class="tiny text-muted">${timeAgo(n.createdAt)}</div></div>
      </div>
    </li><li><hr class="dropdown-divider my-0"></li>`).join('');
}

/* ── 4. PAGE LOADER ─────────────────────────────────────── */
function hideLoader(){const o=document.getElementById('loadingOverlay');if(o)setTimeout(()=>o.classList.add('hide'),350);}
window.addEventListener('DOMContentLoaded',hideLoader);

/* ── 5. COUNTDOWN TIMERS ────────────────────────────────── */
window._timers={};
function startCountdown(key,expiryTime,elementId,donationId){
  stopCountdown(key);
  function tick(){
    const el=document.getElementById(elementId);
    if(!el){stopCountdown(key);return;}
    const fresh=getDonations().find(d=>d.donationId===donationId);
    if(fresh&&['Completed','Rejected'].includes(fresh.status)){
      el.innerHTML='<span class="badge bg-secondary rounded-pill">Timer stopped</span>';stopCountdown(key);return;
    }
    const diff=new Date(expiryTime)-new Date();
    if(diff<=0){el.innerHTML='<span class="countdown-widget critical"><i class="bi bi-alarm"></i><span class="countdown-time">Expired</span></span>';stopCountdown(key);return;}
    const h=String(Math.floor(diff/3600000)).padStart(2,'0');
    const m=String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const s=String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    const crit=diff<3600000?'critical':'';
    el.innerHTML=`<div class="countdown-widget ${crit}"><i class="bi bi-alarm"></i><span class="countdown-time">${h}:${m}:${s}</span><span class="text-muted small ms-1">until expiry</span></div>`;
  }
  tick();window._timers[key]=setInterval(tick,1000);
}
function stopCountdown(key){if(window._timers[key]){clearInterval(window._timers[key]);delete window._timers[key];}}
function clearAllTimers(){Object.keys(window._timers).forEach(stopCountdown);}

/* ── 6. ROLE SELECTION ──────────────────────────────────── */
function selectRole(role){
  sessionStorage.setItem('role',role);
  const o=document.getElementById('loadingOverlay');if(o)o.classList.remove('hide');
  setTimeout(()=>{window.location.href='auth.html';},250);
}

/* ── 7. AUTH UTILS ──────────────────────────────────────── */
function renderRoleBadge(){
  const role=sessionStorage.getItem('role')||'user';
  const map={user:['bi-person-fill','Donor / User','is-user'],ngo:['bi-people-fill','NGO Admin','is-ngo'],volunteer:['bi-bicycle','Volunteer','is-volunteer']};
  const [icon,label,cls]=map[role]||map.user;
  document.querySelectorAll('.role-badge-target').forEach(el=>{
    el.className=`role-badge role-badge-target ${cls}`;
    el.innerHTML=`<i class="bi ${icon}"></i> Continuing as ${label}`;
  });
}
function showAuthPanel(id){
  document.querySelectorAll('.auth-panel').forEach(p=>p.classList.remove('active'));
  const p=document.getElementById(id);if(p)p.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
function togglePasswordVisibility(inputId,btn){
  const inp=document.getElementById(inputId);if(!inp)return;
  const hidden=inp.type==='password';inp.type=hidden?'text':'password';
  btn.querySelector('i').className=`bi ${hidden?'bi-eye-slash':'bi-eye'}`;
}
function isValidEmail(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
function showFormError(el,msg){if(!el)return;el.textContent=msg;el.classList.remove('d-none');}

/* ── 8. SIGN UP ─────────────────────────────────────────── */
function signupUser(event){
  event.preventDefault();
  const name=document.getElementById('signupName').value.trim();
  const phone=document.getElementById('signupPhone').value.trim();
  const email=document.getElementById('signupEmail').value.trim().toLowerCase();
  const pwd=document.getElementById('signupPassword').value;
  const cpwd=document.getElementById('signupConfirmPassword').value;
  const role=sessionStorage.getItem('role')||'user';
  const err=document.getElementById('signupError');
  err.classList.add('d-none');
  if(!name||!phone||!email||!pwd||!cpwd)return showFormError(err,'Please fill in every field.');
  if(!isValidEmail(email))return showFormError(err,'Please enter a valid email address.');
  if(pwd.length<8)return showFormError(err,'Password must be at least 8 characters.');
  if(pwd!==cpwd)return showFormError(err,'Passwords do not match.');
  const users=getUsers();
  if(users.some(u=>u.email===email))return showFormError(err,'This email is already registered.');
  if(users.some(u=>u.phone===phone))return showFormError(err,'This phone number is already registered.');
  const u={id:generateId('USR'),name,email,phone,password:pwd,role,isOnline:true,createdAt:new Date().toISOString()};
  users.push(u);saveUsers(users);
  sessionStorage.setItem('loggedInUser',u.id);
  showToast(`Welcome aboard, ${name.split(' ')[0]}!`,'success');
  setTimeout(()=>redirectDash(role),900);
}

/* ── 9. SIGN IN ─────────────────────────────────────────── */
function loginUser(event){
  event.preventDefault();
  const ident=document.getElementById('loginIdentifier').value.trim().toLowerCase();
  const pwd=document.getElementById('loginPassword').value;
  const err=document.getElementById('loginError');
  err.classList.add('d-none');
  if(!ident||!pwd)return showFormError(err,'Please enter your email/phone and password.');
  const users=getUsers();
  const match=users.find(u=>(u.email===ident||u.phone===ident)&&u.password===pwd);
  if(!match)return showFormError(err,'Incorrect credentials. Please try again.');
  sessionStorage.setItem('loggedInUser',match.id);
  showToast(`Welcome back, ${match.name.split(' ')[0]}!`,'success');
  setTimeout(()=>redirectDash(match.role),700);
}
function redirectDash(role){const m={user:'user-dashboard.html',ngo:'ngo-dashboard.html',volunteer:'volunteer-dashboard.html'};window.location.href=m[role]||'index.html';}

/* ── 10. SESSION ────────────────────────────────────────── */
function checkLogin(req){
  const id=sessionStorage.getItem('loggedInUser');
  if(!id){window.location.href='index.html';return null;}
  const u=getUsers().find(u=>u.id===id);
  if(!u||u.role!==req){window.location.href='index.html';return null;}
  return u;
}
function getCurrentUser(){const id=sessionStorage.getItem('loggedInUser');return getUsers().find(u=>u.id===id)||null;}
function updateCurrentUser(updates){
  const users=getUsers();const id=sessionStorage.getItem('loggedInUser');
  const idx=users.findIndex(u=>u.id===id);if(idx===-1)return null;
  users[idx]={...users[idx],...updates};saveUsers(users);return users[idx];
}
function logoutUser(){clearAllTimers();sessionStorage.removeItem('loggedInUser');window.location.href='index.html';}

/* ── 11. STATUS UTILS ───────────────────────────────────── */
const STATUS_CFG={
  Pending:{cls:'pending',icon:'bi-clock-history',label:'Pending'},
  Accepted:{cls:'accepted',icon:'bi-check-circle',label:'Accepted by NGO'},
  VolunteerAssigned:{cls:'vol-assigned',icon:'bi-bicycle',label:'Volunteer Assigned'},
  QualityCheckPassed:{cls:'quality-passed',icon:'bi-shield-check',label:'Quality Check Passed'},
  OrderPickedUp:{cls:'picked-up',icon:'bi-box-seam',label:'Order Picked Up'},
  OrderReceived:{cls:'received',icon:'bi-house-check',label:'Delivered to NGO'},
  Completed:{cls:'completed',icon:'bi-check2-circle',label:'Completed'},
  Rejected:{cls:'rejected',icon:'bi-x-circle',label:'Rejected'}
};
function statusPillHtml(status){const c=STATUS_CFG[status]||STATUS_CFG.Pending;return `<span class="status-pill ${c.cls}"><i class="bi ${c.icon}"></i> ${c.label}</span>`;}

/* Volunteer's own micro-status, tracked separately from the donation's
   overall status: Assigned → Accepted → QualityApproved → OrderPickedUp → Delivered
   (or RejectedPoorQuality on a failed quality check). */
const VOL_STATUS_CFG={
  Assigned:{cls:'vol-assigned',icon:'bi-bicycle',label:'Volunteer: Assigned'},
  Accepted:{cls:'accepted',icon:'bi-check-circle',label:'Volunteer: Accepted'},
  QualityApproved:{cls:'quality-passed',icon:'bi-shield-check',label:'Volunteer: Quality Approved'},
  RejectedPoorQuality:{cls:'rejected',icon:'bi-x-circle',label:'Volunteer: Rejected - Poor Quality'},
  OrderPickedUp:{cls:'picked-up',icon:'bi-box-seam',label:'Volunteer: Order Picked Up'},
  Delivered:{cls:'received',icon:'bi-house-check',label:'Volunteer: Delivered'}
};
function volunteerStatusPillHtml(volunteerStatus){
  if(!volunteerStatus)return'';
  const c=VOL_STATUS_CFG[volunteerStatus];if(!c)return'';
  return `<span class="status-pill ${c.cls}"><i class="bi ${c.icon}"></i> ${c.label}</span>`;
}

/* ── 12. DONOR DASHBOARD ────────────────────────────────── */
let _donor=null,_donorPoll=null;

function initUserDashboard(){
  _donor=checkLogin('user');if(!_donor)return;
  document.getElementById('userNameDisplay').textContent=_donor.name;
  document.getElementById('userInitial').textContent=_donor.name.charAt(0).toUpperCase();
  document.getElementById('donationForm').addEventListener('submit',addFoodDonation);
  const pi=document.getElementById('photoInput');
  if(pi)pi.addEventListener('change',handleImagePreview);
  const uz=document.getElementById('uploadZone');
  if(uz)uz.addEventListener('click',()=>pi&&pi.click());
  renderNotifBadge(_donor.id);
  displayDonorHistory();
  _donorPoll=setInterval(()=>{displayDonorHistory();renderNotifBadge(_donor.id);},6000);
}

function handleImagePreview(e){
  const file=e.target.files[0];if(!file)return;
  if(file.size>5*1024*1024){showToast('File too large. Max 5MB.','warning');e.target.value='';return;}
  const r=new FileReader();
  r.onload=ev=>{
    document.getElementById('photoData').value=ev.target.result;
    document.getElementById('uploadZone').innerHTML=`<img src="${ev.target.result}" class="preview-thumb" alt="Preview"><div class="small text-muted mt-1">Click to change</div>`;
  };r.readAsDataURL(file);
}
function resetUploadZone(){const z=document.getElementById('uploadZone');if(z)z.innerHTML='<i class="bi bi-cloud-arrow-up fs-3 text-warning"></i><div class="fw-semibold mt-1">Click to upload or drag and drop</div><div class="small text-muted">JPG, PNG up to 5MB</div>';}

function addFoodDonation(event){
  event.preventDefault();
  const foodName=document.getElementById('foodName').value.trim();
  const foodType=document.getElementById('foodType').value;
  const foodForm=document.getElementById('foodForm').value;
  const peopleServed=document.getElementById('peopleServed').value.trim();
  const address=document.getElementById('pickupAddress').value.trim();
  const contact=document.getElementById('contactNumber').value.trim();
  const preparedTime=document.getElementById('preparedTime').value;
  const expiryTime=document.getElementById('expiryTime').value;
  const instructions=document.getElementById('instructions').value.trim();
  const image=document.getElementById('photoData').value;
  if(!foodName||!foodType||!foodForm||!peopleServed||!address||!contact||!preparedTime||!expiryTime){showToast('Please fill in all required fields.','warning');return;}
  const d={
    donationId:generateId('FD'),donorId:_donor.id,donorName:_donor.name,donorPhone:_donor.phone,
    ngoId:null,volunteerId:null,foodName,foodType,foodForm,peopleServed,address,contact,
    preparedTime,expiryTime,instructions,foodImage:image||'',
    status:'Pending',volunteerStatus:null,assignedNGO:null,assignedVolunteer:null,
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  };
  const donations=getDonations();donations.push(d);saveDonations(donations);
  getUsers().filter(u=>u.role==='ngo'&&u.isOnline).forEach(ngo=>{
    addNotification(ngo.id,`New donation: "${foodName}" for ${peopleServed} people — ${address}`,d.donationId,'info');
  });
  showToast('Donation submitted! Finding and assigning the nearest NGO...','success');
  event.target.reset();document.getElementById('photoData').value='';resetUploadZone();
  displayDonorHistory();
}

function displayDonorHistory(){
  clearAllTimers();
  const donations=getDonations().filter(d=>d.donorId===_donor.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const container=document.getElementById('historyContainer');
  const empty=document.getElementById('historyEmpty');
  if(!donations.length){if(container)container.innerHTML='';if(empty)empty.classList.remove('d-none');return;}
  if(empty)empty.classList.add('d-none');
  container.innerHTML=donations.map((d,i)=>donorCardHtml(d,i)).join('');
  donations.filter(d=>!['Completed','Rejected','Pending'].includes(d.status)).forEach(d=>{
    startCountdown(d.donationId,d.expiryTime,`timer-${d.donationId}`,d.donationId);
  });
}

function donorCardHtml(d,i){
  const isActive=!['Completed','Rejected','Pending'].includes(d.status);
  return `
<div class="donation-card mb-3 fade-in-up" style="animation-delay:${i*.06}s">
  <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
    <div class="d-flex align-items-center gap-3">
      ${d.foodImage?`<img src="${d.foodImage}" class="donation-thumb-img" alt="food">`:`<span class="donation-thumb"><i class="bi bi-egg-fried"></i></span>`}
      <div>
        <div class="fw-bold">${escapeHtml(d.foodName)}</div>
        <div class="small text-muted">${escapeHtml(d.foodType)} · ${escapeHtml(d.foodForm)} · ${escapeHtml(d.peopleServed)} people</div>
        <div class="small text-muted">ID: ${escapeHtml(d.donationId)}</div>
      </div>
    </div>
    ${statusPillHtml(d.status)}
  </div>
  ${isActive?`<div id="timer-${d.donationId}" class="mb-2"><div class="countdown-widget"><i class="bi bi-alarm"></i> <span>Loading…</span></div></div>`:''}
  ${d.assignedNGO?`
  <div class="assign-info-card ngo-info mt-2">
    <div class="assign-info-title"><i class="bi bi-building text-primary"></i> NGO Assigned</div>
    <div class="row g-1 mt-1 small">
      <div class="col-sm-6 d-flex align-items-center gap-1"><i class="bi bi-person-circle text-muted"></i>${escapeHtml(d.assignedNGO.name)}</div>
      <div class="col-sm-6 d-flex align-items-center gap-1"><i class="bi bi-telephone text-muted"></i>${escapeHtml(d.assignedNGO.phone)}</div>
      <div class="col-sm-6 d-flex align-items-center gap-1"><i class="bi bi-envelope text-muted"></i>${escapeHtml(d.assignedNGO.email)}</div>
    </div>
  </div>`:''}
  ${d.assignedVolunteer?`
  <div class="assign-info-card vol-info mt-2">
    <div class="assign-info-title"><i class="bi bi-bicycle text-success"></i> Volunteer: ${escapeHtml(d.assignedVolunteer.name)}</div>
    <div class="row g-1 mt-1 small">
      <div class="col-sm-6 d-flex align-items-center gap-1"><i class="bi bi-telephone text-muted"></i>${escapeHtml(d.assignedVolunteer.phone)}</div>
      ${d.assignedVolunteer.vehicleNumber?`<div class="col-sm-6 d-flex align-items-center gap-1"><i class="bi bi-truck text-muted"></i>${escapeHtml(d.assignedVolunteer.vehicleNumber)}</div>`:''}
      <div class="col-sm-12 d-flex gap-2 flex-wrap mt-1">${statusPillHtml(d.status)} ${volunteerStatusPillHtml(d.volunteerStatus)}</div>
    </div>
  </div>`:''}
  ${d.rejectionReason?`<div class="alert alert-warning mt-2 py-2 px-3 small rounded-3 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i><strong>Rejection Reason:</strong> ${escapeHtml(d.rejectionReason)}</div>`:''}
</div>`;
}

/* ── 13. NGO DASHBOARD ──────────────────────────────────── */
let _ngo=null,_ngoPoll=null,_assignTargetId=null;

function initNgoDashboard(){
  _ngo=checkLogin('ngo');if(!_ngo)return;
  document.getElementById('ngoNameDisplay').textContent=_ngo.name;
  document.getElementById('ngoInitial').textContent=_ngo.name.charAt(0).toUpperCase();
  updateNgoAvailUI();updateNgoStats();displayNgoRequests();
  renderNotifBadge(_ngo.id);
  _ngoPoll=setInterval(()=>{_ngo=getCurrentUser();updateNgoStats();displayNgoRequests();renderNotifBadge(_ngo.id);},6000);
}

function toggleNgoAvailability(){
  const updated=updateCurrentUser({isOnline:!_ngo.isOnline});_ngo=updated||getCurrentUser();
  updateNgoAvailUI();
  showToast(_ngo.isOnline?'You are ONLINE. You can now accept donations.':'You are OFFLINE. No new requests will be received.',_ngo.isOnline?'success':'info');
}
function updateNgoAvailUI(){
  const b=document.getElementById('ngoAvailBtn');if(!b)return;
  b.className=`btn avail-toggle-btn ${_ngo.isOnline?'online':'offline'}`;
  b.innerHTML=`<span class="avail-dot"></span>${_ngo.isOnline?'ONLINE':'OFFLINE'}`;
}

function updateNgoStats(){
  const all=getDonations();
  document.getElementById('statTotal').textContent=all.length;
  document.getElementById('statPending').textContent=all.filter(d=>d.status==='Pending').length;
  document.getElementById('statAccepted').textContent=all.filter(d=>d.ngoId===_ngo.id&&!['Pending','Rejected'].includes(d.status)).length;
  document.getElementById('statCompleted').textContent=all.filter(d=>d.ngoId===_ngo.id&&d.status==='Completed').length;
}

function displayNgoRequests(){
  clearAllTimers();
  const all=getDonations().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const pendingEl=document.getElementById('pendingContainer');
  const myEl=document.getElementById('myDonationsContainer');
  const pending=all.filter(d=>d.status==='Pending');
  if(pendingEl){
    pendingEl.innerHTML=!pending.length?`<div class="empty-state"><i class="bi bi-inbox"></i><p class="fw-semibold mb-0">No pending requests</p><p class="small">New donations from donors will appear here.</p></div>`:pending.map(ngoPendingCard).join('');
  }
  const mine=all.filter(d=>d.ngoId===_ngo.id);
  if(myEl){
    myEl.innerHTML=!mine.length?`<div class="empty-state"><i class="bi bi-clipboard-x"></i><p class="fw-semibold mb-0">No accepted donations yet</p></div>`:mine.map(ngoMineCard).join('');
  }
  mine.filter(d=>!['Completed','Rejected'].includes(d.status)).forEach(d=>{
    startCountdown(d.donationId,d.expiryTime,`ngo-timer-${d.donationId}`,d.donationId);
  });
}

function ngoPendingCard(d){
  const canAccept=_ngo.isOnline;
  return `<div class="donation-card mb-3">
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
    <div class="d-flex align-items-center gap-2">
      ${d.foodImage?`<img src="${d.foodImage}" class="donation-thumb-img" alt="food">`:`<span class="donation-thumb"><i class="bi bi-egg-fried"></i></span>`}
      <div><div class="fw-bold">${escapeHtml(d.foodName)}</div><div class="small text-muted">${escapeHtml(d.foodType)} · ${escapeHtml(d.foodForm)} · ${d.peopleServed} people</div></div>
    </div>${statusPillHtml(d.status)}
  </div>
  <div class="donation-meta-row"><i class="bi bi-geo-alt"></i>${escapeHtml(d.address)}</div>
  <div class="donation-meta-row"><i class="bi bi-telephone"></i>${escapeHtml(d.contact)}</div>
  <div class="donation-meta-row"><i class="bi bi-clock"></i>Prepared: ${formatDateTime(d.preparedTime)}</div>
  <div class="donation-meta-row"><i class="bi bi-hourglass-split"></i>Expires: ${formatDateTime(d.expiryTime)}</div>
  <div class="d-flex gap-2 mt-3 flex-wrap">
    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="showDonationDetail('${d.donationId}')"><i class="bi bi-eye"></i> Details</button>
    ${canAccept?`<button class="btn btn-sm btn-success rounded-pill" onclick="ngoAccept('${d.donationId}')"><i class="bi bi-check-lg"></i> Accept</button><button class="btn btn-sm btn-outline-danger rounded-pill" onclick="ngoReject('${d.donationId}')"><i class="bi bi-x-lg"></i> Reject</button>`:`<span class="badge bg-secondary rounded-pill py-2 px-3">Go ONLINE to accept</span>`}
  </div>
</div>`;
}

function ngoMineCard(d){
  const showTimer=!['Completed','Rejected'].includes(d.status);
  let actions='';
  if(d.status==='Accepted')actions=`<button class="btn btn-sm btn-primary rounded-pill" onclick="openAssignVolunteer('${d.donationId}')"><i class="bi bi-person-check"></i> Assign Volunteer</button>`;
  else if(d.status==='OrderReceived')actions=`<button class="btn btn-sm btn-success rounded-pill" onclick="ngoComplete('${d.donationId}')"><i class="bi bi-flag-fill"></i> Mark Completed</button>`;
  return `<div class="donation-card mb-3">
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
    <div class="d-flex align-items-center gap-2">
      ${d.foodImage?`<img src="${d.foodImage}" class="donation-thumb-img" alt="food">`:`<span class="donation-thumb"><i class="bi bi-egg-fried"></i></span>`}
      <div><div class="fw-bold">${escapeHtml(d.foodName)}</div><div class="small text-muted">Donor: ${escapeHtml(d.donorName)} · ${d.peopleServed} people</div><div class="tiny text-muted">${d.donationId}</div></div>
    </div>${statusPillHtml(d.status)}
  </div>
  ${showTimer?`<div id="ngo-timer-${d.donationId}" class="mb-2"><div class="countdown-widget"><i class="bi bi-alarm"></i><span>Loading…</span></div></div>`:''}
  ${d.assignedVolunteer?`<div class="donation-meta-row"><i class="bi bi-bicycle text-success"></i>Volunteer: ${escapeHtml(d.assignedVolunteer.name)} · ${escapeHtml(d.assignedVolunteer.phone)}</div>`:''}
  ${d.volunteerStatus?`<div class="mb-2">${volunteerStatusPillHtml(d.volunteerStatus)}</div>`:''}
  <div class="d-flex gap-2 mt-2 flex-wrap">
    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="showDonationDetail('${d.donationId}')"><i class="bi bi-eye"></i> Details</button>
    ${actions}
    ${!['Completed','Rejected'].includes(d.status)?`<button class="btn btn-sm btn-outline-danger rounded-pill" onclick="ngoReject('${d.donationId}')"><i class="bi bi-x"></i> Reject</button>`:''}
  </div>
</div>`;
}

function ngoAccept(donationId){
  const donations=getDonations();const idx=donations.findIndex(d=>d.donationId===donationId);
  if(idx===-1||donations[idx].status!=='Pending'){showToast('This donation is no longer available.','warning');return;}
  donations[idx].status='Accepted';donations[idx].ngoId=_ngo.id;
  donations[idx].assignedNGO={id:_ngo.id,name:_ngo.name,phone:_ngo.phone,email:_ngo.email,address:_ngo.address||''};
  donations[idx].updatedAt=new Date().toISOString();
  saveDonations(donations);
  addNotification(donations[idx].donorId,`Your donation "${donations[idx].foodName}" was accepted by ${_ngo.name}!`,donationId,'success');
  showToast('Donation accepted! Now assign a volunteer.','success');
  updateNgoStats();displayNgoRequests();
}

function ngoReject(donationId){
  if(!confirm('Reject this donation?'))return;
  const donations=getDonations();const idx=donations.findIndex(d=>d.donationId===donationId);if(idx===-1)return;
  donations[idx].status='Rejected';donations[idx].updatedAt=new Date().toISOString();
  saveDonations(donations);
  addNotification(donations[idx].donorId,`Your donation "${donations[idx].foodName}" was rejected. You may resubmit.`,donationId,'warning');
  showToast('Donation rejected.','info');updateNgoStats();displayNgoRequests();
}

function openAssignVolunteer(donationId){
  _assignTargetId=donationId;
  const busy=getDonations().filter(d=>['VolunteerAssigned','OrderPickedUp'].includes(d.status)).map(d=>d.volunteerId);
  const vols=getUsers().filter(u=>u.role==='volunteer'&&!busy.includes(u.id));
  const listEl=document.getElementById('volunteerListModal');
  if(!vols.length){listEl.innerHTML='<div class="text-muted text-center py-3 small">No available volunteers at this time.</div>';}
  else{listEl.innerHTML=vols.map(v=>`
    <div class="vol-assign-item">
      <div class="avatar-circle vol-av" style="width:36px;height:36px;font-size:.85rem;">${v.name.charAt(0)}</div>
      <div class="flex-grow-1"><div class="fw-semibold small">${escapeHtml(v.name)}</div><div class="tiny text-muted">${escapeHtml(v.phone)}</div></div>
      <input type="text" class="form-control form-control-sm ms-2" id="veh-${v.id}" placeholder="Vehicle No. (optional)" style="max-width:140px;">
      <button class="btn btn-sm btn-brand rounded-pill ms-2" onclick="assignVolunteer('${donationId}','${v.id}')">Assign</button>
    </div>`).join('');}
  new bootstrap.Modal(document.getElementById('assignVolModal')).show();
}

function assignVolunteer(donationId,volunteerId){
  const vol=getUsers().find(u=>u.id===volunteerId);if(!vol)return;
  const vehicle=(document.getElementById(`veh-${volunteerId}`)?.value||'').trim();
  const donations=getDonations();const idx=donations.findIndex(d=>d.donationId===donationId);if(idx===-1)return;
  donations[idx].volunteerId=volunteerId;
  donations[idx].assignedVolunteer={id:volunteerId,name:vol.name,phone:vol.phone,vehicleNumber:vehicle};
  donations[idx].status='VolunteerAssigned';donations[idx].volunteerStatus='Assigned';donations[idx].updatedAt=new Date().toISOString();
  saveDonations(donations);
  addNotification(volunteerId,`${_ngo.name} assigned you to collect "${donations[idx].foodName}" from ${donations[idx].donorName}.`,donationId,'info');
  addNotification(donations[idx].donorId,`Volunteer ${vol.name} has been assigned to collect your donation.`,donationId,'success');
  bootstrap.Modal.getInstance(document.getElementById('assignVolModal'))?.hide();
  showToast(`Volunteer ${vol.name} assigned!`,'success');
  updateNgoStats();displayNgoRequests();
}

function ngoComplete(donationId){
  const donations=getDonations();const idx=donations.findIndex(d=>d.donationId===donationId);if(idx===-1)return;
  donations[idx].status='Completed';donations[idx].updatedAt=new Date().toISOString();
  saveDonations(donations);
  addNotification(donations[idx].donorId,`Your donation "${donations[idx].foodName}" has been completed. Thank you!`,donationId,'success');
  if(donations[idx].volunteerId)addNotification(donations[idx].volunteerId,`Pickup of "${donations[idx].foodName}" marked Completed by NGO. Thank you!`,donationId,'success');
  showToast('Donation marked as Completed!','success');updateNgoStats();displayNgoRequests();
}

function showDonationDetail(donationId){
  const d=getDonations().find(d=>d.donationId===donationId);if(!d)return;
  document.getElementById('detailTitle').textContent='Donation: '+d.donationId;
  document.getElementById('detailBody').innerHTML=`
  <div class="row g-3">
    ${d.foodImage?`<div class="col-12"><img src="${d.foodImage}" class="img-fluid rounded-3" style="max-height:200px;object-fit:cover;width:100%" alt="food"></div>`:''}
    <div class="col-md-6"><h6 class="fw-bold">Donor</h6>
      <div class="donation-meta-row"><i class="bi bi-person"></i>${escapeHtml(d.donorName)}</div>
      <div class="donation-meta-row"><i class="bi bi-telephone"></i>${escapeHtml(d.donorPhone||d.contact)}</div>
      <div class="donation-meta-row"><i class="bi bi-geo-alt"></i>${escapeHtml(d.address)}</div>
    </div>
    <div class="col-md-6"><h6 class="fw-bold">Food Details</h6>
      <div class="donation-meta-row"><i class="bi bi-egg-fried"></i>${escapeHtml(d.foodName)}</div>
      <div class="donation-meta-row"><i class="bi bi-tag"></i>${escapeHtml(d.foodType)} · ${escapeHtml(d.foodForm)}</div>
      <div class="donation-meta-row"><i class="bi bi-people"></i>${escapeHtml(d.peopleServed)} people</div>
      <div class="donation-meta-row"><i class="bi bi-clock"></i>Prepared: ${formatDateTime(d.preparedTime)}</div>
      <div class="donation-meta-row"><i class="bi bi-hourglass-split"></i>Expires: ${formatDateTime(d.expiryTime)}</div>
    </div>
    <div class="col-12"><div id="detail-timer"></div></div>
    ${d.instructions?`<div class="col-12"><div class="donation-meta-row"><i class="bi bi-info-circle"></i>${escapeHtml(d.instructions)}</div></div>`:''}
  </div>`;
  new bootstrap.Modal(document.getElementById('detailModal')).show();
  if(!['Completed','Rejected'].includes(d.status))
    setTimeout(()=>startCountdown(d.donationId+'_detail',d.expiryTime,'detail-timer',d.donationId),200);
}

/* ── 14. VOLUNTEER DASHBOARD ────────────────────────────── */
let _vol=null,_volPoll=null;

function initVolunteerDashboard(){
  _vol=checkLogin('volunteer');if(!_vol)return;
  document.getElementById('volNameDisplay').textContent=_vol.name;
  document.getElementById('volInitial').textContent=_vol.name.charAt(0).toUpperCase();
  updateVolAvailUI();
  renderNotifDropdown(_vol.id);renderNotifBadge(_vol.id);
  displayVolAssignments();displayVolActivity();checkNewAlert();
  _volPoll=setInterval(()=>{_vol=getCurrentUser();displayVolAssignments();displayVolActivity();renderNotifBadge(_vol.id);checkNewAlert();},5000);
}

function toggleVolAvailability(){
  const u=updateCurrentUser({isOnline:!_vol.isOnline});_vol=u||getCurrentUser();
  updateVolAvailUI();showToast(_vol.isOnline?'You are now available for pickups.':'You are now offline.',_vol.isOnline?'success':'info');
}
function updateVolAvailUI(){
  const b=document.getElementById('volAvailBtn');if(!b)return;
  b.className=`btn avail-toggle-btn ${_vol.isOnline?'online':'offline'}`;
  b.innerHTML=`<span class="avail-dot"></span>${_vol.isOnline?'Online':'Offline'}`;
}

function checkNewAlert(){
  const a=getDonations().filter(d=>d.volunteerId===_vol.id&&d.volunteerStatus==='Assigned');
  const el=document.getElementById('newAssignAlert');if(!el)return;
  if(a.length){el.classList.remove('d-none');el.querySelector('.alert-text').textContent=`${a[0].assignedNGO?.name||'An NGO'} assigned you to collect "${a[0].foodName}"!`;}
  else el.classList.add('d-none');
}

/**
 * One-time-per-load safeguard: any donation that already has a
 * volunteer assigned but predates the volunteerStatus field gets a
 * sensible default inferred from its overall status, so older test
 * data keeps working after this fix instead of disappearing.
 */
function normalizeLegacyVolunteerStatus(){
  const donations=getDonations();
  let changed=false;
  donations.forEach(d=>{
    if(d.volunteerId&&!d.volunteerStatus){
      if(d.status==='Completed'||d.status==='OrderReceived')       d.volunteerStatus='Delivered';
      else if(d.status==='OrderPickedUp')                          d.volunteerStatus='OrderPickedUp';
      else if(d.status==='QualityCheckPassed')                     d.volunteerStatus='QualityApproved';
      else if(d.status==='Rejected'&&d.rejectionReason)            d.volunteerStatus='RejectedPoorQuality';
      else                                                          d.volunteerStatus='Assigned';
      changed=true;
    }
  });
  if(changed)saveDonations(donations);
}

function displayVolAssignments(){
  clearAllTimers();
  normalizeLegacyVolunteerStatus();
  const mine=getDonations().filter(d=>d.volunteerId===_vol.id);
  const active=mine.filter(d=>!['Completed','Rejected'].includes(d.status)&&d.volunteerStatus!=='Delivered');
  const pending=mine.filter(d=>d.volunteerStatus==='Assigned');
  const delivered=mine.filter(d=>d.volunteerStatus==='Delivered');
  const inProgress=active.filter(d=>d.volunteerStatus!=='Assigned');

  // Stat cards
  const setStat=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setStat('volStatActive',inProgress.length);
  setStat('volStatCompleted',delivered.length);
  setStat('volStatPending',pending.length);
  setStat('volStatTotal',mine.length);

  // Pickups panel
  const pkEl=document.getElementById('myPickupsPanel');
  if(pkEl){
    pkEl.innerHTML=!pending.length
      ?`<div class="empty-state" style="padding:1.5rem 1rem"><i class="bi bi-inbox"></i><p class="small mb-0">No pending assignments</p></div>`
      :pending.map(d=>`
      <div class="pickup-card">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-semibold small">${escapeHtml(d.donationId)}</span>
          <span class="badge bg-warning text-dark">New</span>
        </div>
        <div class="small text-muted mb-1">By: ${escapeHtml(d.assignedNGO?.name||'NGO')}</div>
        <div class="small text-muted mb-2"><i class="bi bi-geo-alt"></i>${escapeHtml(d.address)}</div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success rounded-pill flex-grow-1" onclick="acceptAssignment('${d.donationId}')">Accept</button>
          <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="rejectAssignment('${d.donationId}')">Reject</button>
        </div>
      </div>`).join('');
  }

  // Current assignment detail: prefer one already in progress, otherwise a fresh pending one
  const current=inProgress[0]||pending[0];
  renderCurrentDetail(current);

  // Start timers for everything still active
  active.forEach(d=>startCountdown(d.donationId,d.expiryTime,`vol-timer-${d.donationId}`,d.donationId));
}

function renderCurrentDetail(d){
  const detEl=document.getElementById('currentDetail');
  const stepsEl=document.getElementById('statusSteps');
  const actEl=document.getElementById('statusActions');
  if(!detEl)return;
  if(!d){
    detEl.innerHTML=`<div class="empty-state"><i class="bi bi-clipboard-check"></i><p class="fw-semibold mb-0">No active assignment</p><p class="small">Accept an assignment above to see details here.</p></div>`;
    if(stepsEl)stepsEl.innerHTML='';if(actEl)actEl.innerHTML='';return;
  }
  detEl.innerHTML=`
  <div class="row g-3">
    ${d.foodImage?`<div class="col-md-4"><img src="${d.foodImage}" class="img-fluid rounded-3" style="height:170px;object-fit:cover;width:100%"></div>`:''}
    <div class="col-md-${d.foodImage?'4':'6'}">
      <h6 class="fw-bold small mb-2 d-flex align-items-center gap-2 flex-wrap">${escapeHtml(d.donationId)} ${volunteerStatusPillHtml(d.volunteerStatus)}</h6>
      <div class="donation-meta-row"><i class="bi bi-person"></i>${escapeHtml(d.donorName)}</div>
      <div class="donation-meta-row"><i class="bi bi-telephone"></i>${escapeHtml(d.donorPhone||d.contact)}</div>
      <div class="donation-meta-row"><i class="bi bi-geo-alt"></i>${escapeHtml(d.address)}</div>
    </div>
    <div class="col-md-${d.foodImage?'4':'6'}">
      <h6 class="fw-bold small mb-2">Food Details</h6>
      <div class="donation-meta-row"><i class="bi bi-egg-fried"></i>${escapeHtml(d.foodName)}</div>
      <div class="donation-meta-row"><i class="bi bi-tag"></i>${escapeHtml(d.foodType)} · ${escapeHtml(d.foodForm)}</div>
      <div class="donation-meta-row"><i class="bi bi-people"></i>${escapeHtml(d.peopleServed)} people</div>
      <div class="donation-meta-row"><i class="bi bi-clock"></i>${formatDateTime(d.preparedTime)}</div>
      <div class="donation-meta-row"><i class="bi bi-hourglass-split"></i>${formatDateTime(d.expiryTime)}</div>
      <div class="mt-2" id="vol-timer-${d.donationId}"><div class="countdown-widget"><i class="bi bi-alarm"></i><span>Loading…</span></div></div>
    </div>
    ${d.assignedNGO?`<div class="col-12"><div class="assign-info-card ngo-info">
      <div class="assign-info-title"><i class="bi bi-building text-primary"></i>Assigned by ${escapeHtml(d.assignedNGO.name)}</div>
      <div class="donation-meta-row mt-1"><i class="bi bi-telephone text-muted"></i>${escapeHtml(d.assignedNGO.phone)}</div>
      <div class="donation-meta-row"><i class="bi bi-geo-alt text-muted"></i>${escapeHtml(d.assignedNGO.address||'—')}</div>
    </div></div>`:''}
  </div>`;

  if(stepsEl){
    const steps=[
      {key:'Assigned',label:'Assigned',icon:'bi-clipboard-check'},
      {key:'Accepted',label:'Accepted',icon:'bi-check-circle'},
      {key:'QualityApproved',label:'Quality Check',icon:'bi-shield-check'},
      {key:'OrderPickedUp',label:'Order Picked Up',icon:'bi-box-seam'},
      {key:'Delivered',label:'Delivered to NGO',icon:'bi-house-check'}
    ];
    const order=['Assigned','Accepted','QualityApproved','OrderPickedUp','Delivered'];
    /* When the volunteer is in QC-pending state (volunteerStatus==='Accepted')
       we want "Quality Check" to show as the current active step. */
    const activeKey=d.volunteerStatus==='Accepted'?'QualityApproved':d.volunteerStatus;
    const cidx=order.indexOf(activeKey);
    stepsEl.innerHTML=`<div class="status-steps">${steps.map((s,i)=>{
      const done=i<cidx,active=i===cidx;
      return `<div class="step ${done?'done':''} ${active?'active':''}">
        <div class="step-circle"><i class="bi ${s.icon}"></i></div>
        <div class="step-label">${s.label}</div>
        ${i<steps.length-1?'<div class="step-connector"></div>':''}
      </div>`;
    }).join('')}</div>`;
  }

  if(actEl){
    if(d.volunteerStatus==='Accepted'){
      /* Quality Check is pending — show the inspection card instead of plain buttons */
      actEl.innerHTML=`
        <div class="quality-check-card">
          <div class="quality-check-header">
            <i class="bi bi-shield-check"></i>
            <div>
              <div class="fw-bold">Food Quality Check</div>
              <div class="small text-muted mt-1">
                Inspect the food before pickup. Verify it is safe, fresh, and fit for consumption.
              </div>
            </div>
          </div>
          <div class="quality-check-actions">
            <button class="btn btn-success rounded-pill px-4" onclick="approveFoodQuality('${d.donationId}')">
              <i class="bi bi-shield-check"></i> Quality Approved
            </button>
            <button class="btn btn-outline-danger rounded-pill px-4" onclick="rejectDonationByVolunteer('${d.donationId}','Poor Food Quality')">
              <i class="bi bi-x-circle"></i> Reject Donation
            </button>
          </div>
        </div>`;
    }else{
      let btns='';
      if(d.volunteerStatus==='Assigned'){
        btns=`<button class="btn btn-success px-4 rounded-pill" onclick="acceptAssignment('${d.donationId}')"><i class="bi bi-check-lg"></i> Accept Assignment</button>
              <button class="btn btn-outline-danger px-4 rounded-pill" onclick="rejectAssignment('${d.donationId}')"><i class="bi bi-x-lg"></i> Reject</button>`;
      }else if(d.volunteerStatus==='QualityApproved'){
        btns=`<button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-check-lg"></i> Accepted</button>
              <button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-shield-check"></i> Quality Approved</button>
              <button class="btn btn-primary px-4 rounded-pill" onclick="markOrderPickedUp('${d.donationId}')"><i class="bi bi-box-seam"></i> Order Picked Up</button>`;
      }else if(d.volunteerStatus==='OrderPickedUp'){
        btns=`<button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-check-lg"></i> Accepted</button>
              <button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-shield-check"></i> Quality Approved</button>
              <button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-box-seam"></i> Picked Up</button>
              <button class="btn btn-primary px-4 rounded-pill" onclick="markDeliveredToNGO('${d.donationId}')"><i class="bi bi-house-check"></i> Delivered to NGO</button>`;
      }else if(d.volunteerStatus==='Delivered'){
        btns=`<button class="btn btn-success px-4 rounded-pill" disabled><i class="bi bi-check2-all"></i> Delivered — Thank you!</button>`;
      }else if(d.volunteerStatus==='RejectedPoorQuality'){
        btns=`<button class="btn btn-danger px-4 rounded-pill" disabled><i class="bi bi-x-circle"></i> Rejected — Poor Food Quality</button>`;
      }
      actEl.innerHTML=`<div class="d-flex gap-3 flex-wrap">${btns}</div>`;
    }
  }
}

/**
 * Generic, single-source-of-truth updater for a donation record.
 * Reads the donations array, merges the given field updates into the
 * matching record (by donationId), stamps updatedAt, and persists it
 * back to LocalStorage. Every status-changing action below routes
 * through this so there is only ever one copy of each donation.
 * @param {string} donationId
 * @param {string|object} statusOrUpdates - a new `status` string, or an
 *   object of field updates (e.g. {status, volunteerStatus}).
 * @returns {object|null} the updated donation record
 */
function updateDonationStatus(donationId,statusOrUpdates){
  const donations=getDonations();
  const idx=donations.findIndex(d=>d.donationId===donationId);
  if(idx===-1)return null;
  const updates=typeof statusOrUpdates==='string'?{status:statusOrUpdates}:(statusOrUpdates||{});
  donations[idx]={...donations[idx],...updates,updatedAt:new Date().toISOString()};
  saveDonations(donations);
  return donations[idx];
}

/**
 * Step 1 — Volunteer accepts the pickup assignment.
 * Valid only while volunteerStatus is "Assigned". Updates the shared
 * donation record, notifies the NGO and donor, then refreshes every
 * dashboard that happens to be open so the change is visible at once.
 */
function acceptAssignment(donationId){
  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id){showToast('This assignment is no longer available.','warning');return;}
  if(donation.volunteerStatus!=='Assigned'){showToast('This assignment has already been actioned.','info');return;}

  const updated=updateDonationStatus(donationId,{volunteerStatus:'Accepted'});
  if(!updated)return;

  addNotification(updated.ngoId,`Volunteer ${_vol.name} accepted the pickup for "${updated.foodName}".`,donationId,'success');
  addNotification(updated.donorId,`Volunteer ${_vol.name} accepted and is on the way to collect your donation!`,donationId,'success');
  showToast('Assignment accepted! Head to the pickup location.','success');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * Volunteer declines a pickup assignment before accepting it.
 * Clears the volunteer assignment entirely so the NGO can reassign.
 */
function rejectAssignment(donationId){
  if(!confirm('Reject this assignment?'))return;
  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id)return;

  const updated=updateDonationStatus(donationId,{
    status:'Accepted',volunteerId:null,assignedVolunteer:null,volunteerStatus:null
  });
  if(!updated)return;

  addNotification(updated.ngoId,`Volunteer ${_vol.name} rejected the pickup for "${updated.foodName}". Please reassign.`,donationId,'warning');
  showToast('Assignment rejected. The NGO will reassign a volunteer.','info');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * Step 3 — Volunteer has collected the food from the donor.
 * Valid only once the Food Quality Check has been approved.
 * Advances both the donation's overall status and the volunteer's own
 * micro-status, then syncs every dashboard.
 */
function markOrderPickedUp(donationId){
  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id){showToast('This assignment is no longer available.','warning');return;}
  if(donation.volunteerStatus!=='QualityApproved'){showToast('Please complete the Food Quality Check before marking the order as picked up.','warning');return;}

  const updated=updateDonationStatus(donationId,{status:'OrderPickedUp',volunteerStatus:'OrderPickedUp'});
  if(!updated)return;

  addNotification(updated.donorId,`Your donation "${updated.foodName}" has been picked up by volunteer ${_vol.name}.`,donationId,'info');
  addNotification(updated.ngoId,`Volunteer ${_vol.name} picked up "${updated.foodName}" and is heading to you.`,donationId,'info');
  showToast('Marked as Picked Up! Now deliver it to the NGO.','success');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * Step 3 — Volunteer has handed the food off to the NGO.
 * Valid only once the order has been picked up. Marks the volunteer
 * as Delivered, advances the donation to OrderReceived, disables all
 * further volunteer action buttons, and syncs every dashboard.
 */
function markDeliveredToNGO(donationId){
  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id){showToast('This assignment is no longer available.','warning');return;}
  if(donation.volunteerStatus!=='OrderPickedUp'){showToast('Please mark the order as picked up first.','warning');return;}

  const updated=updateDonationStatus(donationId,{status:'OrderReceived',volunteerStatus:'Delivered'});
  if(!updated)return;

  addNotification(updated.donorId,`Your donation "${updated.foodName}" has been delivered to ${updated.assignedNGO?.name||'the NGO'}.`,donationId,'success');
  addNotification(updated.ngoId,`Volunteer ${_vol.name} delivered "${updated.foodName}" to your location. Please verify and complete.`,donationId,'success');
  showToast('Delivered to NGO! Thank you for your contribution.','success');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * performQualityCheck — Called conceptually when the volunteer moves
 * from 'Accepted' into the inspection step. No localStorage write is
 * needed here: the QC card is rendered purely from the existing
 * volunteerStatus === 'Accepted' state. Calling this triggers a
 * dashboard refresh so the QC card is displayed immediately.
 * @param {string} donationId
 */
function performQualityCheck(donationId){
  refreshVolunteerDashboard();
}

/**
 * approveFoodQuality — Volunteer confirms the food is safe to deliver.
 * Valid only while volunteerStatus is 'Accepted' (i.e., QC is pending).
 * Sets volunteerStatus → 'QualityApproved' and donation status →
 * 'QualityCheckPassed', then notifies the NGO and donor and syncs all
 * three dashboards.
 * @param {string} donationId
 */
function approveFoodQuality(donationId){
  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id){showToast('This assignment is no longer available.','warning');return;}
  if(donation.volunteerStatus!=='Accepted'){
    showToast('Quality check is only available right after accepting an assignment.','warning');return;
  }

  const updated=updateDonationStatus(donationId,{
    status:'QualityCheckPassed',
    volunteerStatus:'QualityApproved'
  });
  if(!updated)return;

  addNotification(updated.ngoId,
    `Volunteer ${_vol.name} approved the food quality for "${updated.foodName}". Proceeding with pickup.`,
    donationId,'success');
  addNotification(updated.donorId,
    `Quality check passed for your donation "${updated.foodName}". The volunteer is on the way!`,
    donationId,'success');
  showToast('Food quality approved! You can now pick up the donation.','success');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * rejectDonationByVolunteer — Volunteer flags the food as unsafe/spoiled.
 * Valid only while volunteerStatus is 'Accepted' (QC step).
 * After confirmation: sets status → 'Rejected', volunteerStatus →
 * 'RejectedPoorQuality', stops the countdown timer, stores the
 * rejection reason on the donation record, disables all further
 * buttons, and notifies the NGO and donor with the reason.
 * @param {string} donationId
 * @param {string} reason  - human-readable rejection reason
 */
function rejectDonationByVolunteer(donationId,reason){
  reason=reason||'Poor Food Quality';
  if(!confirm(
    'Are you sure you want to reject this donation due to poor food quality?\n\n' +
    'This action cannot be undone and will notify the NGO and donor immediately.'
  ))return;

  const donation=getDonations().find(d=>d.donationId===donationId);
  if(!donation||donation.volunteerId!==_vol.id){showToast('This assignment is no longer available.','warning');return;}
  if(donation.volunteerStatus!=='Accepted'){
    showToast('Rejection is only available during the Quality Check step.','warning');return;
  }

  /* Stop the expiry timer immediately so it doesn't keep running */
  stopCountdown(donationId);

  const updated=updateDonationStatus(donationId,{
    status:'Rejected',
    volunteerStatus:'RejectedPoorQuality',
    rejectionReason:reason
  });
  if(!updated)return;

  addNotification(updated.ngoId,
    `Volunteer ${_vol.name} rejected "${updated.foodName}" due to: ${reason}. Please follow up with the donor.`,
    donationId,'warning');
  addNotification(updated.donorId,
    `Your donation "${updated.foodName}" was rejected by the volunteer. Reason: ${reason}. ` +
    'Please check the food and consider resubmitting once the issue is resolved.',
    donationId,'danger');
  showToast('Donation rejected due to poor food quality. The NGO and donor have been notified.','warning');

  refreshVolunteerDashboard();refreshNGODashboard();refreshDonorDashboard();
}

/**
 * Re-renders the Volunteer Dashboard from the latest LocalStorage data,
 * if and only if a volunteer dashboard is actually loaded in this tab.
 */
function refreshVolunteerDashboard(){
  if(!_vol||!document.getElementById('myPickupsPanel'))return;
  _vol=getCurrentUser()||_vol;
  displayVolAssignments();displayVolActivity();checkNewAlert();renderNotifBadge(_vol.id);
}

/**
 * Re-renders the NGO Dashboard from the latest LocalStorage data,
 * if and only if an NGO dashboard is actually loaded in this tab.
 */
function refreshNGODashboard(){
  if(!_ngo||!document.getElementById('pendingContainer'))return;
  _ngo=getCurrentUser()||_ngo;
  updateNgoStats();displayNgoRequests();renderNotifBadge(_ngo.id);
}

/**
 * Re-renders the Donor Dashboard from the latest LocalStorage data,
 * if and only if a donor dashboard is actually loaded in this tab.
 */
function refreshDonorDashboard(){
  if(!_donor||!document.getElementById('historyContainer'))return;
  _donor=getCurrentUser()||_donor;
  displayDonorHistory();renderNotifBadge(_donor.id);
}

function displayVolActivity(){
  const all=getDonations().filter(d=>d.volunteerId===_vol.id).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const el=document.getElementById('volActivity');if(!el)return;
  if(!all.length){el.innerHTML='<div class="text-muted small text-center py-3">No activity yet</div>';return;}
  el.innerHTML=`<div class="table-responsive"><table class="table history-table align-middle mb-0">
    <thead><tr><th>ID</th><th>Food</th><th>NGO</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>${all.map(d=>`<tr>
      <td class="text-muted small">${escapeHtml(d.donationId)}</td>
      <td><div class="fw-semibold small">${escapeHtml(d.foodName)}</div><div class="tiny text-muted">${escapeHtml(d.foodType)}</div></td>
      <td class="small">${escapeHtml(d.assignedNGO?.name||'—')}</td>
      <td>${statusPillHtml(d.status)}</td>
      <td class="small text-muted">${formatDateTime(d.updatedAt)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// Sidebar toggle for volunteer (mobile)
function toggleSidebar(){
  const sb=document.getElementById('volSidebar');
  const ov=document.getElementById('sidebarOverlay');
  if(!sb)return;
  const open=sb.classList.toggle('open');
  if(ov)ov.classList.toggle('active',open);
}