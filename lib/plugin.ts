'use strict'

import webpack = require("webpack")

module.exports = function (this: webpack.Plugin & {options: any}, options: any) {
  this.options = options
}

module.exports.prototype.apply = function (compiler: any) {
  for (let task of this.options.tasks) {
    task(compiler)
  }
}
