const LS_KEY='erl_state_v2';
const DEFAULT_STATE={level:'B1', completed:[], mistakes:[], generatedHistory:[], purpose:null};
let state=loadState();
function loadState(){ try{ const r=localStorage.getItem(LS_KEY); if(r) return {...DEFAULT_STATE, ...JSON.parse(r)}; }catch(e){} return {...DEFAULT_STATE}; }
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

let currentScenario=null, turnIndex=0, turnScores=[], hintLevel=0, sessionErrors=[];

const LS_KEY_OLD='erl_state_v1';
try{ const old=localStorage.getItem(LS_KEY_OLD); if(old && !localStorage.getItem(LS_KEY)){ localStorage.setItem(LS_KEY, old); state=loadState(); } }catch(e){}

let selectedLevel = state.level;
let selectedCat = 'Travel';

document.addEventListener('DOMContentLoaded', ()=>{
  renderHomeSelectors();
  bindEvents();
  showView('home');
  updateSettingsUI();
});

function bindEvents(){
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=> b.addEventListener('click',()=> showView(b.dataset.nav)));
  document.getElementById('btn-start').addEventListener('click', handleStart);
  document.getElementById('btn-surprise-home').addEventListener('click', ()=>{ selectedCat='Surprise'; handleStart(); });
  document.getElementById('btn-back-home').addEventListener('click', ()=> showView('home'));
  document.getElementById('btn-send').addEventListener('click', handleSend);
  document.getElementById('answer-input').addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); }});
  document.getElementById('btn-hint').addEventListener('click', handleHint);
  document.getElementById('btn-speak').addEventListener('click', toggleSpeak);
  document.getElementById('btn-hold').addEventListener('pointerdown', startHold);
  document.getElementById('btn-hold').addEventListener('pointerup', stopHold);
  document.getElementById('btn-hold').addEventListener('pointercancel', stopHold);
  document.getElementById('btn-try-again').addEventListener('click', ()=> startScenario(currentScenario.id, true));
  document.getElementById('btn-new-situation').addEventListener('click', ()=>{ showView('home'); });
  document.getElementById('btn-go-history').addEventListener('click', ()=> showView('history'));
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if(confirm('Reset history?')){ localStorage.removeItem(LS_KEY); state={...DEFAULT_STATE, level:selectedLevel}; saveState(); renderHistory(); updateSettingsUI(); alert('Cleared'); }
  });
  document.getElementById('tg-sound').addEventListener('change', e=>{ localStorage.setItem('erl_sound', e.target.checked); });
  const tg=document.getElementById('tg-sound'); if(tg) tg.checked = localStorage.getItem('erl_sound')!=='false';
}

function showView(name){
  document.querySelectorAll('.view').forEach(v=> v.classList.remove('active'));
  const el=document.querySelector(`[data-view="${name}"]`);
  if(el) el.classList.add('active');
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.nav===name));
  if(name==='history') renderHistory();
  if(name==='settings') updateSettingsUI();
  window.scrollTo(0,0);
}

function renderHomeSelectors(){
  const lvl=document.getElementById('home-levels');
  lvl.innerHTML = LEVELS.map(l=> `<button class="${l.id===selectedLevel?'active':''}" data-id="${l.id}">${l.label}</button>`).join('');
  lvl.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    selectedLevel=b.dataset.id; state.level=selectedLevel; saveState();
    lvl.querySelectorAll('button').forEach(x=> x.classList.toggle('active', x.dataset.id===selectedLevel));
    updateSettingsUI();
  }));
  const cats=document.getElementById('home-cats');
  const catsData=[...HOME_CATS];
  cats.innerHTML = catsData.map(c=> `<button class="${c.id===selectedCat?'active':''}" data-id="${c.id}">${c.label}</button>`).join('');
  cats.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
    selectedCat=b.dataset.id;
    cats.querySelectorAll('button').forEach(x=> x.classList.toggle('active', x.dataset.id===selectedCat));
  }));
}

function updateSettingsUI(){
  const c=document.getElementById('settings-levels');
  if(c){
    c.innerHTML = LEVELS.map(l=> `<button class="${l.id===state.level?'active':''}" data-id="${l.id}">${l.label}</button>`).join('');
    c.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=>{
      state.level=b.dataset.id; selectedLevel=b.dataset.id; saveState();
      updateSettingsUI(); renderHomeSelectors();
    }));
  }
}

