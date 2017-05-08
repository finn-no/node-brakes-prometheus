let metrics;

function initializeMetrics() {
    const { version } = require('prom-client/package.json');
    let Counter;
    let Summary;
    let Histogram;
    let exponentialBuckets;
    let useTimestamp;

    if (Number(version.split('.')[0]) >= 9) {
        const prom = require('prom-client');
        useTimestamp = true;
        Counter = prom.Counter;
        Summary = prom.Summary;
        Histogram = prom.Histogram;
        exponentialBuckets = prom.exponentialBuckets;
    } else {
        useTimestamp = false;
        Counter = require('prom-client/lib/counter');
        Summary = require('prom-client/lib/summary');
        Histogram = require('prom-client/lib/histogram');
        exponentialBuckets = require('prom-client/lib/bucketGenerators')
            .exponentialBuckets;
    }

    metrics = {
        useTimestamp,
        executeCount: new Counter(
            'breaker_execute_total',
            'Resolver circuit breaker execute count',
            ['breaker_name']
        ),
        successCount: new Counter(
            'breaker_success_total',
            'Resolver circuit breaker success count',
            ['breaker_name']
        ),
        failureCount: new Counter(
            'breaker_failure_total',
            'Resolver circuit breaker failure count',
            ['breaker_name']
        ),
        timeoutCount: new Counter(
            'breaker_timeout_total',
            'Resolver circuit breaker timeout count',
            ['breaker_name']
        ),
        healthCheckFailedCount: new Counter(
            'breaker_reject_total',
            'Resolver circuit breaker reject count',
            ['breaker_name']
        ),
        circuitClosedCount: new Counter(
            'breaker_circuit_closed_total',
            'Resolver circuit breaker circuit closed count',
            ['breaker_name']
        ),
        circuitOpenedCount: new Counter(
            'breaker_circuit_opened_total',
            'Resolver circuit breaker circuit opened count',
            ['breaker_name']
        ),
        durationSummary: new Summary(
            'breaker_duration_seconds',
            'Resolver circuit breaker duration summary',
            ['breaker_name'],
            { percentiles: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 1] }
        ),
        durationBuckets: new Histogram(
            'breaker_duration_buckets_seconds',
            'Resolver circuit breaker duration buckets',
            ['breaker_name'],
            {
                buckets: exponentialBuckets(0.001, 1.5, 20)
                    .map(f => Math.round(f * 10000) / 10000)
                    .concat(Infinity),
            }
        ),
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
        useTimestamp,
    } = metrics;

    breaker.on('exec', () => {
        if (useTimestamp) {
            executeCount.labels(breakerName).inc(1, Date.now());
        } else {
            executeCount.labels(breakerName).inc();
        }
    });
    breaker.on('success', duration => {
        // Make duration into seconds
        duration /= 1000;

        if (useTimestamp) {
            successCount.labels(breakerName).inc(1, Date.now());
        } else {
            successCount.labels(breakerName).inc();
        }

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('failure', duration => {
        // Make duration into seconds
        duration /= 1000;

        if (useTimestamp) {
            failureCount.labels(breakerName).inc(1, Date.now());
        } else {
            failureCount.labels(breakerName).inc();
        }

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('timeout', duration => {
        // Make duration into seconds
        duration /= 1000;

        if (useTimestamp) {
            timeoutCount.labels(breakerName).inc(1, Date.now());
        } else {
            timeoutCount.labels(breakerName).inc();
        }

        durationSummary.labels(breakerName).observe(duration);
        durationBuckets.labels(breakerName).observe(duration);
    });
    breaker.on('healthCheckFailed', () => {
        if (useTimestamp) {
            healthCheckFailedCount.labels(breakerName).inc(1, Date.now());
        } else {
            healthCheckFailedCount.labels(breakerName).inc();
        }
    });
    breaker.on('circuitClosed', () => {
        if (useTimestamp) {
            circuitClosedCount.labels(breakerName).inc(1, Date.now());
        } else {
            circuitClosedCount.labels(breakerName).inc();
        }
    });
    breaker.on('circuitOpen', () => {
        if (useTimestamp) {
            circuitOpenedCount.labels(breakerName).inc(1, Date.now());
        } else {
            circuitOpenedCount.labels(breakerName).inc();
        }
    });

    return breaker;
}

export default (...args) => {
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

    return addEventsForStats(...args);
};
