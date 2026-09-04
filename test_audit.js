const fs=require('fs');
const base='C:/Users/USER/OneDrive/Desktop/english-real-life/js/';
global.state={level:'B1', completed:[], mistakes:[], generatedHistory:[], purpose:null};
global.saveState=()=>{};
eval(
  fs.readFileSync(base+'data.js','utf8') + '\n' +
  fs.readFileSync(base+'generator.js','utf8') + '\n' +
  fs.readFileSync(base+'engine.js','utf8') + '\n' +
  'global.__T={CATEGORIES:CATEGORIES, generateScenario:generateScenario, ensureNextTurn:ensureNextTurn, isRelevant:isRelevant, analyzeAnswer:analyzeAnswer, getVocabHints:getVocabHints, MAX_TURNS:MAX_TURNS};'
);
const T = global.__T;
const G_CATEGORIES=T.CATEGORIES, G_generateScenario=T.generateScenario, G_ensureNextTurn=T.ensureNextTurn, G_isRelevant=T.isRelevant, G_analyzeAnswer=T.analyzeAnswer, G_getVocabHints=T.getVocabHints, G_MAX_TURNS=T.MAX_TURNS;
function isValidFeedback(res, scenario){
  if(!res || !res.corrected) return false;
  const corrLower=(res.corrected||'').toLowerCase();
  const scenLower=(scenario.desc||'').toLowerCase();
  const isLuggage = scenLower.includes('damaged') || scenLower.includes('luggage') || scenLower.includes('suitcase');
  if(isLuggage && corrLower.includes('reservation') && !res.original.toLowerCase().includes('reservation')){
    return false;
  }
  const origLower=(res.original||'').toLowerCase();
  if(/damaged|broken/.test(origLower) && !/damaged|broken|repair|suitcase|bag/.test(corrLower)){
    return false;
  }
  return true;
}

let fails=0;
function ok(cond, name, extra){
  if(cond){ console.log('PASS '+name); }
  else{ fails++; console.log('FAIL '+name+(extra?' :: '+extra:'')); }
}

// 1. All 8 G_CATEGORIES generate valid, context-locked scenarios
const cats=Object.keys(G_CATEGORIES);
ok(cats.length===8, '8 G_CATEGORIES present', cats.join(','));
cats.forEach(cat=>{
  const sc=G_generateScenario({category:cat, level:'B1'});
  const bad=sc.turns.filter(t=>G_isRelevant(t.agent, cat)<25);
  ok(bad.length===0, `context-lock ${cat}`, bad.map(t=>t.agent).join(' | '));
  ok(!!(sc.meta && sc.meta.lockedContext && sc.meta.conversationId), `lockedContext+conversationId ${cat}`);
  ok(sc.turns.length>=2, `>=2 turns ${cat}`);
});

// 2. Continuation: follow-ups stay in context, stop at G_MAX_TURNS
const sc2=G_generateScenario({category:'Travel', level:'B1'});
let n=0, drift=[];
while(true){
  const t=G_ensureNextTurn(sc2);
  if(!t) break;
  n++;
  const cat=sc2.meta.category;
  if(G_isRelevant(t.agent, cat)<25) drift.push(t.agent);
  if(n>20) break; // safety
}
ok(n>0, 'follow-ups generated', 'n='+n);
ok(drift.length===0, 'no context drift in follow-ups', drift.join(' | '));
ok(sc2.turns.length<=G_MAX_TURNS, 'turns capped at G_MAX_TURNS', 'len='+sc2.turns.length);
ok(G_ensureNextTurn(sc2)===null, 'null after G_MAX_TURNS');

// 3. Generic acknowledgments are not flagged off-topic (no regen loops)
ok(G_isRelevant('Thank you for your patience. Is there anything else?', 'Travel')>=25, 'closing turn relevant');
ok(G_isRelevant('Sure, no problem.', 'Hotels')>=25, 'ack relevant');
ok(G_isRelevant('Would you like breakfast at your hotel?', 'Travel')<25, 'hotel line blocked in Travel');

