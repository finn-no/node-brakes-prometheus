# brakes-prometheus

> Expose Brakes metrics as Prometheus data

[![NPM Version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]

[![Greenkeeper badge](https://badges.greenkeeper.io/finn-no/node-brakes-prometheus.svg)](https://greenkeeper.io/)
[![Dependency Status][david-image]][david-url]
[![Peer Dependency Status][david-peer-image]][david-peer-url]
[![Dev Dependency Status][david-dev-image]][david-dev-url]

## Usage

Add event listeners to a [`brakes`][brakes-url] instance, using `prom-client`.
This module has a peer dependency on [`prom-client`][prom-client-url].
Currently, version 10 is supported.

```js
import Brake from 'brakes';
import addEventListeners from 'brakes-prometheus';
import { register as prometheusRegister } from 'prom-client';

const myBrake = new Brake(() => Promise.resolve(), { name: 'some name' });

addEventListeners(myBrake);

setInterval(() => {
    console.log(prometheusRegister.metrics());
}, 500);
```

## Metrics exposed

This module exposes 9 metrics, all using the name of the `Brake` as the label:

1. `breaker_execute_total`, 'Resolver circuit breaker execute count' (`Counter`)
2. `breaker_success_total`, 'Resolver circuit breaker success count' (`Counter`)
3. `breaker_failure_total`, 'Resolver circuit breaker failure count' (`Counter`)
4. `breaker_timeout_total`, 'Resolver circuit breaker timeout count' (`Counter`)
5. `breaker_reject_total`, 'Resolver circuit breaker reject count' (`Counter`)
6. `breaker_circuit_closed_total`, 'Resolver circuit breaker circuit closed
   count' (`Counter`)
7. `breaker_circuit_opened_total`, 'Resolver circuit breaker circuit opened
   count' (`Counter`)
8. `breaker_duration_seconds`: 'Resolver circuit breaker duration summary'
   (`Summary`)
9. `breaker_duration_buckets_seconds`: 'Resolver circuit breaker duration
   buckets' (`Histogram`)

[travis-url]: https://travis-ci.org/finn-no/node-brakes-prometheus
[travis-image]: https://img.shields.io/travis/finn-no/node-brakes-prometheus.svg
[npm-url]: https://npmjs.org/package/brakes-prometheus
[npm-image]: https://img.shields.io/npm/v/brakes-prometheus.svg
[david-url]: https://david-dm.org/finn-no/node-brakes-prometheus
[david-image]: https://img.shields.io/david/finn-no/node-brakes-prometheus.svg
[david-dev-url]: https://david-dm.org/finn-no/node-brakes-prometheus?type=dev
[david-dev-image]: https://img.shields.io/david/dev/finn-no/node-brakes-prometheus.svg
[david-peer-url]: https://david-dm.org/finn-no/node-brakes-prometheus?type=peer
[david-peer-image]: https://img.shields.io/david/peer/finn-no/node-brakes-prometheus.svg
[prom-client-url]: https://github.com/siimon/prom-client
[brakes-url]: https://github.com/awolden/brakes
