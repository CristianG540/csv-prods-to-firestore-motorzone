const path = require('path')
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
