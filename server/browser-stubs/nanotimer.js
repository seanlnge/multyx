// Browser-compatible version of nanotimer
// Uses performance.now() instead of process.hrtime()

function BrowserNanoTimer(logging) {
    this.logging = logging || false;
    this.intervalT1 = null;
    this.timeOutT1 = null;
    this.intervalCount = 1;
    this.deferredInterval = false;
    this.deferredTimeout = false;
    this.deferredTimeoutRef = null;
    this.deferredIntervalRef = null;
    this.timeoutCallbackRef = null;
    this.intervalCallbackRef = null;
    this.timeoutImmediateRef = null;
    this.intervalImmediateRef = null;
    this.intervalErrorChecked = false;
    this.intervalType = '';
    this.timeoutTriggered = false;
}

BrowserNanoTimer.prototype.time = function(task, args, unit, callback) {
    const start = performance.now();
    
    if (!callback) {
        if (args) task.apply(null, args);
        else task();
        
        const elapsed = performance.now() - start;
        const converted = this._convertTime(elapsed, unit);
        return converted;
    } else {
        const self = this;
        const wrappedCallback = function() {
            const elapsed = performance.now() - start;
            const converted = self._convertTime(elapsed, unit);
            callback(converted);
        };
        
        if (args) {
            args.push(wrappedCallback);
            task.apply(null, args);
        } else {
            task(wrappedCallback);
        }
    }
};

BrowserNanoTimer.prototype._convertTime = function(milliseconds, unit) {
    switch(unit) {
        case 's': return milliseconds / 1000;
        case 'm': return milliseconds;
        case 'u': return milliseconds * 1000;
        case 'n': return milliseconds * 1000000;
        default: return milliseconds;
    }
};

BrowserNanoTimer.prototype.setInterval = function(task, args, interval, callback) {
    if (!this.intervalErrorChecked) {
        if (!task || typeof task !== 'function') {
            throw new Error('Task argument to setInterval must be a function reference');
        }
        if (!interval || typeof interval !== 'string') {
            throw new Error('Interval argument to setInterval must be a string');
        }
        
        if (callback && typeof callback === 'function') {
            this.intervalCallbackRef = callback;
        }
        
        this.intervalType = interval[interval.length - 1];
        const intervalValue = parseInt(interval.slice(0, -1));
        
        switch(this.intervalType) {
            case 's': this.intervalTime = intervalValue * 1000; break;
            case 'm': this.intervalTime = intervalValue; break;
            case 'u': this.intervalTime = intervalValue / 1000; break;
            case 'n': this.intervalTime = intervalValue / 1000000; break;
            default: throw new Error('Invalid interval format');
        }
        
        this.intervalErrorChecked = true;
    }
    
    const self = this;
    
    if (this.intervalTime > 0) {
        if (this.intervalT1 === null) {
            this.intervalT1 = performance.now();
        }
        
        const elapsed = performance.now() - this.intervalT1;
        const targetTime = this.intervalTime * this.intervalCount;
        
        if (elapsed < targetTime) {
            const remaining = targetTime - elapsed;
            this.intervalImmediateRef = setTimeout(function() {
                self.setInterval(task, args, interval, callback);
            }, remaining);
        } else {
            if (this.logging) {
                console.log('nanotimer log: cycle time at - ' + elapsed);
            }
            
            if (args) task.apply(null, args);
            else task();
            
            this.intervalCount++;
            this.deferredInterval = false;
            this.intervalImmediateRef = setTimeout(function() {
                self.setInterval(task, args, interval, callback);
            }, this.intervalTime);
        }
    } else {
        if (this.intervalT1 === null) {
            this.intervalT1 = performance.now();
        }
        
        if (args) task.apply(null, args);
        else task();
        
        if (this.intervalT1) {
            this.intervalImmediateRef = setTimeout(function() {
                self.setInterval(task, args, interval, callback);
            }, this.intervalTime);
        }
    }
};

BrowserNanoTimer.prototype.setTimeout = function(task, args, delay, callback) {
    if (!task || typeof task !== 'function') {
        throw new Error('Task argument to setTimeout must be a function reference');
    }
    if (!delay || typeof delay !== 'string') {
        throw new Error('Delay argument to setTimeout must be a string');
    }
    
    if (callback && typeof callback === 'function') {
        this.timeoutCallbackRef = callback;
    }
    
    const delayType = delay[delay.length - 1];
    let delayTime;
    
    switch(delayType) {
        case 's': delayTime = parseInt(delay.slice(0, -1)) * 1000; break;
        case 'm': delayTime = parseInt(delay.slice(0, -1)); break;
        case 'u': delayTime = parseInt(delay.slice(0, -1)) / 1000; break;
        case 'n': delayTime = parseInt(delay.slice(0, -1)) / 1000000; break;
        default: throw new Error('Invalid delay format');
    }
    
    const self = this;
    this.timeoutTriggered = false;
    
    if (this.timeOutT1 === null) {
        this.timeOutT1 = performance.now();
    }
    
    const elapsed = performance.now() - this.timeOutT1;
    
    if (elapsed < delayTime) {
        const remaining = delayTime - elapsed;
        this.timeoutImmediateRef = setTimeout(function() {
            self.setTimeout(task, args, delay, callback);
        }, remaining);
    } else {
        this.timeoutTriggered = true;
        this.timeoutImmediateRef = null;
        this.timeOutT1 = null;
        this.deferredTimeout = false;
        
        if (this.logging) {
            console.log('nanotimer log: actual wait - ' + elapsed);
        }
        
        if (args) task.apply(null, args);
        else task();
        
        if (callback) {
            callback({ waitTime: elapsed });
        }
    }
};

BrowserNanoTimer.prototype.clearInterval = function() {
    if (this.deferredIntervalRef) {
        clearTimeout(this.deferredIntervalRef);
        this.deferredInterval = false;
    }
    if (this.intervalImmediateRef) {
        clearTimeout(this.intervalImmediateRef);
    }
    this.intervalT1 = null;
    this.intervalCount = 1;
    this.intervalErrorChecked = false;
    if (this.intervalCallbackRef) {
        this.intervalCallbackRef();
    }
};

BrowserNanoTimer.prototype.clearTimeout = function() {
    if (!this.timeoutTriggered) {
        let waitTime = 0;
        if (this.deferredTimeoutRef) {
            clearTimeout(this.deferredTimeoutRef);
            if (this.timeOutT1) {
                waitTime = performance.now() - this.timeOutT1;
            }
            this.deferredTimeout = false;
        }
        if (this.timeoutImmediateRef) {
            clearTimeout(this.timeoutImmediateRef);
        }
        this.timeOutT1 = null;
        if (this.timeoutCallbackRef) {
            this.timeoutCallbackRef({ waitTime: waitTime });
        }
    }
};

BrowserNanoTimer.prototype.hasTimeout = function() {
    return this.timeOutT1 !== null;
};

module.exports = BrowserNanoTimer;