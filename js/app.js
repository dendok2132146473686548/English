const LS_KEY='erl_state_v2';
const DEFAULT_STATE={level:'B1', completed:[], mistakes:[], generatedHistory:[], prefs:{cats:[]}, voice:true, feedback:'short'};
let state=loadState();
function loadState(){ try{ const r=localStorage.getItem(LS_KEY); if(r) return {...DEFAULT_STATE, ...JSON.parse(r), prefs:{...DEFAULT_STATE.prefs, ...(JSON.parse(r).prefs||{})}}; }catch(e){} return {...DEFAULT_STATE}; }
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
try{ const old=localStorage.getItem('erl_state_v1'); if(old && !localStorage.getItem(LS_KEY)){ localStorage.setItem(LS_KEY, old); state=loadState(); } }catch(e){}

let selectedLevel=state.level;
let selectedCat='Travel';
let currentScenario=null, turnIndex=0, turnScores=[], hintLevel=0, sessionErrors=[], isChecking=false;

const HOME_CATS_UI=[
  {id:'Travel', icon:'✈️', label:'Travel'},
  {id:'Hotel', icon:'🏨', label:'Hotel'},
  {id:'Restaurant', icon:'🍽️', label:'Restaurant'},
  {id:'Transport', icon:'🚕', label:'Transport'},
  {id:'Work', icon:'💼', label:'Work'},
  {id:'Shopping', icon:'🛍️', label:'Shopping'},
];

document.addEventListener('DOMContentLoaded', ()=>{
  renderHome();
  bindEvents();
  updateBadges();
  showView('home');
});

function bindEvents(){
  // bottom nav
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      const nav=b.dataset.nav;
      if(nav==='practice'){
        if(currentScenario) showView('practice');
        else { showView('home'); toast('Start a situation from Home'); }
        return;
      }
      showView(nav);
    });
  });
  // home
  document.getElementById('btn-start-ai').addEventListener('click', handleStart);
  document.getElementById('btn-surprise-home').addEventListener('click', handleSurprise);
  document.getElementById('card-level').addEventListener('click', openLevelModal);
  document.getElementById('btn-level-badge').addEventListener('click', openLevelModal);
  // practice
  document.getElementById('btn-back-home').addEventListener('click', ()=> showView('home'));
  document.getElementById('btn-send').addEventListener('click', handleSend);
  document.getElementById('answer-input').addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); }});
  document.getElementById('answer-input').addEventListener('input', ()=>{
    const btn=document.getElementById('btn-send');
    btn.disabled = !document.getElementById('answer-input').value.trim() || isChecking;
  });
  document.getElementById('btn-hint').addEventListener('click', handleHint);
  document.getElementById('btn-mic').addEventListener('click', toggleMic);
  document.getElementById('btn-hold').addEventListener('pointerdown', startHold);
  document.getElementById('btn-hold').addEventListener('pointerup', stopHold);
  document.getElementById('btn-hold').addEventListener('pointercancel', stopHold);
  // result
  document.getElementById('btn-try-again').addEventListener('click', ()=> startScenario(currentScenario.id, true));
  document.getElementById('btn-new-situation').addEventListener('click', ()=> showView('home'));
  document.getElementById('btn-go-history').addEventListener('click', ()=> showView('history'));
  // progress
  document.getElementById('btn-view-history').addEventListener('click', ()=> showView('history'));
  // profile
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if(confirm('Reset all history?')){ localStorage.removeItem(LS_KEY); state={...DEFAULT_STATE, level:selectedLevel}; saveState(); renderHistory(); renderProgress(); updateBadges(); toast('History cleared'); }
  });
  document.getElementById('tg-voice').addEventListener('change', e=>{ state.voice=e.target.checked; saveState(); });
  document.querySelectorAll('.segmented .seg').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.segmented .seg').forEach(x=> x.classList.remove('active'));
      b.classList.add('active');
      state.feedback=b.dataset.detail; saveState();
    });
  });
  // level modal
  document.getElementById('level-modal').addEventListener('click', e=>{ if(e.target.id==='level-modal') closeLevelModal(); });
}

