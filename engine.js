/* Pokémon Baseball 2.0: fit definitions, scoring, inning-by-inning baseball season engine.
   No third party packages. All role percentages below total 100. */
(function(root,factory){const x=factory();if(typeof module==='object'&&module.exports)module.exports=x;root.Baseball=x;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const SLOTS=[
{id:'C',name:'Catcher',x:50,y:89},{id:'1B',name:'First base',x:69,y:72},
{id:'2B',name:'Second base',x:57,y:52},{id:'3B',name:'Third base',x:30,y:72},
{id:'SS',name:'Shortstop',x:40,y:54},{id:'LF',name:'Left field',x:27,y:34},
{id:'CF',name:'Center field',x:50,y:26},{id:'RF',name:'Right field',x:73,y:34},
{id:'DH',name:'Designated hitter',x:88,y:87},{id:'P',name:'Pitcher',x:50,y:73},
{id:'BN1',name:'Bench 1'},{id:'BN2',name:'Bench 2'},{id:'BN3',name:'Bench 3'},{id:'BN4',name:'Bench 4'},{id:'BN5',name:'Bench 5'}];
const FIELD_SLOTS=SLOTS.slice(0,10),BENCH_SLOTS=SLOTS.slice(10);const FIELD_IDS=FIELD_SLOTS.map(s=>s.id);const BENCH_IDS=BENCH_SLOTS.map(s=>s.id);
const REGIONS={'1':'Kanto','2':'Johto','3':'Hoenn','4':'Sinnoh','5':'Unova','6':'Kalos','7':'Alola','8':'Galar','9':'Paldea'};const GENS=Object.keys(REGIONS);
const MODES={kanto:{name:'Kanto',gens:['1']},retro:{name:'Retro (Gen 1–4)',gens:['1','2','3','4']},wild:{name:'All generations',gens:GENS}};for(const g of GENS.slice(1))MODES['gen'+g]={name:REGIONS[g],gens:[g]};
const TYPES=['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy'];
const STATS=['atk','def','spa','spd','spe','m','kg'];
const STAT_NAMES={hp:'HP',atk:'Attack',def:'Defense',spa:'Sp. Attack',spd:'Sp. Defense',spe:'Speed',m:'Height',kg:'Weight'};
// Relative importance of each Pokémon attribute BY BASEBALL POSITION; each row adds to 1.00.
// Type bonuses: each of the 18 types benefits exactly 4 roles, max +3 per role.
// Their team-weighted bonus opportunities differ by at most 0.05 points.
// Dual-types use the single largest bonus, never a sum. Fit is clamped to 0–100.
const ROLES={
 C:{stats:{atk:.10,def:.26,spa:.15,spd:.20,spe:.08,m:.11,kg:.10},types:{normal:2,poison:3,rock:3,steel:3,psychic:1,dragon:1,fairy:3}},
 '1B':{stats:{atk:.26,def:.15,spa:.10,spd:.11,spe:.08,m:.15,kg:.15},types:{normal:3,fighting:1,ground:3,rock:2,steel:1,grass:3,ice:2}},
 '2B':{stats:{atk:.10,def:.27,spa:.11,spd:.21,spe:.21,m:.06,kg:.04},types:{poison:1,bug:3,ghost:1,water:3,electric:3,psychic:3,fairy:2}},
 '3B':{stats:{atk:.23,def:.26,spa:.12,spd:.15,spe:.12,m:.07,kg:.05},types:{fighting:1,poison:2,ground:1,rock:2,steel:2,fire:2,dark:2}},
 SS:{stats:{atk:.09,def:.30,spa:.10,spd:.20,spe:.24,m:.05,kg:.02},types:{flying:2,ground:2,bug:2,ghost:3,electric:1,psychic:2,dark:3}},
 LF:{stats:{atk:.21,def:.19,spa:.12,spd:.15,spe:.22,m:.06,kg:.05},types:{normal:2,flying:1,poison:3,bug:1,ghost:2,fire:2,grass:1,dark:2}},
 CF:{stats:{atk:.10,def:.26,spa:.12,spd:.17,spe:.29,m:.04,kg:.02},types:{flying:3,bug:2,water:1,electric:2,ice:3,dragon:3,fairy:2}},
 RF:{stats:{atk:.25,def:.22,spa:.12,spd:.14,spe:.17,m:.06,kg:.04},types:{flying:2,rock:2,steel:3,fire:2,water:3,grass:2,ice:1,dragon:1}},
 DH:{stats:{atk:.38,def:.05,spa:.13,spd:.10,spe:.23,m:.06,kg:.05},types:{normal:2,fighting:2,fire:3,grass:3,dragon:3,dark:1,fairy:1}},
 P:{stats:{atk:.15,def:.07,spa:.40,spd:.18,spe:.04,m:.09,kg:.07},types:{fighting:2,ground:1,ghost:1,water:1,electric:1,psychic:1,ice:1}}
};
// Positional contribution to overall rating; pitcher dominates outcomes, but all ten matter.
const WEIGHTS={C:.095,'1B':.085,'2B':.085,'3B':.085,SS:.110,LF:.075,CF:.100,RF:.075,DH:.090,P:.200};
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));const norm=(v,l,h)=>clamp((v-l)/(h-l),0,1);
function gen(id){const ends=[151,251,386,493,649,721,809,905,1025];return String(ends.findIndex(v=>id<=v)+1);}
function pool(data,mode='wild',legends=true){const gs=(MODES[mode]||MODES.wild).gens;return data.names.map((_,i)=>i+1).filter(id=>gs.includes(gen(id))&&(legends||!data.leg.includes(id)));}
// Consistent transparent normalization, with logarithmic weight to prevent Wailord dominating.
function features(data,id){const p=data.mons[id-1],m=data.heights[id-1]/10;return {hp:norm(p.hp,20,150),atk:norm(p.atk,20,140),def:norm(p.def,20,140),spa:norm(p.spa,20,140),spd:norm(p.spd,20,140),spe:norm(p.spe,20,130),m:norm(m,.3,2.2),kg:norm(Math.log(Math.max(p.kg,.1)),Math.log(5),Math.log(400))};}
function breakdown(data,id,slot){if(!id||!ROLES[slot])return null;const role=ROLES[slot],f=features(data,id),parts=STATS.map(k=>({stat:k,label:STAT_NAMES[k],weight:role.stats[k],normalized:f[k],points:f[k]*role.stats[k]*100}));const types=data.mons[id-1].types;const bonus=Math.max(0,...types.map(t=>role.types[t]||0));const base=parts.reduce((s,x)=>s+x.points,0);return {slot,parts,base,bonus,fit:Math.round(clamp(base+bonus,0,100)),types,matchedTypes:types.filter(t=>role.types[t])};}
function positionScore(data,id,slot){return breakdown(data,id,slot)?.fit||0;}
// Internal game probabilities use original data; no synthesized baseball attributes are exposed to players.
function hiddenSkills(data,id){const f=features(data,id);return {power:(f.atk*.78+f.spa*.22)*100,contact:(f.atk*.42+f.spa*.28+f.spd*.18+f.spe*.12)*100,fielding:(f.def*.60+f.spd*.21+f.m*.10+f.kg*.09)*100,speed:f.spe*100,control:(f.spa*.63+f.spd*.23+f.def*.14)*100,velocity:(f.atk*.58+f.spa*.29+f.m*.08+f.kg*.05)*100};}

