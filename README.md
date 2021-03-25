# brakes-prometheus

> Expose Brakes metrics as Prometheus data

[![NPM Version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]

## Usage

Add event listeners to a [`brakes`][brakes-url] instance, using `prom-client`.
This module has a peer dependency on [`prom-client`][prom-client-url].

```js
import Brake from 'brakes';
import addEventListeners from '@finn-no/brakes-prometheus';
import { register as prometheusRegister } from 'prom-client';

const myBrake = new Brake(() => Promise.resolve(), { name: 'some name' });

addEventListeners(myBrake);

setInterval(() => {
    console.log(prometheusRegister.metrics());
}, 500);
```

## Naming metrics

You can supply an additional options object to set a prefix for the metric
names.

```js
addEventListeners(myBrake, { prefix: 'my_application_prefix_' });

// provides "my_application_prefix_breaker_execute_total" and so on
```

## Metrics exposed

This module exposes 9 metrics, all using the name of the `Brake` as the label:

1.  `breaker_execute_total`, 'Resolver circuit breaker execute count'
    (`Counter`)
2.  `breaker_success_total`, 'Resolver circuit breaker success count'
    (`Counter`)
3.  `breaker_failure_total`, 'Resolver circuit breaker failure count'
    (`Counter`)
4.  `breaker_timeout_total`, 'Resolver circuit breaker timeout count'
    (`Counter`)
5.  `breaker_reject_total`, 'Resolver circuit breaker reject count' (`Counter`)
6.  `breaker_circuit_closed_total`, 'Resolver circuit breaker circuit closed
    count' (`Counter`)
7.  `breaker_circuit_opened_total`, 'Resolver circuit breaker circuit opened
    count' (`Counter`)
8.  `breaker_duration_seconds`: 'Resolver circuit breaker duration summary'
    (`Summary`)
9.  `breaker_duration_buckets_seconds`: 'Resolver circuit breaker duration
    buckets' (`Histogram`)
