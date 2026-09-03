// Infinite Scenario Generator — Context Lock + Strict Validation
const LOCATIONS = ["London","New York","Tokyo","Paris","Berlin","Barcelona","Dubai","Sydney","Rome","Amsterdam","Prague","Bangkok"];
const CATEGORIES = {
  Travel: [
    {id:'airport-lost', title:'Lost Luggage', sub:'Airport', icon:'🧳', problems:['Your luggage is missing','Your bag was sent to another city','Your suitcase is damaged'], goals:['Find your luggage','Get compensation']},
    {id:'airport-delay', title:'Flight Delayed', sub:'Airport', icon:'✈️', problems:['Your flight is delayed 3 hours','Your flight was cancelled','You missed your connection'], goals:['Rebook your flight','Find alternative']},
    {id:'airport-overweight', title:'Overweight Bag', sub:'Airport', icon:'⚖️', problems:['Your bag is overweight by 5kg','You have an extra bag to pay for'], goals:['Pay or repack']},
    {id:'airport-gate', title:'Find the Gate', sub:'Airport', icon:'🚪', problems:['You cannot find gate 12','Gate has changed to 25'], goals:['Find correct gate']},
    {id:'passport', title:'Passport Control', sub:'Passport', icon:'🛂', problems:['Officer asks purpose of visit','Officer asks how long you will stay'], goals:['Answer questions']},
    {id:'customs', title:'Customs', sub:'Customs', icon:'🛃', problems:['You have goods to declare','You bought expensive items'], goals:['Declare items']},
  ],
  Hotels: [
    {id:'hotel-noready', title:'Room Not Ready', sub:'Hotel', icon:'🛎️', problems:['Your room is not ready yet','Your reservation cannot be found'], goals:['Solve check-in problem']},
    {id:'hotel-noise', title:'Noisy Room', sub:'Hotel', icon:'🔇', problems:['Neighbor is very noisy','Street noise keeps you awake'], goals:['Ask to change room']},
    {id:'hotel-ac', title:'AC Broken', sub:'Hotel', icon:'❄️', problems:['Air conditioner is broken','Heating does not work'], goals:['Request repair']},
    {id:'hotel-key', title:'Lost Key', sub:'Hotel', icon:'🔑', problems:['You lost your room key','Key card does not work'], goals:['Get new key']},
    {id:'hotel-breakfast', title:'Breakfast Question', sub:'Hotel', icon:'🥐', problems:['Ask if breakfast is included','Ask breakfast time'], goals:['Get breakfast info']},
    {id:'hotel-late', title:'Late Checkout', sub:'Hotel', icon:'⏰', problems:['You need late checkout','You need to leave luggage'], goals:['Request late checkout']},
  ],
  Food: [
    {id:'restaurant-out', title:'Out of Stock', sub:'Restaurant', icon:'🍽️', problems:["Dish you want is out of stock","Kitchen made a mistake"], goals:['Choose another dish']},
    {id:'restaurant-bill', title:'Split the Bill', sub:'Restaurant', icon:'🧾', problems:['Split bill with friends','Pay by card but terminal broken'], goals:['Pay correctly']},
    {id:'cafe-order', title:'Café Order', sub:'Café', icon:'☕', problems:['Barista asks size and milk type','Your usual order is unavailable'], goals:['Order coffee']},
    {id:'allergy', title:'Food Allergy', sub:'Restaurant', icon:'⚠️', problems:['You have a nut allergy','You cannot eat gluten'], goals:['Explain allergy']},
    {id:'delivery', title:'Food Delivery', sub:'Delivery', icon:'🛵', problems:['Delivery is late','Wrong order delivered'], goals:['Complain politely']},
  ],
  Transport: [
    {id:'taxi-wrong', title:'Wrong Location', sub:'Taxi', icon:'🚕', problems:['Driver is at wrong street','Driver cannot find you'], goals:['Explain where you are']},
    {id:'taxi-price', title:'Price Negotiation', sub:'Taxi', icon:'💰', problems:['Price seems too high','Ask for fixed price'], goals:['Agree on price']},
    {id:'train-ticket', title:'Train Ticket', sub:'Train', icon:'🚆', problems:['You need ticket to next city','You missed your train'], goals:['Buy ticket']},
    {id:'car-rental', title:'Car Rental', sub:'Car', icon:'🚗', problems:['You want to rent a car for 3 days','Car you booked is not available'], goals:['Rent a car']},
  ],
  Shopping: [
    {id:'shop-size', title:'Wrong Size', sub:'Shopping', icon:'👕', problems:['You need a different size','You want to try it on'], goals:['Find right size']},
    {id:'shop-return', title:'Return Item', sub:'Shopping', icon:'↩️', problems:['You want to return a shirt','Item is damaged'], goals:['Return item']},
    {id:'shop-discount', title:'Ask Discount', sub:'Shopping', icon:'🏷️', problems:['Ask for a discount','Compare two products'], goals:['Get good price']},
    {id:'shop-pharmacy', title:'Pharmacy', sub:'Pharmacy', icon:'💊', problems:['You need medicine for headache','Explain symptoms'], goals:['Buy medicine']},
  ],
  Work: [
    {id:'interview', title:'Job Interview', sub:'Interview', icon:'💼', problems:['Tell about yourself','Why do you want this job?'], goals:['Pass interview']},
    {id:'meeting', title:'Business Meeting', sub:'Meeting', icon:'🤝', problems:['Present your project','Client asks difficult question'], goals:['Lead meeting']},
    {id:'manager', title:'Ask Manager', sub:'Work', icon:'👔', problems:['Ask for a day off','Ask for salary raise'], goals:['Negotiate']},
    {id:'colleague', title:'Colleague Help', sub:'Work', icon:'👥', problems:['Ask colleague for help','Give feedback'], goals:['Communicate at work']},
  ],
  Everyday: [
    {id:'doctor', title:'Doctor Visit', sub:'Doctor', icon:'🏥', problems:['You have a sore throat','You need an appointment'], goals:['See doctor']},
    {id:'landlord', title:'Call Landlord', sub:'Housing', icon:'🏠', problems:['Heating is broken','Need to extend rent'], goals:['Call landlord']},
    {id:'bank', title:'Bank', sub:'Bank', icon:'🏦', problems:['Card is blocked','You need to exchange money'], goals:['Solve bank issue']},
    {id:'hairdresser', title:'Hairdresser', sub:'Service', icon:'💇', problems:['Explain how you want your hair cut','Not happy with result'], goals:['Get haircut']},
  ],
  Social: [
    {id:'smalltalk', title:'Small Talk', sub:'Social', icon:'💬', problems:['Meet someone at a party','Talk about weekend plans'], goals:['Make small talk']},
    {id:'dating', title:'Dating', sub:'Social', icon:'❤️', problems:['Invite someone for coffee','Plan a date'], goals:['Make plans']},
    {id:'apology', title:'Apology', sub:'Social', icon:'🙏', problems:['You are late','You broke something'], goals:['Apologize']},
  ]
};

