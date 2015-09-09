let debug = require('debug')('eesec:prowl');

let request = require('request');

import * as EesecUtils from './eesec-utils.es6.js';

let config_eesec = require('./config_eesec.js');
// let config_eesec = {
//     base_url:     'http://eesec',             // EESec hostname (in the local network)
//     user:         'EESec user',               // EESec username
//     password:     'EESec password',           // EESec password
//     external_url: 'http://your-external.ip/', // external base URL the EESec is reachable at
//     camera_id:    'ZS:1234'                   // EESec ID of the camera to use
// };
// module.exports = config_eesec;

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
	EesecUtils.get_full_status(config_eesec, (err, mode, msg) => {
		if(err) { debug('***** error: %s', err); return; }

		debug('status: %s', mode);

		if(last_mode && (last_mode !== mode)) {
			let desc = 'mode changed from "' + last_mode + '" to "' + mode + '"\n' + msg;
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

let last_image_url = undefined;

let check_image = () => {
	EesecUtils.get_latest_image(config_eesec, (err, image) => {
		if(err) { debug('***** error: %s', err); return; }
		if(!image) { return; }

		if(Date.now() - image.timestamp > 60 * 1000) { return; } // image older than 1 minute => ignore it

		if((last_image_url !== image.image_url)) {
			debug('new image:', image.image_url);

			let prowl_params = {
				apikey:      collect_apikeys(config_prowl),
				priority:    1,
				url:         config_eesec.external_url + image.image_url,
				application: 'EESec',
				event:       'new image',
				description: 'new image at: ' + image.timestamp.toISOString()
			};

			request.post(prowl_url, { form: prowl_params });
		}

		last_image_url = image.image_url;
	});
};

setInterval(check_status, check_interval * 1000);

if(config_eesec.external_url) {
	setInterval(check_image, check_interval * 1000);
}
