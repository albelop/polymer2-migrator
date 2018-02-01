const argv = require('yargs').argv;
const fs = require('fs');
const migrator = require('./index.js');

const inputFilePath = argv.file;
const inputFileName = inputFilePath.split('\\').pop();
console.log('Reading file...');
fs.readFile(inputFilePath, 'utf8', function(err, html) {
	if (!err) {
		console.log('Migrating component...')
		const migratedHtml = migrator.migrate(html);
		fs.writeFile('./output/' + inputFileName, migratedHtml, 'utf8', function(err) {
			if (!err) {
				console.log('File succesfully migrated.')
			}else{
				console.error(err);
			}
		});
	}
});
