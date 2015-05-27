let debug = require('debug')('eesec:prowl');

let request = require('request');

let config_alarm = require('./config_alarm.js');
// let config_alarm = {
//     base_url: 'http://eesec',  // EESec hostname (in the local network)
//     user:     'EESec user',    // EESec username
//     password: 'EESec password' // EESec password
// };
// module.exports = config_alarm;

let config_prowl = require('./config_prowl.js');
// let config_prowl = {
//     apikey: 'abcedfghijklmnopqrstuvwxyz0123456789' // prowl API key from this page: https://www.prowlapp.com/api_settings.php
// };
// module.exports = config_prowl;

const max_log_count = 100;
const check_interval = 15; // in seconds

const alarm_get_logs = '/action/logsGet?max_count=' + max_log_count;

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


let last_mode = 'Alarmanlage aus';

let check_status = () => {
	debug('checking status...');

	do_request(
		config_alarm.base_url + alarm_get_logs, config_alarm.user, config_alarm.password,
		(err, data) => {
			if(err) { debug('***** error: %s', JSON.stringify(err)); throw err; }

			for(var i in data.logrows) {
				let row = data.logrows[i];
				if(row.action === '{LOG_MSG_MODE_CHANGED}') {
			        let mode = row.mode, prio = 0;
			        switch(mode) {
						case '{AREA_MODE_0}': mode = 'Alarmanlage aus';  prio = 2; break;
						case '{AREA_MODE_1}': mode = 'Alarmanlage an';   prio = 1; break;
						case '{AREA_MODE_2}': mode = 'Alarmanlage home'; prio = 1; break;
			        }
					if(last_mode !== mode) {
						let desc = 'mode changed from "' + last_mode + '" to "' + mode + '"';
						debug(desc);
						last_mode = mode;

						let prowl_params = {
							apikey:      config_prowl.apikey,
							priority:    prio,
							url:         '',
							application: 'EESec',
							event:       mode,
							description: desc
						};

						request.post(prowl_url, { form: prowl_params });
					}

					break;
			    }
			}
		}
	);
};

setInterval(check_status, check_interval * 1000);