function showView(name){
  // history is separate view, progress is separate
  const map={home:'home', practice:'practice', progress:'progress', history:'history', profile:'profile', result:'result'};
  const target=map[name]||name;
  document.querySelectorAll('.view').forEach(v=> v.classList.remove('active'));
  const el=document.querySelector(`[data-view="${target}"]`);
  if(el) el.classList.add('active');
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.nav===target || (target==='history'&&b.dataset.nav==='progress') || (target==='result'&&b.dataset.nav==='practice'));
  });
  if(target==='progress') renderProgress();
  if(target==='history') renderHistory();
  if(target==='profile') renderProfile();
  if(target==='home') renderHome();
  window.scrollTo(0,0);
  document.getElementById('views').scrollTop=0;
}

function renderHome(){
  // levels
  const lvl=document.getElementById('home-levels');
  if(lvl){
    lvl.innerHTML = LEVELS.map(l=> `<button class="${l.id===selectedLevel?'active':''}" data-id="${l.id}">${l.label}</button>`).join('');
    lvl.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
      selectedLevel=b.dataset.id; state.level=selectedLevel; saveState();
      updateBadges(); renderHome();
    }));
  }
  document.getElementById('home-level-value').textContent = LEVELS.find(l=>l.id===selectedLevel)?.label + ' — ' + (selectedLevel==='B1'?'Intermediate':selectedLevel);
  // cats
  const cats=document.getElementById('home-cats');
  cats.innerHTML = HOME_CATS_UI.map(c=> `<div class="cat-card" data-id="${c.id}"><div class="icon">${c.icon}</div><b>${c.label}</b><small>${c.id==='Travel'?'Airport • Hotel':c.id==='Work'?'Interview • Meeting':c.id==='Hotel'?'Check-in':c.label}</small></div>`).join('');
  // highlight selected
  cats.querySelectorAll('.cat-card').forEach(card=>{
    if(card.dataset.id===selectedCat) card.style.borderColor='var(--primary)';
    card.addEventListener('click',()=>{
      selectedCat=card.dataset.id;
      cats.querySelectorAll('.cat-card').forEach(x=> x.style.borderColor='');
      card.style.borderColor='var(--primary)';
    });
  });
  // today pills clickable
  document.querySelectorAll('#today-pills span').forEach(p=>{
    p.style.cursor='pointer';
    p.addEventListener('click',()=>{
      const txt=p.textContent.trim();
      if(txt.includes('Airport')) selectedCat='Travel';
      else if(txt.includes('Hotel')) selectedCat='Hotel';
      else if(txt.includes('Restaurant')) selectedCat='Restaurant';
      handleStart();
    });
  });
}

function updateBadges(){
  document.getElementById('btn-level-badge').textContent=state.level;
  const pLvl=document.getElementById('p-level'); if(pLvl) pLvl.textContent=state.level;
  const homeVal=document.getElementById('home-level-value'); if(homeVal) homeVal.textContent=LEVELS.find(l=>l.id===state.level)?.label || state.level;
}

function openLevelModal(){
  const m=document.getElementById('level-modal');
  const opts=document.getElementById('level-options');
  opts.innerHTML = LEVELS.map(l=>`<div class="level-opt ${l.id===state.level?'active':''}" data-id="${l.id}"><div><b>${l.id} — ${l.label}</b><br><small>${l.id==='A1'?'Simple words':l.id==='C1'?'Native-like':''}</small></div><span>${l.id===state.level?'✓':''}</span></div>`).join('');
  opts.querySelectorAll('.level-opt').forEach(o=> o.addEventListener('click',()=>{
    state.level=o.dataset.id; selectedLevel=o.dataset.id; saveState(); updateBadges(); renderHome(); closeLevelModal();
  }));
  m.classList.remove('hidden');
}
function closeLevelModal(){ document.getElementById('level-modal').classList.add('hidden'); }

function handleStart(){
  state.level=selectedLevel; saveState(); updateBadges();
  let cat=selectedCat;
  if(cat==='Surprise') cat=null;
  const map={Travel:'Travel', Hotel:'Hotels', Restaurant:'Food', Transport:'Transport', Work:'Work', Shopping:'Shopping'};
  const genCat = cat ? (map[cat]||cat) : null;
  const sc=generateScenario({category:genCat, level:state.level});
  SCENARIOS[sc.id]=sc;
  startScenario(sc.id);
}
function handleSurprise(){
  const sc=generateScenario({level:state.level});
  SCENARIOS[sc.id]=sc;
  startScenario(sc.id);
}

