// Engine — intent-aware, minimal correction, context-locked
function normalize(s){ return s.trim().replace(/\s+/g,' ').toLowerCase().replace(/[.,!?;:]+$/g,''); }

const RULES = [
  { re:/\bwant\s+(change|go|order|book|see|check|have)\b/i, type:'Grammar', severity:'Medium', fix:(m)=>`want to ${m[1]}`, exp:'After "want" use "to" + verb.' },
  { re:/\bwhere\s+i\s+can\b/i, type:'Grammar', severity:'Medium', fix:'where can I', exp:'Word order in questions: where can I ...' },
  { re:/\bcan you explain me\b/i, type:'Grammar', severity:'Medium', fix:'can you explain to me', exp:'Verb + to + person: explain to me.' },
  { re:/\bexplain me\b/i, type:'Grammar', severity:'Medium', fix:'explain to me', exp:'explain to me (not explain me).' },
  { re:/\bfor headache\b/i, type:'Grammar', severity:'Minor', fix:'for a headache', exp:'Article: for a headache.' },
  { re:/\bi have book\b/i, type:'Grammar', severity:'Medium', fix:'I have booked', exp:'Present Perfect: have + past participle.' },
  { re:/\byesterday i go\b/i, type:'Grammar', severity:'Major', fix:'yesterday I went', exp:'Past Simple for past time: go → went.' },
  { re:/\bi booked room\b/i, type:'Grammar', severity:'Minor', fix:'I booked a room', exp:'Article before countable noun: a room.' },
  { re:/\bremote\b/i, type:'Lexical', severity:'Medium', fix:'repair', exp:'"Remote" means distant. Use "repair" for fixing something damaged.' },
  { re:/\bremonte\b/i, type:'Lexical', severity:'Medium', fix:'repair', exp:'Use "repair" for fixing.' },
];

const SPELL_MAP = { restorant:'restaurant', adress:'address', recieve:'receive', accomodation:'accommodation', suitcases:'suitcase' };

// Semantic groups: words that express the same intent (§17).
// Used so "aisle" counts as answering a "window seat?" question, etc.
const SEMANTIC_SETS = [
  ['seat','window','aisle','middle','sit','sitting','sat'],
  ['luggage','suitcase','bag','baggage'],
  ['damaged','broken','damage','crack','torn','cracked'],
  ['repair','fix','fixed','mend','repaired'],
  ['room','hotel','reservation','stay','checkin','checkout'],
  ['breakfast','dinner','lunch','meal','food'],
  ['order','menu','dish','chicken','fish','bill','check','table','drink'],
  ['taxi','driver','road','street','address','ride'],
  ['shirt','size','small','bigger','clothes','fitting'],
  ['meeting','appointment','interview','job','work'],
  ['doctor','symptoms','throat','medicine','appointment','insurance'],
  ['yes','yeah','sure','okay','ok','course','please'],
  ['no','not','rather','prefer'],
  ['thank','thanks'],
  ['when','what','where','how','much','long'],
  ['change','rebook','cancel','refund','options'],
  ['price','cost','pay','card','cash','euros','dollars'],
];

function semanticGroup(w){
  for(let i=0;i<SEMANTIC_SETS.length;i++){
    if(SEMANTIC_SETS[i].includes(w)) return i;
  }
  return -1;
}

function detectIntent(raw, scenario, turn){
  const lower = raw.toLowerCase();
  // Build context keywords from scenario
  const ctxText = ((scenario && scenario.desc)||'') + ' ' + ((scenario && scenario.goal)||'') + ' ' + ((scenario && scenario.meta && scenario.meta.problem)||'') + ' ' + (turn.keywords||[]).join(' ');
  const ctxWords = ctxText.toLowerCase().split(/[^a-z]+/).filter(w=>w.length>2);
  const rawWords = lower.split(/[^a-z]+/).filter(w=>w.length>2);
  const ctxGroups = {};
  ctxWords.forEach(w=>{ const g=semanticGroup(w); if(g>=0) ctxGroups[g]=true; });
  // Check overlap: direct words OR shared semantic group
  let overlap=0;
  rawWords.forEach(w=>{
    if(ctxWords.includes(w)){ overlap++; return; }
    const g=semanticGroup(w);
    if(g>=0 && ctxGroups[g]) overlap++;
  });
  let intentMatch=false;
  // If scenario is about damaged luggage, check if raw mentions luggage/damaged/repair
  const isLuggageScenario = ctxText.toLowerCase().includes('damaged') || ctxText.toLowerCase().includes('luggage') || ctxText.toLowerCase().includes('suitcase');
  if(isLuggageScenario){
    if(/damaged|broken|suitcase|bag|luggage|repair|fix|where.*can/i.test(lower)) intentMatch=true;
  }
  // Generic: if any raw word overlaps with ctxWords, consider intent relevant
  if(overlap>=1) intentMatch=true;
  if(intentMatch) return { relevant:true, score: 90 };
  // Check if raw is completely off-topic
  if(overlap===0 && rawWords.length>3){
    if(isLuggageScenario && /reservation|hotel|room|breakfast/.test(lower)) return { relevant:false, score: 20 };
  }
  return { relevant: overlap>0, score: overlap>0? 70 : 30 };
}

