'use strict'

import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import pify from 'pify'
import webpack = require('webpack');
const readFile = pify(fs.readFile)
const chalk = require('chalk')
const FRAMEWORK_NAMESPACE = '@udock'

type Code = {
  code: string,
  order: number
}

function sortByOrder (a: Code, b: Code) {
  return a.order - b.order
}

function generateFramework (loader: webpack.loader.LoaderContext, options: any): Promise<string> {
  delete require.cache[require.resolve('./dynamicCompileConfig')]
  const dynamicCompileConfig = require('./dynamicCompileConfig')
  return new Promise(function (resolve, reject) {
    const data = {
      defines: [] as Code[],
      installs: [] as Code[]
    }
    const templateFilePath = require.resolve(`${FRAMEWORK_NAMESPACE}/${options.framework}-bootstrap/template/framework.js`)
    readFile(templateFilePath, 'utf8')
      .then(function (fileContent) {
        const template = _.template(fileContent)
        const plugins = (options.plugins || []).map(function (plugin: string|string[]) {
          if (_.isString(plugin)) {
            return [plugin]
          } else {
            return plugin
          }
        })
        const tasks = []
        const missingPackages: string[] = []
        const execErrors:string[] = []
        let order = 0
        for (let plugin of plugins) {
          if (!plugin) { continue }
          const $name = `${FRAMEWORK_NAMESPACE}/${options.framework}-plugin-${plugin[0]}`
          let install
          try {
            install = require(`${$name}/lib/install`)
          } catch (e) {
            console.log(`require ${$name} falied:`, e)
            missingPackages.push($name)
            continue
          }
          let enabled = _.get(plugin[1], `env.${process.env.NODE_ENV}`)
          enabled = _.isUndefined(enabled) ? _.get(install, `env.${process.env.NODE_ENV}`, true) : enabled
          if (!enabled) {
            continue
          }
          let promise
          const envOpts = {
            $name: $name,
            $plugin: `require('${$name}').default`,
            $debug: options.debug
          }
          try {
            promise = _.isFunction(install) ? install(loader, _.defaults(envOpts, plugin[1])) : install
          } catch (e) {
            console.log(`exec ${$name} install falied:`, e)
            execErrors.push($name)
            continue
          }
          if (!(promise instanceof Promise)) {
            promise = Promise.resolve(promise)
          }
          (function (plugin, order) {
            tasks.push(
              promise.then(function (code) {
                if (code.define) {
                  data.defines.push({
                    code: code.define,
                    order
                  })
                }
                if (code.install) {
                  const install =
                    (code.install === 'framework.use') ? `framework.use(${plugin})` : code.install
                  data.installs.push({
                    code: install,
                    order
                  })
                }
                if (code.compile) {
                  dynamicCompileConfig.babel.push(code.compile.babel)
                }
              }))
          })(envOpts.$plugin, order++)
        }
        Promise.all(tasks).then(function () {
          _.mapValues(data, function (value) {
            return _.isArray(value) ? value.sort(sortByOrder) : value
          })
          if (missingPackages.length > 0) {
            reject(new Error(`missing packages: [\n  ===> ${missingPackages.join('\n  ===> ')}\n]`))
          } else if (execErrors.length > 0) {
            reject(new Error(`exec plugin install failed: [\n  ===> ${execErrors.join('\n  ===> ')}\n]`))
          } else {
            resolve(template(Object.assign({}, data)))
          }
        })
      })
      .catch(function (e) {
        console.error(e)
      })
  })
}

module.exports = function (this: webpack.loader.LoaderContext) {
  this.async()
  // 项目配置
  const configPath = path.resolve(`./src/${FRAMEWORK_NAMESPACE.substr(1)}.config.js`)
  delete require.cache[configPath]
  this.addDependency(configPath)
  let config: {debug: boolean}
  try {
    config = require(configPath)
  } catch (e) {
    console.log('\nframework config error:')
    this.callback(e)
    return
  }

  // 调试配置
  require('./requireOptional')(`${FRAMEWORK_NAMESPACE}/debug`, (debug: any) => {
    try {
      config.debug = debug.attach(this)
      console.log(chalk.yellow('Debuger attach success!'))
    } catch (e) {
      console.log(chalk.red('Debuger attach failed: '), e)
    }
  })

  generateFramework(this, config)
    .then((framework) => {
      console.log('-----------------')
      console.log(framework)
      console.log('-----------------')
      this.callback(null, framework)
    })
    .catch((error) => {
      this.callback(error)
    })
}
