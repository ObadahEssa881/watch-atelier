/**
 * Set before the first paint: reduced motion, and whether WebGL exists.
 * CSS keys the still photographs off these, so nobody sees a blank stage.
 */
export const MOTION_SCRIPT = `(function(){var d=document.documentElement;try{if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.motion="reduce";var c=document.createElement("canvas"),g=null;try{g=c.getContext("webgl2")}catch(e){}if(!g)d.dataset.webgl="fail"}catch(e){}})();`;
