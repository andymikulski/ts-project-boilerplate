/**
* Responsible for maintaining window bindings,
* request animation frame
*/
define(["require", "exports", 'core/logger'], function(require, exports, Logger) {
    /// <reference path="../reference/jquery.d.ts" />
    

    

    

    var WindowController;
    (function (WindowController) {
        var log = Logger.log, $win = $(window), BINDINGS = [], bindThreshold = 100, bindThresholdTimer, lastTop = -1, lastDimensions = -1, hasScrolled = false, hasResized = false, runEventsTemp = null, runEventsSTop = null, runEventsWinWidth = null, runEventsWinHeight = null, runEventsTempType = null, runNewDimensions = null;

        /**
        * Binds window events (scroll, resize, etc) and inits
        * the requestAnimationFrame loop
        * @return {void}
        */
        function init() {
            log('WindowController : init');

            bindWindow();
            initRAF();
            hasScrolled = hasResized = true;
            windowLoop();
        }
        WindowController.init = init;

        /**
        * Binds scroll/resize events on window,
        * updates hasScrolled/hasResized variables on event.
        * These should be the ONLY scroll/resize bindings on the window
        * @return {void}
        */
        function bindWindow() {
            $win.on('scroll', function (e) {
                hasScrolled = true;
            });

            $win[0]['onorientationchange'] = function () {
                hasResized = true;
                hasScrolled = true;
            };

            $win[0]['orientationchange'] = function () {
                hasResized = true;
                hasScrolled = true;
            };

            $win.on('resize', function (e) {
                if ('ontouchstart' in window && hasScrolled) {
                    hasScrolled = true;
                    hasResized = true;
                } else {
                    hasResized = true;
                    hasScrolled = true;
                }
            });
        }

        /**
        * requestAnimationFrame shim
        * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
        * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
        * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
        * MIT license
        */
        function initRAF() {
            var lastTime = 0, vendors = ['ms', 'moz', 'webkit', 'o'];

            for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
                window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function (callback) {
                    var currTime = +new Date(), timeToCall = Math.max(0, 16 - (currTime - lastTime)), id = window.setTimeout(function () {
                        callback(currTime + timeToCall);
                    }, timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function (id) {
                    clearTimeout(id);
                };
            }
        }

        /**
        * Actual RAF loop - calls runEvents();
        * @return {void}
        */
        function windowLoop() {
            runEvents();
            window.requestAnimationFrame(windowLoop);
        }

        /**
        * Function to run through list of active event listeners and fire what's necessary
        * @param  {boolean} force?         If 'true', events will be run upon binding attachment
        * @return {void}
        */
        function runEvents(force) {
            // If the scroll or resize event hasn't fired, get outta here
            if (!force && (!hasResized && !hasScrolled)) {
                return;
            }

            // these will be used in the binding execution loop
            runEventsTemp = null;
            runEventsTempType = null;

            // pulling these variables before looping increases performance
            runEventsSTop = $win.scrollTop();
            runEventsWinWidth = $win.width();
            runEventsWinHeight = $win.height();
            runNewDimensions = runEventsWinWidth * runEventsWinHeight;

            // if scroll or dimensions are the same as last time, just return
            if (!force && (lastTop === runEventsSTop && lastDimensions === runNewDimensions)) {
                hasScrolled = hasResized = false;
                return;
            }

            for (var i = BINDINGS.length; i > 0; --i) {
                runEventsTemp = BINDINGS[i - 1];

                // for each one, we'll double check if it needs firing
                runEventsTempType = runEventsTemp.type;
                if (runEventsTempType === 'scroll' && (force || (hasScrolled && runEventsSTop !== lastTop))) {
                    runEventsTemp.fn.apply(runEventsTemp.context, [runEventsSTop, runEventsWinWidth, runEventsWinHeight]);
                } else if (runEventsTempType === 'resize' && (force || (hasResized && runNewDimensions !== lastDimensions))) {
                    runEventsTemp.fn.apply(runEventsTemp.context, [runEventsSTop, runEventsWinWidth, runEventsWinHeight]);
                }
            }

            // if new is different from old, update values
            if (force || (lastTop !== runEventsSTop)) {
                lastTop = runEventsSTop;
            }
            if (force || (lastDimensions !== runNewDimensions)) {
                lastDimensions = runNewDimensions;
            }

            // We should only begin recognizing a new scroll/resize when this is done
            hasScrolled = hasResized = false;
        }

        /**
        * Exposed bind function. Used to apply event handlers to the window
        * @param  {string} type             'resize' or 'scroll'
        * @param  {function} fn             event handling function
        * @param  {any} context             context (this) of handler
        * @return {string}                  unique ID of event handler (used to unbind later)
        */
        function bind(type, fn, context) {
            var id = (+new Date() + (Math.random() * 99999)).toFixed(0);
            log('WindowController : bind', type, context, id);

            BINDINGS.push({
                'type': type,
                'fn': fn,
                'context': context,
                'id': id
            });

            if (bindThresholdTimer) {
                clearTimeout(bindThresholdTimer);
            }
            bindThresholdTimer = setTimeout(function () {
                runEvents(true);
            }, bindThreshold);

            return id;
        }
        WindowController.bind = bind;

        /**
        * Alias for bind function
        * @param  {string} type             'resize' or 'scroll'
        * @param  {function} fn             event handling function
        * @param  {any} context             context (this) of handler
        * @return {string}                  unique ID of event handler (used to unbind later)
        */
        function on(type, fn, context) {
            return bind(type, fn, context);
        }
        WindowController.on = on;

        /**
        * Unbind registered window event
        * @param  {String}     unique ID string of registered event
        * @return {boolean}    successful deletion?
        */
        function unbind(id) {
            if (typeof id === 'undefined') {
                return;
            }
            var temp;
            for (var i = BINDINGS.length; i > 0; --i) {
                temp = BINDINGS[i - 1];
                if (temp.id === id) {
                    BINDINGS.splice(i - 1, 1);
                    log('WindowController : unbind', true);
                    return true;
                }
            }

            log('WindowController : unbind', false, id, BINDINGS);
            return false;
        }
        WindowController.unbind = unbind;

        /**
        * Alias for unbind function
        * @param  {String}     unique ID string of registered event
        * @return {boolean}    successful deletion?
        */
        function off(id) {
            return unbind(id);
        }
        WindowController.off = off;

        /**
        * Manually trigger a WindowController event
        * @param {String} evt Event to trigger ('scroll', 'resize')
        */
        function trigger(evt) {
            log('WindowController : trigger', evt);
            switch (evt) {
                case 'resize':
                    hasResized = true;
                    break;
                case 'scroll':
                    hasScrolled = true;
                    break;
                default:
                    break;
            }
            runEvents(true);
        }
        WindowController.trigger = trigger;

        log('WindowController : Constructor');
    })(WindowController || (WindowController = {}));
    return WindowController;
});