const CHARACTERS = {
  Travel:{name:'Agent', role:'Airline Agent'},
  Hotels:{name:'Receptionist', role:'Hotel Receptionist'},
  Food:{name:'Waiter', role:'Waiter'},
  Transport:{name:'Driver', role:'Driver'},
  Shopping:{name:'Assistant', role:'Shop Assistant'},
  Work:{name:'Manager', role:'Manager'},
  Everyday:{name:'Doctor', role:'Doctor'},
  Social:{name:'Alex', role:'New Friend'},
};

const RANDOM_EVENTS = {
  Travel: ["Your flight time has changed. Please confirm new time.", "There's an issue with your boarding pass."],
  Hotels: ["Your room has an issue we need to inform you about.", "Would you like an upgrade for 20 euros?"],
  Food: ["We're out of that dish today.", "Would you like dessert?"],
  Transport: ["There's heavy traffic, it may take longer.", "The meter is broken, we need to agree on price."],
  Shopping: ["This item is on sale today.", "We have only one left in stock."],
  Work: ["The client has an urgent question.", "Can you elaborate on that point?"],
  Everyday: ["The doctor is running 15 minutes late.", "Do you have insurance?"],
  Social: ["By the way, what do you do for fun?", "I need to go soon, one last thing..."]
};

const CATEGORY_KEYWORDS = {
  Travel:['flight','luggage','bag','passport','gate','airport','boarding','check-in','delay','cancelled'],
  Hotels:['room','reservation','hotel','reception','breakfast','checkout','key','night','stay'],
  Food:['order','menu','dish','restaurant','bill','drink','allergy','table'],
  Transport:['taxi','driver','station','ticket','train','car','address','price'],
  Shopping:['size','return','discount','shop','price','item','pharmacy','medicine'],
  Work:['job','interview','meeting','project','manager','work','colleague'],
  Everyday:['doctor','appointment','landlord','bank','haircut','sore','throat'],
  Social:['party','weekend','invite','apologize','small talk','date']
};

