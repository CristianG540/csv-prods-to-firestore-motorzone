// modulos
import { Tools } from './modules/utils'
import { env } from './modules/env'
import { ProductsHelper } from './modules/products-helper'
import { logger } from './modules/logger-conf'

// Libs terceros
import * as admin from 'firebase-admin'
import Papa from 'papaparse'
import Promise from 'bluebird'
const exec = Promise.promisify(require('child_process').exec)
const fs = require('fs')
Promise.promisifyAll(fs)

console.log('El entorno es:', process.env.NODE_ENV || 'development')

/* *********************************** Configuraciones Logger *************************************** */
// Create the log directory if it does not exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs')
}
/* *********************************** Fin configuraciones Logger *************************************** */

/** *** FIREBASE *****/
// Fetch the service account key JSON file contents
const serviceAccount = require('./../motorzone-efef6-firebase-adminsdk-thfle-d2d5a6b23b.json')
// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
/** *** end FIREBASE *****/

async function updateProds (bd, csvFile) {
  const prods = new ProductsHelper(bd, csvFile, logger, admin.firestore())
  /*
  * Con este comando uso git diff y un pequeño script one liner en perl
  * para comparar los archivos csv con los productos
  * la primera vez que se comparan, el archivo "oldProds.csv" es igual al csv con los
  * productos actual, despues de la comparacion el archivo "oldProds.csv" se
  * convierte en una copia del csv con los productos, asi en la sgte comparacion se puede
  * saber que productos han cambiado
  */
  const cmdLine = `git diff --no-index --color=always old-files/old-${bd}.csv ${csvFile} |perl -wlne 'print $1 if /^\\e\\[32m\\+\\e\\[m\\e\\[32m(.*)\\e\\[m$/' > onlyModifiedProds-${bd}.csv`
  await exec(cmdLine)

  /*
  * Como el resultado del comando anterior no me trae el encabezado del csv entonces
  * lo agrego con las sgtes lineas
  */
  let fileData = 'codigo;descripcion;precio1;cantInventario;descuento;_delete\n'
  fileData += await fs.readFileAsync(`onlyModifiedProds-${bd}.csv`, 'utf8')
  await fs.writeFileAsync(`onlyModifiedProds-${bd}.csv`, fileData)

  try {
    let fileStream = fs.createReadStream(`onlyModifiedProds-${bd}.csv`)
    fileStream.on('err', err => logger.error(`updateProds() - error al leer el puto archivo ${csvFile}`, [err.toString()]))
    Papa.parse(fileStream, {
      header: true,
      skipEmptyLines: true,
      complete: csvParsed => {
        logger.info(`cantidad prods modificados: ${csvParsed.data.length}`)
        prods.parseAndUploadProds(csvParsed.data)
        fileStream.destroy()
      },
      error: err => {
        logger.error(`Puto error parseando onlyModifiedProds-${bd}.csv`, [err.toString()])
        fileStream.destroy()
      }
    })
  } catch (err) {
    logger.error(`error al refrescar old-files/old-${bd}.csv`, [err.toString()])
  }
}

async function lookForDiffs (bd, csvFile) {
  const prods = new ProductsHelper(bd, csvFile, logger, admin.firestore())
  try {
    let fileStream = fs.createReadStream(csvFile) // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
    fileStream.on('err', err => logger.error(`lookForDiffs() - error al leer el puto archivo ${csvFile}`, [err.toString()]))
    Papa.parse(fileStream, {
      header: true,
      complete: csvParsed => {
        prods.checkAndResolve(csvParsed.data)
        fileStream.destroy()
      },
      error: err => {
        logger.error(`Puto error parseando lookForDiffs() -- ${csvFile}`, [err.toString()])
        fileStream.destroy()
      }
    })
  } catch (err) {
    logger.error(`Error desconocido lookForDiffs() -- ${bd}`, [err.toString()])
  }
}

Tools.setIntervalPlus(360, () => {
  updateProds('products', env.prods_sap_file).catch(err => {
    logger.error(`error updateProds() "products"`, [err.toString()])
  })
  updateProds('prods-bogota', env.prods_sap_file_bogota).catch(err => {
    logger.error(`error updateProds() "prods-bogota"`, [err.toString()])
  })
})

Tools.setIntervalPlus(1800, () => {
  lookForDiffs('products', env.prods_sap_file).catch(err => {
    logger.error(`error lookForDiffs() "products"`, [err.toString()])
  })
  lookForDiffs('prods-bogota', env.prods_sap_file_bogota).catch(err => {
    logger.error(`error lookForDiffs() "prods-bogota"`, [err.toString()])
  })
})
