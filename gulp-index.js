var through = require('through2');
var polymer2migrator = require('./index.js');

module.exports = function gulpPlugin() {
	return through.obj(function(file, encoding, callback) {
		if (file.isNull() || file.isDirectory()) {
			this.push(file);
			return callback();
		}

		if (file.isStream()) {
			this.emit('error', new PluginError({
				plugin: 'Polymer2 migrator',
				message: 'Streams are not supported.'
			}));
			return callback();
		}

		if (file.isBuffer()) {
			let sourceHTML = file.contents.toString('utf8');
			let outputHTML = polymer2migrator.migrate(sourceHTML);
			file.contents = new Buffer(outputHTML);
			this.push(file);
			return callback();
		};
	});
}
