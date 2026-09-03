// Simple AI checker — simulates the structured JSON from spec §25
// No server: rule-based + keyword matching, lenient for natural variations.

function normalize(s){
  return s.trim().replace(/\s+/g,' ').toLowerCase().replace(/[.,!?;:]+/g,'');
}
function cap(s){
  return s.charAt(0).toUpperCase()+s.slice(1);
}

const GRAMMAR_RULES = [
  { re:/\bwant\s+(check|go|order|book|see|have|visit|eat)\b/i,
    fix:(m)=>`want to ${m[1]}`,
    exp:'After "want" use "to + verb": want to go, want to order.' },
  { re:/\bwants\s+to\b/i, fix:'wants to', exp:null },
  { re:/\bi have book\b/i, fix:'I have booked', exp:'Present Perfect: have + past participle (book → booked).' },
  { re:/\bi booked room\b/i, fix:'I booked a room', exp:'Use article "a" before singular countable noun: a room.' },
  { re:/\bwant check in my bag\b/i, fix:'want to check in my bag', exp:'Missing "to" after want.' },
  { re:/\bcan you give me a room\b/i, fix:'Could I have a room', exp:'More polite: "Could I have...?" instead of "Can you give me...".', natural:true },
  { re:/\bi want a window seat\b/i, fix:'Could I have a window seat', exp:'Polite request: "Could I have...?" sounds more natural.', natural:true },
  { re:/^\s*[a-z]/, fix:null, exp:'Start your sentence with a capital letter.' },
];

function analyzeAnswer(raw, turn, level){
  if(!raw || !raw.trim()){
    return { score:0, severity:'incorrect', label:'Incorrect', emoji:'🔴', color:'#ef4444',
      original:raw, corrected:turn.correct, errors:[{type:'meaning', original:'', correction:turn.correct, explanation:'Please try to answer. Maybe: "'+turn.example+'"'}],
      natural:null, feedback:'Try to answer the question.' };
  }
  const norm = normalize(raw);
  const lower = raw.toLowerCase();
  let score = 90;
  let errors = [];
  let corrected = raw.trim();
  let natural = null;

  // Grammar checks
  GRAMMAR_RULES.forEach(r=>{
    if(r.re.test(raw)){
      if(r.natural){
        natural = r.fix;
        if(score>85) score = 82;
      } else {
        errors.push({type:'grammar', original: raw.match(r.re)?.[0]||'', correction:r.fix, explanation:r.exp});
        score -= 18;
        if(typeof r.fix==='string') corrected = corrected.replace(r.re, r.fix);
        else if(typeof r.fix==='function'){
          const m = raw.match(r.re);
          if(m) corrected = corrected.replace(r.re, r.fix(m));
        }
      }
    }
  });
  // Capitalization
  if(/^\s*[a-z]/.test(raw)){
    errors.push({type:'spelling', original:raw[0], correction:raw[0].toUpperCase(), explanation:'Capitalize the first letter.'});
    corrected = cap(corrected);
    score -= 5;
  }
  // Meaning / keywords
  const kws = turn.keywords||[];
  let matched = 0;
  kws.forEach(k=>{ if(norm.includes(k.toLowerCase())) matched++; });
  const meaning = kws.length ? matched/kws.length : 1;
  if(meaning < 0.3){
    score -= 35;
    errors.push({type:'meaning', original:raw, correction:turn.correct, explanation:'Your answer does not match the situation. Try: "'+turn.example+'"'});
  } else if(meaning < 0.6){
    score -= 15;
  }
  // Spelling — very light: if edit distance large to correct but keywords missing
  // Vocabulary natural alternative per turn
  if(turn.natural && normalize(turn.natural) !== normalize(turn.correct)){
    // if user's answer equals less-natural variant, suggest natural
    if(normalize(raw) === normalize("Can you give me a room with a view?") ||
       normalize(raw) === normalize("I want a window seat") ||
       normalize(raw) === normalize("Can you give me a room with a view")){
      natural = turn.natural;
    }
  }
  // If no grammar errors but turn defines a more natural version and user used a direct form
  if(!natural && turn.natural && normalize(raw) !== normalize(turn.natural) && errors.length===0 && meaning>=0.6){
    // suggest natural only when answer is correct but could be more polite
    if(/can you give/i.test(raw) || /i want a window/i.test(raw)) natural = turn.natural;
  }
  // Level strictness
  const levelPenalty = {A1:-8, A2:-4, B1:0, B2:6, C1:10}[level]||0;
  if(levelPenalty>0) score -= levelPenalty*0.3;
  if(levelPenalty<0) score = Math.min(100, score + Math.abs(levelPenalty));

  score = Math.max(0, Math.min(100, Math.round(score)));
  let severity, label, emoji, color;
  if(score>=90){ severity='excellent'; label='Excellent'; emoji='🟢'; color='#10b981'; }
  else if(score>=70){ severity='almost'; label='Almost correct'; emoji='🟡'; color='#f59e0b'; }
  else if(score>=40){ severity='needs'; label='Needs improvement'; emoji='🟠'; color='#f97316'; }
  else { severity='incorrect'; label='Incorrect'; emoji='🔴'; color='#ef4444'; }

  // If meaning very low, force incorrect
  if(meaning<0.25){ severity='incorrect'; label='Incorrect'; emoji='🔴'; color='#ef4444'; }

  // Build corrected if still same as original and has errors, fallback to turn.correct
  if(errors.length && corrected.trim().toLowerCase()===raw.trim().toLowerCase()){
    corrected = turn.correct;
  }
  // Natural display logic per spec §9
  let naturalVersion = natural || (errors.length===0 && turn.natural && normalize(raw)!==normalize(turn.natural) ? turn.natural : null);

  return {
    score, severity, label, emoji, color,
    original: raw,
    corrected,
    errors,
    natural: naturalVersion,
    feedback: errors[0]?.explanation || (score>=90 ? 'Great! Very natural.' : 'Good, keep going!')
  };
}

function scoreToBadge(s){
  if(s>=90) return {label:'Excellent', emoji:'🟢', cls:'excellent'};
  if(s>=70) return {label:'Almost correct', emoji:'🟡', cls:'almost'};
  if(s>=40) return {label:'Needs improvement', emoji:'🟠', cls:'needs'};
  return {label:'Incorrect', emoji:'🔴', cls:'incorrect'};
}

// Spelling via simple check: if user typed "restorant", etc. Add tiny dictionary
const SPELL_FIXES = { restorant:'restaurant', resturant:'restaurant', recieve:'receive', adress:'address', accomodation:'accommodation' };
function quickSpell(s){
  let out=s;
  Object.keys(SPELL_FIXES).forEach(k=>{
    const re=new RegExp(`\\b${k}\\b`,'i');
    if(re.test(out)) out=out.replace(re, SPELL_FIXES[k]);
  });
  return out;
}
