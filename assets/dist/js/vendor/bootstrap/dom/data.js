/*!
* Bootstrap data.js v6.0.0-alpha.1 (https://getbootstrap.com/)
* Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
*/
const e=new Map;var t={set(t,s,n){e.has(t)||e.set(t,new Map);const a=e.get(t);a.has(s)||0===a.size?a.set(s,n):console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${[...a.keys()][0]}.`)},get:(t,s)=>t&&e.has(t)&&e.get(t).get(s)||null,getAny:t=>t&&e.has(t)&&e.get(t).values().next().value||null,remove(t,s){if(!e.has(t))return;const n=e.get(t);n.delete(s),0===n.size&&e.delete(t)}};export{t as default};
