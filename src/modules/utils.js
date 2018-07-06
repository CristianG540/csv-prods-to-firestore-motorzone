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
}
