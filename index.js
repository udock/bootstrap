'use strict'
const WebpackChain = require('webpack-chain')

const chalk = require('chalk')
const FRAMEWORK_NAMESPACE = '@udock'

module.exports = function (webpackConfig) {
  // 框架插件
  const pluginOpts = {
    tasks: []
  }

  const udockBootstrapEntry = require.resolve('@udock/bootstrap')
  const udockBootstrapPlugin = new (require('./lib/plugin'))(pluginOpts)
  const udockBootstrapLoader = require.resolve('./lib/loader')
  const udockDynamicCompileIncludes = (req) => {
    const dynamicCompileConfig = require('./lib/dynamicCompileConfig')
    for (let rule of dynamicCompileConfig.babel) {
      if (rule(req)) {
        return true
      }
    }
    return false
  }

  if (webpackConfig instanceof WebpackChain) {
    // 通过 webpack-chain 修改 webpack 配置
    webpackConfig
      .plugin('udock-bootstrap-plugin').use(udockBootstrapPlugin)

    // 框架 loader
    webpackConfig.module
      .rule('udock-bootstrap')
      .test(udockBootstrapEntry)
      .use('babel-loader').loader('babel-loader').end()
      .use('udock-bootstrap-loader').loader(udockBootstrapLoader).end()

    // 动态 babel-loader
    webpackConfig.module
      .rule('udock-dynamic-compile')
      .test(/\.js$/)
      .use('babel-loader').loader('babel-loader').end()
      .include
      .add(udockDynamicCompileIncludes)
  } else {
    // 通过直接修改 webpack config 配置
    const rules = webpackConfig.module.rules
    webpackConfig.plugins = webpackConfig.plugins || []
    webpackConfig.plugins.push(udockBootstrapPlugin)

    // 框架 loader
    rules.push({
      test: udockBootstrapEntry,
      loader: ['babel-loader', udockBootstrapLoader]
    })

    // 动态 babel-loader
    rules.push({
      test: /\.js$/,
      loader: 'babel-loader',
      include: udockDynamicCompileIncludes
    })
  }

  // 调试配置
  require('./lib/requireOptional')(`${FRAMEWORK_NAMESPACE}/debug`, (debug) => {
    try {
      debug.setup(webpackConfig, pluginOpts.tasks)
      console.log(chalk.yellow('Debuger setup success!'))
    } catch (e) {
      console.log(chalk.red('Debuger setup failed: '), e)
    }
  })

  return webpackConfig
}
