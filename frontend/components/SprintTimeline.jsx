import React,{useLayoutEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import spriteManifest from '../../public/sprites/manifest.json';
import {EraProps} from './StreetPoster.jsx';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {desktopStops,sprintPose,ERA_FRAMES,clamp} from './sprint-motion.mjs';

gsap.registerPlugin(ScrollTrigger);
const chapters=[
  {label:'Delhi University Nukkad Natak',year:'THE EARLY DAYS',title:['GALLI KA','THEATRE.'],subtitle:'Delhi University Nukkad Natak',copy:'Shaheed Sukhdev College. Street theatre, loud voices, and expressions big enough for the back row. The stage came later. The drama was always there.',stamp:'DELHI UNIVERSITY',mark:'NUKKAD NATAK',symbol:'✳',note:'NO STAGE? NO PROBLEM.'},
  {label:'Corporate Mazdoori',year:'BEFORE THE MIC',title:['9 TO 5.','PHIR BYE.'],subtitle:'Corporate Mazdoori',copy:'A day job, a desk, and a growing appetite for a different kind of work. From the corporate routine to making everyday life the material.',stamp:'OFFICE SE ONSTAGE',mark:'CORPORATE MAZDOORI',symbol:'⌁',note:'THIS MEETING COULD BE A BIT.'},
  {label:'Comicstaan Season 2 Winner',year:'2019 / THE BREAKTHROUGH',title:['COMICSTAAN.','GAME ON.'],subtitle:'Comicstaan Season 2 Winner',copy:'A national breakout. Comicstaan Season 2 brought the win, a bigger audience, and a whole new stage for that unmistakable Delhi energy.',stamp:'SEASON 2 WINNER',mark:'COMICSTAAN',symbol:'★',note:'SAME EXPRESSIONS. BIGGER ROOM.'},
  {label:'Global Arena Tours',year:'THE JOURNEY CONTINUES',title:['DELHI BOY.','WORLD TOUR.'],subtitle:'Global Arena Tours',copy:'Excuse Me Brother. Daily Ka Kaam Hai. Familiar stories travel across cities, countries, and time zones. The audience changes. The nautanki stays.',stamp:'EXCUSE ME BROTHER',mark:'DUNIYA TAK',symbol:'◎',note:'NEXT STOP? YOUR CITY.'},
];
const frames=[...ERA_FRAMES];
function Skyline(){return <svg className="sprint-skyline" viewBox="0 0 1800 280" aria-hidden="true"><path d="M0 280V190H70V120H110V190H160V225H220V152H247V122H255V152H285V225H340V95H358V78H372V95H389V225H440V125H480V86Q500 45 520 86V125H560V225H610V90H630V65H640V90H660V225H700V156H725V125Q745 100 765 125V156H790V225H850V175H865V115H880V175H895V225H950V155H978V128H1005V155H1035V225H1100V117H1118V97H1140V117H1160V225H1220V165H1265V120H1280V165H1315V225H1370V95H1385V75H1400V95H1420V225H1475V145H1530V225H1580V175H1600V110H1620V175H1640V225H1700V160H1750V200H1800V280Z" fill="currentColor"/><path d="M0 242H1800M0 257H1800" stroke="currentColor" strokeWidth="7"/><g fill="currentColor"><rect x="50" y="198" width="400" height="35" rx="14"/><rect x="900" y="198" width="400" height="35" rx="14"/></g><g fill="#ffd600">{[80,135,190,245,300,355,930,985,1040,1095,1150,1205].map(x=><rect key={x} x={x} y="206" width="30" height="12" rx="2"/>)}</g></svg>}
export default function SprintTimeline(){
  const root=useRef(null),track=useRef(null),background=useRef(null),runner=useRef(null),body=useRef(null),facing=useRef(null),pop=useRef(null),meter=useRef(null),trigger=useRef(null),cardRefs=useRef([]);
  const [activeChapterIndex,setActiveChapterIndex]=useState(0);
  const activeRef=useRef(0);
  useLayoutEffect(()=>{
    let media,popTween;
    const ctx=gsap.context((context)=>{
      context.add('popEra',()=>{popTween?.kill();popTween=gsap.timeline().set(pop.current,{scale:.92}).to(pop.current,{scale:1.06,duration:.1,ease:"steps(1)"}).to(pop.current,{scale:1,duration:.22,ease:"back.out(2.2)"});});
      media=gsap.matchMedia();
      media.add({desktop:'(min-width: 768px)',mobile:'(max-width: 767px)',reduce:'(prefers-reduced-motion: reduce)'},({conditions})=>{
        const {desktop,reduce}=conditions;
        const container=root.current;
        const images=[...container.querySelectorAll('[data-sprint-frame]')];
        const setX=gsap.quickSetter(runner.current,'x','px'),setY=gsap.quickSetter(runner.current,'y','px'),setBounce=gsap.quickSetter(body.current,'y','px'),setTilt=gsap.quickSetter(body.current,'rotation','deg'),setScale=gsap.quickSetter(body.current,'scale'),setFacing=gsap.quickSetter(facing.current,'scaleX'),setMeter=gsap.quickSetter(meter.current,'scaleX');
        let lastFrame='';
        const apply=(p,direction,stops)=>{
          const pose=sprintPose(p,direction,stops);
          if(lastFrame!==pose.frame){const changed=!!lastFrame;images.forEach(img=>{img.style.opacity=img.dataset.sprintFrame===pose.frame?'1':'0'});lastFrame=pose.frame;if(changed)context.popEra();}
          setBounce(pose.y);setTilt(pose.tilt);setScale(pose.scale);setFacing(pose.flip);setMeter(clamp(p));
          container.dataset.activeChapterIndex=String(pose.chapter);container.dataset.sprintPhase=pose.stopped?'punchline':'running';container.dataset.sprintDirection=String(direction);container.dataset.sprintProgress=p.toFixed(3);
          if(activeRef.current!==pose.chapter){activeRef.current=pose.chapter;setActiveChapterIndex(pose.chapter);}
          cardRefs.current.forEach((card,i)=>card.classList.toggle('is-active',i===pose.chapter));
        };
        if(reduce){activeRef.current=0;container.dataset.sprintMode='reduced';images.forEach(img=>img.style.opacity=img.dataset.sprintFrame===ERA_FRAMES[0]?'1':'0');setActiveChapterIndex(0);return()=>{delete container.dataset.sprintMode;};}
        container.dataset.sprintMode=desktop?'horizontal':'vertical';
        if(desktop){
          const camera=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{id:'aakash-sprint',trigger:container,start:'top top',end:()=>'+='+container.clientWidth*4,pin:true,scrub:0.6,anticipatePin:1,invalidateOnRefresh:true,onUpdate:self=>{setX(0);setY(0);apply(self.progress,self.direction,desktopStops);},onRefresh:self=>{setX(0);apply(self.progress,self.direction,desktopStops);}}});
          camera.to(track.current,{x:()=>-container.clientWidth*3,duration:1},0).to(background.current,{x:()=>-container.clientWidth*3*.3,duration:1},0);
          trigger.current=camera.scrollTrigger;
          setX(0);apply(0,1,desktopStops);
        }else{
          let first=0,last=0,stops=[];
          const measure=()=>{const origin=container.getBoundingClientRect().top;const centers=cardRefs.current.map(card=>card.getBoundingClientRect().top-origin+card.offsetHeight*.56);first=centers[0];last=centers[3];stops=centers.map(center=>(center-first)/(last-first));};
          measure();
          const mobileTrigger=ScrollTrigger.create({id:'aakash-sprint-mobile',trigger:container,start:()=>`top+=${first} center`,end:()=>`top+=${last} center`,invalidateOnRefresh:true,onRefreshInit:measure,onRefresh:self=>{measure();setY(first+(last-first)*self.progress-runner.current.offsetHeight*.7);apply(self.progress,self.direction,stops);},onUpdate:self=>{setX(Math.sin(self.progress*Math.PI*6)*8);setY(first+(last-first)*self.progress-runner.current.offsetHeight*.7);apply(self.progress,self.direction,stops);}});
          trigger.current=mobileTrigger;setY(first-runner.current.offsetHeight*.7);apply(0,1,stops);
        }
        return()=>{popTween?.kill();gsap.set(pop.current,{clearProps:'transform'});trigger.current=null;cardRefs.current.forEach(card=>card.classList.remove('is-active'));delete container.dataset.sprintMode;delete container.dataset.activeChapterIndex;delete container.dataset.sprintPhase;delete container.dataset.sprintDirection;delete container.dataset.sprintProgress;images.forEach(img=>img.style.removeProperty('opacity'));};
      });
    },root);
    // Web fonts can change upstream section heights after the initial layout pass.
    let mounted=true;document.fonts?.ready.then(()=>{if(mounted)ScrollTrigger.refresh()});
    return()=>{mounted=false;media?.revert();ctx.revert();};
  },[]);
  function goToChapter(index){const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(window.innerWidth>=768&&!reduce&&trigger.current){const st=trigger.current;window.scrollTo({top:st.start+(st.end-st.start)*desktopStops[index],behavior:'smooth'});}else cardRefs.current[index]?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});}
  return <section ref={root} id="about" className="sprint-timeline" aria-labelledby="sprint-title"><div ref={background} className="sprint-background" aria-hidden="true"><span className="sprint-giant-type">DILLI SE DUNIYA TAK.</span><Skyline/></div><header className="sprint-header"><div><p className="p-kicker">THE LONG WAY TO THE PUNCHLINE</p><h2 id="sprint-title">DELHI SE. <span>DUNIYA TAK.</span></h2></div><div className="sprint-header-aside"><p>Four chapters.<br/>Absolutely no standing still.</p><a className="sprint-skip" href="#specials">SKIP TO THE COMEDY</a></div></header><div className="sprint-scrapbook" ref={track}>{chapters.map((chapter,index)=><div className="sprint-panel" key={chapter.label}><article ref={el=>cardRefs.current[index]=el} className={'sprint-card sprint-card-'+index} aria-labelledby={'sprint-chapter-'+index}><div className="sprint-tape" aria-hidden="true"/><span className="sprint-symbol" aria-hidden="true">{chapter.symbol}</span><div className="sprint-card-copy"><p className="sprint-year">{chapter.year}</p><h3 id={'sprint-chapter-'+index}>{chapter.title[0]}<br/><span>{chapter.title[1]}</span></h3><p className="sprint-subtitle">{chapter.subtitle}</p><p className="sprint-copy">{chapter.copy}</p><span className="sprint-stamp">{chapter.stamp}</span></div><EraProps era={index}/><img className="sprint-static-era" src={"/sprites/"+ERA_FRAMES[index]+".png?v="+spriteManifest.find(asset=>asset.file===ERA_FRAMES[index]+".png").revision} alt={"Aakash Gupta, "+chapter.subtitle+" visual era pairing"} width="600" height="800" loading="lazy"/><span className="sprint-card-note">{chapter.note}</span><span className="sprint-card-mark" aria-hidden="true">{chapter.mark}</span></article></div>)}</div><div className="sprint-foreground" ref={runner} aria-label={"Aakash Gupta cutout: "+chapters[activeChapterIndex].subtitle}><div className="sprint-bounce" ref={body}><div className="sprint-facing" ref={facing}><div className="sprint-era-pop" ref={pop}>{frames.map(frame=><img key={frame} data-sprint-frame={frame} src={'/sprites/'+frame+'.png?v='+spriteManifest.find(asset=>asset.file===frame+'.png').revision} alt="" aria-hidden="true" width="600" height="800" decoding="async" draggable="false"/>)}</div></div></div><span className="sprint-ground-shadow" aria-hidden="true"/></div><div className="sprint-stage-floor" aria-hidden="true"><span>DELHI</span><div/><span>THE WORLD</span></div><nav className="sprint-chapter-nav" aria-label="Comedy journey chapters">{chapters.map((chapter,index)=><button key={chapter.label} type="button" aria-label={chapter.label} aria-current={activeChapterIndex===index?'step':undefined} onClick={()=>goToChapter(index)}><span aria-hidden="true">{['THEATRE','9 TO 5','COMICSTAAN','WORLD TOUR'][index]}</span></button>)}</nav><div className="sprint-progress" aria-hidden="true"><div ref={meter}/></div><span className="sprint-scroll-cue">SCROLL TO RUN THE STORY</span></section>;
}
