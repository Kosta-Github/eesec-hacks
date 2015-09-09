EESec hacks
===========

A collection of simple `NodeJS` based services to communicate with an `EESec` via `iOS Siri`.

Requirements
============

* an `EESec` within the local LAN
* an `iOS` device with `Siri` support
* `iCloud` enabled for `Notes` so that new `Notes` created via `Siri` get automatically synced with `iCloud`
* in order to receive `push notifications` on your `iOS` device(s) you need to install the `prowl` app and generate a `prowl API key`.

Setup
=====

* create a file `config_siri.js` with your `iCloud` credentials and if available your `prowl API key`; see [here](../../blob/master/eesec-siri.es6.js#L9-L23) for a description about the file structure.
* create a file `config_eesec.js` with your `EESec` credentials; see [here](../../blob/master/eesec-siri.es6.js#L26-L31) for a description about the file structure.
* install the `babel` `npm` module globally: `npm install -g babel`
* install all other missing `npm` modules: `npm install`
* start the service: `DEBUG="eesec:*" babel-node eesec-hacks.es6.js`

Usage
=====

Supported `Siri` commands (in German):

* `Neue Notiz Alarmanlage aus`
* `Neue Notiz Alarmanlage an`
* `Neue Notiz Alarmanlage home`
* `Neue Notiz Alarmanlage status` => delivers current status via `prowl` to your iOS device(s)
* `Neue Notiz Wer ist an der Tür` => requests a new image from the camera and delivers it via `prowl`

And every `EESec mode` change and new `EESec image` will be automatically reported via a `prowl` push notification within a timeframe of 15 seconds.

Misc
====

The basic idea about the `Siri` control mechanism via the `iCloud` synced `Notes` is coming from [HcDevel/SiriAPI8](https://github.com/HcDevel/SiriAPI8).