function analyzeAnswer(raw, turn, level, scenario){
  const errors=[];
  if(!raw || !raw.trim()){
    return { score:0, errors:[{type:'Meaning',severity:'Major',original:'',correction:'',explanation:'Please try to answer.'}], breakdown:{Grammar:1,Lexical:0,Spelling:0,Meaning:1}, corrected:'' };
  }
  let corrected = raw.trim();
  let lower = raw.toLowerCase();

  // Spelling - only for clear typos, not for lexical errors like remote->repair (that's Lexical)
  Object.keys(SPELL_MAP).forEach(k=>{
    // Don't treat remote as spelling, it's lexical
    if(k==='remote') return;
    const re=new RegExp(`\\b${k}\\b`,'i');
    if(re.test(lower) && k!=='suitcases'){ // suitcases is not really spelling error in this context
      // Only flag if it's truly a typo, not plural
      if(k==='suitcases' && /damaged.*suitcases/i.test(lower)) return; // keep plural if user said suitcases
      errors.push({type:'Spelling',severity:'Minor',original:k,correction:SPELL_MAP[k],explanation:`Spelling: ${k} → ${SPELL_MAP[k]}`});
      corrected = corrected.replace(re, SPELL_MAP[k]);
    }
  });

  // Grammar & Lexical rules
  const seen=new Set();
  RULES.forEach(r=>{
    if(r.re.test(raw) && !seen.has(r.exp)){
      const m=raw.match(r.re);
      // Avoid duplicate remote/repair if already handled
      if(r.re.toString().includes('remote') && /repair/i.test(lower)) return;
      errors.push({type:r.type,severity:r.severity,original:m?m[0]:'',correction: typeof r.fix==='function' && m ? r.fix(m) : r.fix,explanation:r.exp});
      seen.add(r.exp);
      if(typeof r.fix==='string') corrected = corrected.replace(r.re, r.fix);
      else if(typeof r.fix==='function' && m) corrected = corrected.replace(r.re, r.fix(m));
    }
  });

  // Capitalization
  if(/^\s*[a-z]/.test(raw)){
    errors.push({type:'Spelling',severity:'Minor',original:raw.trim()[0],correction:raw.trim()[0].toUpperCase(),explanation:'Start with capital letter.'});
    corrected = corrected.charAt(0).toUpperCase()+corrected.slice(1);
  }

  // Intent / Meaning check - context-aware
  const intent = detectIntent(raw, scenario, turn);
  if(!intent.relevant){
    errors.push({type:'Meaning',severity:'Major',original:raw,correction:'',explanation:`Your answer doesn't fit the situation. ${turn.hint}`});
  }
  // Do NOT add Meaning error if intent is relevant, even if grammar is bad
  // Remove any previous Meaning error that was based on keyword count

  // Fix where i can -> where can I already handled, but ensure corrected preserves meaning
  // Minimal correction: if we have lexical error remote->repair, ensure corrected reflects it
  // For the example, raw "I have damaged my suitcases, where i can remote it" should become "I have damaged my suitcases, where can I repair it" or "My suitcase is damaged. Where can I get it repaired?"
  // Our current corrected after rules: "I have damaged my suitcases, where can I repair it" (if both rules applied)
  // That's minimal and preserves meaning - good. Don't replace with reservation.

  // Deduplicate
  const uniq=[];
  const seenExp=new Set();
  errors.forEach(e=>{ if(!seenExp.has(e.explanation)){ seenExp.add(e.explanation); uniq.push(e); } });

  // Scoring
  let score=100;
  let dedup=0;
  uniq.forEach(e=>{
    const pen={Minor:3,Medium:7,Major:12}[e.severity]||7;
    dedup+=pen;
  });
  dedup=Math.min(dedup,30);
  score=Math.max(0,100-dedup);
  if(level==='A1' && score<100) score=Math.min(100, score+5);
  if(level==='C1' && score>0) score=Math.max(0, score-3);
  score=Math.round(score);

  const breakdown={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
  uniq.forEach(e=>{ if(breakdown[e.type]!==undefined) breakdown[e.type]++; });

  // Generate minimal corrected sentence if needed and not already corrected
  let finalCorrected = corrected;
  if(uniq.length && finalCorrected.toLowerCase()===raw.trim().toLowerCase()){
    // No correction applied but errors exist, need to generate one
    // For meaning-relevant errors, keep original but fixed
    finalCorrected = corrected;
  }
  // Ensure corrected is not from other scenario (e.g., reservation) - validate
  if(scenario && finalCorrected.toLowerCase().includes('reservation') && !raw.toLowerCase().includes('reservation') && !scenario.desc.toLowerCase().includes('reservation')){
    // This would be irrelevant correction, fallback to minimal fix of raw
    finalCorrected = raw.trim();
    // Re-apply only relevant fixes
    if(/remote/i.test(raw)) finalCorrected = finalCorrected.replace(/remote/gi, 'repair');
    if(/where\s+i\s+can/i.test(raw)) finalCorrected = finalCorrected.replace(/where\s+i\s+can/gi, 'where can I');
  }

  return { score, errors:uniq, breakdown, corrected: uniq.length? finalCorrected : raw.trim(), original:raw };
}

function labelForScore(s){
  if(s===100) return {label:'Excellent', cls:'excellent'};
  if(s>=90) return {label:'Very good', cls:'verygood'};
  if(s>=80) return {label:'Good', cls:'good'};
  if(s>=70) return {label:'Needs practice', cls:'needs'};
  if(s>=60) return {label:'Needs improvement', cls:'needs'};
  return {label:'Keep practicing', cls:'poor'};
}
