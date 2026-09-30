function VideoPlayer(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    container.classList.add('video-player-container');
    VideoPlayer.instancesToLocalize.set(container, this);
    function newelt(parent, type, classes, l10n_id, attributes) {
        var e = document.createElement(type);
        if (classes) {
            e.className = classes;
        }
        if (l10n_id) {
            e.dataset.l10nId = l10n_id;
        }
        if (attributes) {
            for (var attribute in attributes) {
                e.setAttribute(attribute, attributes[attribute]);
            }
        }
        parent.appendChild(e);
        return e;
    }
    var poster = newelt(container, 'img', 'videoPoster');
    var player = newelt(container, 'video', 'videoPlayer', null, { 'aria-hidden': true });
    var controls = newelt(container, 'div', 'videoPlayerControls');
    var playbutton = newelt(controls, 'button', 'videoPlayerPlayButton', 'playbackPlay');
    var footer = newelt(controls, 'div', 'videoPlayerFooter hidden');
    var pausebutton = newelt(footer, 'button', 'videoPlayerPauseButton', 'playbackPause');
    var slider = newelt(footer, 'div', 'videoPlayerSlider', null, {
        'role': 'slider',
        'aria-valuemin': 0
    });
    var elapsedText = newelt(slider, 'span', 'videoPlayerElapsedText');
    var progress = newelt(slider, 'div', 'videoPlayerProgress');
    var backgroundBar = newelt(progress, 'div', 'videoPlayerBackgroundBar');
    var elapsedBar = newelt(progress, 'div', 'videoPlayerElapsedBar');
    var playHead = newelt(progress, 'div', 'videoPlayerPlayHead');
    var durationText = newelt(slider, 'span', 'videoPlayerDurationText');
    var fullscreenButton = newelt(slider, 'button', 'videoPlayerFullscreenButton', 'playbackFullscreen');
    this.poster = poster;
    this.player = player;
    this.controls = controls;
    this.playing = false;
    player.preload = 'metadata';
    player.mozAudioChannelType = 'content';
    var self = this;
    var controlsHidden = false;
    var dragging = false;
    var endedTimer;
    var videourl;
    var posterurl;
    var rotation;
    var aspectRatio;
    var videotimestamp;
    var playbackWidth, playbackHeight;
    var playbackTime;
    var capturedFrame;
    this.load = function (video, posterimage, aspect, rotate, timestamp) {
        this.reset();
        videourl = video;
        posterurl = posterimage;
        rotation = rotate || 0;
        if (rotation === 0 || rotation === 180) {
            aspectRatio = aspect;
        } else {
            aspectRatio = 1 / aspect;
        }
        videotimestamp = timestamp;
        this.localize();
        this.init();
        setPlayerSize();
    };
    this.reset = function () {
        videourl = null;
        posterurl = null;
        rotation = null;
        aspectRatio = null;
        videotimestamp = 0;
        hidePlayer();
        hidePoster();
    };
    this.init = function () {
        playbackTime = 0;
        hidePlayer();
        showPoster();
        this.pause();
    };
    function hidePlayer() {
        player.style.display = 'none';
        player.removeAttribute('src');
        player.load();
        self.playerShowing = false;
    }
    function showPlayer() {
        if (self.onloading) {
            self.onloading();
        }
        player.style.display = 'block';
        player.src = videourl;
        self.playerShowing = true;
        player.oncanplay = function () {
            player.oncanplay = null;
            if (playbackTime !== 0) {
                player.currentTime = playbackTime;
            }
            self.play();
        };
    }
    function hidePoster() {
        poster.style.display = 'none';
        poster.removeAttribute('src');
        if (capturedFrame) {
            URL.revokeObjectURL(capturedFrame);
            capturedFrame = null;
        }
    }
    function showPoster() {
        poster.style.display = 'block';
        if (capturedFrame) {
            poster.src = capturedFrame;
        } else {
            poster.src = posterurl;
        }
    }
    this.setPlayerSize = setPlayerSize;
    this.pause = function pause() {
        if (self.playerShowing) {
            this.playing = false;
            player.pause();
        }
        footer.classList.add('hidden');
        controlsHidden = true;
        playbutton.classList.remove('hidden');
        if (this.onpaused) {
            this.onpaused();
        }
    };
    this.play = function play() {
        if (!this.playerShowing) {
            hidePoster();
            showPlayer();
            return;
        }
        playbutton.classList.add('hidden');
        this.playing = true;
        player.play();
        footer.classList.remove('hidden');
        controlsHidden = false;
        if (this.onplaying) {
            this.onplaying();
        }
    };
    fullscreenButton.addEventListener('tap', function (e) {
        if (self.onfullscreentap) {
            e.stopPropagation();
            self.onfullscreentap();
        }
    });
    playbutton.addEventListener('tap', function (e) {
        if (!self.playerShowing || player.paused) {
            self.play();
        }
        e.stopPropagation();
    });
    pausebutton.addEventListener('tap', function (e) {
        self.pause();
        e.stopPropagation();
    });
    container.addEventListener('tap', function (e) {
        if ((e.target === player || e.target === container) && !player.paused) {
            footer.classList.toggle('hidden');
            controlsHidden = !controlsHidden;
        }
    });
    player.onloadedmetadata = function () {
        var formattedTime = formatTime(player.duration);
        durationText.textContent = formattedTime;
        slider.setAttribute('aria-valuemax', player.duration);
        document.l10n.setAttributes(slider, 'playbackSeekBar', { 'duration': formattedTime });
        self.pause();
    };
    window.addEventListener('resize', function () {
        setPlayerSize();
    });
    player.onended = ended;
    function ended() {
        if (dragging) {
            return;
        }
        if (endedTimer) {
            clearTimeout(endedTimer);
            endedTimer = null;
        }
        self.pause();
        self.init();
    }
    player.ontimeupdate = updateTime;
    function updateTime() {
        if (!controlsHidden) {
            var formattedTime = formatTime(player.currentTime);
            elapsedText.textContent = formattedTime;
            slider.setAttribute('aria-valuenow', player.currentTime);
            slider.setAttribute('aria-valuetext', formattedTime);
            if (player.duration === Infinity || player.duration === 0) {
                return;
            }
            var percent = player.currentTime / player.duration * 100 + '%';
            var startEdge = document.documentElement.dir === 'ltr' ? 'left' : 'right';
            elapsedBar.style.width = percent;
            playHead.style[startEdge] = percent;
        }
        if (!endedTimer) {
            if (!dragging && player.currentTime >= player.duration - 1) {
                var timeUntilEnd = player.duration - player.currentTime + 0.5;
                endedTimer = setTimeout(ended, timeUntilEnd * 1000);
            }
        } else if (dragging && player.currentTime < player.duration - 1) {
            clearTimeout(endedTimer);
            endedTimer = null;
        }
    }
    window.addEventListener('visibilitychange', visibilityChanged);
    function visibilityChanged() {
        if (document.hidden) {
            if (!self.playerShowing) {
                return;
            }
            self.pause();
            if (player.currentTime !== 0) {
                playbackTime = player.currentTime;
                captureCurrentFrame(function (blob) {
                    capturedFrame = URL.createObjectURL(blob);
                    hidePlayer();
                    showPoster();
                });
            } else {
                hidePlayer();
                showPoster();
            }
        }
    }
    function captureCurrentFrame(callback) {
        if (!player.src) {
            return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = playbackWidth;
        canvas.height = playbackHeight;
        var context = canvas.getContext('2d');
        context.drawImage(player, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(callback);
    }
    function setPlayerSize() {
        if (!aspectRatio) {
            return;
        }
        var containerWidth = container.clientWidth;
        var containerHeight = container.clientHeight;
        if (containerWidth > aspectRatio * containerHeight) {
            playbackHeight = containerHeight;
            playbackWidth = Math.round(playbackHeight * aspectRatio);
        } else {
            playbackWidth = containerWidth;
            playbackHeight = Math.round(playbackWidth / aspectRatio);
        }
        var elementWidth, elementHeight;
        if (rotation === 0 || rotation === 180) {
            elementWidth = playbackWidth;
            elementHeight = playbackHeight;
        } else {
            elementWidth = playbackHeight;
            elementHeight = playbackWidth;
        }
        poster.style.position = player.style.position = 'absolute';
        player.style.width = poster.style.width = elementWidth + 'px';
        player.style.height = poster.style.height = elementHeight + 'px';
        poster.style.left = player.style.left = (containerWidth - elementWidth) / 2 + 'px';
        poster.style.top = player.style.top = (containerHeight - elementHeight) / 2 + 'px';
        poster.style.transformOrigin = player.style.transformOrigin = '50% 50%';
        poster.style.transform = player.style.transform = 'rotate(' + rotation + 'deg)';
    }
    slider.addEventListener('pan', function pan(e) {
        e.stopPropagation();
        if (player.duration === Infinity) {
            return;
        }
        if (!dragging) {
            dragging = true;
        }
        var rect = backgroundBar.getBoundingClientRect();
        var position = (e.detail.position.clientX - rect.left) / rect.width;
        var pos = Math.min(Math.max(position, 0), 1);
        if (document.documentElement.dir === 'rtl') {
            pos = 1 - pos;
        }
        player.currentTime = player.duration * pos;
        updateTime();
    });
    slider.addEventListener('swipe', function swipe(e) {
        e.stopPropagation();
        dragging = false;
        if (player.currentTime >= player.duration) {
            self.pause();
        }
    });
    slider.addEventListener('keypress', function (e) {
        var step = Math.max(player.duration / 20, 2);
        if (e.keyCode == e.DOM_VK_DOWN) {
            player.currentTime -= step;
        } else if (e.keyCode == e.DOM_VK_UP) {
            player.currentTime += step;
        }
    });
    function formatTime(time) {
        time = Math.round(time);
        var minutes = Math.floor(time / 60);
        var seconds = time % 60;
        if (minutes < 60) {
            return Format.padLeft(minutes, 2, '0') + ':' + Format.padLeft(seconds, 2, '0');
        } else {
            var hours = Math.floor(minutes / 60);
            minutes = Math.round(minutes % 60);
            return hours + ':' + Format.padLeft(minutes, 2, '0') + ':' + Format.padLeft(seconds, 2, '0');
        }
        return '';
    }
    var acm = navigator.mozAudioChannelManager;
    if (acm) {
        acm.addEventListener('headphoneschange', function onheadphoneschange() {
            if (!acm.headphones && self.playing) {
                self.pause();
            }
        });
    }
    this.localize = function () {
        var portrait = aspectRatio < 1;
        var orientationL10nId = portrait ? 'orientationPortrait' : 'orientationLandscape';
        document.l10n.formatValue(orientationL10nId).then(orientationText => {
            if (videotimestamp) {
                if (!self.dtf) {
                    self.dtf = Intl.DateTimeFormat(navigator.languages, {
                        hour12: navigator.mozHour12,
                        hour: 'numeric',
                        minute: 'numeric',
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric'
                    });
                }
                var ts = this.dtf.format(new Date(videotimestamp));
                document.l10n.setAttributes(poster, 'videoDescription', {
                    orientation: orientationText,
                    timestamp: ts
                });
            } else {
                document.l10n.setAttributes(poster, 'videoDescriptionNoTimestamp', { orientation: orientationText });
            }
        });
    };
}
VideoPlayer.prototype.hide = function () {
    this.controls.style.display = 'none';
};
VideoPlayer.prototype.show = function () {
    this.controls.style.display = 'block';
};
VideoPlayer.instancesToLocalize = new WeakMap();
document.addEventListener('DOMRetranslated', function () {
    for (var container of document.querySelectorAll('.video-player-container')) {
        var instance = VideoPlayer.instancesToLocalize.get(container);
        if (instance) {
            instance.localize();
        }
    }
});