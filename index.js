'use strict'
const chalk = require('chalk')
const FRAMEWORK_NAMESPACE = '@udock'

module.exports = function (config) {
  const rules = config.module.rules
  // 框架插件
  const pluginOpts = {
    tasks: []
  }
  config.plugins = config.plugins || []
  config.plugins.unshift(new (require('./lib/plugin'))(pluginOpts))

  // 框架 loader
  rules.push({
    test: __filename,
    loader: ['babel-loader', `${__dirname}/lib/loader`]
  })

  // 动态 babel-loader
  rules.push({
    test: /\.js$/,
    loader: 'babel-loader',
    include: (req) => {
      const dynamicCompileConfig = require('./lib/dynamicCompileConfig')
      for (let rule of dynamicCompileConfig.babel) {
        if (rule(req)) {
          return true
        }
      }
      return false
    }
  })

  // 调试配置
  require('./lib/requireOptional')(`${FRAMEWORK_NAMESPACE}/debug`, (debug) => {
    try {
      debug.setup(config, pluginOpts.tasks)
      console.log(chalk.yellow('Debuger setup success!'))
    } catch (e) {
      console.log(chalk.red('Debuger setup failed: '), e)
    }
  })

  return config
}
