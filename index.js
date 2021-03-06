#!/usr/bin/env node

const argv = require("yargs").argv;
const fs = require("fs");
const walk = require("walk");
const path = require("path");
const logger = require("./src/logger.js");
const migrator = require("./src/migrator.js");

const sources = !!argv._.length ? argv._ : ["./"];
const analysis = argv.analysis || false;
logger.transports.console.level = argv['log-level'] || "info";

const walkerOptions = {
  followLinks: false,
  filters: [
    ".git",
    "node_modules",
    "bower_components",
    "build",
    "test",
    "coverage"
  ]
};

const migrateFile = (filePath, next) => {
  if (filePath.endsWith(".html")) {
    logger.verbose(`-----------`);
    logger.info(`Migrating file "${filePath}"`);
    fs.readFile(filePath, "utf8", function(err, data) {
      var migratedComponent = migrator.migrate(data);
      logger.debug(migratedComponent);
      logger.info(`Finished migrating file "${filePath}"`);
      if (!analysis) {
        fs.writeFile(filePath, migratedComponent, function(err) {
          if (err) {
            logger.error(err);
          }
        });
      }
      if (!!next) next();
    });
  } else if (!!next) {
    next();
  }
};

sources.map(projectPath => {
  if (fs.lstatSync(projectPath).isDirectory()) {
    logger.info(`Migrating component...`);
    let walker;
    walker = walk.walk(projectPath, walkerOptions);

    walker.on("file", function(root, fileStats, next) {
      let filePath = path.join(root, fileStats.name);

      migrateFile(filePath, next);
    });

    walker.on("errors", function(root, nodeStatsArray, next) {
      logger.error("Error reading file.");
      next();
    });

    walker.on("end", function() {
      logger.verbose(`-----------`);
      logger.info("Component migration completed");
    });
  } else {
    migrateFile(projectPath);
  }
});