function handleStart(){
  state.level=selectedLevel; saveState();
  let cat = selectedCat;
  if(cat==='Surprise') cat=null;
  // map Home cats to generator categories
  const map={Travel:'Travel', Work:'Work', 'Everyday': 'Everyday', 'Everyday Life':'Everyday', Social:'Social'};
  const genCat = cat ? (map[cat]||null) : null;
  const sc = generateScenario({category:genCat, level:state.level});
  SCENARIOS[sc.id]=sc;
  startScenario(sc.id);
}

function startScenario(id, isRetry=false){
  const sc=SCENARIOS[id]||Object.values(SCENARIOS).find(s=>s.id===id);
  if(!sc){ alert('Scenario not found'); return; }
  currentScenario=sc;
  turnIndex=0; turnScores=[]; hintLevel=0; sessionErrors=[];
  showView('practice');
  document.getElementById('practice-category').textContent = sc.title.split(' — ')[0] || sc.title;
  document.getElementById('practice-goal').textContent = 'Goal: '+sc.goal;
  document.getElementById('practice-step').textContent = `1 / ${sc.turns.length}`;
  document.getElementById('practice-context').textContent = sc.desc;
  const chat=document.getElementById('chat');
  chat.innerHTML='';
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('hint-area').classList.add('hidden');
  document.getElementById('answer-input').value='';
  document.getElementById('voice-text').textContent='';
  pushAgent(sc.turns[0].agent);
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
  const input=document.getElementById('answer-input');
  const raw=input.value.trim();
  if(!raw){ input.focus(); return; }
  const turn=currentScenario.turns[turnIndex];
  pushUser(raw);
  input.value='';
  const res=analyzeAnswer(raw, turn, state.level);
  // hint penalty: -3 per hint level already handled via score? we adjust here
  if(hintLevel>0){
    const pen = hintLevel*4;
    res.score=Math.max(0,res.score-pen);
  }
  turnScores.push(res.score);
  if(res.errors.length){
    res.errors.forEach(e=>{
      sessionErrors.push(e);
      state.mistakes.unshift({type:e.type, original:e.original, correction:e.correction, explanation:e.explanation, scenario:currentScenario.title, date:new Date().toISOString().slice(0,10)});
    });
    if(state.mistakes.length>50) state.mistakes=state.mistakes.slice(0,50);
    saveState();
  }
  showFeedback(res);
}

function showFeedback(r){
  const fb=document.getElementById('feedback');
  fb.classList.remove('hidden');
  const breakdown=r.breakdown;
  const hasErrors=r.errors.length>0;
  if(!hasErrors){
    fb.innerHTML=`<div class="score"><span class="badge excellent">✅ Correct</span><span>100%</span></div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">Grammar: ✓ &nbsp; Vocabulary: ✓ &nbsp; Meaning: ✓</div>
      <button class="btn primary" id="btn-continue" style="margin-top:10px;width:100%">Continue →</button>`;
  } else {
    const counts=`Grammar: ${breakdown.Grammar||0} · Lexical: ${breakdown.Lexical||0} · Spelling: ${breakdown.Spelling||0} · Meaning: ${breakdown.Meaning||0}`;
    const errorsHtml=r.errors.map(e=>`
      <div class="error-item">
        <div class="error-type">${e.type} · ${e.severity}</div>
        <div class="error-orig">❌ ${e.original || r.original}</div>
        <div class="error-corr">→ ${e.correction}</div>
        <div class="error-exp">${e.explanation}</div>
      </div>`).join('');
    const label=labelForScore(r.score);
    fb.innerHTML=`<div class="score"><span class="badge ${label.cls}">${r.score}% · ${label.label}</span></div>
      <div style="font-size:11px;color:var(--muted);margin:6px 0">${counts}</div>
      ${errorsHtml}
      <button class="btn primary" id="btn-continue" style="margin-top:10px;width:100%">Continue →</button>`;
  }
  document.getElementById('input-area').style.opacity='.5';
  document.getElementById('input-area').style.pointerEvents='none';
  fb.querySelector('#btn-continue').addEventListener('click', ()=>{
    fb.classList.add('hidden');
    document.getElementById('hint-area').classList.add('hidden');
    hintLevel=0;
    document.getElementById('input-area').style.opacity='1';
    document.getElementById('input-area').style.pointerEvents='auto';
    nextTurn();
  });
}

