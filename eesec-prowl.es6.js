let debug = require('debug')('eesec:prowl');

let request = require('request');

import * as EesecUtils from './eesec-utils.es6.js';

let config_alarm = require('./config_alarm.js');
// let config_alarm = {
//     base_url: 'http://eesec',  // EESec hostname (in the local network)
//     user:     'EESec user',    // EESec username
//     password: 'EESec password' // EESec password
// };
// module.exports = config_alarm;

let config_prowl = require('./config_siri.js');
// let config_prowl = [
//     {
//         prowl_apikey: 'abcedfghijklmnopqrstuvwxyz0123456789' // prowl API key from this page: https://www.prowlapp.com/api_settings.php
//     },
//     {
//         prowl_apikey: 'abcedfghijklmnopqrstuvwxyz0123456789' // prowl API key from this page: https://www.prowlapp.com/api_settings.php
//     }
// ];
// module.exports = config_prowl;

const prowl_url = 'https://api.prowlapp.com/publicapi/add';

const check_interval = 15; // in seconds

let collect_apikeys = (config_prowl) => {
	let keys = config_prowl.map((c) => { return c.prowl_apikey; });
	return keys.join(',');
};

let last_mode = undefined;

let check_status = () => {
	EesecUtils.get_full_status(config_alarm, (err, mode, msg) => {
		if(err) { debug('***** error: %s', err); return; }

		debug('status: %s', mode);

		if(last_mode && (last_mode !== mode)) {
			let desc = '';
			desc += 'mode changed from "' + last_mode + '" to "' + mode + '"\n';
			desc += msg;
			debug(desc);

			let prowl_params = {
				apikey:      collect_apikeys(config_prowl),
				priority:    1,
				url:         '',
				application: 'EESec',
				event:       'Status: Alarmanlage ' + mode,
				description: desc
			};

			request.post(prowl_url, { form: prowl_params });
		}
		last_mode = mode;
	});
};

setInterval(check_status, check_interval * 1000);
