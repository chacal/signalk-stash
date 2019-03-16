const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: ['webpack-hot-middleware/client?reload=true&timeout=2000', './api-server/ui/index.ts'],
  devServer: {
    contentBase: './ui/public'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'api-server/public'),
    publicPath: '/'
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
}
