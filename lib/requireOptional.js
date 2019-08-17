"use strict";
module.exports = function (moduleName, cb) {
    try {
        require.resolve(moduleName);
        cb(require(moduleName));
    }
    catch (e) { }
};
