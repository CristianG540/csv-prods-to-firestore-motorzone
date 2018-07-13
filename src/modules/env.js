const os = require('os')
const path = require('path')
const enviroment = process.env.NODE_ENV || 'development'

export const env = {
  prods_sap_file: enviroment === 'development' ? path.resolve(os.tmpdir(), 'fz3temp-3', 'product_motozone.txt') : '/var/www/html/reactphp-couchdb-importer/observados/product_motozone.txt', // ruta del archivo con los productos de sap
  prods_sap_file_bogota: enviroment === 'development' ? path.resolve(os.tmpdir(), 'fz3temp-3', 'product_motozone_bogota.txt') : '/var/www/html/reactphp-couchdb-importer/observados/product_motozone_bogota.txt'
}
