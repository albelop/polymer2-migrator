//const argv = require('yargs').argv;
const fs = require('fs');
const migrator = require('./index.js');
const git = require('simple-git/promise');

const repoUrl = process.argv[2];
const folderRepo = repoUrl.split('/').pop();

console.log('-----------POLYMER MIGRATOR------------')
console.log('-------------Git Migrator--------------')
console.log(`\n\nCloning repo: ${repoUrl}`)

git().silent(true)
	.clone(repoUrl)
	.then(() => {
		 git(`.\\${folderRepo}`).status().then(status => {
			 console.log(`Repo cloned. Actually in ${status.current} branch.`)
			 git(`.\\${folderRepo}`).checkoutBranch('polymerMigrator', status.current, ()=>{
				 git(`.\\${folderRepo}`).status().then(status => {
					 console.log(`Moved to ${status.current} branch.`)
					 console.log(`---Migrating files---`)
					 dirLooper(`.\\${folderRepo}`);
				 });
			 })
		 });

	})
	.catch((err) => console.error('failed: ', err));

function dirLooper(path){
	if(path.indexOf('.git') === -1) {
	 	console.log(`\nMigrating files from ${path}`);
		fs.readdir(path, (err, files) => {
			files.forEach( file => {
				const pathFile = `${path}\\${file}`;
				fs.statSync(pathFile);
				if(fs.statSync(pathFile).isDirectory())
					dirLooper(pathFile);
				else{
					migrateFile(pathFile, file)
				}
			})
		})
	}
}

function migrateFile (path, file) {
	if(path.indexOf('.html') > -1) {
		console.log(`Reading file ${path}...`);
		fs.readFile(path, 'utf8', function(err, html) {
			if (!err) {
				console.log(`Migrating component ${path}...`)
				const migratedHtml = migrator.migrate(html);
				fs.writeFile(path, migratedHtml, 'utf8', function(err) {
					if (!err) {
						console.log(`File ${path} succesfully migrated.`)
					}else{
						console.error(err);
					}
				});
			}
		});
	}
}
