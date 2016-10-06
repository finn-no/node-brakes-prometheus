let metrics;

function initializeMetrics () {
    const Counter = require('prom-client/lib/counter');
    const Summary = require('prom-client/lib/summary');
    const Histogram = require('prom-client/lib/histogram');
    const exponentialBuckets = require('prom-client/lib/bucketGenerators').exponentialBuckets;

    metrics = {
        executeCount: new Counter('breaker_execute_total', 'Resolver circuit breaker execute count', ['breaker_name']),
        successCount: new Counter('breaker_success_total', 'Resolver circuit breaker success count', ['breaker_name']),
        failureCount: new Counter('breaker_failure_total', 'Resolver circuit breaker failure count', ['breaker_name']),
        timeoutCount: new Counter('breaker_timeout_total', 'Resolver circuit breaker timeout count', ['breaker_name']),
        healthCheckFailedCount: new Counter('breaker_reject_total', 'Resolver circuit breaker reject count', ['breaker_name']),
        circuitClosedCount: new Counter('breaker_circuit_closed_total', 'Resolver circuit breaker circuit closed count', ['breaker_name']),
        circuitOpenedCount: new Counter('breaker_circuit_opened_total', 'Resolver circuit breaker circuit opened count', ['breaker_name']),
        durationSummary: new Summary('breaker_duration_seconds', 'Resolver circuit breaker duration summary',
            ['breaker_name'], { percentiles: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 1] }),
        durationBuckets: new Histogram('breaker_duration_buckets_seconds', 'Resolver circuit breaker duration buckets',
            ['breaker_name'], {
                buckets: exponentialBuckets(1, 1.5, 20)
                    .map(f => Math.round(f * 10) / 10)
                    .concat(Infinity),
            }),
    };
}
function addEventsForStats (breaker) {
    if (metrics == null) {
        initializeMetrics();
    }

    const breakerName = breaker.name;

    const {
        executeCount, successCount, failureCount,
        timeoutCount, durationSummary, durationBuckets,
        healthCheckFailedCount, circuitClosedCount, circuitOpenedCount,
    } = metrics;

    breaker.on('exec', () => executeCount.labels(breakerName).inc());
    breaker.on('success', duration => {
        // Make duration into seconds
        duration /= 1000;
        successCount.labels(breakerName).inc();
        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('failure', duration => {
        // Make duration into seconds
        duration /= 1000;
        failureCount.labels(breakerName).inc();
        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('timeout', duration => {
        // Make duration into seconds
        duration /= 1000;
        timeoutCount.labels(breakerName).inc();
        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('healthCheckFailed', () => healthCheckFailedCount.labels(breakerName).inc());
    breaker.on('circuitClosed', () => circuitClosedCount.labels(breakerName).inc());
    breaker.on('circuitOpen', () => circuitOpenedCount.labels(breakerName).inc());
}

export default (...args) => {
    try {
        require.resolve('prom-client');
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('`prom-client` not available, metrics will not be recorded.');
            return;
        }

        throw e;
    }

    return addEventsForStats(...args);
};
