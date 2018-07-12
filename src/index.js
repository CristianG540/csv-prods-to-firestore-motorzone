// modulos
import { Tools } from './modules/utils'
import { env } from './modules/env'
import { ProductsHelper } from './modules/productsHelper'

// Libs terceros
import { createLogger, format, transports } from 'winston'
import Papa from 'papaparse'
import Promise from 'bluebird'
const exec = Promise.promisify(require('child_process').exec)
const fs = require('fs')
Promise.promisifyAll(fs)
require('winston-daily-rotate-file')

/* *********************************** Configuraciones Logger *************************************** */

// Create the log directory if it does not exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs')
}

const logger = createLogger({
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
/* *********************************** Fin configuraciones Logger *************************************** */

const prods = new ProductsHelper(logger)

async function updateProds () {
  /*
  * Con este comando uso git diff y un pequeño script one liner en perl
  * para comparar los archivos csv con los productos
  * la primera vez que se comparan, el archivo "oldProds.csv" es igual al csv con los
  * productos actual, despues de la comparacion el archivo "oldProds.csv" se
  * convierte en una copia del csv con los productos, asi en la sgte comparacion se puede
  * saber que productos han cambiado
  */
  const cmdLine = `git diff --no-index --color=always old-files/oldProds.csv ${env.prods_sap_file} |perl -wlne 'print $1 if /^\\e\\[32m\\+\\e\\[m\\e\\[32m(.*)\\e\\[m$/' > onlyModifiedProds.csv`
  await exec(cmdLine)

  /*
  * Como el resultado del comando anterior no me trae el encabezado del csv entonces
  * lo agrego con las sgtes lineas
  */
  let fileData = 'codigo;descripcion;precio1;cantInventario;_delete\n'
  fileData += await fs.readFileAsync('onlyModifiedProds.csv', 'utf8')
  await fs.writeFileAsync('onlyModifiedProds.csv', fileData)

  try {
    let fileStream = fs.createReadStream('onlyModifiedProds.csv') // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
    Papa.parse(fileStream, {
      header: true,
      skipEmptyLines: true,
      complete: csvParsed => {
        logger.info(`cantidad prods modificados: ${csvParsed.data.length}`)
        prods.parseAndUploadProds(csvParsed.data)
        fileStream.destroy()
      },
      error: err => {
        logger.error('Puto error parseando onlyModifiedProds.csv', err)
        fileStream.destroy()
      }
    })
  } catch (err) {
    logger.error('error al refrescar old-files/oldProds.csv', err)
  }
}

Tools.setIntervalPlus(360, () => {
  updateProds()
})
