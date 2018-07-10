import { env } from './env'

import * as admin from 'firebase-admin'
import Promise from 'bluebird'
const exec = Promise.promisify(require('child_process').exec)

export class ProductsHelper {
  constructor (localDB, remoteDB) {
    /** *** FIREBASE *****/
    // Fetch the service account key JSON file contents
    const serviceAccount = require('./../../motorzone-efef6-firebase-adminsdk-thfle-d2d5a6b23b.json')
    // Initialize the app with a service account, granting admin privileges
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
    // As an admin, the app has access to read and write all data, regardless of Security Rules
    this.firestoreDB = admin.firestore()
    /** *** end FIREBASE *****/
  }

  /**
   * Elimina los archivos viejos que hayan en la carpeta de comparacion
   * y los remplaza con las copias actualizadas para
   * compararlos la proxima vez que se ejecute el setInterval
   *
   */
  async refreshOldProdsFile () {
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
    * compararlos la proxima vez que se ejecute el setInterval
    */
    await exec(`cp ${env.prods_sap_file} old-files/oldProds.csv`)
  }

  /**
   * Formateo los productos del archivo csv con los productos
   * a un formato estandar antes de subirlo a Firestore
   * despues hago uso de la herramienta de escritura por lotes
   * de firestore para subir los productos
   *
   * @param {any[]} rawProducts recibe un array con los productos obtenidos del csv
   */
  parseAndUploadProds (rawProducts) {
    if (rawProducts.length > 0) {
      try {
        // Create a batch to run an atomic write
        const collectionProdsRef = this.firestoreDB.collection('products')
        const batch = this.firestoreDB.batch()

        for (const product of rawProducts) {
          const tituloApli = product.descripcion.split('.')
          const aplMarca = tituloApli[1] ? tituloApli[1].split('/') : tituloApli[0].split('/')
          const marcaUnd = aplMarca[1] ? aplMarca[1].split('_') : aplMarca[0].split('_')

          const docProdRef = collectionProdsRef.doc(product.codigo)
          if (product._delete === 'true') {
            batch.delete(docProdRef)
          } else {
            batch.set(docProdRef, {
              '_id': product.codigo,
              'titulo': typeof tituloApli[0] !== 'undefined' ? tituloApli[0] : '',
              'aplicacion': typeof aplMarca[0] !== 'undefined' ? aplMarca[0] : '',
              'imagen': 'https://www.igbcolombia.com/img_app_motozone/' + product.codigo + '.jpg',
              'marcas': typeof marcaUnd[0] !== 'undefined' ? marcaUnd[0] : '',
              'unidad': typeof marcaUnd[1] !== 'undefined' ? marcaUnd[1] : '',
              'existencias': parseInt(product.cantInventario),
              'precio': parseInt(product.precio1)
            })
          }
        }
        // Commit the batch
        batch.commit().then(res => {
          console.log('Todo correcto al subir los prods:', res)
          // si todo sale bien, actualizo el archivo con la copia de los productos
          // para la sgte comparacion
          this.refreshOldProdsFile()
        }).catch(err => console.error('error al subir los prods (batch)', err))
      } catch (err) {
        console.error('error en el proceso de analisis/manejo de los prods', err)
      }
    } else {
      console.warn('No se han detectado cambios en los productos')
    }
  }

  getProductsSize () {
    this.firestoreDB.collection('products').get()
      .then(snapshot => {
        console.log('Cant productos en firestore:', snapshot.size)
      })
      .catch(err => console.log('Error getting documents', err))
  }
}
