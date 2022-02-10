// ==UserScript==
// @name         Quayn Editor Improvements
// @namespace    https://www.quayn.nl/
// @version      0.1
// @description  Several tweaks to the Quayn Editor
// @author       Rick Rozemuller
// @match        https://*.quayn.eu/Content/Editor2/index.html*
// @icon         https://redacteuren.quayn.eu/favicon.ico
// @run-at       document-body
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict";

    const DEBUG_ENABLED = false;

    const logger = new (class Logger {
        static #layouts = {
            header: (color) =>
                `background-color: ${color}; color: #fff; padding: 0 2px 0 4px; border: 1px solid ${color};`,
            regular: (color) =>
                `color: ${color}; padding: 0 2px 0 4px; border: 1px solid ${color};`
        };

        enabled = true;
        debugEnabled = false;
        logObj;

        constructor(logObj, debugEnabled = false) {
            this.logObj = Object.assign(
                { log: () => {}, group: () => {}, ungroup: () => {} },
                logObj
            );
            this.debugEnabled = debugEnabled;
        }

        #doLog = (msg, color = "rgb(38, 55, 115)") => {
            return (
                this.enabled &&
                this.logObj.log(
                    `%cQEI:%c${msg}`,
                    Logger.#layouts.header(color),
                    Logger.#layouts.regular(color)
                )
            );
        };

        debug = (...msg) => {
            return this.debugEnabled && this.logObj.log(...msg);
        };

        log = (msg) => {
            this.#doLog(msg);
        };

        success = (msg) => {
            this.#doLog(msg, "rgb(69, 186, 69)");
        };

        warning = (msg) => {
            this.#doLog(msg, "rgb(232, 152, 86)");
        };

        error = (msg) => {
            this.#doLog(msg, "rgb(232, 86, 86)");
        };

        group = (label) => {
            return this.enabled && this.logObj.group(label);
        };

        groupEnd = () => {
            return this.enabled && this.logObj.groupEnd();
        };
    })(console, DEBUG_ENABLED);

    logger.log("QUAYN EDITOR IMPROVEMENTS");

    const targetEditorVersion = "20210622";
    const elements = (function () {
        const elementCache = {};
        const select = (selector) => document.querySelector(selector);
        const get = (selector) =>
            elementCache[selector] ||
            (elementCache[selector] = select(selector));

        return {
            projectController: () => get("#projectController"),
            version: () => get("#projectController .navigation .ultimateRight")
        };
    })();

    logger.debug(elements);

    // Probe for the existence of a value returned by the probe function. Return once found. Retry max X times, once every second, until found.
    async function probeValue(
        probeFunction,
        interval = 1000,
        maxAttempts = 10
    ) {
        logger.debug("Probe function", probeFunction);
        return new Promise((resolve, reject) => {
            const doProbe = (attempt) => {
                if (attempt > maxAttempts) {
                    logger.error("Kan geen verbinding maken met de editor!");
                    throw new Error("Timeout in probing for value!");
                    //return reject();
                }
                logger.debug("About to probe for value", attempt);
                try {
                    const value = probeFunction();
                    if (value) {
                        logger.debug("Value found:", value);
                        return resolve(value);
                    } else {
                        throw new Error();
                    }
                } catch (error) {
                    logger.debug(error);
                    setTimeout(doProbe.bind(null, ++attempt), interval);
                }
            };
            doProbe(1);
        });
    }

    async function probeScope() {
        return await probeValue(() => {
            return unsafeWindow.angular
                .element(elements.projectController())
                .scope();
        });
    }

    const getEditorVersion = (function () {
        let retreivedVersion;

        return async function getEditorVersion() {
            if (retreivedVersion) return retreivedVersion;
            return (retreivedVersion = await probeValue(() => {
                return elements
                    .version()
                    .textContent.match(/versie\s?(\d+)/)[1];
            }));
        };
    })();

    async function isTargetedEditorVersion() {
        return (await getEditorVersion()) === targetEditorVersion;
    }

    const Tweaks = [
        {
            name: "Pop-up vertraging weghalen",
            fn: (scope) => {
                scope.scaleTime = 1;
            }
        },
        {
            name: "Oplossing voor verdwijnen van herhalende itemonderdelen",
            fn: (scope) => {
                scope.set = function (index) {
                    // Settimeout because Angularjs's clickhandler runs within in $apply,
                    // preventing us from directly digesting (Froala text editor changes) beforehand.
                    setTimeout(() => {
                        scope.$digest();

                        var self = this;
                        self.itemIndex = index;
                        //$(".fr-wrapper").remove();
                        editor.project.goto(self.itemIndex);

                        scope.sync();
                        scope.thumbnailSync();
                    });
                }.bind(scope);

                // Some DRY
                function setItem(setFn) {
                    setTimeout(() => {
                        scope.$digest();

                        var self = this;
                        if (!editor) {
                            return;
                        }
                        setFn.apply(editor.project);
                        scope.sync();
                    });
                }

                scope.firstItem = function () {
                    setItem(editor.project.firstItem);
                }.bind(scope);

                scope.lastItem = function () {
                    setItem(editor.project.lastItem);
                }.bind(scope);

                scope.nextItem = function () {
                    setItem(editor.project.nextItem);
                }.bind(scope);

                scope.previousItem = function () {
                    setItem(editor.project.previousItem);
                }.bind(scope);
            }
        },
        {
            name: "Verbeteringen aan de lay-out",
            fn: (scope) => {
                const style = document.createElement("style");
                style.textContent = `
                /* Fix extra window height due to window bar */
                #projectController {
                    margin-top: -14px;
                }

                /* Fix item list height */
                /*#projectController .thumbnails {
                    max-height: 84vh;
                }*/

                /* Fix item details height */
                #projectController div.gridBox.main.ng-include\\:.itemForm\\; {
                    /*max-height: 71.3vh;*/
                    overflow: auto;
                    padding: 0;
                }

                /* Fix item details spacing */
                #projectController .itemGrid {
                    margin: 0;
                    padding: 1vh 1vw;
                    box-sizing: border-box;
                }

                /* Fix item sources height */
                #itemSources {
                    max-height: 62vh;
                    overflow: auto;
                }

                /* Fix right sidebar height */
                .gridBox.secondary > .ng-include\\:secondaryForm\\; {
                    max-height: 58vh;
                    overflow: auto;
                }

                .gridBox.secondary > .ng-include\\:secondaryForm\\; > *:first-child {
                    margin: 1vh 1vw 0 1vw !important;
                }

                .gridBox.secondary > .ng-include\\:secondaryForm\\; .twoGrid {
                    grid-template-columns: 25% min-content !important;
                }

                #itemProperties .propertiesTwoGrid {
                    grid-template-columns: 9rem min-content;
                }

                .gridBox.secondary > .ng-include\\:secondaryForm\\; .metadata.invalid {
                    padding-right: 0 !important;
                }

                .gridBox.secondary > .ng-include\\:secondaryForm\\; .metadata input[type='text'] {
                    max-width: 12vw;
                }

                /* Fix grid to full page */
                #projectController .gridMain {
                    /*grid-auto-rows: max-content;*/
                    height: 100vh;
                    grid-template-areas:
                        "itemBankHeader itemBankHeader itemBankHeader"
                        "thumbnails itemHeader itemHeader"
                        "thumbnails main secondary"
                        "thumbnails navigation navigation";
                    grid-template-rows: auto auto 1fr;
                    grid-auto-rows: min-content;
                }

                #projectController .itemBankHeader {
                    height: 3.8rem;
                    box-sizing: border-box;
                }

                #projectController .itemBankHeader .leftSide {
                    max-width: 44vw;
                }

                #projectController .itemHeader {
                    box-sizing: border-box;
                    min-height: 3.5rem;
                    max-height: 5.1rem;
                }

                #projectController .itemHeader .leftSide {
                    max-width: 50%;
                    max-height: 100%;
                    overflow: auto;
                }

                #projectController .leftSide {
                    margin: 0;
                    padding: 10px 0px 10px 10px;
                    box-sizing: border-box;
                }

                /* Fix quickbuttons positioning looking strange because of our changes */
                #projectController .itemBankHeader .rightSide {
                    margin-top: 20px;
                }

                /* Change scrollbar layout */

                /* Width */
                ::-webkit-scrollbar {
                    width: 10px;
                }

                /* Track */
                ::-webkit-scrollbar-track {
                    background: #f1f1f1; 
                }
                
                /* Handle */
                ::-webkit-scrollbar-thumb {
                    background: #ddd; 
                    border-radius: 4px;
                }

                /* Handle on hover */
                ::-webkit-scrollbar-thumb:hover {
                    background: #999; 
                }


                /* Reduce bottom margin/padding on sources */
                #itemSources.doubleLeft > .je {
                    margin-top: 0 !important;
                }

                /* Add transparency to source delete icon */
                .sourceIcon {
                    background: rgba(255, 255, 255, 0.6) !important;
                }

                .sourceIcon:hover {
                    background: rgba(255, 255, 255, 1) !important;
                }

                .sourceDelete {
                    color: rgba(232, 86, 86, 0.8) !important;
                }

                .sourceDelete:hover {
                    color: rgba(232, 86, 86, 1) !important;
                }

                /* Fix rightside top menu overflow on narrow window */
                @media (max-width: 1080px) {
                    .itemBankHeader .buttonText {
                        display: none;
                    }
                }  
                `;
                document.body.appendChild(style);
            }
        },
        {
            name: "Indicator toevoegen voor Quayn Editor Improvements (rechtsonderin)",
            fn: async (scope, tweakErrors) => {
                /* Add tooltip css */
                const style = document.createElement("style");
                style.textContent = `.QEI_tooltip {
                    position: relative;
                    display: inline-block;
                    border-bottom: 1px dotted black;
                }
                
                .QEI_tooltip .QEI_tooltiptext {
                    visibility: hidden;
                    width: 200px;
                    background-color: #999;
                    color: #fff;
                    text-align: center;
                    border-radius: 4px;
                    padding: 5px;
                    position: fixed;
                    z-index: 1;
                    bottom: 64px;
                    right: 1vw;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                
                .QEI_tooltip .QEI_tooltiptext::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #999 transparent transparent transparent;
                }
                
                .QEI_tooltip:hover .QEI_tooltiptext {
                    visibility: visible;
                    opacity: 1;
                }
                `;
                document.body.appendChild(style);
                const isTargetedVersion = await isTargetedEditorVersion();
                const wrapper = document.createElement("span");
                const el = document.createElement("span");

                const insertEl = elements.version();
                wrapper.style.lineHeight = "18px";
                wrapper.append(...insertEl.childNodes);

                wrapper.classList.add("QEI_tooltip");
                const tooltipText = document.createElement("span");
                tooltipText.classList.add("QEI_tooltiptext");

                if (isTargetedVersion && !tweakErrors) {
                    tooltipText.textContent =
                        "In orde: versie komt overeen met QEI.";
                    el.textContent = "+";
                    el.style.cssText = `
                        color: rgb(69, 186, 69);
                        font-weight: bold;
                        font-size: 18px;
                        vertical-align: bottom;
                    `;
                } else {
                    tooltipText.textContent = !isTargetedVersion
                        ? "Let op: Versie komt niet overeen met QEI. Er kunnen onbedoelde bijwerkingen optreden."
                        : `Let op: Versie komt overeen met QEI maar er zijn ${tweakErrors} fouten opgetreden bij het laden.`;
                    el.textContent = "!";
                    el.style.cssText = `
                        color: rgb(232, 86, 86);
                        font-weight: bold;
                        font-size: 40px;
                        vertical-align: bottom;
                        position: absolute;
                        top: 8px;
                        margin-left: 2px;
                    `;
                    insertEl.style.borderBottom = "1px solid red";
                    insertEl.style.borderTop = "1px solid red";
                }

                wrapper.appendChild(tooltipText);
                wrapper.appendChild(el);
                insertEl.appendChild(wrapper);
            }
        }
    ];

    window.addEventListener("load", async (event) => {
        logger.debug("DOM LOADED");
        const scope = await probeScope();
        logger.success("Verbonden met de editor");
        const editorVersion = await getEditorVersion();
        logger.debug(
            (await isTargetedEditorVersion())
                ? `Editor version '${editorVersion}' matches the supported version`
                : `WARNING: Editor version '${editorVersion}' does not match targetted editor version '${targetEditorVersion}'`
        );
        logger.group("Aanpassingen laden");
        let tweakErrors = 0;
        Tweaks.forEach((tweak) => {
            logger.log(`Aanpassing inschakelen: ${tweak.name}`);
            try {
                tweak.fn(scope, tweakErrors);
            } catch (error) {
                tweakErrors++;
                logger.error(error);
                //throw new Error(error);
            }
        });
        logger.groupEnd();
    });
})();
