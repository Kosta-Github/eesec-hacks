let debug = require('debug')('eesec:siri');

let request = require('request');

import SiriNotes from './siri-notes.es6.js';
import * as EesecUtils from './eesec-utils.es6.js';

let config_siri = require('./config_siri.js');
// let config_siri = [
//     {
//         name:         'User #1',                             // required: display name for logging
//         user:         'my_icloud_login_1@icloud.com',        // required: iCloud login
//         password:     'my_icloud_password_1',                // required: iCloud password
//         prowl_apikey: 'abcedfghijklmnopqrstuvwxyz0123456789' // optional: prowl API key from this page: https://www.prowlapp.com/api_settings.php
//     },
//     {
//         name:         'User #2',                             // required: display name for logging
//         user:         'my_icloud_login_2@icloud.com',        // required: iCloud login
//         password:     'my_icloud_password_2',                // required: iCloud password
//         prowl_apikey: 'abcedfghijklmnopqrstuvwxyz0123456789' // optional: prowl API key from this page: https://www.prowlapp.com/api_settings.php
//     }
// ];
// module.exports = config_siri;

let config_eesec = require('./config_eesec.js');
// let config_eesec = {
//     base_url: 'http://eesec',  // EESec hostname (in the local network)
//     user:     'EESec user',    // EESec username
//     password: 'EESec password' // EESec password
// };
// module.exports = config_eesec;

const prowl_url = 'https://api.prowlapp.com/publicapi/add';

let switchMode = (msg, config_user, config_eesec) => {
	let mode = undefined;
	switch(msg) {
		case 'alarmanlage aus':  mode = 'aus';  break;
		case 'alarmanlage an':   mode = 'an';   break;
		case 'alarmanlage home': mode = 'home'; break;
		default:                 return;
	}

	debug('switch to mode: [%s] Alarmanlage %s', config_user.name, mode);
	EesecUtils.set_mode(config_eesec, mode, (err, data) => {
		if(err) { debug('***** error: [%s] %s', config_user.name, err); return; }
		debug('URL response: [%s] %s', config_user.name, JSON.stringify(data));
		if(data.result === 0) {
			debug('retrying a second time: [%s]', config_user.name);
			EesecUtils.set_mode(config_eesec, mode, (err, data) => {
				if(err) { debug('***** error: [%s] %s', config_user.name, err); return; }
				debug('second URL response: [%s] %s', config_user.name, JSON.stringify(data));
			});
		}
	});

	return true;
}

let checkMode = (msg, config_user, config_eesec) => {
	if(msg !== 'alarmanlage status') { return; }

	debug('checking status: [%s]', config_user.name);
	EesecUtils.get_full_status(config_eesec, (err, mode, msg) => {
		if(err) { debug('***** error: [%s] %s', config_user.name, err); return; }
		debug('Status:\n%s', msg);

		if(config_user.prowl_apikey) {
			let prowl_params = {
				apikey:      config_user.prowl_apikey,
				priority:    0,
				url:         '',
				application: 'EESec',
				event:       'Status: Alarmanlage ' + mode,
				description: msg
			};

			request.post(prowl_url, { form: prowl_params });
		}
	});

	return true;
}

let requestImage = (msg, config_user, config_eesec) => {
	if(msg !== 'wer ist an der tür') { return; }

	debug('requesting new image: [%s]', config_user.name);
	EesecUtils.request_image(config_eesec, config_eesec.camera_id, (err, mode, msg) => {
		if(err) { debug('***** error: [%s] %s', config_user.name, err); return; }
	});

	return true;
}

let handleMessage = (msg, user_config, config_eesec) => {
	msg = msg.toLowerCase();
	debug('handling message: [%s] %s', user_config.name, msg);

	if(switchMode(  msg, user_config, config_eesec)) { return true; }
	if(checkMode(   msg, user_config, config_eesec)) { return true; }
	if(requestImage(msg, user_config, config_eesec)) { return true; }

	debug('***** no handler found for message: [%s] %s', user_config.name, msg); return;
}

let connections = config_siri.map((user_config) => {
	return new SiriNotes(user_config, (msg) => {
		return handleMessage(msg, user_config, config_eesec);
	});
});
