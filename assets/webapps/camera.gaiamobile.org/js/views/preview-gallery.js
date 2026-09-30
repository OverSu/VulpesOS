define([
    'require',
    'debug',
    'lib/panzoom',
    'lib/orientation',
    'MediaFrame',
    'lib/bind',
    'attach',
    'view',
    'gaia-header'
], function (require) {
    'use strict';
    var debug = require('debug')('view:preview-gallery');
    var addPanAndZoomHandlers = require('lib/panzoom');
    var orientation = require('lib/orientation');
    var MediaFrame = require('MediaFrame');
    var bind = require('lib/bind');
    var attach = require('attach');
    var View = require('view');
    require('gaia-header');
    var SWIPE_DISTANCE_THRESHOLD = window.innerWidth / 3;
    var SWIPE_VELOCITY_THRESHOLD = 1;
    var SWIPE_DURATION = 150;
    var FADE_IN_DURATION = 450;
    return View.extend({
        name: 'preview-gallery',
        className: 'offscreen',
        initialize: function () {
            debug('initialized');
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.els.frameContainer = this.find('.js-frame-container');
            this.els.previewMenu = this.find('.js-preview-menu');
            this.els.mediaFrame = this.find('.js-media-frame');
            this.els.countText = this.find('.js-count-text');
            this.els.options = this.find('.js-options');
            this.els.header = this.find('.js-header');
            this.els.share = this.find('.js-share');
            window.dispatchEvent(new CustomEvent('lazyload', { detail: this.el }));
            this.configure();
            delete this.template;
            debug('rendered');
            return this.bindEvents();
        },
        bindEvents: function () {
            bind(this.el, 'tap', this.onTap);
            bind(this.els.header, 'action', this.firer('click:back'));
            bind(this.els.options, 'click', this.onButtonClick);
            bind(this.els.share, 'click', this.onButtonClick);
            bind(this.els.mediaFrame, 'wheel', this.onFrameWheel);
            return this;
        },
        configure: function () {
            this.currentIndex = this.lastIndex = 0;
            this.frame = new MediaFrame(this.els.mediaFrame, true, this.maxPreviewSize);
            this.frame.video.onloading = this.onVideoLoading;
            this.frame.video.onplaying = this.onVideoPlaying;
            this.frame.video.onpaused = this.onVideoPaused;
            addPanAndZoomHandlers(this.frame, this.swipeCallback);
        },
        template: function () {
            return '<div class="preview-menu js-preview-menu">' + '<gaia-header class="js-header" action="back" ignore-dir>' + '<h1 data-l10n-id="preview">Preview</h1>' + '<button class="preview-share-icon js-share"' + 'name="share" data-icon="share" ' + 'data-l10n-id="share-button"></button>' + '<button class="preview-option-icon ' + 'js-options" name="options" data-icon="more" ' + 'data-l10n-id="more-button"></button>' + '</gaia-header>' + '</div>' + '<div class="frame-container js-frame-container">' + '<div class="media-frame js-media-frame"></div>' + '</div>' + '<div class="count-text js-count-text"></div>';
        },
        onTap: function () {
            if (this.videoPlaying) {
                return;
            }
            var isShown = this.els.previewMenu.classList.contains('visible');
            if (isShown) {
                this.previewMenuFadeOut();
            } else {
                this.previewMenuFadeIn();
            }
        },
        previewMenuFadeIn: function () {
            this.els.previewMenu.classList.add('visible');
        },
        previewMenuFadeOut: function () {
            this.els.previewMenu.classList.remove('visible');
        },
        onFrameWheel: function (event) {
            if (event.deltaMode !== event.DOM_DELTA_PAGE || event.deltaY) {
                return;
            }
            if (this.videoPlaying) {
                this.onVideoPaused();
            }
            if (event.deltaX > 0) {
                this.emit('swipe', 'left');
            } else if (event.deltaX < 0) {
                this.emit('swipe', 'right');
            }
        },
        swipeCallback: function (swipeAmount, swipeVelocity) {
            var self = this;
            if (swipeVelocity === undefined) {
                this.els.frameContainer.style.transform = 'translate(' + swipeAmount + 'px, 0)';
                return;
            }
            var direction, translation;
            if (swipeAmount > 0 && swipeVelocity > 0 && this.currentIndex > 1 && (swipeAmount > SWIPE_DISTANCE_THRESHOLD || swipeVelocity > SWIPE_VELOCITY_THRESHOLD)) {
                direction = 'right';
                translation = '100%';
            } else if (swipeAmount <= 0 && swipeVelocity <= 0 && this.currentIndex < this.lastIndex && (swipeAmount < -SWIPE_DISTANCE_THRESHOLD || swipeVelocity < -SWIPE_VELOCITY_THRESHOLD)) {
                direction = 'left';
                translation = '-100%';
            }
            if (!direction) {
                animate('transform', 'translate(0,0)', SWIPE_DURATION);
                return;
            }
            if (this.videoPlaying) {
                this.onVideoPaused();
            }
            animate('transform', 'translate(' + translation + ', 0)', SWIPE_DURATION, function () {
                self.emit('swipe', direction);
                window.requestAnimationFrame(function () {
                    self.els.frameContainer.style.opacity = 0;
                    self.els.frameContainer.style.transform = 'translate(0,0)';
                    window.requestAnimationFrame(function () {
                        animate('opacity', 1, FADE_IN_DURATION);
                    });
                });
            });
            function animate(property, value, duration, done) {
                var e = self.els.frameContainer;
                e.addEventListener('transitionend', onTransitionEnd);
                e.style.transitionProperty = property;
                e.style.transitionDuration = duration + 'ms';
                e.style[property] = value;
                function onTransitionEnd() {
                    e.removeEventListener('transitionend', onTransitionEnd);
                    delete e.style.transitionProperty;
                    delete e.style.transitionDuration;
                    if (done) {
                        done();
                    }
                }
            }
        },
        onButtonClick: function (e, el) {
            if (this.videoPlaying) {
                return;
            }
            el = el || e.currentTarget;
            var name = el.getAttribute('name');
            if (this.optionsMenuContainer) {
                this.hideOptionsMenu();
            }
            this.emit('click:' + name, e);
            e.stopPropagation();
        },
        open: function () {
            window.addEventListener('resize', this.onResize);
            orientation.unlock();
            this.previewMenuFadeIn();
            this.el.classList.remove('offscreen');
        },
        close: function () {
            window.removeEventListener('resize', this.onResize);
            orientation.lock();
            this.previewMenuFadeOut();
            this.el.classList.add('offscreen');
            this.frame.clear();
        },
        updateCountText: function (current, total) {
            this.currentIndex = current;
            this.lastIndex = total;
            this.els.countText.textContent = current + '/' + total;
            this.els.mediaFrame.setAttribute('data-l10n-id', 'media-frame');
            this.els.mediaFrame.setAttribute('data-l10n-args', JSON.stringify({
                total: total,
                current: current
            }));
        },
        onResize: function () {
            this.frame.resize();
            if (this.frame.displayingVideo) {
                this.frame.video.setPlayerSize();
            }
        },
        showImage: function (image) {
            this.frame.displayImage(image.blob, image.width, image.height, image.preview, image.rotation, image.mirrored);
        },
        showVideo: function (video) {
            this.frame.displayVideo(video.blob, video.poster.blob, video.poster.width / video.poster.height, video.rotation);
        },
        onVideoLoading: function () {
            this.emit('loadingvideo', 'loadingVideo');
        },
        onVideoPlaying: function () {
            if (this.videoPlaying) {
                return;
            }
            this.videoPlaying = true;
            this.previewMenuFadeOut();
            this.emit('playingvideo');
        },
        onVideoPaused: function () {
            if (!this.videoPlaying) {
                return;
            }
            this.videoPlaying = false;
            this.previewMenuFadeIn();
        },
        showOptionsMenu: function () {
            this.optionsMenuContainer = document.createElement('div');
            this.optionsMenuContainer.innerHTML = this.optionTemplate();
            this.el.appendChild(this.optionsMenuContainer);
            this.el.classList.add('action-menu');
            this.menu = this.find('.js-menu');
            var cancelButton = this.find('.js-cancel');
            bind(cancelButton, 'click', this.hideOptionsMenu);
            if (this.menu) {
                attach.on(this.menu, 'click', '.js-btn', this.onButtonClick);
            }
        },
        hideOptionsMenu: function () {
            if (this.optionsMenuContainer) {
                this.el.classList.remove('action-menu');
                this.optionsMenuContainer.parentElement.removeChild(this.optionsMenuContainer);
                this.optionsMenuContainer = null;
            }
        },
        optionTemplate: function () {
            return '<form class="visible" data-type="action"' + 'role="dialog" data-z-index-level="action-menu">' + '<header data-l10n-id="options">Options</header>' + '<menu class="js-menu">' + '<button class="js-btn" name="gallery" data-l10n-id="open-gallery">' + 'Open Gallery' + '</button>' + '<button class="js-btn" name="delete" data-l10n-id="delete">' + 'Delete' + '</button>' + '<button class="js-cancel" data-action="cancel" data-l10n-id="cancel">' + 'Cancel' + '</button>' + '</menu>' + '</form>';
        }
    });
});