function startScenario(id){
  const sc=SCENARIOS[id];
  if(!sc) return;
  currentScenario=sc;
  turnIndex=0; turnScores=[]; hintLevel=0; sessionErrors=[]; isChecking=false;
  showView('practice');
  document.getElementById('practice-category').textContent = sc.title.split(' — ')[0];
  document.getElementById('practice-meta').textContent = `${state.level} · ${sc.meta? sc.meta.category : 'Practice'}`;
  document.getElementById('practice-step').textContent = `1 / ${sc.turns.length}`;
  document.getElementById('practice-context').textContent = sc.desc;
  const chat=document.getElementById('chat');
  chat.innerHTML='';
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('hint-area').classList.add('hidden');
  const input=document.getElementById('answer-input');
  input.value=''; input.disabled=false;
  document.getElementById('btn-send').textContent='Send'; document.getElementById('btn-send').disabled=true;
  document.getElementById('practice-progress').style.width='0%';
  setTimeout(()=> pushAgent(sc.turns[0].agent), 300);
}

function pushAgent(text){
  const chat=document.getElementById('chat');
  const d=document.createElement('div'); d.className='bubble agent'; d.innerHTML=`<div class="role">${currentScenario.character.role}</div>${text}`;
  chat.appendChild(d); chat.scrollTop=chat.scrollHeight; speak(text);
}
function pushUser(text){
  const chat=document.getElementById('chat');
  const d=document.createElement('div'); d.className='bubble user'; d.textContent=text;
  chat.appendChild(d); chat.scrollTop=chat.scrollHeight;
}

function handleSend(){
  if(isChecking) return;
  const input=document.getElementById('answer-input');
  const raw=input.value.trim();
  if(!raw){ input.focus(); return; }
  const turn=currentScenario.turns[turnIndex];
  isChecking=true;
  const btn=document.getElementById('btn-send');
  btn.textContent='Checking...'; btn.disabled=true;
  input.disabled=true;
  pushUser(raw);
  setTimeout(()=>{
    const res=analyzeAnswer(raw, turn, state.level);
    if(hintLevel>0) res.score=Math.max(0,res.score - hintLevel*4);
    turnScores.push(res.score);
    if(res.errors.length){
      res.errors.forEach(e=>{ sessionErrors.push(e); state.mistakes.unshift({type:e.type, original:e.original, correction:e.correction, explanation:e.explanation, scenario:currentScenario.title, date:new Date().toISOString().slice(0,10)}); });
      if(state.mistakes.length>50) state.mistakes=state.mistakes.slice(0,50);
      saveState();
    }
    showFeedback(res);
    isChecking=false;
    btn.textContent='Send';
    input.disabled=false; input.value=''; input.focus();
    btn.disabled=true;
  }, 500);
}

