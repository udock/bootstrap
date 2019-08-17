'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = function (options) {
    this.options = options;
};
module.exports.prototype.apply = function (compiler) {
    for (var _i = 0, _a = this.options.tasks; _i < _a.length; _i++) {
        var task = _a[_i];
        task(compiler);
    }
};
