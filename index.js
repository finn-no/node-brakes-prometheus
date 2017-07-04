const {
    Counter,
    Summary,
    Histogram,
    exponentialBuckets,
} = require('prom-client');

let metrics;

function initializeMetrics() {
    metrics = {
        executeCount: new Counter({
            name: 'breaker_execute_total',
            help: 'Resolver circuit breaker execute count',
            labelNames: ['breaker_name'],
        }),
        successCount: new Counter({
            name: 'breaker_success_total',
            help: 'Resolver circuit breaker success count',
            labelNames: ['breaker_name'],
        }),
        failureCount: new Counter({
            name: 'breaker_failure_total',
            help: 'Resolver circuit breaker failure count',
            labelNames: ['breaker_name'],
        }),
        timeoutCount: new Counter({
            name: 'breaker_timeout_total',
            help: 'Resolver circuit breaker timeout count',
            labelNames: ['breaker_name'],
        }),
        healthCheckFailedCount: new Counter({
            name: 'breaker_reject_total',
            help: 'Resolver circuit breaker reject count',
            labelNames: ['breaker_name'],
        }),
        circuitClosedCount: new Counter({
            name: 'breaker_circuit_closed_total',
            help: 'Resolver circuit breaker circuit closed count',
            labelNames: ['breaker_name'],
        }),
        circuitOpenedCount: new Counter({
            name: 'breaker_circuit_opened_total',
            help: 'Resolver circuit breaker circuit opened count',
            labelNames: ['breaker_name'],
        }),
        durationSummary: new Summary({
            name: 'breaker_duration_seconds',
            help: 'Resolver circuit breaker duration summary',
            labelNames: ['breaker_name'],
            percentiles: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 1],
        }),
        durationBuckets: new Histogram({
            name: 'breaker_duration_buckets_seconds',
            help: 'Resolver circuit breaker duration buckets',
            labelNames: ['breaker_name'],
            buckets: exponentialBuckets(0.001, 1.5, 20)
                .map(f => Math.round(f * 10000) / 10000)
                .concat(Infinity),
        }),
    };
}
function addEventsForStats(breaker) {
    if (metrics == null) {
        initializeMetrics();
    }

    const breakerName = breaker.name;

    const {
        executeCount,
        successCount,
        failureCount,
        timeoutCount,
        durationSummary,
        durationBuckets,
        healthCheckFailedCount,
        circuitClosedCount,
        circuitOpenedCount,
    } = metrics;

    breaker.on('exec', () =>
        executeCount.labels(breakerName).inc(1, Date.now())
    );
    breaker.on('success', duration => {
        // Make duration into seconds
        duration /= 1000;

        successCount.labels(breakerName).inc(1, Date.now());

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('failure', duration => {
        // Make duration into seconds
        duration /= 1000;

        failureCount.labels(breakerName).inc(1, Date.now());

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('timeout', duration => {
        // Make duration into seconds
        duration /= 1000;

        timeoutCount.labels(breakerName).inc(1, Date.now());

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('healthCheckFailed', () =>
        healthCheckFailedCount.labels(breakerName).inc(1, Date.now())
    );
    breaker.on('circuitClosed', () =>
        circuitClosedCount.labels(breakerName).inc(1, Date.now())
    );
    breaker.on('circuitOpen', () =>
        circuitOpenedCount.labels(breakerName).inc(1, Date.now())
    );

    return breaker;
}

module.exports = function() {
    try {
        require.resolve('prom-client');
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log(
                '`prom-client` not available, metrics will not be recorded.'
            );
            return;
        }

        throw e;
    }

    return addEventsForStats.apply(null, Array.from(arguments));
};
