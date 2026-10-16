// Use decoded camera frames immediately; a timer covers browsers that delay
// requestVideoFrameCallback. Neither path queues or processes the same frame twice.
export class CameraClock {
  constructor(video,onFrame){this.video=video;this.onFrame=onFrame;this.active=false;this.lastFrame=null;this.videoHandle=null;this.timer=null;}
  start(){this.stop();this.active=true;this.lastFrame=null;this.watchVideo();this.watchTimer();this.process(performance.now());}
  process(now){
    if(!this.active||this.video.readyState<2)return false;
    // currentTime can advance between decoded frames. Prefer the decoder's
    // counter so watchdog ticks do not repeat expensive flow/render work.
    const frames=this.video.getVideoPlaybackQuality?.().totalVideoFrames||this.video.webkitDecodedFrameCount;
    const frame=frames>0?'decoded:'+frames:'time:'+this.video.currentTime;
    if(frame===this.lastFrame)return false;this.lastFrame=frame;this.onFrame(now);return true;
  }
  watchVideo(){if(!this.active||!this.video.requestVideoFrameCallback)return;this.videoHandle=this.video.requestVideoFrameCallback(now=>{this.videoHandle=null;if(!this.active)return;this.process(now);this.watchVideo();});}
  watchTimer(){if(!this.active)return;this.timer=setTimeout(()=>{this.timer=null;if(!this.active)return;this.process(performance.now());this.watchTimer();},16);}
  stop(){this.active=false;clearTimeout(this.timer);this.timer=null;if(this.videoHandle!==null)this.video.cancelVideoFrameCallback?.(this.videoHandle);this.videoHandle=null;}
}
