!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Multyx=e():t.Multyx=e()}(self,(()=>(()=>{"use strict";var t={376:(t,e,i)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.Controller=void 0;const o=i(210);e.Controller=class{constructor(t){this.listening=new Set,this.ws=t,this.keys={},this.mouse={x:NaN,y:NaN,down:!1,centerX:0,centerY:0,scaleX:1,scaleY:1},document.addEventListener("keydown",(t=>{if(this.keys[t.key]||this.keys[t.code])return this.keys[t.key]&&this.listening.has("keyhold")&&this.relayInput("keyhold",{code:t.key}),void(this.keys[t.code]&&this.listening.has("keyhold")&&this.relayInput("keyhold",{code:t.code}));this.keys[t.key]=!0,this.keys[t.code]=!0,this.listening.has(t.key)&&this.relayInput("keydown",{code:t.key}),this.listening.has(t.code)&&this.relayInput("keydown",{code:t.code})})),document.addEventListener("keyup",(t=>{delete this.keys[t.key],delete this.keys[t.code],this.listening.has(t.key)&&this.relayInput("keyup",{code:t.key}),this.listening.has(t.code)&&this.relayInput("keyup",{code:t.code})})),document.addEventListener("mousedown",(t=>{this.mouse.down=!0,this.listening.has("mousedown")&&this.relayInput("mousedown")})),document.addEventListener("mouseup",(t=>{this.mouse.down=!1,this.listening.has("mouseup")&&this.relayInput("mouseup")})),document.addEventListener("mousemove",(t=>{this.mouse.x=(t.clientX-this.mouse.centerX)/this.mouse.scaleX,this.mouse.y=(t.clientY-this.mouse.centerY)/this.mouse.scaleY,this.listening.has("mousemove")&&this.relayInput("mousemove",{x:this.mouse.x,y:this.mouse.y})}))}mapCanvasPosition(t,e){var i,o,s,n,r,a,l,h,u,c,m,f,d,p,b,g;const v="top"in e,y="bottom"in e,w="left"in e,M="right"in e,k=e.anchor,x=t.getBoundingClientRect(),N=(t,...e)=>{const i=t?"Cannot include value for ":"Must include value for ",o=1==e.length?e[0]:e.slice(0,-1).join(", ")+(t?" and ":" or ")+e.slice(-1)[0],s=k?" if anchoring at "+k:" if not anchoring";console.error(i+o+s)},P=x.width/x.height,S=x.height/x.width;if((Number.isNaN(P)||Number.isNaN(S))&&console.error("Canvas element bounding box is flat, canvas must be present on the screen"),k){if("center"==k){if(v&&y&&e.top!==-e.bottom||w&&M&&e.left!==-e.right)return N(!0,"top","bottom","left","right");v?(e.left=w?e.left:M?-e.right:-Math.abs(P*e.top),e.right=w?-e.left:M?e.right:Math.abs(P*e.top),e.bottom=-e.top):y?(e.left=w?e.left:M?-e.right:-Math.abs(P*e.bottom),e.right=w?-e.left:M?e.right:Math.abs(P*e.bottom),e.top=-e.bottom):w?(e.top=v?e.top:y?-e.bottom:-Math.abs(S*e.left),e.bottom=v?-e.top:y?e.bottom:Math.abs(S*e.left),e.right=-e.left):M&&(e.top=v?e.top:y?-e.bottom:-Math.abs(S*e.right),e.bottom=v?-e.top:y?e.bottom:Math.abs(S*e.right),e.left=-e.right)}else if("bottom"==k){if(!w&&!M&&!v)return N(!1,"left","right","top");if(e.bottom)return N(!0,"bottom");e.bottom=0,w?(null!==(i=e.top)&&void 0!==i||(e.top=Math.abs(S*e.left*2)),null!==(o=e.right)&&void 0!==o||(e.right=-e.left)):M?(null!==(s=e.top)&&void 0!==s||(e.top=Math.abs(S*e.right*2)),null!==(n=e.left)&&void 0!==n||(e.left=-e.right)):(e.left=-Math.abs(P*e.top/2),e.right=-e.left)}else if("top"==k){if(!w&&!M&&!y)return N(!1,"left","right","bottom");if(e.top)return N(!0,"top");e.top=0,w?(null!==(r=e.bottom)&&void 0!==r||(e.bottom=Math.abs(S*e.left*2)),null!==(a=e.right)&&void 0!==a||(e.right=-e.left)):M?(null!==(l=e.bottom)&&void 0!==l||(e.bottom=Math.abs(S*e.right*2)),null!==(h=e.left)&&void 0!==h||(e.left=-e.right)):(e.left=-Math.abs(P*e.bottom/2),e.right=-e.left)}else if("left"==k){if(!v&&!y&&!M)return N(!1,"top","bottom","right");if(w)return N(!0,"left");e.left=0,v?(null!==(u=e.right)&&void 0!==u||(e.right=-Math.abs(P*e.top*2)),null!==(c=e.bottom)&&void 0!==c||(e.bottom=-e.top)):y?(null!==(m=e.right)&&void 0!==m||(e.right=Math.abs(P*e.bottom*2)),null!==(f=e.top)&&void 0!==f||(e.top=-e.bottom)):(e.top=-Math.abs(S*e.right/2),e.bottom=-e.top)}else if("right"==k){if(!v&&!y&&!w)return N(!1,"top","bottom","left");if(M)return N(!0,"right");e.right=0,v?(null!==(d=e.left)&&void 0!==d||(e.left=-Math.abs(P*e.top*2)),null!==(p=e.bottom)&&void 0!==p||(e.bottom=-e.top)):y?(null!==(b=e.left)&&void 0!==b||(e.left=Math.abs(P*e.bottom*2)),null!==(g=e.top)&&void 0!==g||(e.top=-e.bottom)):(e.top=-Math.abs(S*e.right/2),e.bottom=-e.top)}else if("topleft"==k){if(!M&&!y)return N(!1,"right","bottom");if(w||v)return N(!0,"left","top");e.left=e.top=0,M?e.bottom=Math.abs(S*e.right):e.right=Math.abs(P*e.bottom)}else if("topright"==k){if(!w&&!y)return N(!1,"left","bottom");if(M||v)return N(!0,"right","top");e.right=e.top=0,w?e.bottom=Math.abs(S*e.left):e.left=Math.abs(P*e.bottom)}else if("bottomleft"==k){if(!M&&!v)return N(!1,"right","top");if(y||w)return N(!0,"bottom","left");e.left=e.bottom=0,M?e.top=Math.abs(S*e.right):e.right=Math.abs(P*e.top)}else if("bottomright"==k){if(!v&&!w)return N(!1,"top","left");if(M||y)return N(!0,"bottom","right");e.right=e.bottom=0,w?e.top=Math.abs(S*e.left):e.left=Math.abs(P*e.top)}}else{if(!v&&!y)return N(!1,"top","bottom");if(y?v||(e.top=e.bottom-t.height):e.bottom=e.top+t.height,!w&&!M)return N(!1,"left","right");M?w||(e.left=e.right-t.width):e.right=e.left+t.width}const E=t.getContext("2d");E.setTransform(1,0,0,1,0,0),t.width=Math.floor(Math.abs(e.right-e.left)),t.height=Math.floor(Math.abs(e.bottom-e.top)),e.right<e.left&&E.scale(-1,1),e.top>e.bottom&&E.scale(1,-1),console.log(e),E.translate(-e.left,-e.top)}mapMousePosition(t,e,i=document.body,o=1,s=o){const n=window.innerWidth/(i instanceof HTMLCanvasElement?i.width:i.clientWidth),r=window.innerHeight/(i instanceof HTMLCanvasElement?i.height:i.clientHeight),a=i.getBoundingClientRect();this.mouse.centerX=a.left+t*n,this.mouse.centerY=a.top+e*r,this.mouse.scaleX=o*n,this.mouse.scaleY=s*r}mapMouseToCanvas(t){const e=t.getContext("2d").getTransform(),i=t.getBoundingClientRect(),o=i.width/t.width,s=i.height/t.height;this.mouse.centerX=i.left+e.e*o,this.mouse.centerY=i.top+e.f*s,this.mouse.scaleX=o*e.a,this.mouse.scaleY=s*e.d}relayInput(t,e){if(1!==this.ws.readyState)throw new Error("Websocket connection is "+(2==this.ws.readyState?"closing":"closed"));this.ws.send(o.Message.Native(Object.assign({instruction:"input",input:t},e?{data:e}:{})))}}},210:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.Message=void 0;class i{constructor(t,e,i=!1){this.name=t,this.data=e,this.time=Date.now(),this.native=i}static BundleOperations(t,e){return Array.isArray(e)||(e=[e]),JSON.stringify(new i("_",{operations:e,deltaTime:t}))}static Native(t){return JSON.stringify(new i("_",t,!0))}static Parse(t){const e=JSON.parse(t);return"_"==e.name[0]&&(e.name=e.name.slice(1)),new i(e.name,e.data,""==e.name)}static Create(t,e){if(0==t.length)throw new Error("Multyx message cannot have empty name");if("_"==t[0]&&(t="_"+t),"function"==typeof e)throw new Error("Multyx data must be JSON storable");return JSON.stringify(new i(t,e))}}e.Message=i},787:(t,e)=>{function i(t,e){if(!e){for(const e in t)i(t,e);return}let o={value:t[e],time:Date.now()},s={value:t[e],time:Date.now()};Object.defineProperty(t,e,{get:()=>{let t=Math.min(1,(Date.now()-s.time)/(s.time-o.time));return Number.isNaN(t)&&(t=0),s.value*t+o.value*(1-t)},set:t=>Date.now()-s.time<10?(s.value=t,!0):(o=Object.assign({},s),s={value:t,time:Date.now()},!0)})}Object.defineProperty(e,"__esModule",{value:!0}),e.EditWrapper=e.isProxy=void 0,e.PredictiveLerp=function(t,e){if(!e){for(const e in t)i(t,e);return}let o={value:t[e],time:Date.now()},s={value:t[e],time:Date.now()};Object.defineProperty(t,e,{get:()=>{let t=0+Math.min(1,(Date.now()-s.time)/(s.time-o.time));return Number.isNaN(t)&&(t=0),s.value*(1+t)-o.value*t},set:t=>Date.now()-s.time<10?(s.value=t,!0):(o=Object.assign({},s),s={value:t,time:Date.now()},!0)})},e.Lerp=i,e.Interpolate=function(t,e,i){let o={value:t[e],time:Date.now()},s={value:t[e],time:Date.now()};Object.defineProperty(t,e,{get:()=>{const t=s.time-o.time;let e=i[0],n=i[0];for(const o of i)t>o.time&&o.time>e.time&&(e=o),t<o.time&&o.time<n.time&&(n=o);const r=(t-e.time)/(n.time-e.time),a=e.progress+r*(n.progress-e.progress);return Number.isNaN(a)?o.value:s.value*a+o.value*(1-a)},set:t=>Date.now()-s.time<10?(s.value=t,!0):(o=Object.assign({},s),s={value:t,time:Date.now()},!0)})},e.BuildConstraint=function(t,e){return"min"==t?t=>t>=e[0]?t:e[0]:"max"==t?t=>t<=e[0]?t:e[0]:t=>t},e.isProxy=Symbol("isProxy"),e.EditWrapper=class{constructor(t){this.data=t}}}},e={};function i(o){var s=e[o];if(void 0!==s)return s.exports;var n=e[o]={exports:{}};return t[o](n,n.exports,i),n.exports}var o={};return(()=>{var t=o;const e=i(210),s=i(787),n=i(376);t.default=new class{constructor(){this.Start=Symbol("start"),this.Connection=Symbol("connection"),this.Disconnect=Symbol("disconnect"),this.Edit=Symbol("edit"),this.Public=Symbol("public"),this.Native=Symbol("native"),this.Custom=Symbol("custom"),this.Any=Symbol("any"),this.Lerp=s.Lerp,this.Interpolate=s.Interpolate,this.PredictiveLerp=s.PredictiveLerp,this.ProxySet=new Set,this.ws=new WebSocket("ws://localhost:8080/"),this.ping=0,this.events=new Map,this.self={},this.all={},this.constraintTable={},this.controller=new n.Controller(this.ws),this.ws.onmessage=t=>{var i,o,s;const n=e.Message.Parse(t.data);this.ping=2*(Date.now()-n.time),n.native?(this.parseNativeEvent(n),null===(i=this.events.get(this.Native))||void 0===i||i.forEach((t=>t()))):n.name in this.events&&(this.events[n.name](n.data),null===(o=this.events.get(this.Custom))||void 0===o||o.forEach((t=>t()))),null===(s=this.events.get(this.Any))||void 0===s||s.forEach((t=>t()))}}on(t,e){var i;const o=null!==(i=this.events.get(t))&&void 0!==i?i:[];o.push(e),this.events.set(t,o)}send(t,i,o=!1){if("_"===t[0]&&(t="_"+t),this.ws.send(e.Message.Create(t,i)),o)return new Promise((e=>this.events.set(Symbol.for("_"+t),[e])))}loop(t,e){this.on(this.Start,(()=>setInterval(e,Math.round(1e3/t))))}forAll(t){1==this.ws.readyState?Object.values(this.clients).forEach((e=>t(e))):new Promise((t=>this.on(this.Start,t))).then((()=>{Object.values(this.clients).forEach((e=>t(e)))})),this.on(this.Connection,t)}parseNativeEvent(t){var e,i;console.log(t);for(const o of t.data)switch(o.instruction){case"init":this.initialize(o);break;case"edit":this.parseEdit(o);break;case"self":"controller"==o.prop?this.controller.listening=new Set(o.data):"uuid"==o.prop&&(this.uuid=o.data);break;case"conn":this.clients[o.uuid]=o.data,null===(e=this.events.get(this.Connection))||void 0===e||e.forEach((t=>t(o)));break;case"dcon":delete this.clients[o.uuid],null===(i=this.events.get(this.Disconnect))||void 0===i||i.forEach((t=>t(o)));break;case"resp":(0,this.events.get(Symbol.for("_"+o.name))[0])(o.response);break;default:console.error("Unknown native Multyx instruction")}}initialize(t){var e;this.uuid=t.client.uuid,this.joinTime=t.client.joinTime,this.self=t.client.self,this.unpackConstraints(t.constraintTable),this.controller.listening=new Set(t.client.controller),this.clients=t.clients,this.teams=t.teams,this.all=t.teams.all,this.self=this.applyProxy(this.self,[this.uuid]);for(const t of Object.keys(this.teams))this.teams[t]=this.applyProxy(this.teams[t],[t]);this.all=this.teams.all,this.clients[this.uuid]=this.self,null===(e=this.events.get(this.Start))||void 0===e||e.forEach((e=>e(t)))}parseEdit(t){var e;let i=t.team?this.teams:this.clients,o=t.team&&!(t.path[0]in this.teams);for(const e of t.path.slice(0,-1))e in i||(i[e]=i[s.isProxy]?new s.EditWrapper({}):{}),i=i[e];i[t.path.slice(-1)[0]]=i[s.isProxy]?new s.EditWrapper(t.value):t.value,o&&(this.teams[t.path[0]]=this.applyProxy(this.teams[t.path[0]],[t.path[0]])),null===(e=this.events.get(this.Edit))||void 0===e||e.forEach((e=>e(t)))}unpackConstraints(t){!function t(e,i,o){for(const[n,r]of Object.entries(i)){if("object"==typeof e[n]){t(e[n],r,o[n]={});continue}const i=o[n]={};for(const[t,e]of Object.entries(r))i[t]=(0,s.BuildConstraint)(t,e)}}(this.self,t,this.constraintTable)}applyProxy(t,i){let o=this.constraintTable;for(const t of i){if(!(t in o))break;o=o[t]}return new Proxy(t,{get:(e,o)=>o===s.isProxy||("object"!=typeof t[o]||this.ProxySet.has(t[o])||(t[o]=this.applyProxy(t[o],[...i,o]),this.ProxySet.add(t[o])),t[o]),set:(n,r,a)=>{if(a===t[r])return!0;if(a instanceof s.EditWrapper)return void 0===a.data?delete t[r]:(t[r]=a.data,!0);if(Array.isArray(t)&&Number.isNaN(parseInt(r)))return t[r]=a,!0;let l=a;if(void 0===a)delete t[r];else{if(r in o)for(const t of Object.values(o[r]))l=t(l);if(t[r]===l)return!0;t[r]=l,void 0===l&&delete t[r]}return this.ws.send(e.Message.Native({instruction:"edit",path:[...i,r],value:l})),!0},deleteProperty:(o,s)=>(delete t[s],this.ws.send(e.Message.Native({instruction:"edit",path:[...i,s],value:void 0})),!0)})}}})(),o.default})()));