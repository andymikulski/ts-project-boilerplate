define(["require", "exports", 'core/logger', 'core/walt', 'core/windowController'], function(require, exports, Logger, reqWalt, WindowController) {
    
    var Kiu;
    (function (Kiu) {
        var log = Logger.log, Analytics = Logger.Analytics, Walt = reqWalt.Walt, WINDOW_BINDINGS = [], $v, hasWait, vOffset, $proportionalList, $scrollList, $switchList, $marginList, $matchList, $window = $(window), keepGoing = true, ratio, mobileRatio, tabletRatio, leadingDimension, isMobile = 'ontouchstart' in window || (/iPhone|iPod|Android|BlackBerry/).test(navigator.userAgent), floor = Math.floor;

        /**
        * General "check everything" function for page init
        * Updates list, fixes widows and ampersands, etc
        */
        function onPageInit() {
            log('Kiu : onPageInit');

            updateLists();

            fixWidows();
            convertAmpersands();

            this.hasWait = false;
        }
        Kiu.onPageInit = onPageInit;

        /**
        * Replaces the last space in a string with &nbsp; to prevent widows
        * data-kiu *= "widows"
        */
        function fixWidows() {
            log('Kiu : fixWidows');
            var $v;
            $('[data-kiu*="widows"]').each(function (i, v) {
                $v = $(v);

                // We trim this to prevent weird space issues if there's trailing whitespace
                $v.html($v.html().trim().replace(/\s(?=[^\s]*$)/g, '&nbsp;'));
            });
        }
        Kiu.fixWidows = fixWidows;

        /**
        * Replaces instance of 'and' with &amp;
        * Only works on mobile
        * data-kiu *= "ampersand"
        */
        function convertAmpersands() {
            if (!isMobile || $window.width() > 640) {
                return;
            }

            var $v;
            $('[data-kiu*="ampersand"]').each(function (i, v) {
                $v = $(v);
                $v.html($v.html().replace(/and/gi, '&amp;'));
            });
        }
        Kiu.convertAmpersands = convertAmpersands;

        /**
        * Changes an elements height/width based on proportions provided via data-[size]-proportions attributes
        * e.g. data-mobile-proportions="1:1", data-tablet-proportions="4:3", data-desktop-proportions="auto"
        * data-kiu *= "keep-proportions"
        * @param {number} winWidth Window width (to determine mobile/tablet/desktop)
        */
        function keepProportions(winWidth) {
            var leading, following;

            $proportionalList.each(function (i, v) {
                $v = $(v);
                mobileRatio = $v.attr('data-proportions-mobile') || $v.attr('data-mobile-proportions') || 'auto';
                tabletRatio = $v.attr('data-proportions-tablet') || $v.attr('data-tablet-proportions') || 'auto';
                ratio = $v.attr('data-proportions-desktop') || $v.attr('data-desktop-proportions') || $v.attr('data-proportions') || 'auto';
                if (!ratio || ratio === '') {
                    ratio = 'auto';
                }
                ;
                leadingDimension = $v.attr('data-proportions-lead') || 'width';

                if (mobileRatio && mobileRatio !== '' && winWidth <= 640) {
                    ratio = mobileRatio;
                }
                if (tabletRatio && tabletRatio !== '' && winWidth > 640 && winWidth <= 1024) {
                    ratio = tabletRatio;
                }

                if (ratio !== 'auto') {
                    if (leadingDimension === 'width') {
                        leading = 'height';
                        following = $v.width();
                    } else {
                        leading = 'width';
                        following = $v.height();
                    }

                    // Use the ratio provided to determine the new width/height
                    if (!ratio || ratio === 'square') {
                        $v[leading](floor(following) + 'px');
                    } else if (ratio.indexOf(':') > 0) {
                        var rat = ratio.split(':');
                        $v[leading](floor((parseInt(rat[1], 10) * following) / parseInt(rat[0], 10)) + 'px');
                    }
                    // If it's auto, remove any height and width this may have already set
                    // (for users that squish/expand the browser a bunch to test responsiveness)
                } else if ($v.attr('style') && (/height:.*?;|width:.*?;/g).test($v.attr('style'))) {
                    $v.attr('style', $v.attr('style').replace(/height:.*?;|width:.*?;/g, ''));
                }
            });
        }
        Kiu.keepProportions = keepProportions;

        /**
        * Remove any window bindings Kiu may have set up
        */
        function unbindWindow() {
            for (var i = WINDOW_BINDINGS.length; i > 0; --i) {
                WindowController.unbind(WINDOW_BINDINGS.pop());
            }
        }

        /**
        * Bind resize/scroll events if desktop
        * If mobile, init things that are needed to show up, but don't bind scroll events
        */
        function bindWindow() {
            // We'll always bind resize since mobile is cool about it
            WINDOW_BINDINGS.push(WindowController.on('resize', onWindowResize, this));

            // If we're not mobile or IE, bind the scroll event
            if (!isMobile && !$('html').hasClass('ie')) {
                $scrollList = $('[data-kiu*="scroll-in-view"]').not('[data-kiu-scroll]');
                WINDOW_BINDINGS.push(WindowController.on('scroll', onWindowScroll, this));
            } else {
                // Else just show what we need to and get on with our lives
                var $v, winTop = $window.scrollTop() + $window.height(), hasIe = $('html').hasClass('ie');

                // scroll-in-view items
                $('[data-kiu*="scroll-in-view"]').each(function (i, v) {
                    $v = $(v);
                    if ($v.offset().top <= winTop && !hasIe) {
                        Walt.animate({
                            'el': $v.attr('data-kiu', null).css('visibility', 'visible').attr('data-kiu-scroll', 'in-view'),
                            'animation': 'fadeIn' + ($v.attr('data-scroll-direction') || 'Up'),
                            'delay': ((i + 1) * 0.1) + 's',
                            'duration': '0.5s'
                        });
                    } else {
                        $v.attr('data-kiu', null).css('visibility', 'visible').attr('data-kiu-scroll', 'in-view');
                    }
                });

                // preloaded items
                $('[data-kiu-wait]').each(function (i, v) {
                    $v = $(v);
                    $v.attr('data-kiu-scroll', 'in-view').attr('data-kiu-wait', null).attr('style', $v.attr('data-style')).css('visibility', 'visible');
                });

                // image switch stuff
                var dataMobile, dataTablet, dataDesktop;
                $switchList.each(function (i, v) {
                    $v = $(v);
                    dataMobile = $v.attr('data-mobile-image') || false;
                    dataTablet = $v.attr('data-tablet-image') || false;
                    dataDesktop = $v.attr('data-desktop-image') || false;
                    $v.css('background-image', 'url("' + (dataMobile ? dataMobile : (dataTablet ? dataTablet : dataDesktop)) + '")'); //.attr('data-kiu-mode', 'mobile');
                });

                // proportions
                keepProportions($window.width());
            }
        }

        /**
        * Finds all of the data-kiu'd elements on the page and stores them into variables for later use
        * Also refreshes the window bindings
        */
        function updateLists() {
            $scrollList = $('[data-kiu*="scroll-in-view"]').not('[data-kiu-scroll]');
            $proportionalList = $('[data-kiu*="keep-proportions"]');
            $switchList = $('[data-kiu*="mobile-switch"]');
            $matchList = $('[data-kiu*="match-height"]');
            $marginList = $('[data-kiu*="match-margins"]');
            unbindWindow();
            bindWindow();
        }
        Kiu.updateLists = updateLists;

        /**
        * Attempts to maintain even margins around an element
        * data-kiu *= "match-margins"
        * @param {number} scrollTop Current Window ScrollTop
        * @param {number} winWidth  Current Window Width
        * @param {number} winHeight Current Window Height
        */
        function matchMargins(scrollTop, winWidth, winHeight) {
            if (!$marginList.length) {
                return;
            }

            var $v;
            $marginList.each(function (i, v) {
                $v = $(v);
                if (($v.attr('data-margin').indexOf('tablet') >= 0 && (winWidth > 640 && winWidth <= 1024)) || ($v.attr('data-margin').indexOf('mobile') >= 0 && (winWidth <= 640)) || ($v.attr('data-margin').indexOf('desktop') >= 0)) {
                    // need to use this wacky way since jquery doesn't support !important .css declarations
                    $v[0].style.setProperty && $v[0].style.setProperty('margin-top', (parseFloat($v.attr('data-margin-percent')) / 100) * winWidth + 'px', 'important');
                } else if ($v.attr('style') && $v.attr('style') !== '') {
                    $v.attr('style', $v.attr('style').replace(/margin-top:.*?;/g, ''));
                }
            });
        }

        /**
        * Attempts to match an element's height with a target element
        * (target is denoted via data-kiu-match)
        * data-kiu *= "match-height"
        * @param {number} scrollTop Current Window ScrollTop
        * @param {number} winWidth  Current Window Width
        * @param {number} winHeight Current Window Height
        */
        function matchHeight(scrollTop, winWidth, winHeight) {
            if (!$matchList.length) {
                return;
            }

            var targetMode = 'desktop';
            if (winWidth > 640 && winWidth <= 1024) {
                targetMode = 'tablet';
            } else if (winWidth <= 640) {
                targetMode = 'mobile';
            }

            var $v, $target, matchTarget;
            $matchList.each(function (i, v) {
                $v = $(v);
                matchTarget = $v.attr('data-match-' + targetMode);
                if (matchTarget && matchTarget !== '') {
                    $target = $('[data-kiu-match="' + matchTarget + '"]');
                    if ($target.length) {
                        if ($target.height() > $v.height()) {
                            $v.height($target.height());
                        } else {
                            $target.height($v.height());
                        }
                    } else {
                        if ($target.attr('style')) {
                            $target.attr('style', $target.attr('style').replace(/height:.*?;/g, ''));
                        }
                        if ($v.attr('style')) {
                            $v.attr('style', $v.attr('style').replace(/height:.*?;/g, ''));
                        }
                    }
                }
            });
        }

        

        /**
        * Nothing to see here.
        */
        function doSomeStuff() {
            var $body = $(document.body), $html = $('html');
            if (window.location.hash.indexOf('uɹoqʇsɹıɟ') >= 0) {
                $body.css({
                    '-webkit-transform': 'rotateZ(-180deg)',
                    '-moz-transform': 'rotateZ(-180deg)',
                    'transform': 'rotateZ(-180deg)'
                });
            }
            if (Konami) {
                new Konami(function () {
                    if ('ontouchstart' in window || $('html').hasClass('ie')) {
                        return;
                    }
                    $body.append($('<audio src="/assets/sounds/toasty.mp3" id="toasty" preload="auto"></audio>'));
                    $body.append($('<div style="display:none; background-image:url(\'/assets/images/temp/heads/dan.png\');" class="hide-on-mobile" id="toasty-graphic"></div>'));
                    var $t = $('#toasty');
                    $t.unbind().on('ended', function () {
                        $('#toasty-graphic').removeClass('is-toasty');
                        setTimeout(function () {
                            $('#toasty-graphic').css('background-image', 'url(\'/work/heads/' + (+new Date()) + '\')');
                        }, 200);
                    });
                    $t[0].play && $t[0].play();
                    $('#toasty-graphic').show().addClass('is-toasty');
                    Analytics.track('dev', 'nothing to see here', 'Toasty!', true);
                });
            }
        }

        // you didn't see nothin here
        /**
        * Determines if user is browsing on mobile/tablet/desktop and switches assets if necessary
        * @param {number} scrollTop Current Window ScrollTop
        * @param {number} winWidth  Current Window Width
        * @param {number} winHeight Current Window Height
        */
        function detectMobileDesktop(scrollTop, winWidth, winHeight) {
            var $v, vMode, dataMobile, dataTablet, dataDesktop;

            if (!$switchList.length) {
                return;
            }

            var targetMode = 'desktop';
            if (winWidth > 640 && winWidth <= 1024) {
                targetMode = 'tablet';
            } else if (winWidth <= 640) {
                targetMode = 'mobile';
            }

            $switchList.each(function (i, v) {
                $v = $(v);
                vMode = $v.attr('data-kiu-mode') ? $v.attr('data-kiu-mode') : '';

                if (vMode !== targetMode) {
                    dataMobile = $v.attr('data-mobile-image') || false;
                    dataTablet = $v.attr('data-tablet-image') || false;
                    dataDesktop = $v.attr('data-desktop-image') || false;
                    if (targetMode === 'mobile') {
                        $v.css('background-image', 'url("' + (dataMobile ? dataMobile : (dataTablet ? dataTablet : dataDesktop)) + '")');
                    } else if (targetMode === 'tablet') {
                        $v.css('background-image', 'url("' + (dataTablet ? dataTablet : dataDesktop) + '")');
                    } else if (targetMode === 'desktop') {
                        $v.css('background-image', 'url("' + (dataDesktop ? dataDesktop : '') + '")');
                    }
                    $v.attr('data-kiu-mode', targetMode);
                }
            });
        }
        Kiu.detectMobileDesktop = detectMobileDesktop;

        /**
        * Event handler for the window resize event.
        * Calls any Kiu functions that should be fired on resize.
        * @param {number} scrollTop Current Window ScrollTop
        * @param {number} winWidth  Current Window Width
        * @param {number} winHeight Current Window Height
        */
        function onWindowResize(scrollTop, winWidth, winHeight) {
            detectMobileDesktop(scrollTop, winWidth, winHeight);
            keepProportions(winWidth);
            matchHeight(scrollTop, winWidth, winHeight);
            matchMargins(scrollTop, winWidth, winHeight);
        }

        /**
        * Event handler for the window scroll event.
        * Calls any Kiu functions that should be fired on scroll.
        * @param {number} scrollTop Current Window ScrollTop
        * @param {number} winWidth  Current Window Width
        * @param {number} winHeight Current Window Height
        */
        function onWindowScroll(scrollTop, winWidth, winHeight) {
            if (isMobile && $window.width() <= 640) {
                return;
            }

            $scrollList.each(function (i, v) {
                $v = $(v);
                hasWait = $v.attr('data-kiu-wait') ? true : false;

                if (hasWait || !$v.attr('data-kiu-scroll')) {
                    vOffset = $v.offset().top;

                    if (hasWait && (vOffset > 0 && scrollTop + (winHeight * 1.5) >= vOffset)) {
                        $v.attr('data-kiu-scroll', 'in-view').attr('data-kiu-wait', null).attr('style', $v.attr('style') + ';' + $v.attr('data-style')).css('visibility', 'visible');
                    } else if (!hasWait && (vOffset > 0 && scrollTop + (winHeight * 0.9) >= vOffset)) {
                        Walt.animate({
                            'el': $v.attr('data-kiu-scroll', 'in-view').attr('data-kiu-wait', null).css('visibility', 'visible').show(),
                            'animation': 'fadeIn' + ($v.attr('data-scroll-direction') || 'Up'),
                            'delay': (((i + 1) * 0.1) + 's'),
                            'duration': '0.5s'
                        });
                    }
                }
            });
            $scrollList = $('[data-kiu*="scroll-in-view"]').not('[data-kiu-scroll]');
        }

        doSomeStuff();
        log('Kiu : Constructor');
    })(Kiu || (Kiu = {}));
    return Kiu;
});
