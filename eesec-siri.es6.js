let debug = require('debug')('eesec:siri');

let request = require('request');

import SiriNotes from './siri-notes.es6.js';

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

let config_alarm = require('./config_alarm.js');
// let config_alarm = {
//     base_url: 'http://eesec',  // EESec hostname (in the local network)
//     user:     'EESec user',    // EESec username
//     password: 'EESec password' // EESec password
// };
// module.exports = config_alarm;

const prowl_url = 'https://api.prowlapp.com/publicapi/add';

let do_request = (url, user, password, cb) => {
	let auth = { auth: { user: user, pass: password, sendImmediately: true } };

	request.get(url, auth, (err, res, body) => {
		if(err) { cb(err); return; }

		if(res.statusCode != 200) { cb({ statusCode: res.statusCode, message: body }); return; }

		body = body.replace(/\t/g, ' '); // replace tabs with spaces (otherwise this is an invalid JSON string!)
		cb(undefined, JSON.parse(body));
  	});
};

let switchMode = (msg, user_config, config_alarm) => {
	let url = config_alarm.base_url + '/action/panelCondPost?area=1&mode=';
	switch(msg) {
		case 'alarmanlage aus':  url += '0'; break;
		case 'alarmanlage an':   url += '1'; break;
		case 'alarmanlage home': url += '2'; break;
		default:                 return;
	}

	debug('switch to mode: [%s] %s', user_config.name, msg);
	do_request(url, config_alarm.user, config_alarm.password, (err, data) => {
		if(err) {
			debug('***** error: [%s]\n\t%s\n\t%s', user_config.name, url, err);
		} else {
			debug('URL response: [%s]\n\t%s\n\t%s', user_config.name, url, JSON.stringify(data));
		}
	});

	return true;
}

let checkMode = (msg, user_config, config_alarm) => {
	if(msg !== 'alarmanlage status') { return; }

	debug('checking status: [%s]', user_config.name);

	let url = config_alarm.base_url + '/action/panelCondGet';
	do_request(url, config_alarm.user, config_alarm.password, (err, data) => {
		if(err) { debug('***** error: [%s]\n\t%s\n\t%s', user_config.name, url, err); return; }

		let mode = data.updates.mode_a1;
		switch(mode) {
			case '{AREA_MODE_0}': mode = 'aus';  break;
			case '{AREA_MODE_1}': mode = 'an';   break;
			case '{AREA_MODE_2}': mode = 'home'; break;
		}
		debug('status: [%s] alarmanlage %s', user_config.name, mode);

		if(user_config.prowl_apikey) {
			let prowl_params = {
				apikey:      user_config.prowl_apikey,
				priority:    0,
				url:         '',
				application: 'EESec',
				event:       'Status: Alarmanlage ' + mode,
				description: 'Status: Alarmanlage ' + mode
			};

			request.post(prowl_url, { form: prowl_params });
		}
	});

	return true;
}

let handleMessage = (msg, user_config, config_alarm) => {
	msg = msg.toLowerCase();
	debug('handling message: [%s] %s', user_config.name, msg);

	if(switchMode(msg, user_config, config_alarm)) { return true; }
	if(checkMode( msg, user_config, config_alarm)) { return true; }

	debug('***** no handler found for message: [%s] %s', user_config.name, msg); return;
}

let connections = config_siri.map((user_config) => {
	return new SiriNotes(user_config, (msg) => {
		return handleMessage(msg, user_config, config_alarm);
	});
});
