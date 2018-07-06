// modulos
import { Tools } from './modules/utils'
import { env } from './modules/env'

// Libs terceros
import _ from 'lodash'
import Papa from 'papaparse'
import * as admin from 'firebase-admin'
import Promise from 'bluebird'
const EOL = require('os').EOL
const exec = Promise.promisify(require('child_process').exec)
const fs = require('fs')
Promise.promisifyAll(fs)

/** *** FIREBASE *****/

// Fetch the service account key JSON file contents
const serviceAccount = require('./../motorzone-efef6-firebase-adminsdk-thfle-d2d5a6b23b.json')

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

// As an admin, the app has access to read and write all data, regardless of Security Rules
const firestoreDB = admin.firestore()

/** *** end FIREBASE *****/
/*
const docRef = firestoreDB.collection('users').doc('alovelace')

const setAda = docRef.set({
  first: 'Ada',
  last: 'Lovelace',
  born: 1815
})

setAda
  .then(res => {
    console.log('Funciona esta porqueria putrida', res)
  })
  .catch(err => console.log('No funciona esta basura putrida', err))
*/
/*
const aTuringRef = firestoreDB.collection('users').doc('aturing')
const setAlan = aTuringRef.set({
  'first': 'Alan',
  'middle': 'Mathison',
  'last': 'Turing',
  'born': 1912
})

firestoreDB.collection('users').get()
  .then(snapshot => {
    _.each(snapshot.docs, doc => {
      console.log(doc.id, '=>', doc.data())
    })
  })
  .catch(err => console.log('Error getting documents', err))
*/

async function refreshOldProdsFile () {
  /*
  * Elimino los archivos viejos que hayan en la carpeta de comparacion
  */
  try {
    await exec('rm -r old-files/oldProds.csv')
  } catch (error) {
    await exec(`cp ${env.prods_sap_file} old-files/oldProds.csv`)
  }
  /*
  * Copio el archivo csv con los productos nuevos a la carpeta de comparacion para
  * compararlos la proxima vez que se ejecute el cron
  */
  await exec(`cp ${env.prods_sap_file} old-files/oldProds.csv`)
}

async function updateProds () {
  const cmdLine = `git diff --no-index --color=always old-files/oldProds.csv ${env.prods_sap_file} |perl -wlne 'print $1 if /^\\e\\[32m\\+\\e\\[m\\e\\[32m(.*)\\e\\[m$/' > onlyModifiedProds.csv`
  await exec(cmdLine)

  /*
  * Como el resultado del comando anterior no me trae el encabezado del csv entonces
  * lo agrego con las sgtes lineas
  */
  let fileData = 'codigo;descripcion;precio1;cantInventario;_delete' + EOL
  fileData += await fs.readFileAsync('onlyModifiedProds.csv', 'utf8')
  await fs.writeFileAsync('onlyModifiedProds.csv', fileData)

  try {
    await refreshOldProdsFile()

    let fileStream = fs.createReadStream('onlyModifiedProds.csv') // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
    Papa.parse(fileStream, {
      header: true,
      complete: csvParsed => {
        console.log('los datos del csv de prods:', csvParsed)

        for (const record of csvParsed.data) {
          const tituloApli = record.descripcion.split('.')
          const aplMarca = tituloApli[1] ? tituloApli[1].split('/') : tituloApli[0].split('/')
          const marcaUnd = aplMarca[1] ? aplMarca[1].split('_') : aplMarca[0].split('_')

          // !!!!!!!!!!!!!!!! CONTINUAR AQUI

        }
      },
      error: err => {
        console.error('Puto error parseando onlyModifiedProds.csv', err)
        fileStream.destroy()
      }
    })
  } catch (err) {
    console.error('error al refrescar old-files/oldProds.csv', err)
  }
}

updateProds()

/*
Tools.setIntervalPlus(360, () => {
  let fileStream = fs.createReadStream(env.prods_sap_file) // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
  Papa.parse(fileStream, {
    header: true,
    complete: csvParsed => {
      console.log('los datos del csv de prods:', csvParsed)
    },
    error: err => {
      console.error('Puto error parseando el csv', err)
      fileStream.destroy()
    }
  })
})
*/
