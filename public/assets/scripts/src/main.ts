/// <reference path="reference/jquery.d.ts" />

// App start
import reqApp = require('app');


/**
 * Main class (entry point for application).
 * Pretty much just creates and inits a new App class.
 * @class Main
 */
class Main {
	constructor(){
	    var App = new reqApp();
	    App.init();
	}
}

new Main();
