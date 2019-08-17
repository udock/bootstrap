module.exports = function (moduleName: string, cb: (module: any) => void) {
  try {
    require.resolve(moduleName)
    cb(require(moduleName))
  } catch (e) {}
}
