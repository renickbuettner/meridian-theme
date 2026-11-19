/*!
* Bootstrap manipulator.js v6.0.0-alpha.1 (https://getbootstrap.com/)
* Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
*/
function t(t){if("true"===t)return!0;if("false"===t)return!1;if(t===Number(t).toString())return Number(t);if(""===t||"null"===t)return null;if("string"!=typeof t)return t;try{return JSON.parse(decodeURIComponent(t))}catch{return t}}function e(t){return t.replace(/[A-Z]/g,t=>`-${t.toLowerCase()}`)}const r={setDataAttribute(t,r,a){t.setAttribute(`data-bs-${e(r)}`,a)},removeDataAttribute(t,r){t.removeAttribute(`data-bs-${e(r)}`)},getDataAttributes(e){if(!e)return{};const r={},a=Object.keys(e.dataset).filter(t=>t.startsWith("bs")&&!t.startsWith("bsConfig"));for(const s of a){let a=s.replace(/^bs/,"");a=a.charAt(0).toLowerCase()+a.slice(1),r[a]=t(e.dataset[s])}return r},getDataAttribute:(r,a)=>t(r.getAttribute(`data-bs-${e(a)}`))};export{r as default};
