let debug = require('debug')('eesec:siri');

let request = require('request');

import SiriNotes from './siri-notes.es6.js';

let config_siri = require('./config_siri.js');
// let config_siri = [
//     {
//         name:     'User #1',                      // display name for logging
//         user:     'my_icloud_login_1@icloud.com', // iCloud login
//         password: 'my_icloud_password_1'          // iCloud password
//     },
//     {
//         name:     'User #2',                      // display name for logging
//         user:     'my_icloud_login_2@icloud.com', // iCloud login
//         password: 'my_icloud_password_2'          // iCloud password
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

let do_request = (name, url, user, password) => {
	debug('using URL: [%s] %s', name, url);
	let auth = { auth: { user: user, pass: password, sendImmediately: true } };

	request.get(url, auth, (err, res, body) => {
		if(err) { debug('***** error: %s', err); return; }
		debug('URL response: [%s] {%s} %s', name, res.statusCode, body);
  	});
};

let handleMessage = (msg, user_config, config_alarm) => {
	msg = msg.toLowerCase();
	debug('message received: [%s] %s', user_config.name, msg);

	let keyword = 'alarmanlage ';
	if(!msg.startsWith(keyword)) { return; }
	let mode = msg.replace(keyword, '');
	debug('switch to mode: [%s] %s', user_config.name, mode);

	let url = config_alarm.base_url + '/action/panelCondPost?area=1&mode=';
	switch(mode) {
		case 'aus':  url += '0'; break;
		case 'an':   url += '1'; break;
		case 'home': url += '2'; break;
		default:     debug('***** no matching mode found: [%s] %s', user_config.name, mode); return;
	}

	do_request(user_config.name, url, config_alarm.user, config_alarm.password);

	return true;
}

let connections = config_siri.map((user_config) => {
	return new SiriNotes(user_config, (msg) => { return handleMessage(msg, user_config, config_alarm); });
});
