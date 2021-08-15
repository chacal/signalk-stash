const path = require('path')
const webpack = require('webpack')

function entriesFor(env) {
  const entries = ['./api-server/ui/index.tsx']
  if (env !== 'production') {
    entries.push('webpack-hot-middleware/client?reload=true&timeout=2000')
  }
  return entries
}

module.exports = function(env, argv) {
  console.log('Using Webpack env:', env)
  return {
    entry: entriesFor(env),
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.less$/,
          use: [
            {
              loader: 'style-loader' // creates style nodes from JS strings
            },
            {
              loader: 'css-loader' // translates CSS into CommonJS
            },
            {
              loader: 'less-loader' // compiles Less to CSS
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'built/api-server/public'),
      publicPath: '/'
    },
    plugins: [new webpack.HotModuleReplacementPlugin()]
  }
}
