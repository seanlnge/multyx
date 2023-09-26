!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Multyx=t():e.Multyx=t()}(self,(()=>(()=>{"use strict";var e={376:(e,t,s)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Controller=void 0;const n=s(210);t.Controller=class{constructor(e){this.listening=new Set,this.ws=e,this.keys={},this.mouse={x:NaN,y:NaN,down:!1,centerX:0,centerY:0,scaleX:1,scaleY:1},document.addEventListener("keydown",(e=>{this.keys[e.code]?this.listening.has("keyhold")&&this.relayInput("keyhold",{code:e.code}):(this.keys[e.code]=!0,this.listening.has(e.code)&&this.relayInput("keydown",{code:e.code}))})),document.addEventListener("keyup",(e=>{delete this.keys[e.code],this.listening.has(e.code)&&this.relayInput("keyup",{code:e.code})})),document.addEventListener("mousedown",(e=>{this.mouse.down=!0,this.listening.has("mousedown")&&this.relayInput("mousedown")})),document.addEventListener("mouseup",(e=>{this.mouse.down=!1,this.listening.has("mouseup")&&this.relayInput("mouseup")})),document.addEventListener("mousemove",(e=>{this.mouse.x=(e.clientX-this.mouse.centerX)/this.mouse.scaleX,this.mouse.y=(e.clientY-this.mouse.centerY)/this.mouse.scaleY,this.listening.has("mousemove")&&this.relayInput("mousemove",{x:this.mouse.x,y:this.mouse.y})}))}mapMousePosition(e,t=0,s=0,n=1,i=n){const o=window.innerWidth/(e instanceof HTMLCanvasElement?e.width:e.clientWidth),a=window.innerHeight/(e instanceof HTMLCanvasElement?e.height:e.clientHeight);this.mouse.centerX=t*o,this.mouse.centerY=s*a,this.mouse.scaleX=n*o,this.mouse.scaleY=i*a}addUnpacked(e){e.forEach((e=>{this.listening.add(e)}))}relayInput(e,t){this.ws.send(n.Message.Native(Object.assign({instruction:"input",input:e},t?{data:t}:{})))}}},210:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Message=void 0;class s{constructor(e,t,s=!1){this.name=e,this.data=t,this.time=Date.now(),this.native=s}static BundleOperations(e,t){return Array.isArray(t)||(t=[t]),JSON.stringify(new s("_",{operations:t,deltaTime:e}))}static Native(e){return JSON.stringify(new s("_",e,!0))}static Parse(e){const t=JSON.parse(e);return"_"==t.name[0]&&(t.name=t.name.slice(1)),new s(t.name,t.data,""==t.name)}static Create(e,t){if(0==e.length)throw new Error("Multyx message cannot have empty name");if("_"==e[0]&&(e="_"+e),"function"==typeof t)throw new Error("Multyx data must be JSON storable");return JSON.stringify(new s(e,t))}}t.Message=s},787:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.BuildConstraint=t.EditWrapper=t.isProxy=void 0,t.isProxy=Symbol("isProxy"),t.EditWrapper=class{constructor(e){this.data=e}},t.BuildConstraint=function(e,t){return"min"==e?e=>e>=t[0]?e:t[0]:"max"==e?e=>e<=t[0]?e:t[0]:e=>e}}},t={};function s(n){var i=t[n];if(void 0!==i)return i.exports;var o=t[n]={exports:{}};return e[n](o,o.exports,s),o.exports}var n={};return(()=>{var e=n;const t=s(210),i=s(787),o=s(376);class a{constructor(){this.ws=new WebSocket("ws://localhost:8080/"),this.ping=0,this.events=new Map,this.shared={},this.constraintTable={},this.controller=new o.Controller(this.ws),this.ws.onmessage=e=>{const s=t.Message.Parse(e.data);if(this.ping=2*(Date.now()-s.time),s.native)return console.log(s),this.parseNativeEvent(s);s.name in this.events&&this.events[s.name](s.data)}}on(e,t){var s;const n=null!==(s=this.events.get(e))&&void 0!==s?s:[];n.push(t),this.events.set(e,n)}send(e,s){"_"===e[0]&&(e="_"+e),this.ws.send(t.Message.Create(e,s))}parseNativeEvent(e){var t,s;for(const n of e.data)if("init"==n.instruction)this.uuid=n.client.uuid,this.joinTime=n.client.joinTime,this.shared=n.client.shared,this.unpackConstraints(n.constraintTable),this.controller.addUnpacked(n.client.controller),this.clients=n.clients,this.setupClientProxy(),(null!==(t=this.events.get(a.Start))&&void 0!==t?t:[]).forEach((e=>e()));else if("edit"==n.instruction){let e=this.clients;n.path.unshift(n.uuid);for(const t of n.path.slice(0,-1))e=e[t];e[n.path.slice(-1)[0]]=e[i.isProxy]?new i.EditWrapper(n.value):n.value}else"conn"==n.instruction&&(this.clients[n.uuid]=n.data,(null!==(s=this.events.get(a.Connection))&&void 0!==s?s:[]).forEach((e=>e(n.data))))}unpackConstraints(e){!function e(t,s,n){for(const[o,a]of Object.entries(s)){if("object"==typeof t[o]){e(t[o],a,n[o]={});continue}const s=n[o]={};for(const[e,t]of Object.entries(a))s[e]=(0,i.BuildConstraint)(e,t)}}(this.shared,e,this.constraintTable)}setupClientProxy(){const e=new WeakSet,s=this;this.shared=function n(o,a=[]){let r=s.constraintTable;for(const e of a){if(!(e in r))break;r=r[e]}return new Proxy(o,{get:(t,s)=>s===i.isProxy||("object"!=typeof o[s]||e.has(o[s])||(o[s]=n(o[s],[...a,s]),e.add(o[s])),o[s]),set(e,n,c){if(c===o[n])return!0;if(c instanceof i.EditWrapper)return o[n]=c.data,!0;if(!(n in o)||"object"==typeof c)throw new Error(`Cannot alter shape of shared client object. Attempting to set ${a.join(".")+"."+n} to ${c}`);let u=c;if(n in r)for(const e of Object.values(r[n]))u=e(u);return o[n]===u||(o[n]=u,s.ws.send(t.Message.Native({instruction:"edit",path:[...a,n],value:u}))),!0},deleteProperty(){throw new Error("Cannot alter shape of shared client object")}})}(this.shared),this.clients[this.uuid]=this.shared}static Lerp(e,t){let s={value:e[t],time:Date.now()},n={value:e[t],time:Date.now()};Object.defineProperty(e,t,{get:()=>{let e=Math.min(1,(Date.now()-n.time)/(n.time-s.time));return Number.isNaN(e)&&(e=0),n.value*e+s.value*(1-e)},set:e=>Date.now()-n.time<10?(n.value=e,!0):(s=Object.assign({},n),n={value:e,time:Date.now()},!0)})}}e.default=a,a.Start="start",a.Connection="connection"})(),n.default})()));