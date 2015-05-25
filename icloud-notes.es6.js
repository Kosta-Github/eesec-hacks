let debug = require('debug')('icloud-notes');

let Imap = require('imap');

export default class ICloudNotes {

	constructor(config, handle_cb) {
		this.config    = config;
		this.handle_cb = handle_cb;

		this.config.box  = this.config.box  || 'Notes';
		this.config.host = this.config.host || 'imap.mail.me.com';
		this.config.port = this.config.port || 993;

		this.max_uid = 0; // will be updated in order to only fetch the newest messages

		this.imap = new Imap({
			user:     config.user,
			password: config.password,
			host:     config.host,
			port:     config.port,
			tls:      true
		});

		this.imap.on('ready', ()    => { this.connected(); });
		this.imap.on('mail',  ()    => { this.fetchNewMessages(); });
		this.imap.on('end',   ()    => { this.disconnected(); });
		this.imap.on('error', (err) => { this.throw_on_error(err); });

		debug('connecting: [%s] %s to %s:%s', config.name, config.user, config.host, config.port);
		this.imap.connect();
	}

	connected() {
		debug('connected to server: [%s]', this.config.name);
		this.imap.openBox(this.config.box, false, (err) => {
			this.throw_on_error(err);
			debug('connected to box: [%s] %s', this.config.name, this.config.box);
		});
	}

	fetchNewMessages() {
		debug('checking for new messages: [%s]', this.config.name);

		this.imap.search([[ 'UID', (this.max_uid + 1) + ':*' ]], (err, results) => {
			this.throw_on_error(err);

			for(var i in results) {
				let msg_uid = results[i];
				if(msg_uid > this.max_uid) { this.max_uid = msg_uid; }

				this.fetchMessage(msg_uid);
			}
		});
	}

	fetchMessage(msg_uid) {
		debug('fetching message: [%s] {%s}', this.config.name, msg_uid);

		let f = this.imap.fetch(msg_uid, { bodies: 'HEADER.FIELDS (SUBJECT)' });
		f.on('message', (msg) => {
			msg.on('body', (stream) => {
				let buffer = '';
				stream.on('data', (chunk) => {
					buffer += chunk.toString('utf8');
				});
				stream.on('end', () => {
					let subj = Imap.parseHeader(buffer).subject[0];
					debug('new message: [%s] "%s" {%s}', this.config.name, subj, msg_uid);
					if(this.handle_cb(subj)) {
						this.deleteMessage(msg_uid);
					}
				});
				stream.on('error', (err) => { this.throw_on_error(err); });
			});
		});
		f.on('error', (err) => { this.throw_on_error(err); });
	}

	deleteMessage(msg_id) {
		debug('deleting message: [%s] {%s}', this.config.name, msg_id);
		this.imap.addFlags(msg_id, 'DELETED', (err) => {
			this.throw_on_error(err);
			this.imap.expunge(msg_id, (err) => { this.throw_on_error(err); });
		});
	}

	disconnected() {
		debug('connection ended: [%s]', this.config.name);
		debug('trying to reconnect: [%s]', this.config.name);
		this.imap.connect(); // reconnect
	}

	throw_on_error(err) {
		if(err) {
			debug('***** error: [%s] %s', this.config.name, err);
			throw err;
		}
	} 

}
