let debug = require('debug')('eesec:utils');

let request = require('request');

function do_request(url, user, password, cb) {
	let auth = { auth: { user: user, pass: password, sendImmediately: true } };

	request.get(url, auth, (err, res, body) => {
		if(err) { cb(err); return; }

		if(res.statusCode != 200) { cb({ statusCode: res.statusCode, message: body }); return; }

		body = body.replace(/\t/g, ' '); // replace tabs with spaces (otherwise this is an invalid JSON string!)
		cb(undefined, JSON.parse(body));
  	});
};

function mode_to_mode_idx(mode) {
	switch(mode) {
		case 'aus':  return 0;
		case 'an':   return 1;
		case 'home': return 2;
		default:     throw ('unknown mode: ' + mode);
	}
}

export function get_mode(config_eesec, cb) {
	let url = config_eesec.base_url + '/action/panelCondGet';
	do_request(url, config_eesec.user, config_eesec.password, (err, data) => {
		if(err) { cb(err); return; }

		let mode = data.updates.mode_a1;
		switch(mode) {
			case '{AREA_MODE_0}': mode = 'aus';  break;
			case '{AREA_MODE_1}': mode = 'an';   break;
			case '{AREA_MODE_2}': mode = 'home'; break;
		}

		cb(undefined, mode);
	});
};

export function get_latest_image(config_eesec, cb) {
	let url = config_eesec.base_url + '/action/captureEventListGet?max_count=1';
	do_request(url, config_eesec.user, config_eesec.password, (err, data) => {
		if(err) { cb(err); return; }

		if(!data.caprows) { cb(); return; }
		let capture = data.caprows[0];
		if(!capture.files || !capture.files[0]) { cb(); return; }

		let result = {
			timestamp: new Date(parseInt(capture.time, 10) * 1000),
			image_url: capture.files[0]
		};

		cb(undefined, result);
	});
};

export function request_image(config_eesec, sensor_id, cb) {
	let url = config_eesec.base_url + '/action/deviceRequestMedia?id=' + sensor_id;
	do_request(url, config_eesec.user, config_eesec.password, cb);
};

export function set_mode(config_eesec, mode, cb) {
	let mode_idx = mode_to_mode_idx(mode);
	let url = config_eesec.base_url + '/action/panelCondPost?area=1&mode=' + mode_idx;
	do_request(url, config_eesec.user, config_eesec.password, cb);
};


function get_open_sensors(sensors) {
	let violations = sensors.filter((sensor) => {
		return (
			(sensor.type_f === '{D_TYPE_4}')         && // check only window sensors
			(sensor.status !== '{WEB_MSG_DC_CLOSE}')    // only non-closed sensors
		);
	});
	return violations.map((sensor) => { return sensor.name; });
};

function get_sensor_violations(sensors, mode_idx) {
	let violations = sensors.filter((sensor) => {
		return (
			(sensor.type_f === '{D_TYPE_4}')         && // check only window sensors
			(sensor.status !== '{WEB_MSG_DC_CLOSE}') && // only non-closed sensors
			(sensor.resp_mode[mode_idx] !== 0)          // only sensor that get in alarming state for the given mode
		);
	});
	return violations.map((sensor) => { return sensor.name; });
};

function get_sensors(config_eesec, cb) {
	debug('checking sensors...');

	let alarm_get_sensors = '/action/deviceListGet';
	do_request(
		config_eesec.base_url + alarm_get_sensors, config_eesec.user, config_eesec.password,
		(err, data) => {
			if(err) { cb(err); return; }

			let sensors = data.senrows.sort((s1, s2) => { return (s1.zone - s2.zone); });
			cb(undefined, sensors);
		}
	);
};

export function get_full_status(config_eesec, cb) {
	debug('get full status...');

	get_mode(config_eesec, (err1, mode) => {
		get_sensors(config_eesec, (err2, sensors) => {
			if(err1 || err2) { cb(err1 || err2); return; }

			let sensors_open_all  = get_open_sensors(sensors);
			let sensors_open_arm  = get_sensor_violations(sensors, mode_to_mode_idx('an'));
			let sensors_open_home = get_sensor_violations(sensors, mode_to_mode_idx('home'));

			let indent = '\n        ';

			let msg = '';
			msg += 'Status: Alarmanlage ' + mode + '\n';
			msg += '    geöffnete Fenster:'                   + indent + sensors_open_all.join(indent)  + '\n';
			msg += '    Fenster schliessen für Modus "an":'   + indent + sensors_open_arm.join(indent)  + '\n';
			msg += '    Fenster schliessen für Modus "home":' + indent + sensors_open_home.join(indent) + '\n';

			cb(undefined, mode, msg);
		});
	});
};
