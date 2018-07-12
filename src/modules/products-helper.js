import { chunk } from 'lodash'
import { Tools } from './utils'

import Promise from 'bluebird'
const exec = Promise.promisify(require('child_process').exec)

export class ProductsHelper {
  constructor (bd, csvFile, logger, firestore) {
    this.bd = bd
    this.csvFile = csvFile
    this.logger = logger
    this.firestoreDB = firestore
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
      await exec(`rm -r old-files/old-${this.bd}.csv`)
    } catch (error) {
      await exec(`cp ${this.csvFile} old-files/old-${this.bd}.csv`)
    }
    /*
    * Copio el archivo csv con los productos nuevos a la carpeta de comparacion para
    * compararlos la proxima vez que se ejecute el setInterval
    */
    await exec(`cp ${this.csvFile} old-files/old-${this.bd}.csv`)

    this.logger.info(`Se refrescaron los archivos csv de comparacion "old-${this.bd}.csv" -- modules/productsHelper/refreshOldProdsFile()`)
  }

  /**
   * Formateo los productos del archivo csv con los productos
   * a un formato estandar antes de subirlo a Firestore
   * despues hago uso de la herramienta de escritura por lotes
   * de firestore para subir los productos
   *
   * @param {any[]} rawProducts recibe un array con los productos obtenidos del csv
   */
  async parseAndUploadProds (rawProducts) {
    if (rawProducts.length > 0) {
      try {
        // Create a batch to run an atomic write
        const collectionProdsRef = this.firestoreDB.collection(this.bd)

        /**
         * para evitar el problema de que firestore no deja modificar/crear mas de 500 documentos
         * a la misma vez en un batch, divido el array de productos en un array de 49 productos,
         * entonces me preguntare a mi mismo, y por mierda no lo divido en arrays de 500 productos
         * y me respondere, "kyt prro" tampoco puedo divirlo en 500, por que cada vez que realizo
         * una operacion en un documento, este lanza un evento en una funcion de firebase cloud functions
         * que se encarga de contar los productos, el problema es que si actualizo 500 productos entonces
         * esa funcion se lanza 500 veces en periodo de tiempo muy corto, esto me tira un error por que solo
         * puedo ejecutar maximo 50 funciones en un lapso de 100 segundos
         */
        const chunksRawProducts = chunk(rawProducts, 49)

        for (const products of chunksRawProducts) {
          const batch = this.firestoreDB.batch()

          for (const product of products) {
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

          /**
           * para mitigar el problema de que firebase cloud functions no me deja ejecutar mas de 50 funciones
           * en menos de 100 segundos, creo una especie de delay. como el de underscore solo que este me devuelve
           * una promesa, de esta forma lo puedo usar con async/await, la ventaja de poder usar el delay como una
           * promesa es que el codigo del delay no se ejecuta concurrente, por ejemplo si lanzo 5 delays con un tiempo
           * de 5 segundos, los 5 se lanzarian al mismo tiempo una vez pasen los 5 segundos, pero usando el async/await
           * cada uno se ejecuta solo cuando hayan pasado los 5 del anterior
           */
          const batchRes = await Tools.promiseDelay(() => batch.commit(), 5000)
          this.logger.info('Todo correcto al subir los prods -- modules/productsHelper/parseAndUploadProds() :', batchRes)
        }

        // si todo sale bien, actualizo el archivo con la copia de los productos
        // para la sgte comparacion
        this.refreshOldProdsFile()
      } catch (err) {
        this.logger.error('error en el proceso de analisis/manejo de los prods -- modules/productsHelper/parseAndUploadProds() :', err)
      }
    } else {
      this.logger.warn('No se han detectado cambios en los productos -- modules/productsHelper/parseAndUploadProds() :')
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
