// ==UserScript==
// @name         Quayn MathJax Hub Disabler
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Temporarily disable problematic MathJax feature
// @author       Rick Rozemuller
// @match        https://*.quayn.eu/Content/Editor2/index.html*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        unsafeWindow
// @run-at       document-body
// ==/UserScript==

(function () {
  "use strict";

  const QMJHD_extension = {
    enableLog: false,
    log: (
      (logger) => function (msg) {
        return this.enableLog && logger(msg)
      })(console.log),
    fnList: {
      signal: ["Post"],
      Hub: ["Queue"],
      Register: ["PreProcessor", "StartupHook"],
      Object: ["isArray"],
      Ajax: ["loadComplete"],
      Callback: ["Hooks"],
    },
    fnToObjList: {
      MathJax: ["Callback"],
    },
    getPxHandler: function () {
      let that = this;
      return {
        get: function (oTarget, sKey, oReceiver) {
          that.log(oTarget, sKey, oReceiver);
          if (
            oTarget.name &&
            that.fnList.hasOwnProperty(oTarget.name) &&
            that.fnList[oTarget.name].includes(sKey)
          ) {
            return function () {};
          }
          if (
            oTarget.name &&
            that.fnToObjList.hasOwnProperty(oTarget.name) &&
            that.fnToObjList[oTarget.name].includes(sKey)
          ) {
            return function () {
              return new Proxy({ name: sKey }, that.getPxHandler());
            };
          }
          return new Proxy({ name: sKey }, that.getPxHandler());
        },
        set: function (oTarget, sKey, vValue) {
          return undefined;
        },
        deleteProperty: function (oTarget, sKey) {
          return undefined;
        },
        enumerate: function (oTarget, sKey) {
          return undefined;
        },
        ownKeys: function (oTarget, sKey) {
          return undefined;
        },
        has: function (oTarget, sKey) {
          return false;
        },
        defineProperty: function (oTarget, sKey, oDesc) {
          return undefined;
        },
        getOwnPropertyDescriptor: function (oTarget, sKey) {
          return undefined;
        },
      };
    },
  };

  const MathJax = () =>
    new Proxy({ name: "MathJax" }, QMJHD_extension.getPxHandler());

  console.log("loaded qmjhd");

  unsafeWindow.QMJHD_extension = QMJHD_extension;

  var script = document.createElement("script");
  script.textContent = "const MathJax = (" + MathJax.toString() + ")();";
  console.log(script.textContent);
  document.body.appendChild(script);

  var style = document.createElement("style");
  style.textContent = `
  #MathJax_Message {
    display: none !important;
  }
  `;
  console.log(style.textContent);
  document.body.appendChild(style);
})();
