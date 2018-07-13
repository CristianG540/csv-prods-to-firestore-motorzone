import { delay } from 'lodash'
import Promise from 'bluebird'

export class Tools {
  /**
   * Esta funcion es algo asi como una version mejorada del setInterval
   * nativo de javascript, lo que hace es ejecturse apenas se llama, ya que
   * el setInterval nativo se ejecuta por primera vez solo cuando pasa eltiempo
   * que se le indica ademas recibe segundos en vez de milisegundos
   *
   * @static
   * @param {*} seconds tiempo en segundos, cada cuanto se ejecuta el setInt
   * @param {*} callback funcion a ejecutar en el tiempo indicado
   * @returns regresa el setInterval por si se quiere detener o manipular
   * @memberof Tools
   */
  static setIntervalPlus (seconds, callback) {
    callback()
    return setInterval(callback, seconds * 1000)
  }

  /**
   *
   *
   * @static
   * @param {Promise} fn
   * @param {number} time
   * @returns {Promise} promesa con al vuelta
   * @memberof Tools
   */
  static async promiseDelay (fn, time) {
    return new Promise((resolve, reject) => {
      delay(() => {
        fn()
          .then(res => resolve(res))
          .catch(err => reject(err))
      }, time)
    })
  }

  static binarySearch (arr, property, search) {
    let low = 0
    let high = arr.length
    let mid
    while (low < high) {
      mid = (low + high) >>> 1 // faster version of Math.floor((low + high) / 2)
      arr[mid][property] < search ? low = mid + 1 : high = mid
    }
    return low
  }
}