const VOCAB_DICT = {
  'reservation':{en:'reservation', ru:'бронирование', level:'A2'},
  'available':{en:'available', ru:'доступный', level:'B1'},
  'availability':{en:'availability', ru:'наличие', level:'B2'},
  'cancelled':{en:'cancelled', ru:'отменён', level:'A2'},
  'options':{en:'options', ru:'варианты', level:'A2'},
  'reschedule':{en:'reschedule', ru:'перенести', level:'B1'},
  'delay':{en:'delay', ru:'задержка', level:'A2'},
  'luggage':{en:'luggage', ru:'багаж', level:'A2'},
  'receipt':{en:'receipt', ru:'квитанция', level:'B1'},
  'overweight':{en:'overweight', ru:'перевес', level:'B1'},
  'gate':{en:'gate', ru:'выход на посадку', level:'A2'},
  'rebook':{en:'rebook', ru:'перебронировать', level:'B1'},
  'refund':{en:'refund', ru:'возврат денег', level:'B1'},
  'check-in':{en:'check-in', ru:'регистрация', level:'A2'},
  'allergy':{en:'allergy', ru:'аллергия', level:'B1'},
  'prescription':{en:'prescription', ru:'рецепт', level:'B2'},
};

function pick(arr, rng=Math.random){ return arr[Math.floor(rng()*arr.length)]; }
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))>>>0; return h; }
function seededRng(seed){ let s=seed>>>0; return ()=> (s=(s*1664525+1013904223)>>>0)/4294967296; }

function getWeakGrammarFocus(){
  const counts={};
  (state.mistakes||[]).forEach(m=>{
    const t=(m.correction||'').toLowerCase();
    if(/want to/.test(t)) counts['want_to']=(counts['want_to']||0)+1;
    if(/\b(a|an|the)\b/.test(t)) counts['articles']=(counts['articles']||0)+1;
    if(/have booked|has gone|went|was/.test(t)) counts['past']=(counts['past']||0)+1;
  });
  let top=null, mx=0; Object.entries(counts).forEach(([k,v])=>{ if(v>mx){mx=v; top=k;}});
  return top;
}

function getVocabForTurn(turn, level){
  // turn.useful contains english words, map to dict and filter by level and history
  const known = new Set((state.mistakes||[]).filter(m=>m.type==='Lexical').map(m=>m.original.toLowerCase()));
  // Actually known words are those user has used correctly many times? Simplify: if word appears in mistakes as correction, it's weak, so prioritize
  // For now, filter: don't show words user has already mastered (appears in completed with high score?) — simplified: show all
  const levelOrder={A1:1,A2:2,B1:3,B2:4,C1:5};
  const lvlNum=levelOrder[level]||3;
  let words = turn.useful.slice(0,4).map(w=>{
    const key=w.toLowerCase();
    const entry=VOCAB_DICT[key] || {en:w, ru:'', level:'A2'};
    return entry;
  });
  // Filter by level: A1/A2 show all, B1 show B1+, B2/C1 show B2+
  words = words.filter(e=>{
    const wLvl=levelOrder[e.level]||2;
    if(lvlNum<=2) return true;
    if(lvlNum===3) return wLvl>=2;
    return wLvl>=3;
  });
  // Prioritize weak words
  const weak=getWeakGrammarFocus();
  if(weak==='want_to'){
    // ensure want_to related vocab shown
  }
  // Limit 2-4
  return words.slice(0,4);
}

function isRelevant(message, category){
  const kws=CATEGORY_KEYWORDS[category]||[];
  const lower=message.toLowerCase();
  let score=0;
  kws.forEach(k=>{ if(lower.includes(k)) score++; });
  // Also check that message does NOT contain keywords from other categories strongly
  let otherScore=0;
  Object.keys(CATEGORY_KEYWORDS).forEach(cat=>{
    if(cat===category) return;
    CATEGORY_KEYWORDS[cat].forEach(k=>{ if(lower.includes(k)) otherScore++; });
  });
  // relevance 0-100
  const relevance = kws.length ? Math.round((score / Math.max(1,kws.length*0.4))*100) : 50;
  // penalize if other category keywords dominate
  if(otherScore > score && score<2) return 20;
  return Math.min(100, relevance);
}

