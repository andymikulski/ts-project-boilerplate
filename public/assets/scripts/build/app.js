var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'core/base', 'core/factory'], function(require, exports, Base, reqFactory) {
    

    /**
    * Application class. Starts the app.
    * Inits global objects (like Factory/WindowController),
    * as well as applies certain UA tags to html element if necessary.
    * @class App
    * @exends Base.SiteObject
    */
    var App = (function (_super) {
        __extends(App, _super);
        function App() {
            _super.call(this);
            this.log('App : Constructor');
        }
        /**
        * App initialization.
        * Inits Analytics, Factory, WindowController.
        * Removes .is-pageloading from body on dom.ready
        * @access public
        */
        App.prototype.init = function () {
            var self = this;
            this.log('App : init');

            // Add ie, iemobile to html if needed
            this.checkUserAgent();

            // Start up GA
            this.Analytics.init();

            // widget factory
            this.Factory = reqFactory.Factory;
            this.Factory.init();

            // window init
            this.WindowController.init();
        };

        /**
        * Determines if User Agent is IE/IE Mobile and appends class to html element as necessary.
        * Also detects touch-based devices (html.is-touch) and modifies console.time/End if not in debug mode.
        * @access private
        */
        App.prototype.checkUserAgent = function () {
            var $html = this.$html, $body = this.$body, UA = $html.attr('data-ua') || '';

            // Various ways to determine if it's IE (since IE10 or 11 is a jerk about its UA)
            if ((/MSIE/i).test(UA) || (/Trident\/[0-9\.]+/i).test(UA) || window.hasOwnProperty('MSStream')) {
                $html.addClass('ie');
                if ((/IEMobile/i).test(UA)) {
                    $html.addClass('ie-mobile');
                }
            }
            var isDebug = $body.attr('data-debug') ? ($body.attr('data-debug') === 'true' ? true : false) : false;
            if (!isDebug) {
                console.time = console.timeEnd = function () {
                    return;
                };
            }

            if ('ontouchstart' in window) {
                $html.addClass('is-touch');
            }
        };
        return App;
    })(Base.SiteObject);
    return App;
});
