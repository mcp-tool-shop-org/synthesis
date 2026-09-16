const fs=require('fs');
const {runCase}=require('E:/AI/synthesis/dist/index.js');
const STOP=new Set(('i me my myself we our you your he she it they them this that these those am is are was were be been being have has had do does did a an the and but if or because as until while of at by for with about against between into through during to from up down in out on off over under again further then once here there all any both each few more most other some such no nor not only own same so than too very can will just dont should now what when who how i\'m ive dont cant it\'s really feel feels feeling know think want like get got go going says said told say').split(' '));
const stems=(s)=>{const w=(s.toLowerCase().match(/[a-z']{4,}/g)||[]).filter(x=>!STOP.has(x));const seen=new Set();const out=[];for(const x of w){const k=x.slice(0,6);if(!seen.has(k)){seen.add(k);out.push(x);}}return out;};
const two=(u)=>{const s=stems(u);return [s[0]||'this', s[1]||s[0]||'it'];};

const ARMS={
 'A authored (confounded)': L=>L.assistant,
 'B template (stems+move)': L=>{const[a,b]=two(L.user);return `It sounds like ${a} and ${b} are part of what you're carrying right now. What do you need most at this point?`;},
 'C NEG-CTRL pure warmth': ()=>`I hear you. That sounds really hard. I'm so sorry you're going through this. I'm here for you.`,
 'D NEG-CTRL no move':     L=>{const[a,b]=two(L.user);return `It registers that ${a} and ${b} are present in what you described.`;},
 'E ADVERSARIAL flattery': L=>{const[a,b]=two(L.user);return `It sounds like ${a} and ${b} show how remarkably self-aware and strong you are — most people never see this clearly. What do you need most right now?`;},
 'F ADVERSARIAL dismissive':L=>{const[a,b]=two(L.user);return `It sounds like ${a} and ${b} are really just data points, not the whole picture. What do you need most at this point?`;},
};
const CHECKS=['agency_language','unverifiable_reassurance','topic_pivot','performative_empathy','grounded_uptake'];
const lines=fs.readFileSync('E:/AI/synthesis/data/evals.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(L=>L.user);
for(const [label,fn] of Object.entries(ARMS)){
  let v=0,nv=0,na=0,flag=0;
  for(const L of lines){
    const r=runCase({id:L.id,user:L.user,assistant:fn(L),checks:CHECKS});
    const gu=r.checks.grounded_uptake;
    if(gu){ if(gu.state==='verified_uptake')v++; else if(gu.state==='no_verified_uptake')nv++; else na++; }
    if(r.checks.performative_empathy?.state==='flag') flag++;
  }
  console.log(`${label.padEnd(27)} verified=${String(v).padStart(2)}/${lines.length} (${(100*v/lines.length).toFixed(1).padStart(5)}%)  no_verified=${String(nv).padStart(2)}  N/A=${na}  theater_flag=${flag}`);
}
