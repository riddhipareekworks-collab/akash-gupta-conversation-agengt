import {useLayoutEffect} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
export function usePosterEntrances(root){
  useLayoutEffect(()=>{
    let media;
    const context=gsap.context(()=>{
      media=gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)',()=>{
        root.current.querySelectorAll('.p-button').forEach(button=>{
          gsap.from(button,{y:20,scale:.9,rotation:-3,opacity:0,duration:.35,ease:'back.out(2.4)',clearProps:'transform,opacity',scrollTrigger:{trigger:button,start:'top 96%',once:true}});
        });
      });
    },root);
    return()=>{media?.revert();context.revert();};
  },[root]);
}
