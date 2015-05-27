let debug = require('debug')('eesec:hacks');

debug('initialize eesec hacks...');

require('./eesec-prowl.es6.js');
require('./eesec-siri.es6.js');

debug('eesec hacks initialized');
