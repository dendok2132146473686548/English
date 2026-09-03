// Infinite Scenario Generator — §14 combinatorial system
// Situation + Location + Character + Goal + Problem + Random Event + Level + Mistakes

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
  Travel:{name:'Agent', role:'Airline Agent', avatar:'👩‍💼'},
  Hotels:{name:'Receptionist', role:'Hotel Receptionist', avatar:'👨‍💼'},
  Food:{name:'Waiter', role:'Waiter', avatar:'🤵'},
  Transport:{name:'Driver', role:'Driver', avatar:'👨‍✈️'},
  Shopping:{name:'Assistant', role:'Shop Assistant', avatar:'👩‍💼'},
  Work:{name:'Manager', role:'Manager', avatar:'👩‍💼'},
  Everyday:{name:'Doctor', role:'Doctor', avatar:'👨‍⚕️'},
  Social:{name:'Alex', role:'New Friend', avatar:'😊'},
};

const RANDOM_EVENTS = [
  "I'm sorry, but there is a problem with your request.",
  "By the way, we have a special offer today.",
  "Could you please wait a moment? I need to check something.",
  "Oh, I need to ask you one more thing.",
  "Just to confirm — could you spell that for me?"
];

function pick(arr, rng=Math.random){ return arr[Math.floor(rng()*arr.length)]; }
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))>>>0; return h; }
function seededRng(seed){ let s=seed>>>0; return ()=> (s=(s*1664525+1013904223)>>>0)/4294967296; }

function getWeakGrammarFocus(){
  const counts={};
  (state.mistakes||[]).forEach(m=>{
    const t=(m.correction||'').toLowerCase();
    if(/want to/.test(t)) counts['want_to']=(counts['want_to']||0)+1;
    if(/\b(a|an|the)\b/.test(t)) counts['articles']=(counts['articles']||0)+1;
    if(/have booked|has gone/.test(t)) counts['past']=(counts['past']||0)+1;
  });
  let top=null, mx=0; Object.entries(counts).forEach(([k,v])=>{ if(v>mx){mx=v; top=k;}});
  return top;
}

function buildTurns(template, location, level, problem){
  const weak = getWeakGrammarFocus();
  // Base 4 turns, inject weak grammar focus if needed
  const base = [
    { agent: level==='A1' ? `Hello. ${problem}.` : `Good ${new Date().getHours()<12?'morning':'evening'}. ${problem} in ${location}. How can I help you?`,
      hint:`Explain your situation in ${location}.`, useful:["help","problem","please"], example:"I have a problem with my reservation.", keywords:["problem","help","reservation"], correct:"I have a problem with my reservation.", natural:"I have an issue with my reservation.", phrases:["I have a problem"] },
    { agent: pick(["Could you give me more details, please?","Can you tell me more?","What exactly happened?"]),
      hint:"Give details clearly.", useful:["yesterday","booked","room"], example:"I booked a room for two nights.", keywords:["booked","room","night"], correct:"I booked a room for two nights.", natural:"I booked a room for two nights.", phrases:["I booked..."] },
    { agent: "I understand. Let me check what I can do for you.",
      hint:"Ask what can be done.", useful:["what can you do","possible","help"], example:"What can you do for me?", keywords:["what","can","do"], correct:"What can you do for me?", natural:"Is there anything you can do?", phrases:["What can you do?"] },
    { agent: "Thank you for your patience. Is there anything else I can help you with?",
      hint:"Thank and close politely.", useful:["thank you","thanks","no"], example:"No, thank you so much!", keywords:["thank"], correct:"No, thank you!", natural:"No, thank you so much!", phrases:["Thank you"] },
  ];
  // Inject weak grammar practice: if weak is want_to, make turn 2 require "want to"
  if(weak==='want_to'){
    base[1].hint = "Use 'want to + verb' (I want to change my room).";
    base[1].useful = ["want to","change","book"];
    base[1].example = "I want to change my room.";
    base[1].keywords = ["want","to"];
  }
  // Level adaptation: A1 shorter
  if(level==='A1'){
    base.forEach(t=>{ t.agent = t.agent.split('.')[0]+'.'; });
  }
  // Random event injection 40%
  if(Math.random()<0.4){
    const ev = pick(RANDOM_EVENTS);
    base.splice(2,0,{ agent: ev, hint:"Respond to the unexpected question.", useful:["sorry","please","help"], example:"Sure, no problem.", keywords:["sure","okay","yes"], correct:"Sure, no problem.", natural:"Of course.", phrases:["Sure"] });
  }
  return base;
}

function getPurposeCats(){
  if(typeof PURPOSES==='undefined' || !state.purpose) return null;
  const p = PURPOSES.find(x=>x.id===state.purpose);
  return p && p.cats ? p.cats : null;
}
function generateScenario(opts={}){
  const level = opts.level || state.level || 'B1';
  // pick category
  let catName = opts.category;
  if(!catName || !CATEGORIES[catName]){
    const pref = getPurposeCats();
    const cats = pref || Object.keys(CATEGORIES);
    catName = pick(cats);
  }
  const pool = CATEGORIES[catName];
  let tmpl = opts.template || pick(pool);
  // avoid recent repeats
  const recent = (state.completed||[]).slice(-10).map(c=>c.id);
  let tries=0;
  while(recent.includes(tmpl.id) && tries<5){ tmpl = pick(pool); tries++; }
  const location = opts.location || pick(LOCATIONS);
  const problem = pick(tmpl.problems);
  const goal = pick(tmpl.goals);
  const character = CHARACTERS[catName] || {name:'Agent', role:'Assistant', avatar:'👤'};
  const turns = buildTurns(tmpl, location, level, problem);
  const id = 'gen-'+Date.now()+'-'+Math.floor(Math.random()*10000);
  const scenario = {
    id, icon:tmpl.icon, title:`${tmpl.title} — ${location}`, goal,
    desc:`You are in ${location}. ${problem}. Goal: ${goal}.`,
    character, turns,
    meta:{category:catName, templateId:tmpl.id, location, problem, level, generated:true}
  };
  // store history to avoid repeats
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
  // linked story: e.g., Trip to <loc>
  for(let i=0;i<length;i++){
    const cat = Object.keys(CATEGORIES)[i % Object.keys(CATEGORIES).length];
    const sc = generateScenario({category:cat, location:loc});
    if(i>0) sc.desc = `Continuing your trip in ${loc}. ` + sc.desc;
    chain.push(sc);
  }
  return { title:`Trip to ${loc}`, location:loc, scenarios:chain };
}
