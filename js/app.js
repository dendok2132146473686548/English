// RealLife English — main app logic
const LS_KEY = 'erl_state_v1';
const DEFAULT_STATE = {
  level:'B1', completed:[], mistakes:[], streak:0, lastDate:null,
  totalMinutes:0, current:null, generatedHistory:[], purpose:null
};
let state = loadState();
let currentScenario=null, turnIndex=0, turnScores=[], hintLevel=0, scenarioMistakes=[], globalScores=[];
let endlessChain=null, endlessIndex=0;
let aiCache=[];

function loadState(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(raw) return {...DEFAULT_STATE, ...JSON.parse(raw)};
  }catch(e){}
  return {...DEFAULT_STATE};
}
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function getLevel(){ return state.level; }

// ---------- init ----------
document.addEventListener('DOMContentLoaded', ()=>{
  updateStreak();
  renderAll();
  bindEvents();
  document.getElementById('btn-level-badge').textContent = getLevel();
  if(!state.purpose) setTimeout(showPurposeModal, 800);
});

function updateStreak(){
  const today = new Date().toISOString().slice(0,10);
  if(!state.lastDate){ state.streak=1; state.lastDate=today; saveState(); return; }
  if(state.lastDate===today) return;
  const d1=new Date(state.lastDate), d2=new Date(today);
  const diff = Math.round((d2-d1)/86400000);
  if(diff===1) state.streak+=1; else if(diff>1) state.streak=1;
  state.lastDate=today; saveState();
}

function renderAll(){
  renderHome();
  renderPractice();
  renderProgress();
  renderMistakes();
  renderFreeTopics();
  renderProfileLevels();
  renderPurpose();
  updateStats();
  renderDailyChallenge();
  refreshAiGrid();
}

