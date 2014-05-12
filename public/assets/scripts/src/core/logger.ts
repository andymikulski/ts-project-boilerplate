declare var ga:any;

export = Logger;
module Logger {
    var logHistory:Array<any> = [],
        isDebug:boolean = $(document.body).attr('data-debug') ? ($(document.body).attr('data-debug') === 'true' ? true : false) : false,
        errorCount:number = 0;

    /**
     * Main log function.
     * @param  {any} args Arguments to be logged to console.
     * @return {void}
     */
    export function log(...args:any[]):void{
        logHistory.push(args);
        if (window.console && window.console.log && isDebug) {
            window.console.log(Array.prototype.slice.call(args));
        }
    }

    /**
     * Returns an array of statements logged through Logger already.
     * @return {Array} Array of logged statements
     */
    export function getHistory():Array<any> {
        return logHistory;
    }

    /**
     * Prints logged history directly to console
     * @return {void}
     */
    export function printHistory():void {
        for(var p in logHistory){
            if(logHistory.hasOwnProperty(p)){
                window.console.log(logHistory[p]);
            }
        }
    }


    /**
     * Collection of analytics-related functions and tracking variables
     */
    export module Analytics {
        var analyticsHistory:Array<any> = [],
            TRACKABLES:any = {},
            IS_ENABLED:boolean = ($(document.body).attr('data-enable-analytics') === 'true' ? true : false) || false,
            _init:boolean = false;


        /**
         * Detects if analytics are active on current environment
         * (via body.attr('data-enable-analytics')) and binds where necessary
         * @return void
         */
        export function init():void {
            if(!IS_ENABLED){ log('Analytics : IS_ENABLED is false, not init\'ing'); return; }
            if(ga){
                log('Analytics : init : UA-58463-9');
                ga('create', 'UA-58463-9', 'auto');
                ga('send', 'pageview');

                bindClickFragments();
            }else{
                log('Analytics : init - no ga!');
            }

            _init = true;
        }

        /**
         * Analytics tracking function - fires custom GA events
         * @param {string} category Typically the object that was interacted with (e.g. 'button')
         * @param {string} action   The type of interaction (e.g. 'click')
         * @param {string} label    Useful for categorizing events (e.g. 'nav buttons')
         * @param {number|boolean} value    Values must be non-negative. Useful to pass counts (e.g. 4 times = '4'). 'true' will enable auto-counting
         */
        export function track(category:string, action:string, label?:string, value?:any):void {
            if(!IS_ENABLED){ return; }
            if(!_init){ init(); }
            log('Analytics : track', category, action, label, value);

            // If 'true' is passed to value, we want to track the event count here
            // (else a number would be passed through from whatever called it,
            //  allowing for custom count tracking to be implemented)
            if(typeof value === 'boolean' && value === true && label){
                var nameString = encodeURIComponent(category + action + label),
                    foundValue = TRACKABLES[nameString];
                // Check the TRACKABLES object for the event,
                // and increment or set to 1 as necessary
                if(TRACKABLES.hasOwnProperty(nameString)){
                    foundValue = parseInt(foundValue, 10) + 1;
                    value = foundValue;
                }else{
                    TRACKABLES[nameString] = 1;
                    value = 1;
                }
            }

            log('Analytics : track variables', category, action, label, value);
            // Calls the ga tracking call
            if(ga && category && action){
                if(label && value){
                    ga('send', 'event', category, action, label, value);
                }else if(label && !value){
                    ga('send', 'event', category, action, label);
                }else{
                    ga('send', 'event', category, action);
                }
            }
        }

        /**
         * Emits a GA pageview event
         * @return void
         */
        export function pageview():void {
            if(!IS_ENABLED){ return; }
            if(!_init){ init(); }
            if(ga){
                log('Analytics : pageview', window.location);
                ga('send', 'pageview');
            }
        }

        /**
         * Alias for bindClickFragments
         * @return void
         */
        export function refresh():void{
            return bindClickFragments();
        }

        /**
         * Finds elements matching [data-analytics:not('[data-analytics-count]')]
         * and binds onFragmentClick (tracking handler)
         * @return void
         */
        export function bindClickFragments():void {
            if(!IS_ENABLED){ return; }
            $('[data-analytics]').not('[data-analytics-count]').on('click', <any>(onFragmentClick)).attr('data-analytics-count', 0);
        }

        /**
         * Event handler for objects with data-analytics
         * which fires on click
         * @param {Event} e Mouse event
         */
        export function onFragmentClick(e:Event):void {
            // we don't prevent default or anything because
            // the analytics should be "transparent"

            var $target:JQuery = $(e.currentTarget),
                clickCount:number = parseInt($target.attr('data-analytics-count'), 10),
                targetTracking:Array<string> = ($target.attr('data-analytics') || '').replace(/\n/g, ' ').split('|'),
                shouldReturn:boolean = false;

            clickCount += 1;
            switch(targetTracking.length){
                default:
                    log('Analytics : Fragment click has less than two or more than four tracking parameters', e.currentTarget, targetTracking);
                    shouldReturn = true;
                    break;
                // category, action
                // data-analytics="button|click"
                case 2:
                    track(targetTracking[0], targetTracking[1]);
                    break;
                // category, action, label?
                // data-analytics="button|click|Red Button"
                case 3:
                    track(targetTracking[0], targetTracking[1], targetTracking[2]);
                    break;
                // category, action, label?, value?
                // data-analytics="button|click|Red Button|true"
                case 4:
                    track(targetTracking[0], targetTracking[1], targetTracking[2], clickCount);
                    break;
            }

            // This is to satisfy TS compiler complaints about unreachable code
            // (originally a 'return' was in the switch default)
            if(shouldReturn){ return; }

            // update the interaction count
            $target.attr('data-analytics-count', clickCount);
        }


        /**
         * Error-catching function, dispatches to analytics
         * (pretty sure error catching doesn't really work though)
         * @param {string} errorMsg   Error message
         * @param {string} url        File error occurred in
         * @param {string} lineNumber Line number of file
         * @param {string} column     Column of file
         * @param {any} errorObj   Stack trace
         */
        export function logError(errorMsg:string, url:string, lineNumber:string, column?:string, errorObj?:any):boolean {
            errorCount += 1;
            track('dev', 'error', url + lineNumber + (lineNumber ? ' - ' + lineNumber + (column ? ' - ' + column : '') : ''), errorCount);
            return false;
        }
    }

    // expose some debug functions if we want to check out the log on staging/production
    window['debug_log'] = window['debug_log'] || {
        'printHistory': printHistory,
        'historyLog': logHistory,
        'force': function(yesno:boolean){
            isDebug = yesno;
        }
    };

    // catch errors
    window.onerror = <any>((errorMsg, url, lineNumber, column, errorObj) => Analytics.logError(errorMsg, url, lineNumber, column, errorObj));

    log('Logger : Constructor');
}

