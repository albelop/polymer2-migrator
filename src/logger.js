const winston = require("winston");

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: "info",
      showLevel: false,
    }),
    new winston.transports.File({
      timestamp: () => new Date().toLocaleTimeString(),
      level: "verbose",
      json: false,
      showLevel: false,
      filename: `./migrator-analysis_${Date.now()}.log`
    })
  ]
});

module.exports = logger;
