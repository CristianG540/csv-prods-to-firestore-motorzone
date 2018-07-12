import { createLogger, format, transports } from 'winston'
require('winston-daily-rotate-file')

export const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      level: 'error'
    }),
    new transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      maxSize: '20m'
    }),
    // colorize the output to the console
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.simple()
      )
    })
  ]
})