function bindEvents(){
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=>{
    b.addEventListener('click',()=> showView(b.dataset.nav));
  });
  document.querySelectorAll('[data-nav]').forEach(el=>{
    if(el.classList.contains('nav-btn')) return;
    el.addEventListener('click',()=> showView(el.dataset.nav));
  });
  document.getElementById('btn-start-practice').addEventListener('click',()=> showView('practice'));
  document.getElementById('btn-free-teaser').addEventListener('click',()=> showView('free'));
  const bi=document.getElementById('btn-infinite'); if(bi) bi.addEventListener('click',()=> { try{ handleInfinite(); }catch(e){ alert('Infinite error: '+e.message); console.error(e);} });
  const bs=document.getElementById('btn-surprise'); if(bs) bs.addEventListener('click', ()=>{ try{ handleSurprise(); }catch(e){ alert(e.message); }});
  const be=document.getElementById('btn-endless'); if(be) be.addEventListener('click', ()=>{ try{ startEndlessJourney(); }catch(e){ alert(e.message); }});
  const ra=document.getElementById('btn-refresh-ai'); if(ra) ra.addEventListener('click', ()=>{ try{ refreshAiGrid(); }catch(e){ alert(e.message); }});
  const dc=document.getElementById('daily-card'); if(dc) dc.addEventListener('click', ()=>{ try{ const sc=getDailyChallenge(); SCENARIOS[sc.id]=sc; startScenario(sc.id); }catch(e){ alert(e.message); }});
  const bpi=document.getElementById('btn-practice-infinite'); if(bpi) bpi.addEventListener('click',()=> { try{ handleInfinite(document.getElementById('category-filter').value); }catch(e){ alert(e.message); }});
  const bps=document.getElementById('btn-practice-surprise'); if(bps) bps.addEventListener('click', handleSurprise);
  const cf=document.getElementById('category-filter'); if(cf) cf.addEventListener('change', renderPractice);
  document.getElementById('btn-level-badge').addEventListener('click', openLevelModal);
  document.getElementById('btn-continue').addEventListener('click', ()=>{
    if(state.current) startScenario(state.current);
  });
  document.getElementById('btn-back-scenario').addEventListener('click',()=> showView('practice'));
  document.getElementById('btn-send').addEventListener('click', handleSend);
  document.getElementById('answer-input').addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); }
  });
  document.getElementById('answer-input').addEventListener('input', e=>{
    e.target.style.height='auto'; e.target.style.height=Math.min(96, e.target.scrollHeight)+'px';
  });
  document.getElementById('btn-hint').addEventListener('click', handleHint);
  document.getElementById('btn-skip').addEventListener('click', ()=>{
    const t = currentScenario.turns[turnIndex];
    const res = analyzeAnswer(t.example, t, getLevel());
    showFeedback(res); // show what expected
  });
  document.getElementById('btn-speak').addEventListener('click', toggleSpeak);
  // hold to speak
  const holdBtn=document.getElementById('btn-hold');
  holdBtn.addEventListener('pointerdown', startHoldSpeak);
  holdBtn.addEventListener('pointerup', stopHoldSpeak);
  holdBtn.addEventListener('pointercancel', stopHoldSpeak);
  document.getElementById('btn-next-scenario').addEventListener('click',()=>{
    if(endlessChain && endlessIndex < endlessChain.length-1){
      endlessIndex++;
      startScenario(endlessChain[endlessIndex].id);
      return;
    }
    const ids=Object.keys(SCENARIOS).filter(k=>!k.startsWith('gen-') && !k.startsWith('free:'));
    const cur=currentScenario.id;
    let idx=ids.indexOf(cur);
    if(idx===-1) idx=0;
    const next=ids[(idx+1)%ids.length] || ids[0];
    // if next is coming-soon, generate infinite instead
    const nxtSit=SITUATIONS.find(s=>s.id===next);
    if(nxtSit && nxtSit.coming) handleInfinite();
    else startScenario(next);
  });
  document.getElementById('btn-try-again').addEventListener('click',()=> startScenario(currentScenario.id));
  document.getElementById('btn-review-mistakes').addEventListener('click',()=> showView('mistakes'));
  document.getElementById('btn-reset').addEventListener('click',()=>{
    if(confirm('Reset all progress?')){ localStorage.removeItem(LS_KEY); state={...DEFAULT_STATE}; saveState(); renderAll(); showView('home'); }
  });
  // free
  document.getElementById('free-send').addEventListener('click', handleFreeSend);
  document.getElementById('free-speak').addEventListener('click', toggleFreeSpeak);
  document.getElementById('free-end').addEventListener('click', endFree);
  document.getElementById('free-input').addEventListener('keydown', e=>{
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleFreeSend(); }
  });
  // level modal close on backdrop
  document.getElementById('level-modal').addEventListener('click', e=>{
    if(e.target.id==='level-modal') closeLevelModal();
  });
}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el=document.querySelector(`[data-view="${name}"]`);
  if(el) el.classList.add('active');
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.nav===name));
  document.getElementById('views').scrollTop=0;
  if(name==='progress') renderProgress();
  if(name==='mistakes') renderMistakes();
}

