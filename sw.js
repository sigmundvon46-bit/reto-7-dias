const SHELL="fi-shell-v1",AUDIO="fi-audio-v1";
const FILES=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==AUDIO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function fromCache(req){
const c=await caches.open(AUDIO),r=await c.match(req.url,{ignoreSearch:true});
if(!r)return null;
const buf=await r.arrayBuffer(),size=buf.byteLength,type=r.headers.get("content-type")||"audio/mpeg",rng=req.headers.get("range");
if(!rng)return new Response(buf,{status:200,headers:{"Content-Type":type,"Content-Length":String(size),"Accept-Ranges":"bytes"}});
const m=/bytes=(\d*)-(\d*)/.exec(rng);let s=m&&m[1]?+m[1]:0,e=m&&m[2]?+m[2]:size-1;
if(m&&!m[1]&&m[2]){s=Math.max(0,size-+m[2]);e=size-1}
e=Math.min(e,size-1);
if(s>e)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+size}});
return new Response(buf.slice(s,e+1),{status:206,headers:{"Content-Type":type,"Content-Range":"bytes "+s+"-"+e+"/"+size,"Content-Length":String(e-s+1),"Accept-Ranges":"bytes"}})}
self.addEventListener("fetch",e=>{
const req=e.request;if(req.method!=="GET")return;
const url=new URL(req.url);if(url.origin!==self.location.origin)return;
if(url.pathname.indexOf("/audio/")!==-1){e.respondWith((async()=>(await fromCache(req))||fetch(req))());return}
e.respondWith(fetch(req).then(res=>{if(res&&res.status===200){const cp=res.clone();caches.open(SHELL).then(c=>c.put(req,cp))}return res}).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))))});
