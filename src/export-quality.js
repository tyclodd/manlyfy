import {outputSize} from './core.js?v=1.7.0';
export const MAX_FACES=8;
export function exportSize(width,height,ratio='original',quality='source'){
 return outputSize(width,height,ratio,quality==='1080'?1920:quality==='720'?1280:3840);
}
export function videoBitrate(width,height,fps=30){
 return Math.round(Math.max(6_000_000,Math.min(80_000_000,width*height*Math.min(120,Math.max(1,fps))*.2)));
}
export function trackingProfile(quality='precision',group=false){
 return quality==='lite'?{flowEdge:320,scanEdge:640,interval:120,cpuInterval:350,fps:30}:
  {flowEdge:480,scanEdge:group?1280:960,interval:quality==='balanced'?40:0,cpuInterval:quality==='balanced'?220:120,fps:60};
}