function scoreTeam(data,roster){const fits=FIELD_SLOTS.map(s=>({id:s.id,fit:positionScore(data,roster[s.id],s.id),weight:WEIGHTS[s.id]}));if(fits.some(x=>!roster[x.id]))return null;const weighted=fits.reduce((a,x)=>a+x.fit*x.weight,0);const bottom=[...fits].sort((a,b)=>a.fit-b.fit).slice(0,2);const weak=bottom.reduce((a,x)=>a+x.fit,0)/2;const raw=weighted*.84+weak*.16;
  const to1000=x=>Math.round(clamp((x-14)/78*1000,0,1000));const field=fits.filter(x=>!['P','DH'].includes(x.id)),bat=fits.filter(x=>x.id!=='P');const average=(a)=>a.reduce((s,x)=>s+x.fit,0)/a.length;
  return {score:to1000(raw),offense:to1000(average(bat)),defense:to1000(average(field)),pitching:to1000(fits.find(x=>x.id==='P').fit),raw:+raw.toFixed(2),weighted:+weighted.toFixed(2),weak:+weak.toFixed(2),fits};}
function rand(seed,i){let t=(seed+Math.imul(i+1,0x9e3779b9))|0;t=Math.imul(t^(t>>>16),0x21f0aaad);t=Math.imul(t^(t>>>15),0x735a2d97);return((t^(t>>>15))>>>0)/4294967296;}
function random(seed){let i=0;return()=>rand(seed,++i);}
function roll(data,seed,index,taken,mode='wild',legends=true){const a=pool(data,mode,legends).filter(id=>!taken.includes(id));const gs=[...new Set(a.map(gen))];if(!gs.length)return null;const g=gs[Math.floor(rand(seed,index*2)*gs.length)];const ts=[...new Set(a.filter(id=>gen(id)===g).flatMap(id=>data.mons[id-1].types))];return {gen:g,type:ts[Math.floor(rand(seed,index*2+1)*ts.length)]};}
function choicesFor(data,r,taken,mode='wild',legends=true){if(!r)return [];return pool(data,mode,legends).filter(id=>gen(id)===r.gen&&data.mons[id-1].types.includes(r.type)&&!taken.includes(id));}
function rerollType(data,o,seed,i,taken,mode='wild',legends=true){const a=pool(data,mode,legends).filter(id=>gen(id)===o.gen&&!taken.includes(id));const ts=[...new Set(a.flatMap(id=>data.mons[id-1].types))].filter(t=>t!==o.type);return ts.length?{gen:o.gen,type:ts[Math.floor(rand(seed,i)*ts.length)]}:null;}
function rerollGen(data,o,seed,i,taken,mode='wild',legends=true){const a=pool(data,mode,legends).filter(id=>data.mons[id-1].types.includes(o.type)&&!taken.includes(id));const gs=[...new Set(a.map(gen))].filter(g=>g!==o.gen);return gs.length?{gen:gs[Math.floor(rand(seed,i)*gs.length)],type:o.type}:null;}
// ----- Real rosters and season fatigue -----
const HITTERS=['CF','SS','1B','DH','RF','3B','LF','2B','C'];
const blankBatter=()=>({pa:0,ab:0,h:0,singles:0,doubles:0,triples:0,hr:0,bb:0,k:0,r:0,rbi:0,sb:0});
const blankPitcher=()=>({outs:0,h:0,er:0,bb:0,k:0,bf:0,hr:0});
const OPPONENTS=['Pallet Town','Viridian City','Pewter City','Cerulean City','Vermilion City','Lavender Town','Celadon City','Fuchsia City','Saffron City','Cinnabar Island','New Bark','Goldenrod City','Rustboro City','Mauville City','Littleroot Town','Snowpoint City','Indigo Plateau','Castelia City'];
function createTeamState(data,roster,name='Team'){
 if(SLOTS.some(s=>!roster[s.id]))throw Error('All 15 roster positions must be filled.');
 if(new Set(SLOTS.map(s=>roster[s.id])).size!==15)throw Error('Each Pokémon can only appear once.');
 return {name,roster:{...roster},energy:Object.fromEntries(SLOTS.map(s=>[roster[s.id],100])),restNext:[],played:Object.fromEntries(SLOTS.map(s=>[roster[s.id],0])),score:scoreTeam(data,roster)};
}
function fatigueCost(data,id,slot){const hp=data.mons[id-1].hp;const base=slot==='P'?43:slot==='C'?20:slot==='DH'?12:17;return clamp(Math.round(base*100/(hp+25)),4,80);}
function dailyLineup(data,state){
 const rest=new Set(state.restNext),assigned=new Set(),roster={},substitutions=[];
 for(const slot of FIELD_IDS){const starter=state.roster[slot];if(!rest.has(starter)){roster[slot]=starter;continue;}
   const bench=BENCH_IDS.map(k=>state.roster[k]).filter(id=>!rest.has(id)&&!assigned.has(id));
   if(!bench.length)throw Error('Not enough available bench Pokémon for mandatory rest.');
   bench.sort((a,b)=>positionScore(data,b,slot)-positionScore(data,a,slot)||a-b);
   roster[slot]=bench[0];assigned.add(bench[0]);substitutions.push({position:slot,out:starter,in:bench[0]});
 }
 return {roster,substitutions,rested:[...rest]};
}
function side(data,roster,name='Team',state=null){
 const sc=scoreTeam(data,roster);if(!sc)throw Error('Starting lineup is incomplete.');
 const energy=id=>state?state.energy[id]??100:100;
 // An exhausted starter loses some effectiveness before mandatory rest; HP itself does not raise fit.
 const effectiveness=id=>energy(id)>=40?1:clamp(.75+energy(id)/160,.75,1);
 const batters=HITTERS.map(slot=>{const id=roster[slot],r=hiddenSkills(data,id),mult=effectiveness(id);return {slot,id,fit:positionScore(data,id,slot),r:{...r,power:r.power*mult,contact:r.contact*mult,speed:r.speed*mult}};});
 batters.sort((a,b)=>(b.r.contact*.50+b.r.speed*.20+b.r.power*.30)-(a.r.contact*.50+a.r.speed*.20+a.r.power*.30));
 const pId=roster.P,pR=hiddenSkills(data,pId),mult=effectiveness(pId);
 return {name,team:sc,batters,p:{slot:'P',id:pId,fit:positionScore(data,pId,'P'),r:{control:pR.control*mult,velocity:pR.velocity*mult}},fielding:sc.defense};
}
function mockSide(rating,name='Opponent'){
 const k=clamp(rating/1000,0,1),v=clamp(22+66*k,10,94);
 return {name,team:{score:rating,offense:rating,defense:rating,pitching:rating},fielding:rating,batters:HITTERS.map((slot,i)=>({slot,id:-(i+1),fit:v,r:{power:clamp(v+(i%3-1)*8,0,100),contact:clamp(v+((i*5)%13-6),0,100),speed:v,fielding:v}})),p:{id:-99,slot:'P',fit:v,r:{control:v,velocity:v}}};
}
function simulateMatch(away,home,seed){const rnd=random(seed),squads=[away,home];
 const box=squads.map(s=>({runs:0,hits:0,errors:0,innings:[],batters:Object.fromEntries(s.batters.map(b=>[b.id,blankBatter()])),pitcher:blankPitcher()}));
 const orders=[0,0];let inning=1;
 function half(off,def){const s=squads[off],p=squads[def].p,pitcher=box[def].pitcher,out=box[off];let outs=0,bases=[null,null,null],runs=0,guard=0;
  const move=(index,runner)=>{if(index>2){runs++;out.runs++;if(runner!=null)out.batters[runner].r++;}else bases[index]=runner;};
  while(outs<3&&guard++<45){const hitter=s.batters[orders[off]++%9],st=out.batters[hitter.id],r=hitter.r,pr=p.r;st.pa++;pitcher.bf++;
   const pitching=pr.control*.42+pr.velocity*.40+p.fit*.18,defense=squads[def].fielding/10;
   const walk=clamp(.086+(r.contact-pitching)*.00043,.035,.13),strike=clamp(.225+(pitching-r.contact)*.0015,.085,.37);
   const hr=clamp(.029+(r.power-pitching)*.00052+(hitter.fit-60)/180*.045,.007,.099);
   const hit=clamp(.255+(r.contact-pitching)*.00125-defense*.0015,.16,.365);
   const z=rnd(),oldRuns=runs;
   if(z<walk){st.bb++;pitcher.bb++;if(bases[0]!=null&&bases[1]!=null&&bases[2]!=null){move(3,bases[2]);bases[2]=null;}if(bases[0]!=null&&bases[1]!=null){bases[2]=bases[1];bases[1]=null;}if(bases[0]!=null){bases[1]=bases[0];bases[0]=null;}bases[0]=hitter.id;}
   else{st.ab++;if(z<walk+strike){outs++;st.k++;pitcher.k++;}
    else if(z<walk+strike+hr){st.h++;st.hr++;out.hits++;pitcher.h++;pitcher.hr++;for(let x=2;x>=0;x--)if(bases[x]!=null){move(3,bases[x]);bases[x]=null;}move(3,hitter.id);}
    else if(z<walk+strike+hr+hit){st.h++;out.hits++;pitcher.h++;const extra=rnd(),kind=extra<.71?1:extra<.945?2:3;if(kind===1)st.singles++;else if(kind===2)st.doubles++;else st.triples++;
     for(let x=2;x>=0;x--)if(bases[x]!=null){const next=x+kind+(kind===1&&x===0&&rnd()<.19?1:0);move(next,bases[x]);bases[x]=null;}bases[kind-1]=hitter.id;
    }else outs++;
   }
   st.rbi+=runs-oldRuns;pitcher.er+=runs-oldRuns;
   if(outs<3&&bases[0]!=null&&bases[1]==null&&rnd()<clamp((s.batters.find(x=>x.id===bases[0])?.r.speed||40)*.00032,0,.03)){out.batters[bases[0]].sb++;bases[1]=bases[0];bases[0]=null;}
   if(off===1&&inning>=9&&box[1].runs>box[0].runs)break;
  }
  pitcher.outs+=outs;return runs;
 }
 while(inning<=20){const first=half(0,1);box[0].innings.push(first);if(inning>=9&&box[1].runs>box[0].runs){box[1].innings.push(null);break;}const second=half(1,0);box[1].innings.push(second);if(inning>=9&&box[0].runs!==box[1].runs)break;inning++;}
 if(box[0].runs===box[1].runs){const win=rnd()<.5?0:1;box[win].runs++;box[win].innings[box[win].innings.length-1]++;}
 return {away:box[0],home:box[1],winner:box[0].runs>box[1].runs?'away':'home',innings:box[0].innings.length};
}
function emptyStats(state){return {players:Object.fromEntries(Object.values(state.roster).map(id=>[id,{id,b:blankBatter(),p:blankPitcher(),g:0,starts:0,positions:{}}])),games:0};}
function addStats(agg,box,active){agg.games++;
 for(const [slot,id] of Object.entries(active)){
  const x=agg.players[id];if(!x)continue;x.g++;x.positions[slot]=(x.positions[slot]||0)+1;
  const stats=slot==='P'?box.pitcher:box.batters[id];if(!stats)continue;
  if(slot==='P')for(const k of Object.keys(stats))x.p[k]+=stats[k];else for(const k of Object.keys(stats))x.b[k]+=stats[k];
 }
}
function finalizeStats(state,agg){const batters=[],pitchers=[];for(const id of Object.values(state.roster)){
 const x=agg.players[id],b={...x.b},p=x.p;b.id=id;b.g=x.g;b.positions=x.positions;b.avg=b.ab?(b.h/b.ab).toFixed(3):'.000';b.obp=b.ab+b.bb?((b.h+b.bb)/(b.ab+b.bb)).toFixed(3):'.000';b.slg=b.ab?(b.singles+2*b.doubles+3*b.triples+4*b.hr)/b.ab:0;b.slg=Number(b.slg).toFixed(3);batters.push(b);
 pitchers.push({id,g:x.positions.P||0,ip:`${Math.floor(p.outs/3)}.${p.outs%3}`,era:p.outs?+(p.er*27/p.outs).toFixed(2):0,whip:p.outs?+((p.bb+p.h)*3/p.outs).toFixed(2):0,so:p.k,bb:p.bb,er:p.er,h:p.h,hr:p.hr});
 }
 return {batters,pitchers,games:agg.games};}
