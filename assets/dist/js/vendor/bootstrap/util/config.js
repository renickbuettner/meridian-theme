/*!
* Bootstrap config.js v6.0.0-alpha.1 (https://getbootstrap.com/)
* Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
*/
import t from"../dom/manipulator.js";import{isElement as e,toType as r}from"./index.js";var o=class{static get Default(){return{}}static get DefaultType(){return{}}static get NAME(){throw new Error('You have to implement the static method "NAME", for each component!')}_getConfig(t){return t=this._mergeConfigObj(t),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}_configAfterMerge(t){return t}_mergeConfigObj(r,o){const n=e(o)?t.getDataAttribute(o,"config"):{};return{...this.constructor.Default,..."object"==typeof n?n:{},...e(o)?t.getDataAttributes(o):{},..."object"==typeof r?r:{}}}_typeCheckConfig(t,o=this.constructor.DefaultType){for(const[n,i]of Object.entries(o)){const o=t[n],c=e(o)?"element":r(o);if(!new RegExp(i).test(c))throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${n}" provided type "${c}" but expected type "${i}".`)}}};export{o as default};
