import React, {useEffect, useRef} from 'react';
import {gsap} from 'gsap';
import {Starburst} from './StreetPoster.jsx';
import sprites from '../../public/sprites/manifest.json';

const driver = sprites.find(sprite => sprite.file === 'hero_driver_cutout.png');
const sceneryAsset = name => {
  const asset = sprites.find(sprite => sprite.file === `hero_${name}.png`);
  return `/sprites/hero_${name}.png?v=${asset?.revision || 'sky-v1'}`;
};

function SceneryCutout({asset, className, depth}) {
  return <div className={`hero-scenery-parallax ${className}`} data-depth={depth} aria-hidden="true"><img className="hero-scenery-float" src={sceneryAsset(asset)} alt="" draggable="false"/></div>;
}

export default function Hero() {
  const section = useRef(null);
  useEffect(() => {
    const root = section.current;
    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const ambient = gsap.timeline({paused: true, repeat: -1, yoyo: true});
        ambient.to('.hero-cloud .hero-scenery-float', {x: 20, y: -5, duration: 4, stagger: .25, ease: 'steps(12)'}, 0)
          .fromTo('.hero-bird-one .hero-scenery-float', {rotation: -3}, {y: -12, rotation: 3, duration: .8, repeat: 4, yoyo: true, ease: 'steps(4)'}, 0)
          .fromTo('.hero-bird-two .hero-scenery-float', {rotation: 2}, {y: -10, rotation: -2, duration: 1, repeat: 3, yoyo: true, ease: 'steps(4)'}, 0)
          .to('.hero-road .hero-scenery-float', {x: -9, y: 4, rotation: -1, duration: 2, repeat: 1, yoyo: true, ease: 'steps(10)'}, 0);
        const observer = new IntersectionObserver(([entry]) => entry.isIntersecting ? ambient.play() : ambient.pause());
        observer.observe(root);
        return () => {observer.disconnect(); ambient.kill();};
      });
      media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const steer = root.querySelector('.hero-driver-steer');
        const bounce = root.querySelector('.hero-driver-bounce');
        const turn = gsap.quickTo(steer, 'rotation', {duration: .22, ease: 'power2.out'});
        const shift = gsap.quickTo(steer, 'x', {duration: .22, ease: 'power2.out'});
        const layers = [...root.querySelectorAll('.hero-scenery-parallax')].map(element => ({
          x: gsap.quickTo(element, 'x', {duration: .3, ease: 'power2.out'}),
          y: gsap.quickTo(element, 'y', {duration: .3, ease: 'power2.out'}),
          depth: Number(element.dataset.depth)
        }));
        const move = event => {
          const bounds = root.getBoundingClientRect();
          const position = gsap.utils.clamp(-1, 1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1);
          turn(position * 7);
          shift(position * 12);
          const vertical = gsap.utils.clamp(-1, 1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1);
          layers.forEach(layer => {layer.x(-position * layer.depth); layer.y(-vertical * layer.depth * .45);});
        };
        let hop;
        const enter = () => ctx.add(() => {
          hop?.kill();
          hop = gsap.timeline().to(bounce, {y: -5, duration: .08, ease: 'steps(1)'})
            .to(bounce, {y: 0, duration: .08, ease: 'steps(1)'});
        });
        const leave = () => {turn(0); shift(0); layers.forEach(layer => {layer.x(0); layer.y(0);});};
        root.addEventListener('pointermove', move);
        root.addEventListener('pointerenter', enter);
        root.addEventListener('pointerleave', leave);
        return () => {
          root.removeEventListener('pointermove', move);
          root.removeEventListener('pointerenter', enter);
          root.removeEventListener('pointerleave', leave);
          hop?.kill(); turn.tween.kill(); shift.tween.kill();
          layers.forEach(layer => {layer.x.tween.kill(); layer.y.tween.kill();});
          gsap.set([steer, bounce], {clearProps: 'transform'});
        };
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return <section ref={section} className="p-hero hero-delhi" aria-label="Aakash Gupta — stand-up and unnecessary drama">
    <div className="p-hero-copy">
      <p className="p-kicker"><span className="p-star">✳</span> DELHI BOY. WORLDWIDE BAKCHODI.</p>
      <h1>TU HASTA<br/>KYU <span>NAHI?</span></h1>
      <span className="poster-hindi-stamp">तू हँसता क्यों नहीं?</span>
      <p className="p-hero-sub">Sarojini ke dhakke. Delhi traffic ki bakchodi. Aur bilkul unnecessary drama.</p>
      <p className="p-description">Stand-up, stories, and expressions that deserve their own show. Welcome to the world of Aakash Gupta.</p>
      <div className="hero-actions"><a className="p-button" href="#shows">FIND A LIVE SHOW</a><a className="p-watch" href="#specials"><span aria-hidden="true">▶</span> EXCUSE ME BROTHER</a></div>
      <div className="p-hero-foot"><span>HINDI + ENGLISH</span><span>100% DELHI ENERGY</span><span>NO INSIDE VOICE</span></div>
    </div>
    <div className="hero-driver-stage">
      <div className="hero-sky-backdrop" aria-hidden="true" style={{backgroundImage: `url(${sceneryAsset('sky')})`}}/>
      <div className="hero-scenery-window" aria-hidden="true">
        <SceneryCutout asset="cloud" className="hero-cloud hero-cloud-one" depth={7}/>
        <SceneryCutout asset="cloud" className="hero-cloud hero-cloud-two" depth={12}/>
        <SceneryCutout asset="cloud" className="hero-cloud hero-cloud-three" depth={9}/>
        <SceneryCutout asset="road" className="hero-road" depth={18}/>
        <SceneryCutout asset="bird" className="hero-bird hero-bird-one" depth={26}/>
        <SceneryCutout asset="bird" className="hero-bird hero-bird-two" depth={34}/>
      </div>
      <img className="hero-poster-heading" src={sceneryAsset('title')} alt="Aakash Gupta — Daily Ka Kaam Hai. A stand-up comedy special." width="1100" height="400"/>
      <Starburst label="100% ORIGINAL" small="NAUTANKI" tone="yellow" className="p-hero-starburst"/>
      <div className="hero-driver-anchor"><div className="hero-driver-steer"><div className="hero-driver-bounce"><img src={'/sprites/hero_driver_cutout.png?v=' + driver.revision} width={driver.size[0]} height={driver.size[1]} alt="Aakash Gupta in a black tee and red-and-yellow muffler, gripping a steering wheel mid-act-out" fetchPriority="high"/></div></div></div>
      <span className="hero-traffic-note" aria-hidden="true">CAUTION: NO INSIDE VOICE. ↗</span>
    </div>
  </section>;
}
