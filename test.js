const test = require('ava');
const requireUncached = require('require-uncached');
const Brakes = require('brakes');
const { register } = require('prom-client');

const origNow = Date.now;

test.after.always(() => {
    Date.now = origNow;
    register.clear();
});

test.beforeEach((t) => {
    t.context.module = requireUncached('./');
    Date.now = () => 1494222986972;
    register.clear();
});

test.serial('add metrics on new brakes', async (t) => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    let metrics = await register.getMetricsAsJSON();
    t.true(metrics.length === 0);

    t.context.module(brake);

    metrics = await register.getMetricsAsJSON();
    t.true(metrics.length === 9);

    brake.destroy();
});

test.serial('listen to execution', async (t) => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    t.context.module(brake);

    let metrics = await register.getMetricsAsJSON();
    t.deepEqual(metrics[0].values, []);

    await brake.exec();

    metrics = await register.getMetricsAsJSON();
    t.deepEqual(metrics[0].values, [
        {
            value: 1,
            labels: {
                /* eslint-disable camelcase */
                breaker_name: 'some-name',
                breaker_group: 'defaultBrakeGroup',
                /* eslint-enable */
            },
        },
    ]);

    brake.destroy();
});

test.serial('record timings in seconds', async (t) => {
    Date.now = origNow;
    const brake = new Brakes(
        () => new Promise((resolve) => setTimeout(resolve, 250)),
        { name: 'some-name' }
    );

    t.context.module(brake);
    let metrics = await register.getMetricsAsJSON();
    t.deepEqual(metrics[0].values, []);

    await brake.exec();

    metrics = await register.getMetricsAsJSON();
    const durationSum = metrics[7].values[9].value;
    t.true(durationSum >= 0.25 && durationSum < 0.275);

    brake.destroy();
});

test.serial('handle failure', async (t) => {
    const brake = new Brakes(() => Promise.reject(new Error('test')), {
        name: 'some-name',
    });

    t.context.module(brake);
    let metrics = await register.getMetricsAsJSON();
    t.deepEqual(metrics[0].values, []);

    try {
        await brake.exec();
    } catch (e) {
        // ignored
    }
    metrics = await register.getMetricsAsJSON();
    const execs = metrics[0].values[0].value;
    const successes = metrics[1].values;
    const failures = metrics[2].values[0].value;
    const timeouts = metrics[3].values;

    t.true(execs === 1);
    t.true(successes.length === 0);
    t.true(failures === 1);
    t.true(timeouts.length === 0);

    brake.destroy();
});

test.serial('handle timeouts', async (t) => {
    const brake = new Brakes(
        () => new Promise((resolve) => setTimeout(resolve, 250)),
        { name: 'some-name', timeout: 50 }
    );

    t.context.module(brake);
    let metrics = await register.getMetricsAsJSON();
    t.deepEqual(metrics[0].values, []);

    try {
        await brake.exec();
    } catch (e) {
        // ignored
    }
    metrics = await register.getMetricsAsJSON();

    const execs = metrics[0].values[0].value;
    const successes = metrics[1].values;
    const failures = metrics[2].values;
    const timeouts = metrics[3].values[0].value;

    t.true(execs === 1);
    t.true(successes.length === 0);
    t.true(failures.length === 0);
    t.true(timeouts === 1);

    brake.destroy();
});

test.serial('return input', (t) => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    t.true(t.context.module(brake) === brake);

    brake.destroy();
});

test.serial('options can add a prefix', async (t) => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });
    t.context.module(brake, { prefix: 'some_prefix_' });

    const metrics = await register.getMetricsAsJSON();
    metrics.forEach((metric) => {
        t.true(metric.name.substring(0, 12) === 'some_prefix_');
    });

    brake.destroy();
});
