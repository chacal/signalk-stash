import { Express } from 'express'
import webpack from 'webpack'
import webpackMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'

export default function bindWebpackMiddlewares(app: Express) {
  console.log('Starting Webpack middleware..')

  const webpackConfig = require('../../webpack.config.js')
  webpackConfig.mode = 'development'
  webpackConfig.devtool = 'inline-source-map'

  const compiler = webpack(webpackConfig)
  app.use(webpackMiddleware(compiler))
  app.use(webpackHotMiddleware(compiler))
}
