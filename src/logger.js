const winston = require("winston");

var logger = new winston.Logger({
  level: "verbose",
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      timestamp:()=>(new Date().toLocaleTimeString()),
      json: false,
      showLevel: false,
      filename: "migrator-analysis.log"
    })
  ]
});

module.exports = logger;
