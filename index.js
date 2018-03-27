#!/usr/bin/env node

const argv = require("yargs").argv;
const fs = require("fs");
var walk = require("walk");
var path = require("path");
const migrator = require("./src/migrator.js");

var walker;

options = {
  followLinks: false,
  // directories with these keys will be skipped
  filters: [".git", "node_modules", "bower_components", "build"]
};

let projectPath = argv._[0] || "./";

walker = walk.walk(projectPath, options);

walker.on("file", function(root, fileStats, next) {
  if (fileStats.name.endsWith(".html")) {
	  let filePath = path.join(root, fileStats.name);
    fs.readFile(filePath, "utf8", function(err, data) {
      console.log(migrator.migrate(data));
      next();
    });
  } else {
    next();
  }
});

walker.on("errors", function(root, nodeStatsArray, next) {
  next();
});

walker.on("end", function() {
  console.log("all done");
});