// 4. Bug case: damaged luggage correction stays in context, Meaning correct
const scenD={desc:'You are in Tokyo. Your suitcase is damaged. Goal: Find your luggage.', goal:'Find your luggage', meta:{problem:'Your suitcase is damaged', category:'Travel'}};
const turnD={agent:'Your suitcase is damaged. How can I help?', hint:'', useful:[], example:'', correct:'', keywords:['suitcase','damaged','repair']};
const r1=G_analyzeAnswer('I have damaged my suitcases, where i can remote it', turnD, 'B1', scenD);
ok(r1.errors.some(e=>e.type==='Grammar'), 'bug: grammar flagged');
ok(r1.errors.some(e=>e.type==='Lexical'), 'bug: lexical flagged');
ok(r1.breakdown.Meaning===0, 'bug: Meaning correct', JSON.stringify(r1.breakdown));
ok(!/reservation/i.test(r1.corrected), 'bug: no reservation in correction', r1.corrected);
ok(isValidFeedback(r1, scenD)===true, 'bug: feedback valid');

// 5. Semantic equivalence: different correct phrasings all pass
const turnW={agent:'Would you like a window seat?', hint:'', useful:[], example:'', correct:'', keywords:['window','seat']};
['Could I get a seat near the window?','Can I have a window seat?',"No, I'd rather sit near the aisle."].forEach((a,i)=>{
  const r=G_analyzeAnswer(a, turnW, 'B1', {desc:'Airport window seat', goal:'Choose seat', meta:{problem:'Choose seat', category:'Travel'}});
  const pass = r.errors.length===0 || r.breakdown.Meaning===0;
  ok(pass, 'semantic variant '+(i+1)+' accepted', a+' -> '+JSON.stringify(r.errors.map(e=>e.type)));
});

// 5b. Off-topic answers are still caught
const rOff=G_analyzeAnswer('I want to book a hotel room with breakfast', turnD, 'B1', scenD);
ok(rOff.breakdown.Meaning>0, 'off-topic flagged Meaning', JSON.stringify(rOff.breakdown));

// 6. Meaning separated from grammar: bad grammar, clear meaning
const r6=G_analyzeAnswer('Yesterday I go airport and miss flight.', {agent:'What happened?', hint:'', useful:[], example:'', correct:'', keywords:['airport','flight','miss']}, 'B1', {desc:'Airport missed flight', goal:'Explain', meta:{problem:'Missed flight', category:'Travel'}});
ok(r6.breakdown.Meaning===0, 'meaning not duplicated with grammar', JSON.stringify(r6.breakdown));
ok(r6.breakdown.Grammar>0, 'grammar flagged');

// 7. Scoring sanity
ok(G_analyzeAnswer('Thank you!', {agent:'Anything else?', hint:'', useful:[], example:'', correct:'', keywords:['thank']}, 'B1', {desc:'x', goal:'y', meta:{}}).score===100, 'perfect = 100');
const rMin=G_analyzeAnswer('i want go airport tomorow', {agent:'Where?', hint:'', useful:[], example:'', correct:'', keywords:['airport']}, 'B1', {desc:'Airport', goal:'g', meta:{}});
ok(rMin.score>=50 && rMin.score<100, 'single-construction penalty bounded', 'score='+rMin.score);

// 8. Vocab hints: 2-4, context words only
const vh=G_getVocabHints({useful:['receipt','here','lost','bag']}, 'B1');
ok(vh.length>=2 && vh.length<=4, 'vocab hint count 2-4', 'n='+vh.length);

// 9. Mass generation: 50 scenarios, no throw, no infinite loop
const t0=Date.now();
for(let i=0;i<50;i++){ G_generateScenario({level:['A1','B1','C1'][i%3]}); }
ok(Date.now()-t0 < 5000, '50 generations fast, no hang', (Date.now()-t0)+'ms');

console.log(fails===0 ? 'ALL TESTS PASSED' : fails+' TESTS FAILED');
process.exit(fails===0?0:1);