// ---------- HOME / PRACTICE ----------
function renderHome(){
  const grid=document.getElementById('home-grid');
  const fav=['airport','hotel','restaurant','taxi','shopping','interview'];
  grid.innerHTML = fav.map(id=>{
    const s=SITUATIONS.find(x=>x.id===id);
    const coming=s.coming?'<span class="card-badge">Soon</span>':'';
    return `<div class="card ${s.coming?'coming':''}" data-id="${s.id}">${coming}<div class="card-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.sub}</p></div>`;
  }).join('');
  grid.querySelectorAll('.card').forEach(c=> c.addEventListener('click',()=>{
    const id=c.dataset.id; const s=SITUATIONS.find(x=>x.id===id);
    if(s.coming) alert('Coming soon — try Airport, Hotel, Restaurant or Taxi (MVP).');
    else startScenario(id);
  }));
  // continue
  const cc=document.getElementById('continue-card');
  if(state.current && SCENARIOS[state.current]){
    cc.classList.remove('hidden');
    document.getElementById('continue-name').textContent = SCENARIOS[state.current].title;
  } else cc.classList.add('hidden');
  document.getElementById('stat-streak').textContent = state.streak;
  document.getElementById('stat-completed').textContent = state.completed.length;
}
function renderPractice(){
  const filter=document.getElementById('category-filter')?.value || 'all';
  let list=SITUATIONS;
  if(filter!=='all'){
    // map filter name to ids: simple contains
    list=SITUATIONS.filter(s=> s.title.toLowerCase().includes(filter.toLowerCase()) || s.sub.toLowerCase().includes(filter.toLowerCase()));
    if(list.length===0) list=SITUATIONS;
  }
  const grid=document.getElementById('practice-grid');
  grid.innerHTML = list.map(s=>{
    const coming=s.coming?'<span class="card-badge">Soon</span>':'<span class="card-badge" style="background:#dcfce7;color:#166534">Ready</span>';
    return `<div class="card ${s.coming?'coming':''}" data-id="${s.id}">${coming}<div class="card-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.sub}</p></div>`;
  }).join('');
  grid.querySelectorAll('.card').forEach(c=> c.addEventListener('click',()=>{
    const s=SITUATIONS.find(x=>x.id===c.dataset.id);
    if(s.coming){
      // generate infinite variant for coming-soon categories
      const catMap={Shopping:'Shopping', 'Job Interview':'Work', Hospital:'Everyday'};
      const cat=catMap[s.title]||'Travel';
      handleInfinite(cat);
    } else startScenario(s.id);
  }));
  // practice AI grid
  const pa=document.getElementById('practice-ai-grid');
  if(pa){
    if(aiCache.length===0) refreshAiGrid();
    // filter aiCache by category if needed
    let filtered=aiCache;
    if(filter!=='all') filtered=aiCache.filter(sc=> sc.meta.category===filter);
    if(filtered.length===0) filtered=aiCache;
    pa.innerHTML = filtered.slice(0,4).map(sc=> `<div class="card" data-gen="${sc.id}" style="border:1px solid #e9d5ff"><span class="card-badge" style="background:linear-gradient(135deg,#6c5cff,#a78bfa);color:#fff">AI</span><div class="card-icon">${sc.icon}</div><h3>${sc.title.split(' — ')[0]}</h3><p>${sc.meta.location} · ${sc.goal}</p></div>`).join('');
    pa.querySelectorAll('.card').forEach(c=> c.addEventListener('click',()=> startScenario(c.dataset.gen)));
  }
}

function renderDailyChallenge(){
  const el=document.getElementById('daily-title');
  if(!el) return;
  const sc=getDailyChallenge();
  // cache daily so same day same scenario (don't save to SCENARIOS yet, just display)
  if(!window._dailyId || window._dailyId!==sc.id){
    window._dailyId=sc.id;
    SCENARIOS[sc.id]=sc;
    window._dailyScenario=sc;
  }
  el.textContent = window._dailyScenario.title;
}

function refreshAiGrid(){
  aiCache=[];
  for(let i=0;i<3;i++){
    const sc=generateScenario();
    SCENARIOS[sc.id]=sc;
    aiCache.push(sc);
  }
  const grid=document.getElementById('ai-grid');
  if(!grid) return;
  grid.innerHTML = aiCache.map(sc=> `<div class="card" data-gen="${sc.id}" style="border:1px solid #e9d5ff"><span class="card-badge" style="background:linear-gradient(135deg,#6c5cff,#22d3ee);color:#fff">AI</span><div class="card-icon">${sc.icon}</div><h3>${sc.title.split(' — ')[0]}</h3><p>${sc.meta.location} · ${sc.goal}</p></div>`).join('');
  grid.querySelectorAll('.card').forEach(c=> c.addEventListener('click',()=> startScenario(c.dataset.gen)));
  // also refresh practice ai if visible
  const pa=document.getElementById('practice-ai-grid');
  if(pa && document.querySelector('[data-view="practice"].active')) renderPractice();
}