function showFeedback(r){
  const fb=document.getElementById('feedback');
  fb.classList.remove('hidden');
  const label=labelForScore(r.score);
  if(r.errors.length===0){
    fb.innerHTML=`<div class="score"><span class="badge excellent">✓ Correct</span><span>${r.score}%</span></div>
      <div style="font-size:11px;color:var(--muted);margin:6px 0">Grammar: ✓ &nbsp; Vocabulary: ✓ &nbsp; Meaning: ✓</div>
      <button class="btn primary" id="btn-continue" style="width:100%;margin-top:8px">Continue →</button>`;
  } else {
    const counts={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
    r.errors.forEach(e=>{ if(counts[e.type]!==undefined) counts[e.type]++; });
    const countsHtml=Object.entries(counts).map(([k,v])=> `${k} ${v?`⚠️ ${v} error${v>1?'s':''}`:'✓'}`).join(' · ');
    const errorsHtml=r.errors.map(e=>`
      <div class="error-item">
        <div class="error-type">${e.type} · ${e.severity}</div>
        <div class="error-orig">❌ ${e.original||r.original}</div>
        <div class="error-corr">→ ${e.correction}</div>
        <div class="error-exp">${e.explanation}</div>
      </div>`).join('');
    fb.innerHTML=`<div class="score"><span class="badge ${label.cls}">${r.score}% · ${label.label}</span></div>
      <div style="font-size:11px;color:var(--muted);margin:6px 0">${countsHtml}</div>
      ${errorsHtml}
      <button class="btn primary" id="btn-continue" style="width:100%;margin-top:8px">Continue →</button>`;
  }
  fb.querySelector('#btn-continue').addEventListener('click', ()=>{
    fb.classList.add('hidden');
    document.getElementById('hint-area').classList.add('hidden');
    hintLevel=0;
    nextTurn();
  });
  // detailed vs short
  if(state.feedback==='short'){
    // keep as is (already short)
  }
}

function nextTurn(){
  turnIndex++;
  document.getElementById('practice-step').textContent = `${Math.min(turnIndex+1, currentScenario.turns.length)} / ${currentScenario.turns.length}`;
  document.getElementById('practice-progress').style.width = (turnIndex/currentScenario.turns.length*100)+'%';
  if(turnIndex >= currentScenario.turns.length){
    finishScenario();
  } else {
    const turn=currentScenario.turns[turnIndex];
    setTimeout(()=> pushAgent(turn.agent), 400);
  }
}

function handleHint(){
  const turn=currentScenario.turns[turnIndex];
  const area=document.getElementById('hint-area');
  area.classList.remove('hidden');
  if(hintLevel===0){
    area.innerHTML = `<b>Hint:</b> ${turn.hint}`;
  } else {
    const vocab = (typeof getVocabHints==='function') ? getVocabHints(turn, state.level) : null;
    if(vocab && vocab.length){
      area.innerHTML = vocab.map(v=> `<b>${v.en}</b>${v.ru?' — '+v.ru:''}`).join('<br>');
    } else {
      area.innerHTML = `<b>Useful words:</b> ${turn.useful.slice(0,4).join(', ')}`;
    }
  }
  hintLevel=Math.min(1, hintLevel+1);
}

function finishScenario(){
  const avg=Math.round(turnScores.reduce((a,b)=>a+b,0)/turnScores.length)||0;
  const totals={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
  sessionErrors.forEach(e=>{ if(totals[e.type]!==undefined) totals[e.type]++; });
  state.completed.push({id:currentScenario.id, title:currentScenario.title, score:avg, date:new Date().toISOString().slice(0,10), totals});
  saveState();
  showResult(avg, totals);
}
function showResult(avg, totals){
  showView('result');
  document.getElementById('result-score').textContent=avg+'%';
  document.getElementById('result-breakdown').innerHTML=`
    <div><small>Grammar</small><br><b>${totals.Grammar||0}</b></div>
    <div><small>Lexical</small><br><b>${totals.Lexical||0}</b></div>
    <div><small>Spelling</small><br><b>${totals.Spelling||0}</b></div>
    <div><small>Meaning</small><br><b>${totals.Meaning||0}</b></div>`;
  let main='—'; let max=0; Object.entries(totals).forEach(([k,v])=>{ if(v>max){max=v; main=k;}});
  if(max===0) main='No errors — great!';
  document.getElementById('result-main').innerHTML=`<div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px"><b>Main problem</b><br><span style="color:var(--muted);font-size:13px">${main}</span></div>`;
}

function renderProgress(){
  const avg = state.completed.length ? Math.round(state.completed.reduce((a,c)=>a+c.score,0)/state.completed.length) : 0;
  document.getElementById('p-avg').textContent = avg ? avg+'%' : '—';
  document.getElementById('p-count').textContent = state.completed.length;
  document.getElementById('p-level').textContent = state.level;
  // weakness
  const totals={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
  state.mistakes.forEach(m=>{ if(totals[m.type]!==undefined) totals[m.type]++; });
  let weak='—'; let mx=0; Object.entries(totals).forEach(([k,v])=>{ if(v>mx){mx=v; weak=k;}});
  document.getElementById('p-weak').textContent = weak;
  const box=document.getElementById('progress-mistakes');
  const groups={};
  state.mistakes.forEach(m=>{
    const key=m.type+':'+m.explanation;
    if(!groups[key]) groups[key]={type:m.type, exp:m.explanation, count:0};
    groups[key].count++;
  });
  const sorted=Object.values(groups).sort((a,b)=>b.count-a.count).slice(0,5);
  if(!sorted.length) box.innerHTML='<p class="muted" style="font-size:12px">No mistakes yet.</p>';
  else box.innerHTML = sorted.map(g=> `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px"><span>${g.type} — ${g.exp}</span><b>${g.count}×</b></div>`).join('');
}

function renderHistory(){
  const list=document.getElementById('history-list');
  const empty=document.getElementById('history-empty');
  const agg=document.getElementById('history-agg');
  if(!state.completed.length && !state.mistakes.length){
    list.innerHTML=''; agg.innerHTML=''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');
  const groups={};
  state.mistakes.forEach(m=>{
    const key=m.type+':'+m.explanation;
    if(!groups[key]) groups[key]={type:m.type, exp:m.explanation, corr:m.correction, count:0, ex:m.original};
    groups[key].count++;
  });
  const sorted=Object.values(groups).sort((a,b)=>b.count-a.count).slice(0,6);
  agg.innerHTML = sorted.length ? '<h3 style="font-size:12px;margin-bottom:6px">Frequent mistakes</h3>' + sorted.map(g=>`
    <div class="history-group"><b>${g.type}</b> — ${g.exp}<br><small>${g.corr}</small><br><small style="color:var(--muted)">×${g.count} · e.g. "${g.ex}"</small></div>
  `).join('') : '';
  list.innerHTML = state.completed.slice().reverse().map(c=>`
    <div class="history-item"><b>${c.title||c.id}</b> <span style="float:right;font-weight:700">${c.score}%</span><br><small>${c.date} · ${c.totals? Object.entries(c.totals).map(([k,v])=>`${k}:${v}`).join(' '):''}</small></div>
  `).join('');
}

function renderProfile(){
  const c=document.getElementById('profile-levels');
  c.innerHTML = LEVELS.map(l=> `<button class="${l.id===state.level?'active':''}" data-id="${l.id}">${l.label}</button>`).join('');
  c.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    state.level=b.dataset.id; selectedLevel=b.dataset.id; saveState(); renderProfile(); updateBadges();
  }));
  const prefs=document.getElementById('pref-cats');
  const cats=['Travel','Work','Everyday','Social'];
  prefs.innerHTML = cats.map(cat=> `<button class="${(state.prefs.cats||[]).includes(cat)?'active':''}" data-cat="${cat}">${cat}</button>`).join('');
  prefs.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    const cat=b.dataset.cat;
    let arr=state.prefs.cats||[];
    if(arr.includes(cat)) arr=arr.filter(x=>x!==cat); else arr.push(cat);
    state.prefs.cats=arr; saveState();
    b.classList.toggle('active');
  }));
  document.getElementById('tg-voice').checked = state.voice!==false;
  const segShort=document.querySelector('[data-detail="short"]');
  const segDet=document.querySelector('[data-detail="detailed"]');
  if(state.feedback==='detailed'){ segDet.classList.add('active'); segShort.classList.remove('active'); }
  else { segShort.classList.add('active'); segDet.classList.remove('active'); }
}

