import Base = require('core/base');
import reqFactory = require('core/factory');

export = App;

/**
 * Application class. Starts the app.
 * Inits global objects (like Factory/WindowController),
 * as well as applies certain UA tags to html element if necessary.
 * @class App
 * @exends Base.SiteObject
 */
class App extends Base.SiteObject {
    Factory: any;

    constructor() {
        super();
        this.log('App : Constructor');
    }

    /**
     * App initialization.
     * Inits Analytics, Factory, WindowController.
     * Removes .is-pageloading from body on dom.ready
     * @access public
     */
    public init():void {
        var self:App = this;
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
    }

    /**
     * Determines if User Agent is IE/IE Mobile and appends class to html element as necessary.
     * Also detects touch-based devices (html.is-touch) and modifies console.time/End if not in debug mode.
     * @access private
     */
    private checkUserAgent():void {
        var $html:JQuery = this.$html,
            $body:JQuery = this.$body,
            UA:string = $html.attr('data-ua') || '';

        // Various ways to determine if it's IE (since IE10 or 11 is a jerk about its UA)
        if((/MSIE/i).test(UA) || (/Trident\/[0-9\.]+/i).test(UA) || window.hasOwnProperty('MSStream')){
            $html.addClass('ie');
            if((/IEMobile/i).test(UA)){
                $html.addClass('ie-mobile');
            }
        }
        var isDebug:boolean = $body.attr('data-debug') ? ($body.attr('data-debug') === 'true' ? true : false) : false;
        if(!isDebug){
            console.time = console.timeEnd = function(){ return; };
        }

        if('ontouchstart' in window){ $html.addClass('is-touch'); }
    }
}
