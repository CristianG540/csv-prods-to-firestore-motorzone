// modulos
import { Tools } from './modules/utils'
import { env } from './modules/env'
import { ProductsHelper } from './modules/productsHelper'

// Libs terceros
import Papa from 'papaparse'
import Promise from 'bluebird'
const exec = Promise.promisify(require('child_process').exec)
const fs = require('fs')
Promise.promisifyAll(fs)

const prods = new ProductsHelper()

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
    await prods.refreshOldProdsFile()

    let fileStream = fs.createReadStream('onlyModifiedProds.csv') // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
    Papa.parse(fileStream, {
      header: true,
      skipEmptyLines: true,
      complete: csvParsed => {
        console.log('los datos del csv de prods:', csvParsed)
        console.log('cantidad prods:', csvParsed.data.length)
        prods.parseAndUploadProds(csvParsed.data)
        fileStream.destroy()
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

Tools.setIntervalPlus(360, () => {
  updateProds()
})

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