function handleInfinite(category){
  let cat = category && category!=='all' ? category : null;
  const sc=generateScenario({category:cat});
  SCENARIOS[sc.id]=sc;
  aiCache.unshift(sc); if(aiCache.length>6) aiCache=aiCache.slice(0,6);
  startScenario(sc.id);
}
function handleSurprise(){
  const sc=generateScenario();
  SCENARIOS[sc.id]=sc;
  aiCache.unshift(sc); if(aiCache.length>6) aiCache=aiCache.slice(0,6);
  const t=document.createElement('div'); t.textContent='🎲 '+sc.title; t.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px;z-index:99'; document.body.appendChild(t); setTimeout(()=>t.remove(),1800);
  startScenario(sc.id);
}
function startEndlessJourney(){
  const chain=generateChain(5);
  endlessChain=chain.scenarios;
  endlessIndex=0;
  endlessChain.forEach(sc=> SCENARIOS[sc.id]=sc);
  alert(`🌎 Endless Journey: Trip to ${chain.location} — ${chain.scenarios.length} linked scenarios. Your story begins now!`);
  startScenario(endlessChain[0].id);
}

// ---------- LEVEL ----------
function openLevelModal(){
  const m=document.getElementById('level-modal');
  const opts=document.getElementById('level-options');
  opts.innerHTML = LEVELS.map(l=>`
    <div class="level-opt ${l.id===state.level?'active':''}" data-id="${l.id}">
      <div><b>${l.name}</b><br><small>${l.desc}</small></div>
      <span>${l.id===state.level?'✓':''}</span>
    </div>`).join('');
  opts.querySelectorAll('.level-opt').forEach(o=> o.addEventListener('click',()=>{
    state.level=o.dataset.id; saveState();
    document.getElementById('btn-level-badge').textContent=state.level;
    renderProfileLevels(); renderProgress(); closeLevelModal();
  }));
  m.classList.remove('hidden');
}
function closeLevelModal(){ document.getElementById('level-modal').classList.add('hidden'); }
function renderProfileLevels(){
  const c=document.getElementById('profile-levels');
  if(!c) return;
  c.innerHTML = LEVELS.map(l=> `<button class="${l.id===state.level?'active':''}" data-id="${l.id}">${l.id}</button>`).join('');
  c.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    state.level=b.dataset.id; saveState();
    document.getElementById('btn-level-badge').textContent=state.level;
    renderProfileLevels(); renderProgress();
  }));
}
function renderPurpose(){
  const c=document.getElementById('profile-purpose');
  if(!c) return;
  c.innerHTML = PURPOSES.map(p=> `<div class="purpose-card ${state.purpose===p.id?'active':''}" data-id="${p.id}"><b>${p.icon} ${p.title}</b><small>${p.desc}</small></div>`).join('');
  c.querySelectorAll('.purpose-card').forEach(el=> el.addEventListener('click',()=>{
    state.purpose=el.dataset.id; saveState(); renderPurpose();
  }));
}
function showPurposeModal(){
  const m=document.getElementById('purpose-modal');
  const opts=document.getElementById('purpose-options');
  opts.innerHTML = PURPOSES.map(p=> `<div class="purpose-card" data-id="${p.id}" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"><div><b>${p.icon} ${p.title}</b><br><small>${p.desc}</small></div><span>›</span></div>`).join('');
  opts.querySelectorAll('.purpose-card').forEach(o=> o.addEventListener('click',()=>{
    state.purpose=o.dataset.id; saveState(); renderPurpose();
    m.classList.add('hidden');
  }));
  const skip=document.getElementById('btn-skip-purpose');
  if(skip) skip.addEventListener('click',()=>{
    if(!state.purpose){ state.purpose='general'; saveState(); renderPurpose(); }
    m.classList.add('hidden');
  }, {once:true});
  m.addEventListener('click', e=>{ if(e.target.id==='purpose-modal') m.classList.add('hidden'); });
  m.classList.remove('hidden');
}

// ---------- SCENARIO ----------
function startScenario(id){
  currentScenario = SCENARIOS[id];
  if(!currentScenario) return;
  state.current=id; saveState();
  turnIndex=0; turnScores=[]; hintLevel=0; scenarioMistakes=[];
  showView('scenario');
  document.getElementById('scenario-icon').textContent=currentScenario.icon;
  let title=currentScenario.title;
  if(endlessChain && endlessChain.some(s=>s.id===id)){
    const pos=endlessChain.findIndex(s=>s.id===id)+1;
    title += ` (${pos}/${endlessChain.length})`;
  }
  document.getElementById('scenario-title').textContent=title;
  document.getElementById('scenario-goal').textContent='Goal: '+currentScenario.goal;
  const chat=document.getElementById('chat');
  chat.innerHTML = `<div class="bubble agent"><div class="role">${currentScenario.character.role}</div>${currentScenario.desc}</div>`;
  // first agent line
  setTimeout(()=> pushAgent(currentScenario.turns[0].agent), 400);
  updateScenarioProgress();
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('hint-area').classList.add('hidden');
  document.getElementById('answer-input').value='';
  document.getElementById('answer-input').focus();
}

