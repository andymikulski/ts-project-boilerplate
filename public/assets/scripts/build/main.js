/// <reference path="reference/jquery.d.ts" />
define(["require", "exports", 'app'], function(require, exports, reqApp) {
    /**
    * Main class (entry point for application).
    * Pretty much just creates and inits a new App class.
    * @class Main
    */
    var Main = (function () {
        function Main() {
            var App = new reqApp();
            App.init();
        }
        return Main;
    })();

    new Main();
});