function nextTurn(){
  turnIndex++;
  document.getElementById('practice-step').textContent = `${Math.min(turnIndex+1, currentScenario.turns.length)} / ${currentScenario.turns.length}`;
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
    area.textContent = turn.hint;
  } else if(hintLevel===1){
    area.innerHTML = `<b>Useful words:</b> ${turn.useful.join(', ')}`;
  } else {
    area.textContent = `Try: "${turn.example}" — say it in your own words.`;
  }
  hintLevel=Math.min(2,hintLevel+1);
}

function finishScenario(){
  const avg=Math.round(turnScores.reduce((a,b)=>a+b,0)/turnScores.length)||0;
  // breakdown totals
  const totals={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
  sessionErrors.forEach(e=>{ if(totals[e.type]!==undefined) totals[e.type]++; });
  state.completed.push({id:currentScenario.id, title:currentScenario.title, score:avg, date:new Date().toISOString().slice(0,10), totals, errors:sessionErrors.slice()});
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
  // main problem = most frequent error type
  let main='—';
  let max=0;
  Object.entries(totals).forEach(([k,v])=>{ if(v>max){max=v; main=k;}});
  if(max===0) main='No errors';
  document.getElementById('result-main').innerHTML=`<div class="history-group"><b>Main problem</b><br><span style="color:var(--muted)">${main}</span></div>`;
}

function renderHistory(){
  const list=document.getElementById('history-list');
  const empty=document.getElementById('history-empty');
  const agg=document.getElementById('history-errors');
  if(!state.completed.length && !state.mistakes.length){
    list.innerHTML=''; agg.innerHTML=''; empty.style.display='block'; return;
  }
  empty.style.display='none';
  // aggregated errors
  const groups={};
  state.mistakes.forEach(m=>{
    const key=m.type+':'+m.explanation;
    if(!groups[key]) groups[key]={type:m.type, exp:m.explanation, correction:m.correction, count:0, example:m.original};
    groups[key].count++;
  });
  const sorted=Object.values(groups).sort((a,b)=>b.count-a.count).slice(0,6);
  if(sorted.length){
    agg.innerHTML='<h3 style="font-size:13px;margin-bottom:6px">Frequent mistakes</h3>' + sorted.map(g=>`
      <div class="history-group"><b>${g.type}</b> — ${g.exp}<br><small>${g.correction}</small><br><small style="color:var(--muted)">You made this ${g.count} times · e.g. "${g.example}"</small></div>
    `).join('');
  } else agg.innerHTML='';
  // list of scenarios
  list.innerHTML = state.completed.slice().reverse().map(c=>`
    <div class="history-item">
      <b>${c.title||c.id}</b> <span style="float:right;font-weight:700">${c.score}%</span><br>
      <small>${c.date} · ${(c.totals? Object.entries(c.totals).map(([k,v])=>`${k}:${v}`).join(' ') : '')}</small>
    </div>
  `).join('');
}

// speech
let recognition=null;
function getRec(){ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ alert('Speech not supported. Use Chrome.'); return null; } const r=new SR(); r.lang='en-US'; r.interimResults=false; return r; }
function toggleSpeak(){ const a=document.getElementById('voice-hold'); a.classList.toggle('hidden'); }
function startHold(e){ e.preventDefault(); const r=getRec(); if(!r) return; r.onresult=ev=>{ const t=ev.results[0][0].transcript; document.getElementById('answer-input').value=t; document.getElementById('voice-text').textContent=t; }; r.onend=()=>{}; try{ r.start(); recognition=r; }catch(_){} }
function stopHold(){ if(recognition) try{ recognition.stop(); }catch(_){} }
function speak(text){
  const tg=document.getElementById('tg-sound');
  if(tg && !tg.checked) return;
  if(!('speechSynthesis' in window)) return;
  const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate={A1:0.85,A2:0.9,B1:1,B2:1.05,C1:1.1}[state.level]||1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
