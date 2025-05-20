class Interpolator {
    constructor(multyxItem) {
        this.multyxItem = multyxItem;
        this.values = [multyxItem.value];
        this.times = [Date.now()];
        this.function = (values, _) => values[0];

        this.multyxItem.addReadModifier(() => this.getValue(this));
        this.multyxItem.addEditCallback(v => this.addValue(v, this));
    }

    getValue(t) {
        return this.function(t.values, t.times);
    }

    addValue(value, t) {
        if(t.values.length > 6) t.values.pop();
        if(t.times.length > 6) t.times.pop();
        t.values.unshift(value);
        t.times.unshift(Date.now());
    }

    static Lerp(multyxItem) {
        const interpolator = new Interpolator(multyxItem);
        interpolator.function = (values, times) => {
            if(times.length < 2) return values[0];

            const dt0 = Date.now() - times[0];
            const dt1 = Math.min(times[0] - times[1], 1000 / multyxItem.multyx.tps);
            const ratio = Math.min(dt0 / dt1, 1);
            if(isNaN(ratio)) return values[0];

            const value = values[1] * (1 - ratio) + values[0] * ratio;
            return value;
        }
        return interpolator;
    }

    static PredictiveLerp(multyxItem) {
        const interpolator = new Interpolator(multyxItem);
        interpolator.function = (values, times) => {
            if(times.length < 2) return values[0];

            const dt0 = Date.now() - times[0];
            const dt1 = Math.min(times[0] - times[1], 1000 / multyxItem.multyx.tps);
            const ratio = Math.min(dt0 / dt1, 1);
            if(isNaN(ratio)) return values[0];

            const nextPosition = values[0] + (values[0] - values[1]) * ratio;
            const value = values[0] * (1 - ratio) + nextPosition * ratio;
            return value;
        }
        return interpolator;
    }

    static SpeedLerp(multyxItem, changePerSecond) {
        const interpolator = new Interpolator(multyxItem);
        interpolator.function = (values, times) => values[0] + (Date.now() - times[0]) / 1000 * changePerSecond;
        return interpolator;
    }

    static Manual(multyxItem, interpolationFunction) {
        const interpolator = new Interpolator(multyxItem);
        interpolator.function = interpolationFunction;
        return interpolator;
    }
}