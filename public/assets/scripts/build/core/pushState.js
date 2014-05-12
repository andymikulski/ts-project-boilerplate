define(["require", "exports", 'core/logger', 'core/factory', 'core/kiu', 'core/walt'], function(require, exports, Logger, reqFactory, Kiu, reqWalt) {
    /// <reference path="../reference/jquery.d.ts" />
    

    
    var PushState;
    (function (PushState) {
        var PUSH_HISTORY = [], PUSH_CACHE = {}, log = Logger.log, Analytics = Logger.Analytics, REQUEST, Walt, $window = $(window), Factory, $container, $tempLink, lastTop;

        /**
        * Gathers CSS, inits PUSH_HISTORY, PUSH_CACHE, etc
        * @return {void}
        */
        function init(el) {
            var _this = this;
            log('PushState : init');
            this.gatherCss();
            if (el) {
                this.$container = $(el);
            } else {
                this.$container = $(document.body);
            }

            this.PUSH_HISTORY = [encodeURIComponent(window.location.href)];

            this.lastTop = 0;

            this.Walt = reqWalt.Walt;

            this.PUSH_CACHE = {};
            this.Factory = reqFactory.Factory;

            this.bindLinks();

            // 'hack' to expose the addHistory function to the global scope
            window['fb_push_state'] = window['fb_push_state'] || {
                'addHistory': function (href) {
                    return _this.addHistory(href);
                }
            };
        }
        PushState.init = init;

        /**
        * Adds a URL to the push history
        * @param {string} href URL to be placed into history
        */
        function addHistory(href) {
            var encodedHref = encodeURIComponent(href);
            if (this.PUSH_HISTORY[this.PUSH_HISTORY.length - 1] !== encodedHref) {
                this.PUSH_HISTORY.push(encodedHref);
            }
        }
        PushState.addHistory = addHistory;

        /**
        * Finds all links on the page, and binds handler if no data-push attribute is found
        * @param {JQuery} _container? Element to search inside of for links (else defaults to body)
        */
        function bindLinks(_container) {
            var _this = this;
            if (window.history && window.history.pushState) {
                if (_container && _container.length) {
                    _container.find('a').not('[data-push]').attr('data-push', 'true').on('click', (function (e) {
                        return _this.handleLink(e);
                    }));
                } else {
                    $('a').not('[data-push]').attr('data-push', 'true').on('click', (function (e) {
                        return _this.handleLink(e);
                    }));
                }
            }
        }
        PushState.bindLinks = bindLinks;

        /**
        * Same as bindLinks, however instead of targeting container, a single el (or collection) may be passed
        * @param {JQuery}  $link Single or collection of links to bind
        * @param {boolean} force Force the link to be bound, regardless if it has been already
        */
        function bindLink($link, force) {
            var _this = this;
            if (window.history && window.history.pushState) {
                if (!$link.attr('data-push') || force) {
                    $link.attr('data-push', 'true').unbind().on('click', (function (e) {
                        return _this.handleLink(e);
                    }));
                }
            }
        }
        PushState.bindLink = bindLink;

        /**
        * Navigates to a certain page
        * Useful if trying to change the page with AJAX etc
        * @param {string} href Destination url
        */
        function gotoURL(href) {
            if (!href) {
                return;
            }
            if (this.$tempLink && this.$tempLink.remove) {
                this.$tempLink.remove();
            }

            this.$tempLink = $('<a href="' + href + '"></a>');
            this.bindLink(this.$tempLink, true);
            this.$tempLink[0].click();
        }
        PushState.gotoURL = gotoURL;

        /**
        * Binds the onpopstate function to step through PUSH_HISTORY instead of
        * using native functionality
        * @return void
        */
        function bindBackButton() {
            var self = this;

            // Overwrite the onpopstate function
            window.onpopstate = function (e) {
                e.preventDefault();
                var top, href = '';

                if (self.PUSH_HISTORY.length > 1) {
                    top = decodeURIComponent(self.PUSH_HISTORY.pop());
                }
                self.load(href = decodeURIComponent(self.PUSH_HISTORY[self.PUSH_HISTORY.length - 1]), self.lastTop);

                window.history.pushState({
                    'url': href
                }, '', href);

                return false;
            };
        }
        PushState.bindBackButton = bindBackButton;

        /**
        * Find all the CSS declarations on the page and gathers them into one spot
        * This happens because we progressively add CSS to the page as the site is navigated
        * @param {JQuery} $container? Element to search for CSS declarations
        */
        function gatherCss($container) {
            if (!$container) {
                $container = $('#the-content');
            }
            var $cssArea = $('head').find('#mobile-css'), $v, $head = $('head'), onComplete = function ($el) {
                setTimeout(function () {
                    $el.empty().unbind().remove();
                }, 25);
            };

            $container.find('[rel="stylesheet"]').each(function (i, v) {
                $v = $(v);

                // If it already exists, just remove the duplicate
                if ($head.find('[rel="stylesheet"][href="' + $v.attr('href') + '"]').length) {
                    $v.remove();
                    return;
                } else {
                    // If it's not in the css area already,
                    // clone and move up
                    $cssArea.before($v.clone());
                    onComplete($v);
                }
            });
        }
        PushState.gatherCss = gatherCss;

        /**
        * Click event handler for PushState-bound items
        * Basically picks up target href and calls PushState.load()
        * @param {Event} e Click event
        */
        function handleLink(e) {
            var $target = $(e.currentTarget), thisHref = $target.attr('href'), isMobile = ('ontouchstart' in window || (/iPhone|iPod|Android|BlackBerry/).test(navigator.userAgent));

            // ignore if it's a hash link
            if (thisHref.indexOf('#') === 0) {
                return;
                // ignore if it's a page we're already on, or if it's a phone number and we're on desktop
            } else if (window.location.href === thisHref || window.location.href === thisHref + '/' || (thisHref.indexOf('tel:') === 0 && !isMobile)) {
                e.preventDefault();
                return;
                // ignore if it links out
            } else if (thisHref.indexOf(window.location.host) < 0 && thisHref.indexOf('/') > 0) {
                $target.unbind().attr('target', '_blank');
                return;
            }

            // made it this far then it's something we can ajax
            e.preventDefault();
            this.load(thisHref);
        }
        PushState.handleLink = handleLink;

        /**
        * Aborts any current request PushState might be making
        */
        function abort() {
            this.REQUEST && this.REQUEST.abort && this.REQUEST.abort();
        }
        PushState.abort = abort;

        /**
        * Loads target URL while displaying loading bar
        * @param {string}    href Destination URL
        * @param {number} sTop? ScrollTop value to set on window (if going back a page, etc)
        */
        function load(href, sTop) {
            this.REQUEST && this.REQUEST.abort && this.REQUEST.abort();

            var safeHref = encodeURIComponent(href);

            $('html').addClass('is-loading');

            var self = this;

            // The PUSH_CACHE might already have this URL response loaded
            if (self.PUSH_CACHE.hasOwnProperty(safeHref)) {
                self._onSuccess(self.PUSH_CACHE[safeHref], href, sTop);
            } else {
                // Set up the loading bar and inch it forward a little
                $('#loading').width('0%').text('').show();
                setTimeout(function () {
                    $('#loading').width(((Math.floor(Math.random() * 20) + 1)) + '%');
                }, 100);

                // Initiate AJAX request
                self.REQUEST = $.ajax({
                    'url': href,
                    'xhrFields': {
                        'onprogress': function (e) {
                            // If a progress event is passed..
                            if ($('#loading').width() !== '100%') {
                                //  ..and we can calculate the percentage loaded, do that
                                if (e.lengthComputable) {
                                    $('#loading').width((e.loaded / e.total) * 100 + '%');
                                } else {
                                    // ..or just make something up to give the illusion of progression
                                    var thisWidth = $('#loading').width();
                                    $('#loading').width((thisWidth + (thisWidth / 2)) + '%');
                                }
                            }
                        }
                    }
                }).error(function (e1, e2, e3) {
                    return self._onError(e1, e2, e3);
                }).success(function (response) {
                    return self._onSuccess(response, href, sTop);
                });

                // bind the back button (since there's something to go back to now)
                self.bindBackButton();
            }
        }
        PushState.load = load;

        /**
        * Called after a successful PushState.load()
        * Parses response, caches (if necessary),
        * begins preloading, and finally calls PushState.replaceContent()
        * @param {string}    response Server response
        * @param {string} href     URL of whatever we just loaded
        * @param {number} sTop?     ScrollTop to transition to (if going back etc)
        */
        function _onSuccess(response, href, sTop) {
            this.lastTop = $(window).scrollTop();

            // Add href to PUSH_HISTORY
            var encodedHref = encodeURIComponent(href);
            if (this.PUSH_HISTORY[this.PUSH_HISTORY.length - 1] !== encodedHref) {
                this.PUSH_HISTORY.push(encodedHref);
            }

            // get the response and rip div#the-content
            var $res = $(response), $holder = $(document.createElement('div')).append(response);
            $res = $holder.find('#the-content');

            // change the <title> tag to whatever the new one is
            this.changeTitle($holder);

            // use pushState to change the URL
            var safeHref = (href).replace(window.location.host, '').replace(window.location.protocol + '//', '');
            if (safeHref === '') {
                safeHref = href;
            }
            window.history.pushState({
                'url': safeHref
            }, '', safeHref);

            // if this URL doesn't exist in cache, add it
            if (href && !this.PUSH_CACHE.hasOwnProperty(encodedHref)) {
                this.PUSH_CACHE[encodedHref] = response;
            }

            // preload stylesheets
            // this prevents a FOUC race condition when loading new sections
            var self = this, $preloadables = $res.find('[rel="stylesheet"]');
            if ($preloadables.length) {
                var counter = 0, $v;
                $preloadables.each(function (i, v) {
                    $v = $(v);
                    $.ajax({
                        'url': $v.attr('href')
                    }).done(function () {
                        counter++;
                        if (counter === $preloadables.length) {
                            self.updateHeaderNav();
                            self.replaceContent($res, sTop);
                        }
                    });
                });
            } else {
                setTimeout(function () {
                    self.updateHeaderNav();

                    // need to async this because resources will load incorrect path due to pushState not going through in time
                    self.replaceContent($res, sTop);
                }, 50);
            }
        }
        PushState._onSuccess = _onSuccess;

        /**
        * Determines which header navigation item to highlight based on location
        */
        function updateHeaderNav() {
            var curLink = window.location.href.replace(window.location.host, '').replace(window.location.protocol + '//', '');

            // Get section from URL
            if (curLink.split('/').length - 1 >= 2) {
                curLink = curLink.slice(0, curLink.lastIndexOf('/') + 1);
            }
            curLink = curLink.replace(/\//g, '');

            // what's in the URL may not be what we want curLink to be
            if (curLink.indexOf('work') >= 0) {
                curLink = 'work';
            } else if (curLink.indexOf('about') >= 0) {
                curLink = 'about';
            } else if (curLink.indexOf('news') >= 0) {
                curLink = 'news';
            } else if (curLink.indexOf('careers') >= 0) {
                curLink = 'careers';
            } else if (curLink.indexOf('contact') >= 0) {
                curLink = 'contact';
            }

            // mobile sidebar
            var $mobileList = $('.header-mobile__list-item');
            $mobileList.removeClass('is-active');
            if (curLink && curLink !== '' && curLink !== '/') {
                $mobileList.find('a[href*="' + curLink + '"]').closest('.header-mobile__list-item').addClass('is-active');
            }

            // mobile subsidebar
            if (curLink === 'about' || curLink === 'work') {
                var $mobileSubList = $('.header-mobile__sub-item');
                $mobileSubList.removeClass('is-active');
                var subLink = window.location.href.replace(window.location.host, '').replace(window.location.protocol, '').replace('//', '');
                $mobileSubList.find('a[href*="' + subLink + '"]').closest('.header-mobile__sub-item').addClass('is-active');
            }

            //header
            var $navList = $('.header-nav__list-item');
            $navList.removeClass('is-active');
            if (curLink && curLink !== '' && curLink !== '/') {
                $navList.find('a[href*="' + curLink + '"]').closest('.header-nav__list-item').addClass('is-active');
            }

            //footer
            var $footList = $('.footer-links__item');
            $footList.removeClass('is-active');
            if (curLink && curLink !== '' && curLink !== '/') {
                $footList.find('a[href*="' + curLink + '"]').closest('.footer-links__item').addClass('is-active');
            } else {
                $footList.first().addClass('is-active');
            }
        }
        PushState.updateHeaderNav = updateHeaderNav;

        /**
        * Fired after PushState.load() goes wrong.
        */
        function _onError(e1, e2, e3) {
            log('PushState _onError', e1, e2, e3);
            $('html').removeClass('is-loading');

            var showMessage = true;

            // Determine the cause of the issue
            if (e3 === 'Not Found') {
                $('#loading').text('Sorry! That page appears to be missing.').width('100%');
                // Abort means something stopped it (PushState.abort())
            } else if (e3 === 'abort') {
                $('#loading').text('').hide();
                showMessage = false;
            } else {
                // Something else (includes message from server)
                var text = 'Sorry! That link appears to be broken' + (e3 !== '' ? '- ' + e3 : '');

                // Double check if the user is online
                if (window.navigator.hasOwnProperty('onLine') && !window.navigator.onLine) {
                    text = 'Error! It looks like you might not be online.';
                }
                $('#loading').text(text).width('100%');
            }

            // If we showed a message, we should fade it away after a few seconds
            if (showMessage) {
                setTimeout(function () {
                    $('#loading').fadeOut(function () {
                        $('#loading').css('width', '0%');
                    });
                }, 5000);
            }
        }
        PushState._onError = _onError;

        /**
        * Updates the <title> tag value after a successful page load
        * @param {JQuery} $response Server response to search for replacement title
        */
        function changeTitle($response) {
            var $title = $response.find('title');
            if (!$title || !$title.length) {
                return;
            }

            $('title').html($title.html());

            // GA picks up the title tag in pageviews, so we ping it here
            Analytics.pageview();
        }
        PushState.changeTitle = changeTitle;

        /**
        * Gets the last ScrollTop saved.
        * Also deletes lastTop variable upon execution
        * @return {number} Saved ScrollTop value
        */
        function getLastTop() {
            var lt = this.lastTop;
            delete this.lastTop;
            return lt;
        }
        PushState.getLastTop = getLastTop;

        /**
        * Function to replace content existing in the dom with content coming from the server/cache
        * @param {JQuery}    $content New content to put into the page
        * @param {number} sTop?    ScrollTop to set the window to (used if navigating back etc)
        */
        function replaceContent($content, sTop) {
            var $target = this.$container.find('#the-content'), self = this;

            // Not sure why this is here, but it looks important
            $('a').blur();

            // Moves any CSS declarations out of the response
            this.gatherCss($content);

            // The loading bar should be full-width by this point
            $('#loading').width('100%');

            // dispose old widgets
            this.Factory.removeWidgets($target);

            // In some cases we want to hold onto some things on the page
            // (the about section subnav should stay between about pages, for instance)
            // so we find the keepers already on the page and the keepers coming in
            // compare the two, and from there prevent it from transitioning out
            var $toFade = $target, $keepersComingIn = $content.find('[data-push-keep]'), $keepersAlreadyHere = $target.find('[data-push-keep]');

            // this only assumes there is one keeper per page - not good
            if ($keepersComingIn.length) {
                if ($keepersAlreadyHere.attr('data-push-keep') === $keepersComingIn.attr('data-push-keep')) {
                    if ($keepersComingIn.attr('data-widget') === 'collapse-nav') {
                        $keepersComingIn.attr('data-collapse-intro', 'false');
                        $keepersComingIn.attr('class', $keepersAlreadyHere.attr('class'));
                    }
                    $toFade = $target.find('section').first();
                    $target = $target.not($toFade);
                }
            }

            // close the mobile menu if it's there
            if ($('html').hasClass('has-sidebar')) {
                // get the mobile menu widget and close if necessary
                // (this is kind of a weird way to do this I suppose)
                var menu = $('[data-widget="mobile-navtoggle"]').data('fb-widget');
                menu && menu.onMenuEvent && menu.onMenuEvent({}, true);
            }

            // Animate the old content out and replace it with the new stuff
            this.Walt.animate({
                'el': $toFade,
                'animation': 'fadeOut',
                'duration': '300ms',
                'onComplete': function ($el) {
                    // If a ScrollTop value was provided, we'll set it here,
                    // else just setting it to 0 is fine
                    if (typeof sTop === 'undefined') {
                        // Android bugz
                        if ((/Android/).test(navigator.userAgent)) {
                            $('html,body').animate({
                                'scrollTop': 0
                            }, 10);
                        } else {
                            $('html,body').scrollTop(0);
                        }
                    } else if (typeof sTop !== 'undefined') {
                        if ((/Android/).test(navigator.userAgent)) {
                            $('html,body').animate({
                                'scrollTop': sTop
                            }, 10);
                        } else {
                            $('html,body').scrollTop(sTop);
                        }
                    }

                    // remove the loading bar
                    $('#loading').fadeOut(function () {
                        $('#loading').css('width', '0%');
                    });

                    // clear out the destination's contents
                    $target.find('*').unbind().empty().remove();

                    // replace with the new stuff
                    $target.html($content.html());

                    // tell Kiu to swap out any mobile/tablet/desktop images that might need swapping
                    Kiu.detectMobileDesktop($window.scrollTop(), $window.width(), $window.height());

                    // fade in the section with the newly-replaced content
                    self.Walt.animate({
                        'el': $target,
                        'animation': 'fadeIn',
                        'duration': '500ms',
                        'delay': '100ms',
                        'onBefore': function () {
                            // Tell factory, pushstate, and analytics to deal with a new page
                            self.Factory.refresh();
                            self.bindLinks();
                            Analytics.refresh();

                            $('html').removeClass('is-loading');
                        }
                    });
                }
            });
        }
        PushState.replaceContent = replaceContent;

        log('PushState : Constructor');
    })(PushState || (PushState = {}));
    return PushState;
});
