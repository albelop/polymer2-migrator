#!/usr/bin/env node

const argv = require("yargs").argv;
const fs = require("fs");
var walk = require("walk");
var path = require("path");
const logger = require("./src/logger.js");
const migrator = require("./src/migrator.js");

var walker;

var walkerOptions = {
  followLinks: false,
  filters: [".git", "node_modules", "bower_components", "build","test","coverage"]
};



let projectPath = argv._[0] || "./";
let analyze = argv.analyze || false;
let logLevel = argv.logLevel || 'info';

logger.transports.console.level = logLevel;

logger.info(`Migrating component...`);
walker = walk.walk(projectPath, walkerOptions);
walker.on("file", function(root, fileStats, next) {
  if (fileStats.name.endsWith(".html")) {
    let filePath = path.join(root, fileStats.name);
    logger.verbose(`-----------`);
    logger.verbose(`Migrating file "${filePath}"`);
    fs.readFile(filePath, "utf8", function(err, data) {
      var migratedComponent = migrator.migrate(data);
      logger.verbose(`Finished migrating file "${filePath}"`);
      if (!analyze) {
        fs.writeFile(filePath, migratedComponent, function(err) {
          if (err) {
            logger.error(err);
          }
        });
      }
      next();
    });
  } else {
    next();
  }
});

walker.on("errors", function(root, nodeStatsArray, next) {
  logger.error("Error reading file.");
  next();
});

walker.on("end", function() {
  logger.verbose(`-----------`);
  logger.info("Component migration completed");
});
