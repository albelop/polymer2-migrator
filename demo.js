const argv = require('yargs').argv;
const fs = require('fs');
const migrator = require('./index.js');

const inputFile = argv.file;
console.log('Reading file...')
fs.readFile(inputFile, 'utf8', function(err, html) {
	if (!err) {
		console.log('Migrating component...')
		const migratedHtml = migrator.migrateFile(html);
		fs.writeFile('./output/' + inputFile, migratedHtml, 'utf8', function(err) {
			if (!err) {
				console.log('File succesfully migrated.')
			}
		});
	}
});