function buildTurns(template, location, level, problem){
  const category = Object.keys(CATEGORIES).find(cat=> CATEGORIES[cat].some(t=>t.id===template.id)) || 'Travel';
  const weak = getWeakGrammarFocus();

  // Template-specific turns
  const specific = {
    'airport-lost': [
      { agent:`Your luggage is missing in ${location}. Could you describe your bag?`, hint:"Describe your bag (color, size).", useful:["suitcase","black","large","receipt"], example:"It's a large black suitcase.", keywords:["suitcase","black","large","bag"], correct:"It's a large black suitcase.", phrases:[] },
      { agent:"Do you have your baggage receipt?", hint:"Say you have it or not.", useful:["receipt","here","yes"], example:"Yes, here it is.", keywords:["receipt","here","yes"], correct:"Yes, here it is.", phrases:[] },
      { agent:"Thank you. We'll try to locate it. Where are you staying in "+location+"?", hint:"Say your hotel.", useful:["hotel","stay","address"], example:"At the Central Hotel.", keywords:["hotel","central"], correct:"At the Central Hotel.", phrases:[] },
    ],
    'airport-delay': [
      { agent:`Your flight in ${location} is delayed. Would you like to rebook?`, hint:"Ask about options.", useful:["rebook","options","cancelled"], example:"Can I rebook for tomorrow?", keywords:["rebook","options"], correct:"Can I rebook for tomorrow?", phrases:[] },
      { agent:"We can rebook you for tomorrow 9 a.m. or give a refund. What do you prefer?", hint:"Choose rebook or refund.", useful:["rebook","refund","prefer"], example:"I'd like to rebook.", keywords:["rebook","refund"], correct:"I'd like to rebook.", phrases:[] },
    ],
    'hotel-noready': [
      { agent:`Your room in ${location} is not ready yet. How would you like to proceed?`, hint:"Ask when it will be ready.", useful:["ready","when","available"], example:"When will it be ready?", keywords:["ready","when","available"], correct:"When will it be ready?", phrases:[] },
      { agent:"It will be ready in 30 minutes. Would you like to leave your luggage here?", hint:"Say yes or no.", useful:["luggage","leave","yes"], example:"Yes, please.", keywords:["luggage","yes"], correct:"Yes, please.", phrases:[] },
    ],
  };

  let base = specific[template.id];
  if(!base){
    // Generic but context-locked fallback using template problem
    base = [
      { agent: level==='A1' ? `Hello. ${problem}.` : `Good ${new Date().getHours()<12?'morning':'evening'}. ${problem} in ${location}. How can I help you?`,
        hint:`Explain your situation in ${location}.`, useful:["help","problem","please"], example:"I have a problem.", keywords:["problem","help"], correct:"I have a problem.", phrases:[] },
      { agent: "Could you give me more details, please?", hint:"Give details.", useful:["booked","room","night"], example:"I booked a room.", keywords:["booked","room"], correct:"I booked a room.", phrases:[] },
      { agent: "I understand. What would you like me to do?", hint:"Ask what can be done.", useful:["what can you do","possible"], example:"What can you do?", keywords:["what","can","do"], correct:"What can you do?", phrases:[] },
    ];
  }

  // Weak grammar injection
  if(weak==='want_to' && base[1]){
    base[1].hint = "Use 'want to + verb' (I want to change my booking).";
    base[1].useful = ["want to","change","book"];
    base[1].example = "I want to change my booking.";
    base[1].keywords = ["want","to"];
  }

  // Level adaptation
  if(level==='A1'){
    base.forEach(t=>{ t.agent = t.agent.split('.')[0]+'.'; });
  }

  // Add closing turn if not present
  if(!base.some(t=>/thank/i.test(t.agent))){
    base.push({ agent:"Thank you for your patience. Is there anything else?", hint:"Thank and close.", useful:["thank you","no"], example:"No, thank you!", keywords:["thank"], correct:"No, thank you!", phrases:[] });
  }

  // Random event injection — only from same category
  if(Math.random()<0.35){
    const evs=RANDOM_EVENTS[category] || RANDOM_EVENTS.Travel;
    const ev=pick(evs);
    // Validate relevance
    if(isRelevant(ev, category) > 40){
      base.splice(2,0,{ agent: ev, hint:"Respond to the question.", useful:["sure","okay","yes"], example:"Sure.", keywords:["sure","okay"], correct:"Sure.", phrases:[] });
    }
  }

  // Final validation: ensure all agent messages are relevant
  base = base.filter(t=> isRelevant(t.agent, category) >= 30);
  if(base.length<2){
    // Fallback to ensure at least 2 turns
    base = specific[template.id] || base;
  }

  return base;
}