function pushAgent(text){
  const chat=document.getElementById('chat');
  const div=document.createElement('div');
  div.className='bubble agent';
  div.innerHTML=`<div class="role">${currentScenario.character.role}</div>${text}`;
  chat.appendChild(div);
  chat.scrollTop=chat.scrollHeight;
  speak(text);
}

function pushUser(text){
  const chat=document.getElementById('chat');
  const div=document.createElement('div');
  div.className='bubble user';
  div.textContent=text;
  chat.appendChild(div);
  chat.scrollTop=chat.scrollHeight;
}

function updateScenarioProgress(){
  const pct = currentScenario ? (turnIndex / currentScenario.turns.length)*100 : 0;
  document.getElementById('scenario-progress-bar').style.width = pct+'%';
}

function handleSend(){
  const input=document.getElementById('answer-input');
  const raw=input.value.trim();
  if(!raw){
    input.focus(); input.style.borderColor='#ef4444';
    setTimeout(()=> input.style.borderColor='', 800);
    return;
  }
  const turn=currentScenario.turns[turnIndex];
  pushUser(raw);
  input.value=''; input.style.height='auto';
  const result = analyzeAnswer(raw, turn, getLevel());
  // hint penalty
  if(hintLevel>0) result.score = Math.max(0, result.score - hintLevel*10);
  turnScores.push(result.score);
  if(result.severity!=='excellent'){
    scenarioMistakes.push({ original:result.original, correction:result.corrected, explanation:result.feedback, scenario:currentScenario.title });
    // also push to global mistakes for Review
    state.mistakes.unshift({ original:result.original, correction:result.corrected, explanation:result.feedback, scenario:currentScenario.title, date:new Date().toISOString().slice(0,10) });
    if(state.mistakes.length>30) state.mistakes=state.mistakes.slice(0,30);
    saveState();
  }
  showFeedback(result);
  // adaptive: if many mistakes, suggest easier hint next time (no auto downgrade, just more hints)
}

function showFeedback(r){
  const fb=document.getElementById('feedback');
  fb.classList.remove('hidden');
  const naturalPart = r.natural ? `<div class="fb-better">💡 <b>More natural:</b> "${r.natural}"</div>` : '';
  const whyPart = r.errors[0] ? `<div class="fb-why"><b>Why?</b> ${r.errors[0].explanation}</div>` : `<div class="fb-why">${r.feedback}</div>`;
  fb.innerHTML = `
    <div class="fb-head"><span class="badge ${r.severity}" style="background:${r.color}">${r.emoji} ${r.label}</span> <span style="margin-left:auto;font-weight:800">${r.score}/100</span></div>
    <div style="font-size:13px;color:var(--muted)">Your answer:</div>
    <div style="font-size:14px;margin:4px 0">"${r.original}"</div>
    ${r.corrected!==r.original ? `<div class="fb-better">✅ <b>Better:</b> "${r.corrected}"</div>` : (r.score>=90?`<div class="fb-better">✅ Perfect!</div>`:'')}
    ${naturalPart}
    ${whyPart}
    <button class="btn primary wide" id="btn-continue-chat" style="margin-top:10px">Got it → Continue</button>
  `;
  fb.querySelector('#btn-continue-chat').addEventListener('click', ()=>{
    fb.classList.add('hidden');
    document.getElementById('hint-area').classList.add('hidden');
    hintLevel=0;
    nextTurn();
  });
  document.getElementById('input-area').style.opacity='.4';
  document.getElementById('input-area').style.pointerEvents='none';
}

