let debug = require('debug')('siri-eesec');

let request = require('request');

import ICloudNotes from './icloud-notes.es6.js';

let user_configs = require('./user_configs.js');
// let user_configs = [
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
// module.exports = user_configs;

let alarm_config = require('./alarm_config.js');
// let alarm_config = {
//     base_url: 'http://eesec',  // EESec hostname (in the local network)
//     user:     'EESec user',    // EESec username
//     password: 'EESec password' // EESec password
// };
// module.exports = alarm_config;

let do_request = (name, url, user, password) => {
	debug('using URL: [%s] %s', name, url);
	let auth = { auth: { user: user, pass: password } };

	request.get(url, auth, (err, res, body) => {
		if(err) { debug('***** error: %s', err); return; }
		debug('URL response: [%s] {%s} %s', name, res.statusCode, body);
  	});
};

let handleMessage = (msg, user_config, alarm_config) => {
	msg = msg.toLowerCase();
	debug('message received: [%s] %s', user_config.name, msg);

	let keyword = 'alarmanlage ';
	if(!msg.startsWith(keyword)) { return; }
	let mode = msg.replace(keyword, '');
	debug('switch to mode: [%s] %s', user_config.name, mode);

	let url = alarm_config.base_url + '/action/panelCondPost?area=1&mode=';
	switch(mode) {
		case 'aus':  url += '0'; break;
		case 'an':   url += '1'; break;
		case 'home': url += '2'; break;
		default:     debug('***** no matching mode found: [%s] %s', user_config.name, mode); return;
	}

	do_request(user_config.name, url, alarm_config.user, alarm_config.password);

	return true;
}

let connections = user_configs.map((user_config) => {
	return new ICloudNotes(user_config, (msg) => { return handleMessage(msg, user_config, alarm_config); });
});
