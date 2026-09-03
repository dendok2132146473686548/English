// Engine — precise error analysis, no artificial "more natural" rewrites
function normalize(s){ return s.trim().replace(/\s+/g,' ').toLowerCase().replace(/[.,!?;:]+$/g,''); }

const RULES = [
  { re:/\bwant\s+(change|go|order|book|see|check|have)\b/i, type:'Grammar', severity:'Medium', fix:(m)=>`want to ${m[1]}`, exp:'After "want" use "to" + verb.' },
  { re:/\bcan you explain me\b/i, type:'Grammar', severity:'Medium', fix:'can you explain to me', exp:'Verb + to + person: explain to me.' },
  { re:/\bfor headache\b/i, type:'Grammar', severity:'Minor', fix:'for a headache', exp:'Article: for a headache.' },
  { re:/\bi have book\b/i, type:'Grammar', severity:'Medium', fix:'I have booked', exp:'Present Perfect: have + past participle.' },
  { re:/\byesterday i go\b/i, type:'Grammar', severity:'Major', fix:'yesterday I went', exp:'Past Simple for past time: go → went.' },
  { re:/\bi booked room\b/i, type:'Grammar', severity:'Minor', fix:'I booked a room', exp:'Article before countable noun: a room.' },
  { re:/\bexplain me the problem\b/i, type:'Grammar', severity:'Medium', fix:'explain the problem to me', exp:'explain something to someone.' },
];

const SPELL_MAP = { restorant:'restaurant', adress:'address', recieve:'receive', accomodation:'accommodation' };

function analyzeAnswer(raw, turn, level){
  const errors=[];
  if(!raw || !raw.trim()){
    return { score:0, errors:[{type:'Meaning',severity:'Major',original:'',correction:turn.correct,explanation:'Please try to answer.'}], breakdown:{Grammar:1,Lexical:0,Spelling:0,Meaning:1}, corrected:turn.correct };
  }
  let corrected = raw.trim();
  let lower = raw.toLowerCase();

  // Spelling
  Object.keys(SPELL_MAP).forEach(k=>{
    const re=new RegExp(`\\b${k}\\b`,'i');
    if(re.test(lower)){
      errors.push({type:'Spelling',severity:'Minor',original:k,correction:SPELL_MAP[k],explanation:`Spelling: ${k} → ${SPELL_MAP[k]}`});
      corrected = corrected.replace(re, SPELL_MAP[k]);
    }
  });

  // Grammar rules — only one per pattern, avoid double penalty for same construction
  const seen=new Set();
  RULES.forEach(r=>{
    if(r.re.test(raw) && !seen.has(r.type+r.exp)){
      const m=raw.match(r.re);
      errors.push({type:r.type,severity:r.severity,original:m?m[0]:'',correction:r.fix,explanation:r.exp});
      seen.add(r.type+r.exp);
      if(typeof r.fix==='string') corrected = corrected.replace(r.re, r.fix);
      else if(typeof r.fix==='function' && m) corrected = corrected.replace(r.re, r.fix(m));
    }
  });

  // Capitalization (minor)
  if(/^\s*[a-z]/.test(raw)){
    errors.push({type:'Spelling',severity:'Minor',original:raw.trim()[0],correction:raw.trim()[0].toUpperCase(),explanation:'Start with capital letter.'});
    corrected = corrected.charAt(0).toUpperCase()+corrected.slice(1);
  }

  // Meaning check via keywords
  const norm = normalize(raw);
  const kws = turn.keywords||[];
  let matched=0;
  kws.forEach(k=>{ if(norm.includes(k.toLowerCase())) matched++; });
  const meaningRatio = kws.length ? matched/kws.length : 1;
  if(meaningRatio < 0.35){
    errors.push({type:'Meaning',severity:'Major',original:raw,correction:turn.correct,explanation:`Your answer doesn't fit the situation. Try: "${turn.example}"`});
  }

  // Deduplicate same error (want to ... should be one error, not 3)
  const uniq=[];
  const seenExp=new Set();
  errors.forEach(e=>{ if(!seenExp.has(e.explanation)){ seenExp.add(e.explanation); uniq.push(e); } });

  // Scoring: 100 - Minor 3, Medium 7, Major 12, cap per sentence 30
  let score=100;
  let dedup=0;
  uniq.forEach(e=>{
    const pen={Minor:3,Medium:7,Major:12}[e.severity]||7;
    dedup+=pen;
  });
  dedup=Math.min(dedup,30);
  score=Math.max(0,100-dedup);
  // Level leniency: A1 more lenient
  if(level==='A1' && score<100) score=Math.min(100, score+5);
  if(level==='C1' && score>0) score=Math.max(0, score-3);
  score=Math.round(score);

  // Breakdown
  const breakdown={Grammar:0,Lexical:0,Spelling:0,Meaning:0};
  uniq.forEach(e=>{ if(breakdown[e.type]!==undefined) breakdown[e.type]++; else breakdown[e.type]=1; });

  // If score is 100, clear natural suggestions (don't invent)
  return { score, errors:uniq, breakdown, corrected: uniq.length? corrected : raw.trim(), original:raw };
}

function labelForScore(s){
  if(s===100) return {label:'Excellent', cls:'excellent'};
  if(s>=90) return {label:'Very good', cls:'verygood'};
  if(s>=80) return {label:'Good', cls:'good'};
  if(s>=70) return {label:'Needs practice', cls:'needs'};
  if(s>=60) return {label:'Needs improvement', cls:'needs'};
  return {label:'Keep practicing', cls:'poor'};
}
