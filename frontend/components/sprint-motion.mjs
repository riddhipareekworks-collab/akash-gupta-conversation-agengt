export const FRAME_STEP=0.03;
export const RUN_FRAMES=['pose_run_1','pose_run_2','pose_mid_air'];
export const STOP_FRAME='pose_rant_stop';
export const ERA_FRAMES=['era_1_theatre','era_2_corporate','era_3_comicstaan','era_4_worldtour'];
export const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
// Cards now settle at the viewport center; the foreground stays in its own zone.
export const desktopStops=[0,1/3,2/3,1];
export function sprintPose(progress,direction=1,stops=desktopStops){
 const p=clamp(progress);
 const chapter=stops.reduce((best,point,i)=>Math.abs(point-p)<Math.abs(stops[best]-p)?i:best,0);
 const stopped=Math.abs(stops[chapter]-p)<=.024;
 return {frame:ERA_FRAMES[chapter],chapter,stopped,y:stopped?0:Math.sin(p*Math.PI*24)*-18,tilt:stopped?0:Math.sin(p*Math.PI*24)*6,scale:stopped?1.06:1,flip:direction===-1?-1:1};
}