function nextTurn(){
  document.getElementById('input-area').style.opacity='1';
  document.getElementById('input-area').style.pointerEvents='auto';
  turnIndex++;
  updateScenarioProgress();
  if(turnIndex >= currentScenario.turns.length){
    finishScenario();
  } else {
    const turn=currentScenario.turns[turnIndex];
    setTimeout(()=> pushAgent(turn.agent), 500);
    document.getElementById('answer-input').focus();
  }
}

function handleHint(){
  const turn=currentScenario.turns[turnIndex];
  const area=document.getElementById('hint-area');
  area.classList.remove('hidden');
  if(hintLevel===0){
    area.innerHTML = `<b>💡 Hint:</b> ${turn.hint}`;
  } else if(hintLevel===1){
    area.innerHTML = `<b>Useful words:</b> ${turn.useful.join(' / ')}<br><small style="color:var(--muted)">Try to make a sentence with them.</small>`;
  } else {
    area.innerHTML = `<b>Example:</b> "${turn.example}"<br><small style="color:var(--muted)">Try to say it in your own words.</small>`;
  }
  hintLevel = Math.min(3, hintLevel+1);
}

function finishScenario(){
  const avg = Math.round(turnScores.reduce((a,b)=>a+b,0)/turnScores.length) || 0;
  const breakdown = {
    grammar: Math.max(0, avg - 2),
    vocab: Math.max(0, avg),
    natural: Math.max(0, avg - 5 + (scenarioMistakes.length? -5:5)),
    understanding: Math.max(0, avg + 4)
  };
  const isDaily = window._dailyScenario && currentScenario.id===window._dailyScenario.id;
  if(isDaily) state.totalMinutes += 2; // bonus for daily
  // save completed
  const metaCat = currentScenario.meta ? currentScenario.meta.category : null;
  state.completed.push({ id:currentScenario.id, category:metaCat, score:avg, date:new Date().toISOString().slice(0,10), breakdown });
  state.totalMinutes += 6;
  // endless journey completion
  if(endlessChain && endlessIndex===endlessChain.length-1){
    state.completed.push({ id:'journey-done', score:100, date:new Date().toISOString().slice(0,10) });
    state.totalMinutes += 4;
  }
  saveState();
  showResult(avg, breakdown, 0);
}

function showResult(avg, breakdown, wantErrors){
  showView('result');
  document.getElementById('result-score').textContent = avg;
  document.querySelector('.score-ring').style.setProperty('--score', avg);
  document.getElementById('result-breakdown').innerHTML = `
    <div><small>Grammar</small><br><b>${breakdown.grammar}%</b></div>
    <div><small>Vocabulary</small><br><b>${breakdown.vocab}%</b></div>
    <div><small>Natural</small><br><b>${breakdown.natural}%</b></div>
    <div><small>Understanding</small><br><b>${breakdown.understanding}%</b></div>
  `;
  document.getElementById('result-good').innerHTML = `<h4>You did well</h4><ul>
    <li>Good basic vocabulary</li>
    <li>You understood the questions</li>
    <li>${avg>=80?'Confident answers':'Keep practicing'}</li>
  </ul>`;
  document.getElementById('result-work').innerHTML = `<h4>Work on</h4><ul>
    <li>Articles (a / an / the)</li>
    <li>Prepositions</li>
    <li>${scenarioMistakes.length? scenarioMistakes[0].explanation : 'Try more complex sentences'}</li>
  </ul>`;
  document.getElementById('result-phrases').innerHTML = `<h4>New phrases</h4>
    "Could I have...?" · "Is it possible to...?" · "I'd like to..." · "How much does it cost?"`;
  renderProgress(); renderMistakes();
}

// ---------- MISTAKES ----------
function renderMistakes(){
  const list=document.getElementById('mistakes-list');
  if(!state.mistakes.length){
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px">No mistakes yet — start a scenario! 🎉</p>`;
    return;
  }
  list.innerHTML = state.mistakes.map((m,i)=>`
    <div class="mistake">
      <div class="orig">❌ "${m.original}"</div>
      <div class="corr">✅ "${m.correction}"</div>
      <div class="exp">${m.explanation}</div>
      <small style="color:var(--muted)">${m.scenario} · ${m.date}</small>
      <button class="btn small" style="margin-top:8px" data-idx="${i}">Practice this mistake</button>
    </div>
  `).join('');
  list.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    const m=state.mistakes[b.dataset.idx];
    alert('Practice: Try to say correctly:\\n"'+m.correction+'"\\n\\nTip: '+m.explanation);
  }));
}