function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg; t.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--primary);color:#fff;padding:8px 14px;border-radius:999px;font-size:12px;z-index:99';
  document.body.appendChild(t); setTimeout(()=> t.remove(), 1600);
}

// speech
let recognition=null;
function getRec(){ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ return null; } const r=new SR(); r.lang='en-US'; r.interimResults=false; return r; }
function toggleMic(){
  const area=document.getElementById('voice-hold');
  const mic=document.getElementById('btn-mic');
  const isHidden=area.classList.contains('hidden');
  if(isHidden){
    if(!getRec()){ document.getElementById('mic-status').textContent='Microphone access is unavailable. You can type your answer instead.'; document.getElementById('mic-status').classList.remove('hidden'); return; }
    area.classList.remove('hidden'); mic.classList.add('listening'); mic.textContent='●';
    document.getElementById('mic-status').textContent='Listening...'; document.getElementById('mic-status').classList.remove('hidden');
  } else {
    area.classList.add('hidden'); mic.classList.remove('listening'); mic.textContent='🎤';
    document.getElementById('mic-status').classList.add('hidden');
  }
}
function startHold(e){ e.preventDefault(); const r=getRec(); if(!r) return; r.onresult=ev=>{ const t=ev.results[0][0].transcript; document.getElementById('answer-input').value=t; document.getElementById('voice-text').textContent=t; document.getElementById('btn-send').disabled=false; }; r.start(); recognition=r; document.getElementById('btn-mic').classList.add('listening'); }
function stopHold(){ if(recognition) try{ recognition.stop(); }catch(_){} document.getElementById('btn-mic').classList.remove('listening'); }
function speak(text){
  if(state.voice===false) return;
  const tg=document.getElementById('tg-voice'); if(tg && !tg.checked) return;
  if(!('speechSynthesis' in window)) return;
  const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate={A1:0.85,A2:0.9,B1:1,B2:1.05,C1:1.1}[state.level]||1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
