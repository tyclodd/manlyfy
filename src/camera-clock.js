// Use decoded camera frames immediately; a timer covers browsers that delay
// requestVideoFrameCallback. Neither path queues or processes the same frame twice.
export class CameraClock {
  constructor(video,onFrame){this.video=video;this.onFrame=onFrame;this.active=false;this.lastTime=-1;this.videoHandle=null;this.timer=null;}
  start(){this.stop();this.active=true;this.lastTime=-1;this.watchVideo();this.watchTimer();this.process(performance.now());}
  process(now){if(!this.active||this.video.readyState<2||this.video.currentTime===this.lastTime)return false;this.lastTime=this.video.currentTime;this.onFrame(now);return true;}
  watchVideo(){if(!this.active||!this.video.requestVideoFrameCallback)return;this.videoHandle=this.video.requestVideoFrameCallback(now=>{this.videoHandle=null;if(!this.active)return;this.process(now);this.watchVideo();});}
  watchTimer(){if(!this.active)return;this.timer=setTimeout(()=>{this.timer=null;if(!this.active)return;const start=performance.now();this.process(start);this.timer=setTimeout(()=>{this.timer=null;this.watchTimer();},Math.max(0,16-(performance.now()-start)));},0);}
  stop(){this.active=false;clearTimeout(this.timer);this.timer=null;if(this.videoHandle!==null)this.video.cancelVideoFrameCallback?.(this.videoHandle);this.videoHandle=null;}
}
