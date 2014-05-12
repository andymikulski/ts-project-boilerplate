define(["require", "exports"], function(require, exports) {
    
    var Logger;
    (function (Logger) {
        var logHistory = [], isDebug = $(document.body).attr('data-debug') ? ($(document.body).attr('data-debug') === 'true' ? true : false) : false, errorCount = 0;

        /**
        * Main log function.
        * @param  {any} args Arguments to be logged to console.
        * @return {void}
        */
        function log() {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            logHistory.push(args);
            if (window.console && window.console.log && isDebug) {
                window.console.log(Array.prototype.slice.call(args));
            }
        }
        Logger.log = log;

        /**
        * Returns an array of statements logged through Logger already.
        * @return {Array} Array of logged statements
        */
        function getHistory() {
            return logHistory;
        }
        Logger.getHistory = getHistory;

        /**
        * Prints logged history directly to console
        * @return {void}
        */
        function printHistory() {
            for (var p in logHistory) {
                if (logHistory.hasOwnProperty(p)) {
                    window.console.log(logHistory[p]);
                }
            }
        }
        Logger.printHistory = printHistory;

        /**
        * Collection of analytics-related functions and tracking variables
        */
        (function (Analytics) {
            var analyticsHistory = [], TRACKABLES = {}, IS_ENABLED = ($(document.body).attr('data-enable-analytics') === 'true' ? true : false) || false, _init = false;

            /**
            * Detects if analytics are active on current environment
            * (via body.attr('data-enable-analytics')) and binds where necessary
            * @return void
            */
            function init() {
                if (!IS_ENABLED) {
                    log('Analytics : IS_ENABLED is false, not init\'ing');
                    return;
                }
                if (ga) {
                    log('Analytics : init : UA-58463-9');
                    ga('create', 'UA-58463-9', 'auto');
                    ga('send', 'pageview');

                    bindClickFragments();
                } else {
                    log('Analytics : init - no ga!');
                }

                _init = true;
            }
            Analytics.init = init;

            /**
            * Analytics tracking function - fires custom GA events
            * @param {string} category Typically the object that was interacted with (e.g. 'button')
            * @param {string} action   The type of interaction (e.g. 'click')
            * @param {string} label    Useful for categorizing events (e.g. 'nav buttons')
            * @param {number|boolean} value    Values must be non-negative. Useful to pass counts (e.g. 4 times = '4'). 'true' will enable auto-counting
            */
            function track(category, action, label, value) {
                if (!IS_ENABLED) {
                    return;
                }
                if (!_init) {
                    init();
                }
                log('Analytics : track', category, action, label, value);

                // If 'true' is passed to value, we want to track the event count here
                // (else a number would be passed through from whatever called it,
                //  allowing for custom count tracking to be implemented)
                if (typeof value === 'boolean' && value === true && label) {
                    var nameString = encodeURIComponent(category + action + label), foundValue = TRACKABLES[nameString];

                    // Check the TRACKABLES object for the event,
                    // and increment or set to 1 as necessary
                    if (TRACKABLES.hasOwnProperty(nameString)) {
                        foundValue = parseInt(foundValue, 10) + 1;
                        value = foundValue;
                    } else {
                        TRACKABLES[nameString] = 1;
                        value = 1;
                    }
                }

                log('Analytics : track variables', category, action, label, value);

                // Calls the ga tracking call
                if (ga && category && action) {
                    if (label && value) {
                        ga('send', 'event', category, action, label, value);
                    } else if (label && !value) {
                        ga('send', 'event', category, action, label);
                    } else {
                        ga('send', 'event', category, action);
                    }
                }
            }
            Analytics.track = track;

            /**
            * Emits a GA pageview event
            * @return void
            */
            function pageview() {
                if (!IS_ENABLED) {
                    return;
                }
                if (!_init) {
                    init();
                }
                if (ga) {
                    log('Analytics : pageview', window.location);
                    ga('send', 'pageview');
                }
            }
            Analytics.pageview = pageview;

            /**
            * Alias for bindClickFragments
            * @return void
            */
            function refresh() {
                return bindClickFragments();
            }
            Analytics.refresh = refresh;

            /**
            * Finds elements matching [data-analytics:not('[data-analytics-count]')]
            * and binds onFragmentClick (tracking handler)
            * @return void
            */
            function bindClickFragments() {
                if (!IS_ENABLED) {
                    return;
                }
                $('[data-analytics]').not('[data-analytics-count]').on('click', (onFragmentClick)).attr('data-analytics-count', 0);
            }
            Analytics.bindClickFragments = bindClickFragments;

            /**
            * Event handler for objects with data-analytics
            * which fires on click
            * @param {Event} e Mouse event
            */
            function onFragmentClick(e) {
                // we don't prevent default or anything because
                // the analytics should be "transparent"
                var $target = $(e.currentTarget), clickCount = parseInt($target.attr('data-analytics-count'), 10), targetTracking = ($target.attr('data-analytics') || '').replace(/\n/g, ' ').split('|'), shouldReturn = false;

                clickCount += 1;
                switch (targetTracking.length) {
                    default:
                        log('Analytics : Fragment click has less than two or more than four tracking parameters', e.currentTarget, targetTracking);
                        shouldReturn = true;
                        break;

                    case 2:
                        track(targetTracking[0], targetTracking[1]);
                        break;

                    case 3:
                        track(targetTracking[0], targetTracking[1], targetTracking[2]);
                        break;

                    case 4:
                        track(targetTracking[0], targetTracking[1], targetTracking[2], clickCount);
                        break;
                }

                // This is to satisfy TS compiler complaints about unreachable code
                // (originally a 'return' was in the switch default)
                if (shouldReturn) {
                    return;
                }

                // update the interaction count
                $target.attr('data-analytics-count', clickCount);
            }
            Analytics.onFragmentClick = onFragmentClick;

            /**
            * Error-catching function, dispatches to analytics
            * (pretty sure error catching doesn't really work though)
            * @param {string} errorMsg   Error message
            * @param {string} url        File error occurred in
            * @param {string} lineNumber Line number of file
            * @param {string} column     Column of file
            * @param {any} errorObj   Stack trace
            */
            function logError(errorMsg, url, lineNumber, column, errorObj) {
                errorCount += 1;
                track('dev', 'error', url + lineNumber + (lineNumber ? ' - ' + lineNumber + (column ? ' - ' + column : '') : ''), errorCount);
                return false;
            }
            Analytics.logError = logError;
        })(Logger.Analytics || (Logger.Analytics = {}));
        var Analytics = Logger.Analytics;

        // expose some debug functions if we want to check out the log on staging/production
        window['debug_log'] = window['debug_log'] || {
            'printHistory': printHistory,
            'historyLog': logHistory,
            'force': function (yesno) {
                isDebug = yesno;
            }
        };

        // catch errors
        window.onerror = (function (errorMsg, url, lineNumber, column, errorObj) {
            return Analytics.logError(errorMsg, url, lineNumber, column, errorObj);
        });

        log('Logger : Constructor');
    })(Logger || (Logger = {}));
    return Logger;
});