function getVocabHints(turn, level){
  const levelOrder={A1:1,A2:2,B1:3,B2:4,C1:5};
  const lvlNum=levelOrder[level]||3;
  // turn.useful contains english words/phrases
  let words = turn.useful.slice(0,4).map(w=>{
    const key=w.toLowerCase();
    const entry=VOCAB_DICT[key] || {en:w, ru:'', level:'A2'};
    return entry;
  });
  // Filter by level
  words = words.filter(e=>{
    const wLvl=levelOrder[e.level]||2;
    if(lvlNum<=2) return true;
    if(lvlNum===3) return wLvl>=2;
    return wLvl>=3;
  });
  // Don't show words user already knows well (appears in history as correct many times)
  const known = new Set();
  // If word appears in mistakes as correction, it's weak, keep it; if not in mistakes at all, it's unknown, keep
  // For now, don't filter known, just prioritize weak
  // Limit 2-4
  if(words.length>4) words=words.slice(0,4);
  if(words.length<2 && turn.useful.length>=2) words=turn.useful.slice(0,2).map(w=> VOCAB_DICT[w.toLowerCase()] || {en:w, ru:'', level:'A2'});
  return words.slice(0,4);
}

function getPurposeCats(){
  if(typeof PURPOSES==='undefined' || !state.purpose) return null;
  const p = PURPOSES.find(x=>x.id===state.purpose);
  return p && p.cats ? p.cats : null;
}

function generateScenario(opts={}){
  const level = opts.level || state.level || 'B1';
  let catName = opts.category;
  if(!catName || !CATEGORIES[catName]){
    const pref = getPurposeCats();
    const cats = pref || Object.keys(CATEGORIES);
    catName = pick(cats);
  }
  const pool = CATEGORIES[catName];
  let tmpl = opts.template || pick(pool);
  const recent = (state.generatedHistory||[]).slice(-10).map(c=>c.templateId);
  let tries=0;
  while(recent.includes(tmpl.id) && tries<5){ tmpl = pick(pool); tries++; }
  const location = opts.location || pick(LOCATIONS);
  const problem = pick(tmpl.problems);
  const goal = pick(tmpl.goals);
  const character = CHARACTERS[catName] || {name:'Agent', role:'Assistant'};
  const turns = buildTurns(tmpl, location, level, problem);

  // Context validation before return
  const lockedContext = {
    category:catName,
    scenario:tmpl.title,
    location,
    user_role: catName==='Travel'?'Passenger': catName==='Hotels'?'Guest':'Customer',
    ai_role: character.role,
    goal,
    context: `You are in ${location}. ${problem}.`,
    constraints:[`Stay in ${catName}`, `Goal: ${goal}`]
  };

  // Validate each turn
  let valid=true;
  for(const t of turns){
    if(isRelevant(t.agent, catName) < 25) valid=false;
  }
  if(!valid && tries<3){
    // regenerate with different template
    return generateScenario({...opts, template:pick(pool)});
  }

  const id = 'gen-'+Date.now()+'-'+Math.floor(Math.random()*10000);
  const scenario = {
    id, icon:tmpl.icon, title:`${tmpl.title} — ${location}`, goal,
    desc:`You are in ${location}. ${problem}. Goal: ${goal}.`,
    character, turns,
    meta:{category:catName, templateId:tmpl.id, location, problem, level, generated:true, lockedContext}
  };
  if(!state.generatedHistory) state.generatedHistory=[];
  state.generatedHistory.push({id, templateId:tmpl.id, category:catName, location, problem, date:new Date().toISOString().slice(0,10)});
  if(state.generatedHistory.length>50) state.generatedHistory = state.generatedHistory.slice(-50);
  saveState();
  return scenario;
}

function getDailyChallenge(){
  const today=new Date().toISOString().slice(0,10);
  const seed = hashStr(today + state.level);
  const rng = seededRng(seed);
  const cats=Object.keys(CATEGORIES);
  const cat=cats[Math.floor(rng()*cats.length)];
  const tmpl=pick(CATEGORIES[cat], rng);
  const loc=pick(LOCATIONS, rng);
  return generateScenario({category:cat, template:tmpl, location:loc, level:state.level});
}

function generateChain(length=5){
  const chain=[];
  const loc=pick(LOCATIONS);
  for(let i=0;i<length;i++){
    const cat = Object.keys(CATEGORIES)[i % Object.keys(CATEGORIES).length];
    const sc = generateScenario({category:cat, location:loc});
    if(i>0) sc.desc = `Continuing your trip in ${loc}. ` + sc.desc;
    chain.push(sc);
  }
  return { title:`Trip to ${loc}`, location:loc, scenarios:chain };
}