// ---------- PROGRESS ----------
function renderProgress(){
  document.getElementById('p-level').textContent = state.level;
  const h=Math.floor(state.totalMinutes/60), m=state.totalMinutes%60;
  document.getElementById('p-time').textContent = `${h}h ${m}m`;
  document.getElementById('p-scenarios').textContent = state.completed.length;
  const avg = state.completed.length ? Math.round(state.completed.reduce((a,c)=>a+c.score,0)/state.completed.length) : 0;
  document.getElementById('p-avg').textContent = avg ? avg+'%' : '—';
  document.getElementById('p-streak').textContent = state.streak;
  // calendar last 7 days
  const cal=document.getElementById('calendar');
  const today=new Date();
  let html='';
  for(let i=6;i>=0;i--){
    const d=new Date(today); d.setDate(today.getDate()-i);
    const iso=d.toISOString().slice(0,10);
    const active = state.completed.some(c=>c.date===iso) || state.lastDate===iso;
    html+=`<span class="${active?'active':''}">${d.getDate()}</span>`;
  }
  cal.innerHTML=html;
  // skills bars
  const gram = avg? Math.min(100, avg+4) : 0;
  const vocab = avg? Math.max(0, avg-2) : 0;
  const speak = avg? Math.max(0, avg-6) : 0;
  document.getElementById('bar-grammar').style.width=gram+'%';
  document.getElementById('val-grammar').textContent=gram+'%';
  document.getElementById('bar-vocab').style.width=vocab+'%';
  document.getElementById('val-vocab').textContent=vocab+'%';
  document.getElementById('bar-speaking').style.width=speak+'%';
  document.getElementById('val-speaking').textContent=speak+'%';
  // achievements
  const achC=document.getElementById('achievements');
  achC.innerHTML = ACHIEVEMENTS_LIST.map(a=>{
    const unlocked=a.check(state);
    return `<div class="ach ${unlocked?'unlocked':''}"><div>${a.icon}</div><b>${a.title}</b><p>${a.desc}</p>${unlocked?'<small style="color:#10b981">✓ Unlocked</small>':''}</div>`;
  }).join('');
  // fix card pattern
  const fixCard=document.getElementById('fix-card');
  const wantCount = state.mistakes.filter(mm=>/want to/i.test(mm.correction)).length;
  if(wantCount>=3){
    fixCard.classList.remove('hidden');
    fixCard.innerHTML = `<b>Let's fix this —</b> You often forget "to" after "want".<br>
      <small>Try: I want <u>to</u> go home · I want <u>to</u> order coffee · I want <u>to</u> book a room.</small>
      <button class="btn small" style="margin-top:8px" onclick="alert('Great! Practice: Fill — I want ___ go home. → to')">Practice now</button>`;
  } else fixCard.classList.add('hidden');
}

function updateStats(){ renderProgress(); }

