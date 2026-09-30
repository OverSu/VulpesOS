var GestureDetector = function () {
    function GD(e, options) {
        this.element = e;
        this.options = options || {};
        this.options.panThreshold = this.options.panThreshold || GD.PAN_THRESHOLD;
        this.state = initialState;
        this.timers = {};
    }
    GD.prototype.startDetecting = function () {
        var self = this;
        eventtypes.forEach(function (t) {
            self.element.addEventListener(t, self);
        });
    };
    GD.prototype.stopDetecting = function () {
        var self = this;
        eventtypes.forEach(function (t) {
            self.element.removeEventListener(t, self);
        });
    };
    GD.prototype.handleEvent = function (e) {
        var handler = this.state[e.type];
        if (!handler) {
            return;
        }
        if (e.changedTouches) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                handler(this, e, e.changedTouches[i]);
                handler = this.state[e.type];
                if (!handler) {
                    return;
                }
            }
        } else {
            handler(this, e);
        }
    };
    GD.prototype.startTimer = function (type, time) {
        this.clearTimer(type);
        var self = this;
        this.timers[type] = setTimeout(function () {
            self.timers[type] = null;
            var handler = self.state[type];
            if (handler) {
                handler(self, type);
            }
        }, time);
    };
    GD.prototype.clearTimer = function (type) {
        if (this.timers[type]) {
            clearTimeout(this.timers[type]);
            this.timers[type] = null;
        }
    };
    GD.prototype.switchTo = function (state, event, touch) {
        this.state = state;
        if (state.init) {
            state.init(this, event, touch);
        }
    };
    GD.prototype.emitEvent = function (type, detail) {
        if (!this.target) {
            console.error('Attempt to emit event with no target');
            return;
        }
        var event = this.element.ownerDocument.createEvent('CustomEvent');
        event.initCustomEvent(type, true, true, detail);
        this.target.dispatchEvent(event);
    };
    GD.HOLD_INTERVAL = 1000;
    GD.PAN_THRESHOLD = 20;
    GD.DOUBLE_TAP_DISTANCE = 50;
    GD.DOUBLE_TAP_TIME = 500;
    GD.VELOCITY_SMOOTHING = 0.5;
    GD.SCALE_THRESHOLD = 20;
    GD.ROTATE_THRESHOLD = 22.5;
    GD.THRESHOLD_SMOOTHING = 0.9;
    var abs = Math.abs, floor = Math.floor, sqrt = Math.sqrt, atan2 = Math.atan2;
    var PI = Math.PI;
    var eventtypes = [
        'touchstart',
        'touchmove',
        'touchend'
    ];
    function eventTime(e) {
        var ts = e.timeStamp;
        if (ts > 2 * Date.now()) {
            return Math.floor(ts / 1000);
        } else {
            return ts;
        }
    }
    function coordinates(e, t) {
        return Object.freeze({
            screenX: t.screenX,
            screenY: t.screenY,
            clientX: t.clientX,
            clientY: t.clientY,
            timeStamp: eventTime(e)
        });
    }
    function midpoints(e, t1, t2) {
        return Object.freeze({
            screenX: floor((t1.screenX + t2.screenX) / 2),
            screenY: floor((t1.screenY + t2.screenY) / 2),
            clientX: floor((t1.clientX + t2.clientX) / 2),
            clientY: floor((t1.clientY + t2.clientY) / 2),
            timeStamp: eventTime(e)
        });
    }
    function between(c1, c2) {
        var r = GD.THRESHOLD_SMOOTHING;
        return Object.freeze({
            screenX: floor(c1.screenX + r * (c2.screenX - c1.screenX)),
            screenY: floor(c1.screenY + r * (c2.screenY - c1.screenY)),
            clientX: floor(c1.clientX + r * (c2.clientX - c1.clientX)),
            clientY: floor(c1.clientY + r * (c2.clientY - c1.clientY)),
            timeStamp: floor(c1.timeStamp + r * (c2.timeStamp - c1.timeStamp))
        });
    }
    function touchDistance(t1, t2) {
        var dx = t2.screenX - t1.screenX;
        var dy = t2.screenY - t1.screenY;
        return sqrt(dx * dx + dy * dy);
    }
    function touchDirection(t1, t2) {
        return atan2(t2.screenY - t1.screenY, t2.screenX - t1.screenX) * 180 / PI;
    }
    function touchRotation(d1, d2) {
        var angle = d2 - d1;
        if (angle > 180) {
            angle -= 360;
        } else if (angle <= -180) {
            angle += 360;
        }
        return angle;
    }
    function isDoubleTap(lastTap, thisTap) {
        var dx = abs(thisTap.screenX - lastTap.screenX);
        var dy = abs(thisTap.screenY - lastTap.screenY);
        var dt = thisTap.timeStamp - lastTap.timeStamp;
        return dx < GD.DOUBLE_TAP_DISTANCE && dy < GD.DOUBLE_TAP_DISTANCE && dt < GD.DOUBLE_TAP_TIME;
    }
    var initialState = {
        name: 'initialState',
        init: function (d, e, t) {
            d.target = null;
            d.start = d.last = null;
            d.touch1 = d.touch2 = null;
            d.vx = d.vy = null;
            d.startDistance = d.lastDistance = null;
            d.startDirection = d.lastDirection = null;
            d.lastMidpoint = null;
            d.scaled = d.rotated = null;
            if (e && t && e.type === 'touchstart') {
                initialState.touchstart(d, e, t);
            }
        },
        touchstart: function (d, e, t) {
            d.switchTo(touchStartedState, e, t);
        }
    };
    var touchStartedState = {
        name: 'touchStartedState',
        init: function (d, e, t) {
            d.target = e.target;
            d.touch1 = t.identifier;
            d.start = d.last = coordinates(e, t);
            if (d.options.holdEvents) {
                d.startTimer('holdtimeout', GD.HOLD_INTERVAL);
            }
        },
        touchstart: function (d, e, t) {
            d.clearTimer('holdtimeout');
            if (e.touches.length > 1) {
                d.switchTo(transformState, e, t);
            } else {
                console.warn('Ignoring missing touchend event. See bug 1162771.');
                d.switchTo(initialState, e, t);
            }
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            if (abs(t.screenX - d.start.screenX) > d.options.panThreshold || abs(t.screenY - d.start.screenY) > d.options.panThreshold) {
                d.clearTimer('holdtimeout');
                d.switchTo(panStartedState, e, t);
            }
        },
        touchend: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            if (d.lastTap && isDoubleTap(d.lastTap, d.start)) {
                d.emitEvent('tap', d.start);
                d.emitEvent('dbltap', d.start);
                d.lastTap = null;
            } else {
                d.emitEvent('tap', d.start);
                d.lastTap = coordinates(e, t);
            }
            d.clearTimer('holdtimeout');
            d.switchTo(initialState);
        },
        holdtimeout: function (d) {
            d.switchTo(holdState);
        }
    };
    var panStartedState = {
        name: 'panStartedState',
        init: function (d, e, t) {
            d.start = d.last = between(d.start, coordinates(e, t));
            if (e.type === 'touchmove') {
                panStartedState.touchmove(d, e, t);
            }
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            var current = coordinates(e, t);
            d.emitEvent('pan', {
                absolute: {
                    dx: current.screenX - d.start.screenX,
                    dy: current.screenY - d.start.screenY
                },
                relative: {
                    dx: current.screenX - d.last.screenX,
                    dy: current.screenY - d.last.screenY
                },
                position: current
            });
            var dt = current.timeStamp - d.last.timeStamp;
            var vx = (current.screenX - d.last.screenX) / dt;
            var vy = (current.screenY - d.last.screenY) / dt;
            if (d.vx == null) {
                d.vx = vx;
                d.vy = vy;
            } else {
                d.vx = d.vx * GD.VELOCITY_SMOOTHING + vx * (1 - GD.VELOCITY_SMOOTHING);
                d.vy = d.vy * GD.VELOCITY_SMOOTHING + vy * (1 - GD.VELOCITY_SMOOTHING);
            }
            d.last = current;
        },
        touchend: function (d, e, t) {
            if (t.identifier !== d.touch1) {
                return;
            }
            var current = coordinates(e, t);
            var dx = current.screenX - d.start.screenX;
            var dy = current.screenY - d.start.screenY;
            var angle = atan2(dy, dx) * 180 / PI;
            if (angle < 0) {
                angle += 360;
            }
            var direction;
            if (angle >= 315 || angle < 45) {
                direction = 'right';
            } else if (angle >= 45 && angle < 135) {
                direction = 'down';
            } else if (angle >= 135 && angle < 225) {
                direction = 'left';
            } else if (angle >= 225 && angle < 315) {
                direction = 'up';
            }
            d.emitEvent('swipe', {
                start: d.start,
                end: current,
                dx: dx,
                dy: dy,
                dt: e.timeStamp - d.start.timeStamp,
                vx: d.vx,
                vy: d.vy,
                direction: direction,
                angle: angle
            });
            d.switchTo(initialState);
        }
    };
    var holdState = {
        name: 'holdState',
        init: function (d) {
            d.emitEvent('holdstart', d.start);
        },
        touchmove: function (d, e, t) {
            var current = coordinates(e, t);
            d.emitEvent('holdmove', {
                absolute: {
                    dx: current.screenX - d.start.screenX,
                    dy: current.screenY - d.start.screenY
                },
                relative: {
                    dx: current.screenX - d.last.screenX,
                    dy: current.screenY - d.last.screenY
                },
                position: current
            });
            d.last = current;
        },
        touchend: function (d, e, t) {
            var current = coordinates(e, t);
            d.emitEvent('holdend', {
                start: d.start,
                end: current,
                dx: current.screenX - d.start.screenX,
                dy: current.screenY - d.start.screenY
            });
            d.switchTo(initialState);
        }
    };
    var transformState = {
        name: 'transformState',
        init: function (d, e, t) {
            d.touch2 = t.identifier;
            var t1 = e.touches.identifiedTouch(d.touch1);
            var t2 = e.touches.identifiedTouch(d.touch2);
            d.startDistance = d.lastDistance = touchDistance(t1, t2);
            d.startDirection = d.lastDirection = touchDirection(t1, t2);
            d.scaled = d.rotated = false;
        },
        touchmove: function (d, e, t) {
            if (t.identifier !== d.touch1 && t.identifier !== d.touch2) {
                return;
            }
            var t1 = e.touches.identifiedTouch(d.touch1);
            var t2 = e.touches.identifiedTouch(d.touch2);
            var midpoint = midpoints(e, t1, t2);
            var distance = touchDistance(t1, t2);
            var direction = touchDirection(t1, t2);
            var rotation = touchRotation(d.startDirection, direction);
            if (!d.scaled) {
                if (abs(distance - d.startDistance) > GD.SCALE_THRESHOLD) {
                    d.scaled = true;
                    d.startDistance = d.lastDistance = floor(d.startDistance + GD.THRESHOLD_SMOOTHING * (distance - d.startDistance));
                } else {
                    distance = d.startDistance;
                }
            }
            if (!d.rotated) {
                if (abs(rotation) > GD.ROTATE_THRESHOLD) {
                    d.rotated = true;
                } else {
                    direction = d.startDirection;
                }
            }
            if (d.scaled || d.rotated) {
                d.emitEvent('transform', {
                    absolute: {
                        scale: distance / d.startDistance,
                        rotate: touchRotation(d.startDirection, direction)
                    },
                    relative: {
                        scale: distance / d.lastDistance,
                        rotate: touchRotation(d.lastDirection, direction)
                    },
                    midpoint: midpoint
                });
                d.lastDistance = distance;
                d.lastDirection = direction;
                d.lastMidpoint = midpoint;
            }
        },
        touchend: function (d, e, t) {
            if (t.identifier === d.touch2) {
                d.touch2 = null;
            } else if (t.identifier === d.touch1) {
                d.touch1 = d.touch2;
                d.touch2 = null;
            } else {
                return;
            }
            if (d.scaled || d.rotated) {
                d.emitEvent('transformend', {
                    absolute: {
                        scale: d.lastDistance / d.startDistance,
                        rotate: touchRotation(d.startDirection, d.lastDirection)
                    },
                    relative: {
                        scale: 1,
                        rotate: 0
                    },
                    midpoint: d.lastMidpoint
                });
            }
            d.switchTo(afterTransformState);
        }
    };
    var afterTransformState = {
        name: 'afterTransformState',
        touchstart: function (d, e, t) {
            d.switchTo(transformState, e, t);
        },
        touchend: function (d, e, t) {
            if (t.identifier === d.touch1) {
                d.switchTo(initialState);
            }
        }
    };
    return GD;
}();