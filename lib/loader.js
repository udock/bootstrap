'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var pify_1 = __importDefault(require("pify"));
var readFile = pify_1.default(fs_1.default.readFile);
var chalk = require('chalk');
var FRAMEWORK_NAMESPACE = '@udock';
function sortByOrder(a, b) {
    return a.order - b.order;
}
function generateFramework(loader, options) {
    delete require.cache[require.resolve('./dynamicCompileConfig')];
    var dynamicCompileConfig = require('./dynamicCompileConfig');
    return new Promise(function (resolve, reject) {
        var data = {
            defines: [],
            installs: []
        };
        var templateFilePath = require.resolve(FRAMEWORK_NAMESPACE + "/" + options.framework + "-bootstrap/template/framework.js");
        readFile(templateFilePath, 'utf8')
            .then(function (fileContent) {
            var template = lodash_1.default.template(fileContent);
            var plugins = (options.plugins || []).map(function (plugin) {
                if (lodash_1.default.isString(plugin)) {
                    return [plugin];
                }
                else {
                    return plugin;
                }
            });
            var tasks = [];
            var missingPackages = [];
            var execErrors = [];
            var order = 0;
            var _loop_1 = function (plugin) {
                if (!plugin) {
                    return "continue";
                }
                var $name = FRAMEWORK_NAMESPACE + "/" + options.framework + "-plugin-" + plugin[0];
                var install = void 0;
                try {
                    install = require($name + "/lib/install");
                }
                catch (e) {
                    console.log("require " + $name + " falied:", e);
                    missingPackages.push($name);
                    return "continue";
                }
                var enabled = lodash_1.default.get(plugin[1], "env." + process.env.NODE_ENV);
                enabled = lodash_1.default.isUndefined(enabled) ? lodash_1.default.get(install, "env." + process.env.NODE_ENV, true) : enabled;
                if (!enabled) {
                    return "continue";
                }
                var promise;
                var envOpts = {
                    $name: $name,
                    $plugin: "require('" + $name + "').default",
                    $debug: options.debug
                };
                try {
                    promise = lodash_1.default.isFunction(install) ? install(loader, lodash_1.default.defaults(envOpts, plugin[1])) : install;
                }
                catch (e) {
                    console.log("exec " + $name + " install falied:", e);
                    execErrors.push($name);
                    return "continue";
                }
                if (!(promise instanceof Promise)) {
                    promise = Promise.resolve(promise);
                }
                (function (plugin, order) {
                    tasks.push(promise.then(function (code) {
                        if (code.define) {
                            data.defines.push({
                                code: code.define,
                                order: order
                            });
                        }
                        if (code.install) {
                            var install_1 = (code.install === 'framework.use') ? "framework.use(" + plugin + ")" : code.install;
                            data.installs.push({
                                code: install_1,
                                order: order
                            });
                        }
                        if (code.compile) {
                            dynamicCompileConfig.babel.push(code.compile.babel);
                        }
                    }));
                })(envOpts.$plugin, order++);
            };
            for (var _i = 0, plugins_1 = plugins; _i < plugins_1.length; _i++) {
                var plugin = plugins_1[_i];
                _loop_1(plugin);
            }
            Promise.all(tasks).then(function () {
                lodash_1.default.mapValues(data, function (value) {
                    return lodash_1.default.isArray(value) ? value.sort(sortByOrder) : value;
                });
                if (missingPackages.length > 0) {
                    reject(new Error("missing packages: [\n  ===> " + missingPackages.join('\n  ===> ') + "\n]"));
                }
                else if (execErrors.length > 0) {
                    reject(new Error("exec plugin install failed: [\n  ===> " + execErrors.join('\n  ===> ') + "\n]"));
                }
                else {
                    resolve(template(Object.assign({}, data)));
                }
            });
        })
            .catch(function (e) {
            console.error(e);
        });
    });
}
module.exports = function () {
    var _this = this;
    this.async();
    // 项目配置
    var configPath = path_1.default.resolve("./src/" + FRAMEWORK_NAMESPACE.substr(1) + ".config.js");
    delete require.cache[configPath];
    this.addDependency(configPath);
    var config;
    try {
        config = require(configPath);
    }
    catch (e) {
        console.log('\nframework config error:');
        this.callback(e);
        return;
    }
    // 调试配置
    require('./requireOptional')(FRAMEWORK_NAMESPACE + "/debug", function (debug) {
        try {
            config.debug = debug.attach(_this);
            console.log(chalk.yellow('Debuger attach success!'));
        }
        catch (e) {
            console.log(chalk.red('Debuger attach failed: '), e);
        }
    });
    generateFramework(this, config)
        .then(function (framework) {
        console.log('-----------------');
        console.log(framework);
        console.log('-----------------');
        _this.callback(null, framework);
    })
        .catch(function (error) {
        _this.callback(error);
    });
};
