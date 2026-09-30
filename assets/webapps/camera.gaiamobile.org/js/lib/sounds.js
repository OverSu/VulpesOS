define([
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    'use strict';
    module.exports = Sounds;
    function Sounds(list) {
        this.items = {};
        (list || []).forEach(this.add, this);
    }
    Sounds.prototype.add = function (data) {
        var self = this;
        var sound = {
            name: data.name,
            url: data.url,
            setting: data.setting,
            enabled: false
        };
        this.items[data.name] = sound;
        this.isEnabled(sound, function (value) {
            self.setEnabled(sound, value);
            self.observeSetting(sound);
        });
    };
    Sounds.prototype.isEnabled = function (sound, done) {
        setTimeout(function () {
            var mozSettings = navigator.mozSettings;
            var key = sound.setting;
            if (!mozSettings) {
                return;
            }
            mozSettings.createLock().get(key).onsuccess = onSuccess;
            function onSuccess(e) {
                var result = e.target.result[key];
                done(result);
            }
        });
    };
    Sounds.prototype.observeSetting = function (sound) {
        var mozSettings = navigator.mozSettings;
        var key = sound.setting;
        var self = this;
        if (mozSettings) {
            mozSettings.addObserver(key, function (e) {
                self.setEnabled(sound, e.settingValue);
            });
        }
    };
    Sounds.prototype.setEnabled = function (sound, value) {
        sound.enabled = value;
    };
    Sounds.prototype.play = function (name) {
        var sound = this.items[name];
        if (!sound.audio) {
            sound.audio = this.createAudio(sound.url);
        }
        this.playSound(sound);
    };
    Sounds.prototype.player = function (name) {
        return function () {
            this.play(name);
        }.bind(this);
    };
    Sounds.prototype.playSound = function (sound) {
        if (sound.enabled) {
            sound.audio.cloneNode(true).play();
        }
    };
    Sounds.prototype.createAudio = function (url) {
        var audio = new Audio(url);
        audio.mozAudioChannelType = 'notification';
        return audio;
    };
});