function finishDay(data,state,daily){const used=Object.entries(daily.roster),tired=[],oldRest=[...state.restNext];
 // A Pokémon missing this game recovers fully and is eligible to return next game.
 for(const id of oldRest)state.energy[id]=100;
 // Unused bench Pokémon recover between games (one mandatory rest fully restores energy).
 const activeIds=new Set(used.map(([,id])=>id));for(const slot of BENCH_IDS){const id=state.roster[slot];if(!activeIds.has(id))state.energy[id]=Math.min(100,state.energy[id]+30);}
 const fatigue=[];for(const [position,id] of used){const before=state.energy[id],usedEnergy=fatigueCost(data,id,position);state.energy[id]=Math.max(0,before-usedEnergy);state.played[id]++;if(state.energy[id]<=25)fatigue.push({id,position,energy:state.energy[id],cost:usedEnergy});}
 const benchId=new Set(BENCH_IDS.map(k=>state.roster[k]));const benchTired=fatigue.filter(x=>benchId.has(x.id));const startersTired=fatigue.filter(x=>!benchId.has(x.id)).sort((a,b)=>a.energy-b.energy);
 // Every exhausted bench Pokémon is automatically off for the following game, too.
 // Never schedule more starter rest days than the eligible bench can actually cover.
 const availableBench=5-benchTired.length;
 const scheduled=startersTired.slice(0,Math.max(0,availableBench));
 for(const deferred of startersTired.slice(availableBench))state.energy[deferred.id]=26; // reaches threshold on its next appearance
 const restNext=[...scheduled,...benchTired];state.restNext=restNext.map(t=>t.id);
 for(const t of restNext)tired.push({id:t.id,position:t.position,energy:t.energy});
 return {tired,substitutions:daily.substitutions,rested:oldRest,energy:Object.fromEntries(used.map(([slot,id])=>[id,state.energy[id]]))};
}
function playGame(data,awayState,homeState,seed){
 const da=dailyLineup(data,awayState),dh=dailyLineup(data,homeState);
 const away=side(data,da.roster,awayState.name,awayState),home=side(data,dh.roster,homeState.name,homeState);
 const g=simulateMatch(away,home,seed),ae=finishDay(data,awayState,da),he=finishDay(data,homeState,dh);
 return {...g,awayLineup:da.roster,homeLineup:dh.roster,awayEvents:ae,homeEvents:he};
}
function singleSeason(data,roster,seed){const state=createTeamState(data,roster,'Your Team'),agg=emptyStats(state),games=[];let wins=0;
 for(let i=0;i<162;i++){const n=i%OPPONENTS.length,rating=370+n*30+(Math.floor(i/18)%3)*14,opp=mockSide(rating,OPPONENTS[n]);const home=i%2===0;
  const daily=dailyLineup(data,state),team=side(data,daily.roster,'Your Team',state);
  const g=home?simulateMatch(opp,team,seed+i*9871):simulateMatch(team,opp,seed+i*9871);
  const result=home?g.home:g.away,other=home?g.away:g.home;addStats(agg,result,daily.roster);
  const report=finishDay(data,state,daily),win=home?g.winner==='home':g.winner==='away';wins+=+win;
  games.push({number:i+1,opponent:opp.name,rating,home,win,us:result.runs,them:other.runs,hits:result.hits,innings:g.innings,line:{us:result.innings,them:other.innings},...report,activeLineup:daily.roster});
 }
 return {rating:state.score,wins,losses:162-wins,games,stats:finalizeStats(state,agg),seasonLength:162,perfect:wins===162};
}
function winChance(a,b){return 1/(1+Math.exp(-(a-b)/110));}
function game(data,rosterA,rosterB,seed){const x=simulateMatch(side(data,rosterA),side(data,rosterB),seed);return {a:x.away.runs,b:x.home.runs,winner:x.winner==='away'?'a':'b',lineA:x.away.innings,lineB:x.home.innings,detail:x};}
function seasonStats(data,roster,games,seed){const state=createTeamState(data,roster),agg=emptyStats(state);for(let i=0;i<games;i++){const daily=dailyLineup(data,state),g=simulateMatch(side(data,daily.roster,'Team',state),mockSide(550+(i%6)*60),seed+i*1009);addStats(agg,g.away,daily.roster);finishDay(data,state,daily);}return finalizeStats(state,agg);}
function schedulePairs(count){const pairs=[];const full=Math.floor(162/(count-1));for(let c=0;c<full;c++)for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)pairs.push({a:i,b:j,cycle:c});const remain=162-full*(count-1);if(remain===2){for(let i=0;i<count;i++)pairs.push({a:i,b:(i+1)%count,cycle:full});}return pairs;}
function leagueSeason(data,seats,teams,seed){
 const states=seats.map(s=>createTeamState(data,teams[s.id],s.name)),agg=states.map(emptyStats);
 const rows=seats.map((s,i)=>({id:s.id,name:s.name,w:0,l:0,rs:0,ra:0,score:states[i].score})),games=[];
 const pairs=schedulePairs(seats.length);let idx=0;
 for(const pair of pairs){const home=(pair.cycle+pair.a+pair.b)%2?pair.a:pair.b,away=home===pair.a?pair.b:pair.a;
   const g=playGame(data,states[away],states[home],seed+idx++*9137);
   addStats(agg[away],g.away,g.awayLineup);addStats(agg[home],g.home,g.homeLineup);
   const x=rows[away],y=rows[home];x.rs+=g.away.runs;x.ra+=g.home.runs;y.rs+=g.home.runs;y.ra+=g.away.runs;
   if(g.winner==='away'){x.w++;y.l++;}else{y.w++;x.l++;}
   games.push({n:idx,h:seats[home].id,a:seats[away].id,hs:g.home.runs,as:g.away.runs,hi:g.home.hits,ai:g.away.hits,inningsHome:g.home.innings,inningsAway:g.away.innings,extras:g.innings>9,homeEvents:g.homeEvents,awayEvents:g.awayEvents,homeLineup:g.homeLineup,awayLineup:g.awayLineup});
 }
 rows.sort((a,b)=>b.w-a.w||(b.rs-b.ra)-(a.rs-a.ra)||b.score.score-a.score.score);
 const a=seats.findIndex(s=>s.id===rows[0].id),b=seats.findIndex(s=>s.id===rows[1].id);let aw=0,bw=0;const playoff=[];
 while(aw<4&&bw<4){const index=playoff.length,home=index%2?b:a,away=index%2?a:b;const g=playGame(data,states[away],states[home],seed+923847+index*3907);
  addStats(agg[away],g.away,g.awayLineup);addStats(agg[home],g.home,g.homeLineup);
  if(g.winner==='home'){if(home===a)aw++;else bw++;}else{if(away===a)aw++;else bw++;}
  playoff.push({game:index+1,h:seats[home].id,a:seats[away].id,hs:g.home.runs,as:g.away.runs,inningsHome:g.home.innings,inningsAway:g.away.innings,homeEvents:g.homeEvents,awayEvents:g.awayEvents});
 }
 const stats={};seats.forEach((s,i)=>{stats[s.id]=finalizeStats(states[i],agg[i]);});
 return {seed,seasonLength:162,weekCount:162,games,standings:rows,playoff,final:playoff.at(-1),champion:aw===4?seats[a].id:seats[b].id,stats};
}
return {SLOTS,FIELD_SLOTS,BENCH_SLOTS,FIELD_IDS,BENCH_IDS,REGIONS,GENS,MODES,TYPES,STATS,STAT_NAMES,ROLES,WEIGHTS,gen,pool,features,breakdown,positionScore,scoreTeam,rand,roll,choicesFor,rerollType,rerollGen,winChance,game,seasonStats,singleSeason,simulateMatch,side,mockSide,schedulePairs,leagueSeason,fatigueCost,createTeamState,dailyLineup,finishDay};
});
