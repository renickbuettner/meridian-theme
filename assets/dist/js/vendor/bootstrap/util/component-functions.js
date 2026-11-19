/*!
* Bootstrap component-functions.js v6.0.0-alpha.1 (https://getbootstrap.com/)
* Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
*/
import t from"../dom/event-handler.js";import e from"../dom/selector-engine.js";import{isDisabled as n}from"./index.js";const s=(s,o="hide")=>{const i=`click.dismiss${s.EVENT_KEY}`,r=s.NAME;t.on(document,i,`[data-bs-dismiss="${r}"]`,function(t){if(["A","AREA"].includes(this.tagName)&&t.preventDefault(),n(this))return;const i=e.getElementFromSelector(this)||this.closest(`.${r}, [class*=":${r}"]`);s.getOrCreateInstance(i)[o]()})},o=(t,e,n,s,o=null)=>{i(`${e}.${t.NAME}`,n,e=>{const n=e.targets.filter(Boolean).map(e=>t.getOrCreateInstance(e));"function"==typeof o&&o({...e,instances:n});for(const t of n)t[s]()})},i=(n,s,o)=>{const i=`${s}:not(.disabled):not(:disabled)`;t.on(document,n,i,function(t){["A","AREA"].includes(this.tagName)&&t.preventDefault();const n=e.getSelectorFromElement(this);o({targets:n?e.find(n):[this],event:t})})};export{s as enableDismissTrigger,o as eventActionOnPlugin};