// ---------- FREE CONVERSATION ----------
let freeTopic=null, freeHistory=[];
function renderFreeTopics(){
  const g=document.getElementById('topic-grid');
  g.innerHTML = FREE_TOPICS.map(t=> `<div class="card" data-id="${t.id}"><div class="card-icon">${t.icon}</div><h3>${t.title}</h3></div>`).join('');
  g.querySelectorAll('.card').forEach(c=> c.addEventListener('click',()=> startFree(c.dataset.id)));
}
function startFree(id){
  freeTopic=id;
  freeHistory=[];
  document.getElementById('topic-grid').classList.add('hidden');
  document.getElementById('free-chat').classList.remove('hidden');
  document.getElementById('free-result').classList.add('hidden');
  const box=document.getElementById('free-messages');
  box.innerHTML='';
  pushFreeAgent(FREE_STARTERS[id]);
}
function pushFreeAgent(text){
  const box=document.getElementById('free-messages');
  const d=document.createElement('div'); d.className='bubble agent'; d.textContent=text;
  box.appendChild(d); box.scrollTop=box.scrollHeight; speak(text);
  freeHistory.push({role:'agent', text});
}
function pushFreeUser(text){
  const box=document.getElementById('free-messages');
  const d=document.createElement('div'); d.className='bubble user'; d.textContent=text;
  box.appendChild(d); box.scrollTop=box.scrollHeight;
  freeHistory.push({role:'user', text});
}
function handleFreeSend(){
  const inp=document.getElementById('free-input');
  const raw=inp.value.trim(); if(!raw) return;
  pushFreeUser(raw); inp.value='';
  // simple AI follow-up
  const replies=[
    "Interesting! Could you tell me more?",
    "That sounds great. What else do you like about it?",
    "I see. How often do you do that?",
    "Nice! What was the best part?",
  ];
  const reply = replies[Math.floor(Math.random()*replies.length)];
  setTimeout(()=> pushFreeAgent(reply), 700);
}
function endFree(){
  document.getElementById('free-chat').classList.add('hidden');
  const res=document.getElementById('free-result');
  res.classList.remove('hidden');
  const count=freeHistory.filter(h=>h.role==='user').length;
  res.innerHTML = `<div class="result-box"><h4>Conversation Feedback</h4>
    <p style="font-size:13px;color:var(--muted)">You said ${count} sentences. Great practice!</p>
    <ul style="font-size:13px;color:var(--muted)"><li>Keep using varied vocabulary</li><li>Try longer sentences</li><li>Great fluency!</li></ul>
    <button class="btn primary" onclick="document.getElementById('free-result').classList.add('hidden');document.getElementById('topic-grid').classList.remove('hidden');">Back to topics</button>
  </div>`;
  if(count) state.completed.push({id:'free:'+freeTopic, score:80, date:new Date().toISOString().slice(0,10)}), saveState(), renderProgress();
}

// ---------- SPEECH ----------
let recognition=null, isListening=false, holdListening=false;
function getRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ alert('Speech recognition not supported in this browser. Try Chrome on Android/ Desktop.'); return null; }
  const r=new SR(); r.lang='en-US'; r.interimResults=false; r.maxAlternatives=1;
  return r;
}
function toggleSpeak(){
  const area=document.getElementById('voice-hold');
  const isHidden=area.classList.contains('hidden');
  if(isHidden){
    area.classList.remove('hidden');
  } else {
    area.classList.add('hidden');
  }
}
function startHoldSpeak(e){
  e.preventDefault();
  const r=getRecognition(); if(!r) return;
  holdListening=true;
  document.getElementById('btn-hold').textContent='🔴 Listening...';
  r.onresult = ev=>{
    const txt=ev.results[0][0].transcript;
    document.getElementById('voice-text').textContent='"'+txt+'"';
    document.getElementById('answer-input').value=txt;
    document.getElementById('free-input').value=txt;
  };
  r.onerror=()=>{ document.getElementById('btn-hold').textContent='🎤 Hold to Speak'; };
  r.onend=()=>{ document.getElementById('btn-hold').textContent='🎤 Hold to Speak'; holdListening=false; };
  try{ r.start(); recognition=r; }catch(_){}
}
function stopHoldSpeak(){
  if(recognition){ try{ recognition.stop(); }catch(_){} }
  document.getElementById('btn-hold').textContent='🎤 Hold to Speak';
  holdListening=false;
}
function toggleFreeSpeak(){
  // reuse same hold logic for free chat input
  const r=getRecognition(); if(!r) return;
  r.onresult=ev=>{
    const txt=ev.results[0][0].transcript;
    document.getElementById('free-input').value=txt;
  };
  try{ r.start(); }catch(_){}
}
function speak(text){
  if(!('speechSynthesis' in window)) return;
  if(document.getElementById('tg-sound') && !document.getElementById('tg-sound').checked) return;
  const level=getLevel();
  const rate={A1:0.85,A2:0.9,B1:1,B2:1.05,C1:1.1}[level]||1;
  const u=new SpeechSynthesisUtterance(text);
  u.lang='en-US'; u.rate=rate;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
