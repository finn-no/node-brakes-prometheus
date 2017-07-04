import test from 'ava';
import requireUncached from 'require-uncached';
import Brakes from 'brakes';
import { register } from 'prom-client';

const origNow = Date.now;

test.beforeEach(t => {
    t.context.module = requireUncached('../');
    Date.now = () => 1494222986972;
    register.clear();
});

test.after.always(() => {
    Date.now = origNow;
    register.clear();
});

test.serial('add metrics on new brakes', t => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    t.true(register.getMetricsAsJSON().length === 0);

    t.context.module(brake);

    t.true(register.getMetricsAsJSON().length === 9);

    brake.destroy();
});

test.serial('listen to execution', async t => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    t.context.module(brake);

    t.deepEqual(register.getMetricsAsJSON()[0].values, []);

    await brake.exec();

    t.deepEqual(register.getMetricsAsJSON()[0].values, [
        {
            value: 1,
            // eslint-disable-next-line camelcase
            labels: { breaker_name: 'some-name' },
            timestamp: 1494222986972,
        },
    ]);

    brake.destroy();
});

test.serial('record timings in seconds', async t => {
    Date.now = origNow;
    const brake = new Brakes(
        () => new Promise(resolve => setTimeout(resolve, 250)),
        { name: 'some-name' }
    );

    t.context.module(brake);

    t.deepEqual(register.getMetricsAsJSON()[0].values, []);

    await brake.exec();

    const durationSum = register.getMetricsAsJSON()[7].values[9].value;
    t.true(durationSum >= 0.25 && durationSum < 0.275);

    brake.destroy();
});

test.serial('handle failure', async t => {
    const brake = new Brakes(() => Promise.reject(new Error('test')), {
        name: 'some-name',
    });

    t.context.module(brake);

    t.deepEqual(register.getMetricsAsJSON()[0].values, []);

    try {
        await brake.exec();
    } catch (e) {
        // ignored
    }

    const execs = register.getMetricsAsJSON()[0].values[0].value;
    const successes = register.getMetricsAsJSON()[1].values;
    const failures = register.getMetricsAsJSON()[2].values[0].value;
    const timeouts = register.getMetricsAsJSON()[3].values;

    t.true(execs === 1);
    t.true(successes.length === 0);
    t.true(failures === 1);
    t.true(timeouts.length === 0);

    brake.destroy();
});

test.serial('handle timeouts', async t => {
    const brake = new Brakes(
        () => new Promise(resolve => setTimeout(resolve, 250)),
        { name: 'some-name', timeout: 50 }
    );

    t.context.module(brake);

    t.deepEqual(register.getMetricsAsJSON()[0].values, []);

    try {
        await brake.exec();
    } catch (e) {
        // ignored
    }

    const execs = register.getMetricsAsJSON()[0].values[0].value;
    const successes = register.getMetricsAsJSON()[1].values;
    const failures = register.getMetricsAsJSON()[2].values;
    const timeouts = register.getMetricsAsJSON()[3].values[0].value;

    t.true(execs === 1);
    t.true(successes.length === 0);
    t.true(failures.length === 0);
    t.true(timeouts === 1);

    brake.destroy();
});

test.serial('return input', t => {
    const brake = new Brakes(() => Promise.resolve(), { name: 'some-name' });

    t.true(t.context.module(brake) === brake);

    brake.destroy();
});
