const path = require('path')
/**
 * Para usar webpack con node.js la unica solucion q he encontrado
 * es usar esta libreria, por que webpack trata de empaquetar las librerias
 * de node.js y esto trae muchos muchos errores
 */
const nodeExternals = require('webpack-node-externals') // para que funcionen los scripts en node.js

module.exports = {
  context: process.cwd(),
  entry: ['babel-polyfill', './src/index.js'], // Agrego el babel-polyfill para trabajar con async/await
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  },
  externals: [nodeExternals()],
  target: 'async-node'
}
