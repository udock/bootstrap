'use strict'

module.exports = function (options) {
  this.options = options
}

module.exports.prototype.apply = function (compiler) {
  for (let task of this.options.tasks) {
    task(compiler)
  }
}
