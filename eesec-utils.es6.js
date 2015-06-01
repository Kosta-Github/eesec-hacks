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

export function get_mode(config_alarm, cb) {
	let url = config_alarm.base_url + '/action/panelCondGet';
	do_request(url, config_alarm.user, config_alarm.password, (err, data) => {
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

export function set_mode(config_alarm, mode, cb) {
	let mode_idx = mode_to_mode_idx(mode);
	let url = config_alarm.base_url + '/action/panelCondPost?area=1&mode=' + mode_idx;
	do_request(url, config_alarm.user, config_alarm.password, cb);
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

export function check_sensors(config_alarm, mode, cb) {
	debug('checking sensors...');

	let alarm_get_sensors = '/action/deviceListGet';
	do_request(
		config_alarm.base_url + alarm_get_sensors, config_alarm.user, config_alarm.password,
		(err, data) => {
			if(err) { cb(err); return; }

			let sensors = data.senrows.sort((s1, s2) => { return (s1.zone - s2.zone); })
			sensors = (mode ? get_sensor_violations(sensors, mode_to_mode_idx(mode)) : get_open_sensors(sensors));
			cb(undefined, sensors);
		}
	);
};
