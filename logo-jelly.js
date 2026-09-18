/* INSYNC jelly: the original brand silhouette, extruded and shaded in WebGL.
   Interaction adapted from the user's tibetyakut.xyz jelly star. No dependencies. */
(() => {
    'use strict';
    const canvas = document.getElementById('logo-jelly');
    const stage = document.querySelector('.jelly-stage');
    if (!canvas || !stage) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
    const fragment = `
    precision highp float;
    uniform vec2 center, stretch;
    uniform float pixels, time, motion;
    uniform vec3 tint, turn;
    const float PI=3.14159265;
    mat2 rotate(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
    uniform sampler2D logoDistance;
    float logo(vec2 p){
        vec2 uv=p/3.0+.5;
        vec2 edge=max(abs(p)-1.48,0.);
        float d=(texture2D(logoDistance,clamp(uv,.001,.999)).r*255.-128.)/2.*3./256.;
        return d+length(edge);
    }
    float shape(vec3 p){
        p.xy=rotate(turn.z)*p.xy;
        p.yz=rotate(turn.x)*p.yz;
        p.xz=rotate(turn.y)*p.xz;
        p.x-=stretch.x*p.y*.35;
        p.y/=1.+stretch.y*.20;
        p.xz*=1.+stretch.y*.10;
        p.xy+=vec2(sin(p.y*5.-time*5.),sin(p.x*4.+time*4.3))*motion*.055;
        p.z+=sin(p.x*4.+time*3.)*cos(p.y*4.-time*2.7)*motion*.075;
        float bulge=.06*cos(p.x*2.)*cos(p.y*2.);
        vec2 d=vec2(logo(p.xy),abs(p.z)-.17-bulge);
        return (min(max(d.x,d.y),0.)+length(max(d,0.))-.065)*.58;
    }
    vec3 normalAt(vec3 p){
        vec2 e=vec2(.025,0.);
        return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));
    }
    float card(vec2 uv,vec2 pos,vec2 halfSize,float blur){
        vec2 d=abs(uv-pos)-halfSize;
        return 1.-smoothstep(-blur,blur,max(d.x,d.y));
    }
    vec3 environment(vec3 d){
        vec2 uv=d.xy/max(abs(d.z),.12);
        float front=smoothstep(-.1,.1,d.z);
        float key=card(uv,vec2(-.85,.95),vec2(.65,.32),.06);
        float strip=card(uv,vec2(.9,.1),vec2(.075,.85),.025);
        float edge=card(uv,vec2(-1.25,-.35),vec2(.07,.65),.02);
        float rear=card(uv,vec2(.15,-.65),vec2(1.05,.32),.035);
        float ceiling=pow(max(d.y,0.),6.);
        return vec3(.012)+vec3(1.,.95,.98)*(front*(key*5.+strip*7.+edge*4.)+(1.-front)*(rear*3.8+key*1.8))+ceiling*.6;
    }
    vec3 film(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
    void main(){
        vec2 uv=(gl_FragCoord.xy-center)/pixels;
        // Expensive shading is confined to the moving body's bounding square.
        if(max(abs(uv.x),abs(uv.y))>1.9){gl_FragColor=vec4(0.);return;}
        vec3 ro=vec3(uv,4.5),rd=vec3(0.,0.,-1.);
        float t=2.6; bool hit=false;
        for(int i=0;i<90;i++){
            float d=shape(ro+rd*t);
            if(d<.0025){hit=true;break;}if(t>6.4)break;t+=d;
        }
        vec3 col=vec3(0.);
        if(hit){
            vec3 p=ro+rd*t,n=normalAt(p);
            float fres=.08+.92*pow(1.-max(dot(-rd,n),0.),4.);
            vec3 light=normalize(vec3(-.6,.9,1.4));
            float diffuse=max(dot(n,light),0.);
            vec3 reflection=environment(reflect(rd,n));
            float gloss=pow(max(dot(reflect(-light,n),-rd),0.),38.);
            col=vec3(.016,.019,.023)*(0.7+diffuse*.5);
            col+=reflection*(.10+fres*.34)+gloss*.38;
            col=pow(film(col),vec3(1./2.2));
        }
        gl_FragColor=vec4(col,hit?1.:0.);
    }`;
    function shader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
    }
    let program;
    try {
        program = gl.createProgram();
        gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
        gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    } catch (error) { console.warn('Logo uses static fallback:', error); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['center','pixels','stretch','time','motion','tint','turn','logoDistance'].map(key => [key, gl.getUniformLocation(program, key)]));
    const texture = gl.createTexture();
    const image = new Image();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const body = {x:0,y:0,vx:0,vy:0,angle:0,spin:0,tiltX:.16,tiltY:-.25};
    const gel = {x:0,y:0,vx:0,vy:0};
    let width=1,height=1,ratio=1,ready=false,visible=true,lost=false,drag=null,raf=0,last=0,elapsed=0;
    const resetButton = document.getElementById('jelly-reset');
    const hint = document.getElementById('jelly-hint');
    function scale() { return Math.min(width*.26, height*.29, 120); }
    function bounds() { const r=scale()*1.3; return {left:r,right:width-r,top:r,bottom:height-r}; }
    function contain() { const b=bounds(); body.x=clamp(body.x,b.left,b.right); body.y=clamp(body.y,b.top,b.bottom); }
    function active() { return ready && visible && !document.hidden && !lost; }
    function wake() { if (!raf && active()) { last=performance.now(); raf=requestAnimationFrame(frame); } }
    function render() {
        gl.uniform2f(uniforms.center,body.x*ratio,(height-body.y)*ratio);
        gl.uniform1f(uniforms.pixels,scale()*ratio);
        gl.uniform2f(uniforms.stretch,gel.x,gel.y);
        gl.uniform3f(uniforms.turn,body.tiltX+gel.y*.15,body.tiltY+gel.x*.18,body.angle);
        gl.uniform1f(uniforms.time,elapsed);
        gl.uniform1f(uniforms.motion,reduced.matches ? 0 : Math.min(.75,(Math.abs(gel.vx)+Math.abs(gel.vy))*.12));
        gl.uniform3f(uniforms.tint,.035,.04,.045);
        gl.drawArrays(gl.TRIANGLES,0,6);
    }
    function resize() {
        const rect=stage.getBoundingClientRect(), oldW=width, oldH=height;
        width=Math.max(1,rect.width); height=Math.max(1,rect.height);
        if(oldW>1) {body.x*=width/oldW;body.y*=height/oldH;} else {body.x=width/2;body.y=height/2;}
        ratio=Math.min(devicePixelRatio||1,1.5);
        canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
        gl.viewport(0,0,canvas.width,canvas.height); contain(); wake();
    }
    function frame(now) {
        raf=0; if(!active()) return;
        const dt=Math.min((now-last)/1000,.035); last=now; elapsed+=dt;
        for(let i=0;i<4;i++) {
            const step=dt/4; let gx=0,gy=0;
            if(drag) {
                const dx=drag.x-drag.offsetX-body.x,dy=drag.y-drag.offsetY-body.y;
                if(reduced.matches) {body.x+=dx;body.y+=dy;body.vx=body.vy=0;}
                else {body.vx+=(dx*115-body.vx*16)*step;body.vy+=(dy*115-body.vy*16)*step;gx=clamp(dx/scale(),-.9,.9);gy=clamp(-dy/scale(),-.8,.8);}
            } else {body.vx*=Math.exp(-1.8*step);body.vy*=Math.exp(-1.8*step);}
            body.x+=body.vx*step; body.y+=body.vy*step;
            const b=bounds();
            if(body.x<b.left||body.x>b.right) {body.x=clamp(body.x,b.left,b.right);gel.vx+=clamp(body.vx/160,-4,4);body.vx*= -.65;}
            if(body.y<b.top||body.y>b.bottom) {body.y=clamp(body.y,b.top,b.bottom);gel.vy+=clamp(body.vy/160,-4,4);body.vy*= -.65;}
            gel.vx+=((gx-gel.x)*55-gel.vx*6)*step;gel.vy+=((gy-gel.y)*55-gel.vy*6)*step;
            gel.x=clamp(gel.x+gel.vx*step,-1,1);gel.y=clamp(gel.y+gel.vy*step,-1,1);
            body.spin*=Math.exp(-2.4*step);body.angle+=body.spin*step;
            // Return to the readable brand orientation after each throw.
            body.angle+=-body.angle*step*1.7;
            body.tiltX+=(.16+clamp(body.vy/800,-.5,.5)-body.tiltX)*step*6;
            body.tiltY+=(-.25+clamp(body.vx/800,-.5,.5)-body.tiltY)*step*6;
        }
        render();
        const moving=Math.hypot(body.vx,body.vy)>.2||Math.abs(body.angle)>.002||Math.abs(body.spin)>.002||Math.abs(body.tiltX-.16)+Math.abs(body.tiltY+.25)>.002||Math.abs(gel.x)+Math.abs(gel.y)+Math.abs(gel.vx)+Math.abs(gel.vy)>.003;
        if(drag||moving) raf=requestAnimationFrame(frame);
    }
    function point(event) {const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
    function hit(p) {return Math.abs(p.x-body.x)<scale()*1.12&&Math.abs(p.y-body.y)<scale()*1.12;}
    function jiggle() {
        if(reduced.matches) {body.tiltY=body.tiltY<0?.25:-.25;render();return;}
        body.vx+=180;body.vy-=130;body.spin+=1.3;gel.vx+=2.8;gel.vy-=3;wake();
    }
    canvas.addEventListener('pointerdown',event=>{
        if(event.button!==0||drag||!ready) return;
        const p=point(event);if(!hit(p))return;
        event.preventDefault();canvas.focus({preventScroll:true});
        drag={id:event.pointerId,...p,offsetX:p.x-body.x,offsetY:p.y-body.y,start:p,samples:[{...p,t:performance.now()}]};
        canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');wake();
    });
    canvas.addEventListener('pointermove',event=>{
        const p=point(event);canvas.classList.toggle('over-logo',hit(p));
        if(!drag||event.pointerId!==drag.id)return;
        const now=performance.now();drag.x=p.x;drag.y=p.y;
        drag.samples.push({...p,t:now});drag.samples=drag.samples.filter(s=>now-s.t<100);wake();
    });
    function release(event,throwBody=true) {
        if(!drag||(event&&event.pointerId!==drag.id))return;
        const grab=drag;drag=null;canvas.classList.remove('dragging');
        const samples=grab.samples,first=samples[0],end=samples[samples.length-1];
        if(throwBody&&!reduced.matches&&samples.length>1&&performance.now()-end.t<110) {
            const seconds=Math.max(.016,(end.t-first.t)/1000);
            body.vx=clamp((end.x-first.x)/seconds,-1100,1100);body.vy=clamp((end.y-first.y)/seconds,-1100,1100);
            body.spin=clamp((grab.offsetX*body.vy-grab.offsetY*body.vx)/(scale()*scale())*.2,-3,3);
            gel.vx+=clamp(body.vx/350,-3,3);gel.vy-=clamp(body.vy/350,-3,3);
        } else {body.vx=body.vy=0;}
        if(canvas.hasPointerCapture(grab.id))canvas.releasePointerCapture(grab.id);
        if(throwBody&&Math.hypot(grab.x-grab.start.x,grab.y-grab.start.y)<5)jiggle();
        wake();
    }
    canvas.addEventListener('pointerup',e=>release(e));
    canvas.addEventListener('pointercancel',e=>release(e,false));
    canvas.addEventListener('lostpointercapture',e=>release(e,false));
    canvas.addEventListener('keydown',event=>{
        if(![' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))return;
        event.preventDefault();
        if(event.key==='Escape') {reset();return;}
        if(event.key===' '||event.key==='Enter') {jiggle();return;}
        const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
        const dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
        if(reduced.matches) {body.x+=dx*18;body.y+=dy*18;contain();render();}
        else {body.vx+=dx*240;body.vy+=dy*240;wake();}
    });
    function reset() {
        release(null,false);Object.assign(body,{x:width/2,y:height/2,vx:0,vy:0,angle:0,spin:0,tiltX:.16,tiltY:-.25});
        Object.assign(gel,{x:0,y:0,vx:0,vy:0});wake();
    }
    resetButton.addEventListener('click',reset);
    reduced.addEventListener('change',reset);
    document.addEventListener('visibilitychange',()=>{release(null,false);wake();});
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)release(null,false);wake();},{threshold:.01}).observe(stage);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;release(null,false);cancelAnimationFrame(raf);raf=0;stage.classList.remove('jelly-ready');resetButton.hidden=true;hint.textContent='GO AT YOUR OWN PACE.';});
    canvas.addEventListener('webglcontextrestored',()=>{ /* Keep the accessible static fallback until reload. */ });
    image.onload=()=>{
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.uniform1i(uniforms.logoDistance,0);ready=true;stage.classList.add('jelly-ready');resetButton.hidden=false;hint.textContent='GRAB. TOSS. GET IN SYNC.';
        new ResizeObserver(resize).observe(stage);resize();
    };
    image.src='assets/logo-distance.png';
})();
