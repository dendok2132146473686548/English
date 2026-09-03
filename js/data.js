const LEVELS = [
  { id:'A1', label:'A1' },
  { id:'A2', label:'A2' },
  { id:'B1', label:'B1' },
  { id:'B2', label:'B2' },
  { id:'C1', label:'C1' },
];

const HOME_CATS = [
  { id:'Travel', label:'Travel' },
  { id:'Work', label:'Work' },
  { id:'Everyday', label:'Everyday Life' },
  { id:'Social', label:'Social' },
  { id:'Surprise', label:'Surprise Me' },
];

// Fallback static scenarios (used if generator fails)
const SCENARIOS = {
airport: {
  id:'airport', icon:'✈️', title:'Airport — Cancelled Flight', goal:'Find another flight',
  desc:'You are at the airport in London. Your flight has been cancelled.',
  character:{ name:'Agent', role:'Airline Agent' },
  turns:[
    { agent:"I'm sorry, but your flight has been cancelled.", hint:"Ask about changing your flight.", useful:["change","flight","please"], example:"Can I change my flight?", correct:"Can I change my flight?", keywords:["change","flight"], phrases:[] },
    { agent:"I can rebook you for tomorrow morning. Is that okay?", hint:"Confirm or ask for another option.", useful:["okay","tomorrow","another"], example:"Yes, that's fine.", correct:"Yes, that's fine.", keywords:["yes","fine","okay"], phrases:[] },
    { agent:"Great. Here is your new boarding pass.", hint:"Thank the agent.", useful:["thank you","thanks"], example:"Thank you!", correct:"Thank you!", keywords:["thank"], phrases:[] },
  ]
}
};
