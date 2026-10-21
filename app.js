const state = {
  role: 'visitor',
  previousRole: 'visitor',
  demoMode: false,
  selectedResponseTripIndex: null,
  responseLog: [],
  prototypeRole: 'Ranger',
  dueSoonMinutes: 30,
  overdueGraceMinutes: 15,
  auditLog: [],
  interfaceMode: 'simple',
  offlinePreparedAt: null,
  lastInfoRefreshAt: null,
  freshnessHours: 24,
  offlineReady: false,
  checkedIn: false,
  checkedOut: false,
  currentTrip: null,
  localTrips: [],
  localHazards: [],
  localRouteUpdate: null
};

const $ = id => document.getElementById(id);

function saveState(){
  try {
    localStorage.setItem('pathfinderOfficialStateV2', JSON.stringify(state));
  } catch (e) {
    // Storage may be blocked in sandbox/file preview. UI should still work.
  }
}

function loadState(){
  try {
    const raw = localStorage.getItem('pathfinderOfficialStateV2');
    if (!raw) return;
    Object.assign(state, JSON.parse(raw));
  } catch (e) {
    // Ignore blocked or invalid local storage and continue with defaults.
  }
}

function formatTime(t){
  if(!t) return 'Not available';
  const [h,m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2,'0')} ${suffix}`;
}

function updateNetwork(){
  const online = navigator.onLine;
  const badge = $('networkBadge');
  if (badge) {
    badge.textContent = online ? 'ONLINE' : 'OFFLINE';
    badge.className = `badge ${online ? 'online' : 'offline'}`;
  }
  updateSimpleNetwork();
}

function updateRole(role){
  if(role){
    state.role = role;
    saveState();
  }
  const visitor = state.role === 'visitor';
  const ranger = state.role === 'ranger';
  const rangerLock = state.role === 'ranger-lock';
  const sources = state.role === 'sources';
  $('visitorApp')?.classList.toggle('hidden', !visitor);
  $('rangerApp')?.classList.toggle('hidden', !ranger);
  $('rangerLockScreen')?.classList.toggle('hidden', !rangerLock);
  $('sourcesApp')?.classList.toggle('hidden', !sources);
  $('roleToggle')?.classList.toggle('hidden', sources || rangerLock);
  $('sourcesToggle')?.classList.toggle('hidden', sources || rangerLock);
  if(visitor && $('roleToggle')) $('roleToggle').textContent = 'Switch to Ranger';
  if(ranger && $('roleToggle')) $('roleToggle').textContent = 'Switch to Visitor';
}

function updateTripPack(){
  const trip = state.currentTrip;
  $('packDestination').textContent = trip?.destination || 'Not available';
  $('tripId').textContent = trip ? 'Local prototype record' : 'Not available';
  $('packReturn').textContent = trip ? formatTime(trip.returnTime) : 'Not available';

  const badge = $('offlineReadyBadge');
  badge.textContent = state.offlineReady ? 'AVAILABLE OFFLINE' : 'NOT READY';
  badge.className = `status-chip ${state.offlineReady ? 'open' : 'muted'}`;

  $('downloadPackBtn').disabled = !trip;
  $('checkinBtn').disabled = !trip || !state.offlineReady || (state.checkedIn && !state.checkedOut);
  $('checkoutBtn').disabled = !state.checkedIn || state.checkedOut;
}


function updateMetrics(){
  const trips = Array.isArray(state.localTrips) ? state.localTrips : [];
  const empty = $('emptyTrips');
  if (empty) empty.classList.toggle('hidden', trips.length > 0);

  // Metrics are optional in the current prototype layout.
  // Update them only if those elements exist.
  const activeEl = $('metricActiveTrips');
  const dueEl = $('metricDueSoon');
  const overdueEl = $('metricOverdue');

  if (activeEl) activeEl.textContent = String(trips.filter(t => t.status !== 'Returned').length);
  if (dueEl) dueEl.textContent = String(trips.filter(t => t.status === 'Due soon').length);
  if (overdueEl) overdueEl.textContent = String(trips.filter(t => t.status === 'Overdue').length);
}

function renderTrips(){
  const body = $('tripTableBody');
  if ($('demoBanner')) $('demoBanner').classList.toggle('hidden', !state.demoMode);
  if ($('demoModeBtn')) $('demoModeBtn').textContent = state.demoMode ? 'Demo Mode Active' : 'Start Demo Mode';

  body.innerHTML = '';

  if (!state.localTrips || state.localTrips.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7"><div class="resource-placeholder compact"><strong>No active visitor records</strong><span>NO PUBLIC RESOURCE FOUND</span><p>No live YAC visitor dataset is publicly available. Use locally entered prototype trips or Demo Mode only.</p></div></td>`;
    body.appendChild(tr);
    updateMetrics();
    return;
  }

  state.localTrips.forEach((t, index) => {
    const tr = document.createElement('tr');
    if(t.status === 'Overdue') tr.className = 'overdue';
    if(t.status === 'Due soon') tr.className = 'due-soon';

    const canReview = t.status === 'Overdue' || t.status === 'Due soon';
    tr.innerHTML = `
      <td>${escapeHtml(t.tripId || t.id || 'Prototype')}</td>
      <td><strong>${escapeHtml(t.destination || 'Not provided')}</strong>${t.demo ? '<br><small>DEMO DATA</small>' : ''}</td>
      <td>${escapeHtml(formatTime(t.returnTime || t.return || ''))}</td>
      <td><span class="status-pill">${escapeHtml(t.status || 'Planned')}</span></td>
      <td>${escapeHtml(t.device || 'Not recorded')}</td>
      <td>${escapeHtml(String(t.party || '—'))}</td>
      <td>${canReview ? `<button class="response-btn" data-response-index="${index}">Review</button>` : '—'}</td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-response-index]').forEach(btn => {
    btn.addEventListener('click', () => openResponsePanel(Number(btn.dataset.responseIndex)));
  });

  updateMetrics();
}

function renderHazards(){
  const feed = $('hazardFeed');
  feed.innerHTML = '';
  if (!state.localHazards.length){
    const d = document.createElement('div');
    d.className = 'empty-state';
    d.textContent = 'No public resource found — no local prototype hazard updates yet.';
    feed.appendChild(d);
    return;
  }
  state.localHazards.slice().reverse().forEach(h => {
    const d = document.createElement('div');
    d.className = 'hazard-item';
    d.innerHTML = `<strong>${escapeHtml(h.title)}</strong><div>${escapeHtml(h.message)}</div><small>Local prototype only</small>`;
    feed.appendChild(d);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}


function openResponsePanel(index){
  if (!state.localTrips || !state.localTrips[index]) return;
  state.selectedResponseTripIndex = index;
  const t = state.localTrips[index];

  const fields = [
    ['Status', t.status || 'Not recorded'],
    ['Destination', t.destination || 'Not recorded'],
    ['Expected return', formatTime(t.returnTime || t.return || '') || 'Not recorded'],
    ['Party', t.party || 'Not recorded'],
    ['Vehicle', t.vehicle || 'Not recorded'],
    ['Satellite device', t.device || 'Not recorded']
  ];

  $('responseTripSummary').innerHTML = fields.map(([k,v]) =>
    `<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`
  ).join('');

  $('reviewTripInfoCheck').checked = false;
  $('contactAttemptCheck').checked = false;
  $('confirmStillOverdueCheck').checked = false;
  $('responseActionMessage').textContent = 'No response action recorded.';

  $('responsePanel').classList.remove('hidden');
  $('responsePanel').scrollIntoView({behavior:'smooth', block:'start'});
}

function currentResponseTrip(){
  const i = state.selectedResponseTripIndex;
  if (i === null || i === undefined) return null;
  return state.localTrips?.[i] || null;
}

function logResponseAction(action){
  const t = currentResponseTrip();
  if (!t) return;
  state.responseLog = state.responseLog || [];
  state.responseLog.push({
    action,
    destination: t.destination || '',
    time: new Date().toISOString(),
    demo: !!t.demo
  });
  saveState();
}


function addAudit(action, details=''){
  state.auditLog = state.auditLog || [];
  state.auditLog.unshift({time:new Date().toISOString(), role:state.prototypeRole || 'Prototype user', action, details});
  state.auditLog = state.auditLog.slice(0,50);
  saveState();
  renderAudit();
}
function renderAudit(){
  const el = $('auditLog');
  if(!el) return;
  if(!state.auditLog || state.auditLog.length===0){
    el.innerHTML='<div class="resource-placeholder compact"><strong>No prototype actions recorded</strong><p>The log will populate as local actions are performed.</p></div>';
    return;
  }
  el.innerHTML = state.auditLog.map(a => {
    const d=new Date(a.time);
    return `<div class="audit-entry"><span class="audit-time">${escapeHtml(d.toLocaleString())}</span><span class="audit-role">${escapeHtml(a.role)}</span><span><strong>${escapeHtml(a.action)}</strong>${a.details?`<br><small>${escapeHtml(a.details)}</small>`:''}</span></div>`;
  }).join('');
}
function updateRoleAccess(){
  const role=state.prototypeRole || 'Ranger';
  if($('activeRoleBadge')) $('activeRoleBadge').textContent=role.toUpperCase();
  const matrix={
    'Visitor':[['View own Trip Pack',true,'Own approved trip information only'],['View public visitor rules',true,'Official public content'],['Manage active visitor records',false,'Ranger function'],['Publish hazard / route status',false,'Ranger function'],['Approve cultural content',false,'Cultural approver function'],['Manage users / retention',false,'YAC administrator function']],
    'Ranger':[['View active visitor records',true,'Operational prototype view'],['Review overdue trips',true,'Supports Ranger judgement'],['Preview hazard / route updates',true,'Future-development workflow'],['Approve cultural content',false,'Requires cultural authority'],['Manage retention rules',false,'YAC administrator function'],['View audit information',true,'Prototype accountability']],
    'Cultural Approver':[['Review cultural content',true,'Proposed governance role'],['Approve what visitors may see',true,'Proposed content workflow'],['View active visitor records',false,'Not required by default'],['Change emergency status',false,'Ranger function'],['Manage users / retention',false,'YAC administrator function']],
    'YAC Administrator':[['Manage users and roles',true,'Proposed governance function'],['Manage retention settings',true,'Requires final policy approval'],['View audit records',true,'Proposed accountability function'],['Approve operational emergency response',false,'Not automated by Pathfinder'],['Override cultural approval',false,'Not assumed by the prototype']]
  };
  if($('roleAccessSummary')) $('roleAccessSummary').innerHTML=matrix[role].map(([n,a,x])=>`<div class="permission-card ${a?'allowed':'denied'}"><strong>${a?'✓ ':'— '}${escapeHtml(n)}</strong><span>${escapeHtml(x)}</span></div>`).join('');
}
function timeToMinutes(t){
  if(!t || !t.includes(':')) return null;
  const [h,m]=t.split(':').map(Number);
  if(Number.isNaN(h)||Number.isNaN(m)) return null;
  return h*60+m;
}
function recalculateStatuses(){
  if(!state.localTrips) return;
  const now=new Date(), current=now.getHours()*60+now.getMinutes();
  const due=Number(state.dueSoonMinutes||30), grace=Number(state.overdueGraceMinutes||15);
  state.localTrips.forEach(t=>{
    if(t.status==='Returned') return;
    const target=timeToMinutes(t.returnTime||t.return);
    if(target===null) return;
    const diff=target-current;
    if(diff < -grace) t.status='Overdue';
    else if(diff <= due) t.status='Due soon';
    else t.status='On Country';
  });
  saveState(); renderTrips();
}


function setInterfaceMode(mode){
  state.interfaceMode = mode === 'advanced' ? 'advanced' : 'simple';
  document.body.classList.toggle('simple-mode', state.interfaceMode === 'simple');
  document.body.classList.toggle('advanced-mode', state.interfaceMode === 'advanced');

  if(state.interfaceMode === 'simple'){
    if($('simpleApp')) $('simpleApp').classList.remove('hidden');
    if($('simplePanel')) $('simplePanel').classList.add('hidden');
    if (!location.hash || location.hash === '#advanced') history.replaceState(null, '', '#home');
    window.scrollTo({top:0, behavior:'smooth'});
  } else {
    history.replaceState(null, '', '#advanced');
  }
  saveState();
}

function getCurrentPrototypeTrip(){
  if(state.currentTrip) return state.currentTrip;
  if(state.localTrips && state.localTrips.length) {
    return state.localTrips.find(t => t.status !== 'Returned') || state.localTrips[0];
  }
  return null;
}

function showSimpleHome(updateHash=true){
  $('simplePanel')?.classList.add('hidden');
  $('simpleApp')?.classList.remove('hidden');
  if (updateHash && location.hash !== '#home') history.pushState(null, '', '#home');
  window.scrollTo({top:0, behavior:'smooth'});
}

function showSimplePanel(title, html, hashName=''){
  $('simpleApp')?.classList.add('hidden');
  $('simplePanel')?.classList.remove('hidden');
  if ($('simplePanelTitle')) $('simplePanelTitle').textContent = title;
  if ($('simplePanelContent')) $('simplePanelContent').innerHTML = html;
  if (hashName && location.hash !== '#' + hashName) history.pushState(null, '', '#' + hashName);
  window.scrollTo({top:0, behavior:'smooth'});
}

function updateSimpleNetwork(){
  if(!$('simpleNetworkText')) return;
  $('simpleNetworkText').textContent = navigator.onLine
    ? 'ONLINE · refresh information before leaving coverage'
    : 'OFFLINE · using locally available information';
}

function openSimpleEmergency(){
  const t=getCurrentPrototypeTrip();
  const device=t?.device && t.device!=='None' ? escapeHtml(t.device) : 'No device recorded';
  showSimplePanel('Emergency', `
    <span class="legend proposed-label">PATHFINDER SAFETY INTERFACE</span>
    <h2 class="quick-title">Emergency</h2>
    <p class="quick-subtitle">Fast access to location and contact information.</p>

    <div class="emergency-primary-grid">
      <button id="simpleGetLocationBtn" class="quick-primary" type="button">Get My Location</button>
      <button id="copyEmergencyCoordsBtn" class="quick-secondary" type="button" disabled>Copy Location</button>
    </div>

    <div class="quick-info-grid">
      <div class="quick-info"><span>Coordinates</span><strong id="simpleEmergencyCoords">Not requested</strong></div>
      <div class="quick-info"><span>Accuracy</span><strong id="simpleEmergencyAccuracy">—</strong></div>
    </div>

    <a class="quick-call" href="tel:0740603369">Call Lama Lama Ranger Base · 07 4060 3369</a>

    <div class="quick-warning">
      <strong>No mobile signal?</strong><br>
      If a satellite communicator has been issued, use that device for off-grid SOS. Satellite issue remains a proposed Pathfinder feature.
    </div>

    <details class="quick-warning">
      <summary><strong>More information</strong></summary>
      <p>Pathfinder does not replace emergency services or Ranger judgement. A normal browser cannot transmit an off-grid SOS without a communications network.</p>
      <p>Official Ranger/YAC emergency procedure: No public resource found.</p>
      <p>Recorded satellite device: <strong>${device}</strong></p>
    </details>
  `,'emergency');

  let coordsText='';
  setTimeout(()=>{
    const btn=$('simpleGetLocationBtn');
    const copyBtn=$('copyEmergencyCoordsBtn');
    btn?.addEventListener('click',()=>{
      const out=$('simpleEmergencyCoords');
      const acc=$('simpleEmergencyAccuracy');
      if(!navigator.geolocation){
        if(out) out.textContent='Location unavailable on this device';
        return;
      }
      if(out) out.textContent='Requesting permission…';
      navigator.geolocation.getCurrentPosition(
        p=>{
          coordsText=`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`;
          if(out) out.textContent=coordsText;
          if(acc) acc.textContent=`±${Math.round(p.coords.accuracy)} m`;
          if(copyBtn) copyBtn.disabled=false;
        },
        ()=>{
          if(out) out.textContent='Location permission denied or unavailable';
          if(acc) acc.textContent='—';
        },
        {enableHighAccuracy:true,timeout:8000}
      );
    });
    copyBtn?.addEventListener('click', async ()=>{
      if(!coordsText) return;
      try{
        await navigator.clipboard.writeText(coordsText);
        copyBtn.textContent='Copied';
      }catch(e){
        copyBtn.textContent='Read coordinates aloud';
      }
    });
  },0);
}

function openSimpleMap(){
  showSimplePanel('Map', `
    <span class="legend official-label">OFFICIAL PUBLIC MAP</span>
    <h2 class="quick-title">Lama Lama Country map</h2>
    <p class="quick-subtitle">General geographic reference from Yintjingga Aboriginal Corporation.</p>
    <img class="quick-map" src="assets/Lama-Lama-Map-2014-1.jpg" alt="Official Lama Lama Country reference map">
    <div id="simpleFreshnessLine" class="freshness-line"></div>
    <div class="quick-warning">
      <strong>Reference only.</strong>
      This map is not detailed enough for Pathfinder trip planning or operational navigation.
      A more detailed, community-approved visitor and route map is still required.
    </div>
  `, 'map');
  setTimeout(()=>{
    const f=freshnessText();
    const el=$('simpleFreshnessLine');
    if(el){
      el.textContent=f.text + (f.stale ? ' · Refresh recommended before leaving coverage.' : ' · Current prototype cache record.');
      if(f.stale) el.classList.add('freshness-warning');
    }
  },0);
}

function openSimpleTrip(){
  const t = getCurrentPrototypeTrip();
  if(!t){
    showSimplePanel('My Trip', `
      <span class="legend proposed-label">PATHFINDER PROPOSED FEATURE</span>
      <h2 class="quick-title">My Trip</h2>
      <p class="quick-subtitle">No local trip is currently stored on this device.</p>
      <div class="quick-warning">Create a trip in the Visitor Workspace before travelling.</div>
      <button id="tripToAdvancedBtn" class="quick-primary" type="button">Create Trip</button>
    `, 'trip');
    setTimeout(()=> $('tripToAdvancedBtn')?.addEventListener('click', ()=>setInterfaceMode('advanced')),0);
    return;
  }
  showSimplePanel('My Trip', `
    <span class="legend proposed-label">PATHFINDER PROPOSED FEATURE</span>
    <h2 class="quick-title">My Trip</h2>
    <div class="quick-info-grid">
      <div class="quick-info"><span>Destination</span><strong>${escapeHtml(t.destination || 'Not recorded')}</strong></div>
      <div class="quick-info"><span>Expected return</span><strong>${escapeHtml(formatTime(t.returnTime || t.return || '') || 'Not recorded')}</strong></div>
      <div class="quick-info"><span>Party</span><strong>${escapeHtml(String(t.party || 'Not recorded'))}</strong></div>
      <div class="quick-info"><span>Status</span><strong>${escapeHtml(t.status || 'Planned')}</strong></div>
    </div>
    <div class="quick-warning">Trip information stored in this prototype is local demonstration data unless explicitly sourced otherwise.</div>
  `, 'trip');
}

function openSimpleSafety(){
  showSimplePanel('Safety Info', `
    <span class="legend official-label">OFFICIAL PUBLIC INFORMATION</span>
    <h2 class="quick-title">Essential visitor safety</h2>
    <p class="quick-subtitle">Public visitor information from Yintjingga Aboriginal Corporation.</p>
    <div id="safetyFreshnessLine" class="freshness-line"></div>
    <ul class="simple-rule-list">
      <li><strong>Check in first:</strong> Visitors should first check in at the Lama Lama Ranger Base at Port Stewart.</li>
      <li><strong>Camp only in designated areas</strong> and obtain the required permit.</li>
      <li><strong>Follow Ranger instructions</strong> and approved access conditions.</li>
      <li><strong>Crocodile warning:</strong> Estuarine crocodiles inhabit waters in Lama Lama Country.</li>
      <li><strong>Do not enter restricted areas</strong> or infer access from this prototype map.</li>
    </ul>
    <a class="quick-call" href="tel:0740603369">Lama Lama Ranger Base · 07 4060 3369</a>
  `, 'safety');
  setTimeout(()=>{
    const f=freshnessText();
    const el=$('safetyFreshnessLine');
    if(el){
      el.textContent=f.text + (f.stale ? ' · Information may be outdated.' : '');
      if(f.stale) el.classList.add('freshness-warning');
    }
  },0);
}

function openSimpleCheck(){
  const t = getCurrentPrototypeTrip();
  if(!t){
    showSimplePanel('Check In / Out', `
      <span class="legend proposed-label">PATHFINDER PROPOSED FEATURE</span>
      <h2 class="quick-title">Check In / Out</h2>
      <p class="quick-subtitle">No prototype trip is currently stored.</p>
      <div class="quick-warning">
        YAC's public visitor information states that visitors should first check in at the Lama Lama Ranger Base at Port Stewart.
        Digital check-in/check-out is a Pathfinder proposed feature.
      </div>
      <a class="quick-call" href="tel:0740603369">Contact Lama Lama Ranger Base · 07 4060 3369</a>
      <div class="quick-actions">
        <button id="checkToAdvancedBtn" class="quick-secondary" type="button">Open full trip planning</button>
      </div>
    `, 'check');
    setTimeout(()=> $('checkToAdvancedBtn')?.addEventListener('click', ()=>setInterfaceMode('advanced')),0);
    return;
  }

  const returned = t.status === 'Returned';
  showSimplePanel('Check In / Out', `
    <span class="legend proposed-label">PATHFINDER PROPOSED FEATURE</span>
    <h2 class="quick-title">Check In / Out</h2>
    <div class="quick-info-grid">
      <div class="quick-info"><span>Destination</span><strong>${escapeHtml(t.destination || 'Not recorded')}</strong></div>
      <div class="quick-info"><span>Current status</span><strong id="simpleTripStatus">${escapeHtml(t.status || 'Planned')}</strong></div>
    </div>
    <div class="quick-warning">
      Official practice: visitors should first check in at the Lama Lama Ranger Base. The digital action below is only a proposed Pathfinder workflow.
    </div>
    <div class="quick-actions">
      <button id="simpleQuickCheckOutBtn" class="quick-primary" type="button" ${returned?'disabled':''}>${returned?'Returned':'Mark returned'}</button>
      <button id="simpleFullCheckBtn" class="quick-secondary" type="button">Advanced Mode</button>
    </div>
  `, 'check');

  setTimeout(()=>{
    $('simpleFullCheckBtn')?.addEventListener('click', ()=>setInterfaceMode('advanced'));
    $('simpleQuickCheckOutBtn')?.addEventListener('click', ()=>{
      const host=$('simplePanelContent');
      const existing=$('returnConfirmBox');
      if(existing) return;
      host?.insertAdjacentHTML('beforeend', `
        <div id="returnConfirmBox" class="confirm-card">
          <strong>Confirm safe return</strong>
          <p>Only confirm after the visitor has safely returned.</p>
          <div class="quick-actions">
            <button id="confirmReturnedBtn" class="quick-primary" type="button">Confirm Returned</button>
            <button id="cancelReturnedBtn" class="quick-secondary" type="button">Cancel</button>
          </div>
        </div>`);
      $('cancelReturnedBtn')?.addEventListener('click',()=> $('returnConfirmBox')?.remove());
      $('confirmReturnedBtn')?.addEventListener('click',()=>{
        t.status='Returned';
        saveState();
        addAudit?.('Visitor marked returned from Simple Mode', t.destination || 'Prototype trip');
        const out=$('simpleTripStatus'); if(out) out.textContent='Returned';
        const b=$('simpleQuickCheckOutBtn'); if(b){b.textContent='Returned'; b.disabled=true;}
        $('returnConfirmBox')?.remove();
      });
    });
  },0);
}



function routeSimpleHash(){
  if (state.interfaceMode !== 'simple') return;
  const h = (location.hash || '#home').toLowerCase();
  if (h === '#emergency') return openSimpleEmergency();
  if (h === '#map') return openSimpleMap();
  if (h === '#trip') return openSimpleTrip();
  if (h === '#safety') return openSimpleSafety();
  if (h === '#check') return openSimpleCheck();
  showSimpleHome(false);
}


function safeSessionGet(key){
  try { return sessionStorage.getItem(key); } catch(e){ return null; }
}
function safeSessionSet(key,value){
  try { sessionStorage.setItem(key,value); } catch(e){}
}
function safeSessionRemove(key){
  try { sessionStorage.removeItem(key); } catch(e){}
}
function updateOfflineReadyBadge(){
  const b=$('offlineReadyBadge');
  if(!b) return;
  const ready=!!state.offlinePreparedAt;
  b.textContent=ready?'OFFLINE READY':'OFFLINE NOT READY';
  b.className='badge '+(ready?'offline-ready':'offline-not-ready');
}
function freshnessText(){
  if(!state.lastInfoRefreshAt) return {text:'No refresh time recorded', stale:true};
  const age=(Date.now()-new Date(state.lastInfoRefreshAt).getTime())/3600000;
  return {
    text:`Safety information refreshed ${new Date(state.lastInfoRefreshAt).toLocaleString()}`,
    stale: age > Number(state.freshnessHours || 24)
  };
}
async function prepareOfflineResources(){
  if(!('serviceWorker' in navigator)) return false;
  try{
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    state.offlinePreparedAt=new Date().toISOString();
    if(!state.lastInfoRefreshAt) state.lastInfoRefreshAt=new Date().toISOString();
    saveState();
    updateOfflineReadyBadge();
    return true;
  }catch(e){
    updateOfflineReadyBadge();
    return false;
  }
}
async function sha256Hex(text){
  if(!(window.crypto && crypto.subtle)) return null;
  const data=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest('SHA-256',data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
const RANGER_PASSCODE_HASH='03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // demo passcode 1234
function rangerUnlocked(){
  return safeSessionGet('pathfinderRangerUnlocked')==='1';
}
function showRangerLogin(){
  updateRole('ranger-lock');
}
function lockRanger(){
  safeSessionRemove('pathfinderRangerUnlocked');
  showRangerLogin();
}
async function attemptRangerLogin(){
  const input=$('rangerPasscodeInput');
  const msg=$('rangerLoginMessage');
  const value=input?.value || '';
  const hash=await sha256Hex(value);
  if(hash && hash===RANGER_PASSCODE_HASH){
    safeSessionSet('pathfinderRangerUnlocked','1');
    if(msg) msg.textContent='Unlocked for this browser session.';
    updateRole('ranger');
    addAudit?.('Ranger workspace unlocked','Prototype passcode gate');
  }else{
    if(msg) msg.textContent='Incorrect passcode.';
  }
}
function openRangerWorkspace(){
  if(rangerUnlocked()) updateRole('ranger');
  else showRangerLogin();
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setInterfaceMode(state.interfaceMode || 'simple');
  // Safety-critical visitor controls are bound first so Advanced Mode
  // errors cannot disable the Simple Mode interface.
  $('advancedModeBtn')?.addEventListener('click', ()=>setInterfaceMode('advanced'));
  $('simplePanelAdvancedBtn')?.addEventListener('click', ()=>setInterfaceMode('advanced'));
  $('simpleModeBtn')?.addEventListener('click', ()=>setInterfaceMode('simple'));
  $('simpleBackBtn')?.addEventListener('click', ()=>showSimpleHome());
  $('simpleEmergencyBtn')?.addEventListener('click', openSimpleEmergency);
  $('simpleMapBtn')?.addEventListener('click', openSimpleMap);
  $('simpleTripBtn')?.addEventListener('click', openSimpleTrip);
  $('simpleSafetyBtn')?.addEventListener('click', openSimpleSafety);
  $('simpleCheckBtn')?.addEventListener('click', openSimpleCheck);
  routeSimpleHash();

  updateNetwork();
  updateOfflineReadyBadge();
  if(location.protocol==='http:' || location.protocol==='https:'){
    prepareOfflineResources();
  }

  if($('roleSelector')) $('roleSelector').value=state.prototypeRole||'Ranger';
  if($('dueSoonThreshold')) $('dueSoonThreshold').value=String(state.dueSoonMinutes||30);
  if($('overdueGrace')) $('overdueGrace').value=String(state.overdueGraceMinutes||15);
  updateRole();
  updateTripPack();
  renderTrips();
  renderHazards();
  renderAudit();
  updateRoleAccess();

  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => $(btn.dataset.scroll).scrollIntoView({behavior:'smooth'}));
  });


  $('openVisitorWorkspaceBtn')?.addEventListener('click', () => {
    updateRole('visitor');
    window.scrollTo({top:0, behavior:'smooth'});
  });

  $('openRangerWorkspaceBtn')?.addEventListener('click', () => {
    openRangerWorkspace();
    window.scrollTo({top:0, behavior:'smooth'});
  });

  $('rangerLoginBtn')?.addEventListener('click', attemptRangerLogin);
  $('rangerPasscodeInput')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') attemptRangerLogin();
  });

  $('roleToggle')?.addEventListener('click', () => {
    if(state.role === 'visitor') openRangerWorkspace();
    else updateRole('visitor');
  });

  $('sourcesToggle').addEventListener('click', () => {
    state.previousRole = state.role === 'sources' ? (state.previousRole || 'visitor') : state.role;
    state.role = 'sources';
    saveState();
    updateRole();
    window.scrollTo({top:0, behavior:'smooth'});
  });

  $('backFromSourcesBtn').addEventListener('click', () => {
    state.role = state.previousRole || 'visitor';
    saveState();
    updateRole();
    window.scrollTo({top:0, behavior:'smooth'});
  });

  $('tripForm').addEventListener('submit', e => {
    e.preventDefault();
    const destination = $('destination').value;
    const returnTime = $('returnTime').value;
    const party = Number($('partySize').value || 0);
    const vehicle = $('vehicle').value.trim();
    const emergencyContact = $('emergencyContact').value.trim();

    if (!destination || !returnTime || !party || !$('rulesAccepted').checked){
      $('formMessage').textContent = 'Please select a published place, enter return time/party size, and accept the YAC visitor requirements.';
      return;
    }

    state.currentTrip = { destination, returnTime, party, vehicle, emergencyContact };
    state.offlineReady = false;
    state.checkedIn = false;
    state.checkedOut = false;
    $('lastUpdated').textContent = 'Not available';
    $('formMessage').textContent = 'Local prototype trip created. This is not an official booking or permit.';
    saveState();
    updateTripPack();
  });

  $('downloadPackBtn').addEventListener('click', () => {
    if (!state.currentTrip) return;
    state.offlineReady = true;
    $('lastUpdated').textContent = new Date().toLocaleString();
    saveState();
    updateTripPack();
  });

  $('checkinBtn').addEventListener('click', () => {
    if (!state.currentTrip || !state.offlineReady) return;
    state.checkedIn = true;
    state.checkedOut = false;
    const local = {...state.currentTrip, status:'Local prototype check-in'};
    state.localTrips.push(local);
    saveState();
    updateTripPack();
    renderTrips();
  });

  $('checkoutBtn').addEventListener('click', () => {
    state.checkedOut = true;
    const last = state.localTrips[state.localTrips.length - 1];
    if (last) last.status = 'Local prototype returned';
    saveState();
    updateTripPack();
    renderTrips();
  });

  $('clearLocalTripsBtn').addEventListener('click', () => {
    state.localTrips = [];
    state.demoMode = false;
    state.currentTrip = null;
    state.offlineReady = false;
    state.checkedIn = false;
    state.checkedOut = false;
    saveState();
    updateTripPack();
    renderTrips();
  });

  $('demoModeBtn').addEventListener('click', () => {
    if (state.demoMode) return;
    state.demoMode = true;
    addAudit('Demo Mode started','Fictional demonstration records generated');
    state.localTrips = [
      {tripId:'DEMO-01', destination:'Warokutal (Safari Camp – Port Stewart)', returnTime:'15:30', status:'On Country', party:2, vehicle:'Demo vehicle A', device:'None', demo:true},
      {tripId:'DEMO-02', destination:'Yintjingga (Port Stewart) — day visit', returnTime:'16:30', status:'Due soon', party:3, vehicle:'Demo vehicle B', device:'Proposed satellite device', demo:true},
      {tripId:'DEMO-03', destination:'Maramba (Silver Plains Station)', returnTime:'14:45', status:'Overdue', party:4, vehicle:'Demo vehicle C', device:'Proposed satellite device', demo:true}
    ];
    saveState();
    renderTrips();
  });

  $('offlineTestBtn').addEventListener('click', async () => {
    const out = $('offlineTestResult');
    if (!('serviceWorker' in navigator)) {
      out.textContent = 'Service workers are not supported in this browser.';
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const hasCache = keys.some(k => k.includes('pathfinder'));
      out.textContent = hasCache
        ? 'Core Pathfinder app files are cached. Disconnecting the network can now be used to demonstrate the PWA shell offline.'
        : 'Service worker is ready, but no Pathfinder cache was detected yet. Reload once while online.';
    } catch(e) {
      out.textContent = 'Offline readiness could not be confirmed. Run the site through http://localhost rather than opening the HTML file directly.';
    }
  });


  $('roleSelector').addEventListener('change', ()=>{
    state.prototypeRole=$('roleSelector').value;
    addAudit('Prototype role changed', state.prototypeRole);
    updateRoleAccess();
  });
  $('recalculateStatusBtn').addEventListener('click', ()=>{
    state.dueSoonMinutes=Number($('dueSoonThreshold').value);
    state.overdueGraceMinutes=Number($('overdueGrace').value);
    addAudit('Prototype timing recalculated', `Due soon: ${state.dueSoonMinutes} min; grace: ${state.overdueGraceMinutes} min`);
    recalculateStatuses();
  });
  $('clearAuditBtn').addEventListener('click', ()=>{
    state.auditLog=[];
    saveState(); renderAudit();
  });

  $('closeResponsePanelBtn').addEventListener('click', () => {
    $('responsePanel').classList.add('hidden');
    state.selectedResponseTripIndex = null;
    saveState();
  });

  $('markContactAttemptedBtn').addEventListener('click', () => {
    const t = currentResponseTrip();
    if (!t) return;
    $('contactAttemptCheck').checked = true;
    $('responseActionMessage').textContent = 'Contact attempt recorded in this local prototype only.';
    logResponseAction('Contact attempt recorded');
    addAudit('Contact attempt recorded', t.destination || 'Prototype trip');
  });

  $('markReturnedBtn').addEventListener('click', () => {
    const t = currentResponseTrip();
    if (!t) return;
    t.status = 'Returned';
    $('responseActionMessage').textContent = 'Visitor marked as returned in the local prototype.';
    logResponseAction('Visitor marked returned');
    addAudit('Visitor marked returned', t.destination || 'Prototype trip');
    renderTrips();
  });

  $('followApprovedProcedureBtn').addEventListener('click', () => {
    const t = currentResponseTrip();
    if (!t) return;
    const reviewed = $('reviewTripInfoCheck').checked;
    const contacted = $('contactAttemptCheck').checked;
    const unresolved = $('confirmStillOverdueCheck').checked;

    if (!(reviewed && contacted && unresolved)) {
      $('responseActionMessage').textContent = 'Complete all three review checks before proceeding.';
      return;
    }

    $('responseActionMessage').textContent =
      'Prototype hand-off recorded. Pathfinder stops here: follow the Ranger/YAC-approved emergency procedure outside this system.';
    logResponseAction('Hand-off to approved Ranger procedure');
    addAudit('Hand-off to approved Ranger procedure', t.destination || 'Prototype trip');
  });

  $('publishRouteBtn').addEventListener('click', () => {
    const place = $('routeSelect').value;
    const status = $('routeStatusSelect').value;
    const message = $('routeMessage').value.trim();
    if (!place || !status){
      $('routePublishMessage').textContent = 'Select a place and status first.';
      return;
    }
    state.localRouteUpdate = {place, status, message};
    $('routePublishMessage').textContent = 'Saved locally as a Pathfinder prototype update — not official YAC data.';
    saveState();
  });

  $('publishHazardBtn').addEventListener('click', () => {
    const title = $('hazardTitle').value.trim();
    const message = $('hazardMessage').value.trim();
    if (!title || !message) return;
    state.localHazards.push({title, message});
    $('hazardTitle').value = '';
    $('hazardMessage').value = '';
    saveState();
    renderHazards();
  });

  if ('geolocation' in navigator){
    navigator.geolocation.getCurrentPosition(
      pos => { $('coords').textContent = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`; },
      () => { $('coords').textContent = 'Unavailable (permission denied or device not available)'; }
    );
  }

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

window.addEventListener('popstate', routeSimpleHash);
