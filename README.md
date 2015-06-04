EESec hacks
===========

A collection of simple `NodeJS` based services to communicate with an `EESec` via `iOS Siri`.

requirements
============

* an `EESec` within the local LAN
* an `iOS` device with `Siri` support
* `iCloud` enabled for `Notes` so that new `Notes` created via `Siri` get automatically synced with `iCloud`
* in order to receive `push notifications` on your `iOS` device(s) you need to install the `prowl` app and generate a `prowl API key`.

setup
=====

* create a file `config_siri.js` with your `iCloud` credentials and if available your `prowl API key`; see [here](...) for a description about the file structure.
* create a file `config_eesec.js` with your `EESec` credentials; see [here](...) for a description about the file structure.
* install the `babel` `npm` module globally: `npm install -g babel`
* install all other missing `npm` modules: `npm install`
* start the service: `DEBUG="eesec:*" babel-node eesec-hacks.es6.js`

usage
=====

Supported `Siri` commands (in German):

* `Neue Notiz Alarmanlage aus`
* `Neue Notiz Alarmanlage an`
* `Neue Notiz Alarmanlage home`
* `Neue Notiz Alarmanlage status` => delivers current status via `prowl` to your iOS device(s)

And every `EESec mode` change will be automatically reported via a `prowl` push notification within 15 seconds.
