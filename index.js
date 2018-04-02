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
  filters: [".git", "node_modules", "bower_components", "build"]
};

let projectPath = argv._[0] || "./";

logger.info(``);
logger.info(`##########################`);
logger.info(`Migrating component...`);
walker = walk.walk(projectPath, walkerOptions);
walker.on("file", function(root, fileStats, next) {
  if (fileStats.name.endsWith(".html")) {
    let filePath = path.join(root, fileStats.name);
    logger.verbose(`-----------`);
    logger.verbose(`Migrating file "${filePath}"`);
    fs.readFile(filePath, "utf8", function(err, data) {
      var migratedComponent = migrator.migrate(data);
      var newFileName = filePath.replace(".html", "_2.html");
      // TODO: check write flag
      fs.writeFile(newFileName, migratedComponent, function(err) {
        if (err) {
          logger.error(err);
        }
        logger.info(`New component saved: ${newFileName}`);
      });

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
  logger.info("Component migration completed");
});
