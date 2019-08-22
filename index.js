'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var chalk_1 = __importDefault(require("chalk"));
var FRAMEWORK_NAMESPACE = '@udock';
module.exports = function (webpackConfig) {
    // 框架插件
    var pluginOpts = {
        tasks: []
    };
    var udockBootstrapEntry = require.resolve('@udock/bootstrap');
    var udockBootstrapPlugin = new (require('./lib/plugin'))(pluginOpts);
    var udockBootstrapLoader = require.resolve('./lib/loader');
    var udockDynamicCompileIncludes = function (req) {
        var dynamicCompileConfig = require('./lib/dynamicCompileConfig');
        for (var _i = 0, _a = dynamicCompileConfig.babel; _i < _a.length; _i++) {
            var rule = _a[_i];
            if (rule(req)) {
                return true;
            }
        }
        return false;
    };
    if ('toConfig' in webpackConfig) {
        // 通过 webpack-chain 修改 webpack 配置
        // 添加框架启动入口
        webpackConfig.entry('app').prepend('@udock/bootstrap');
        webpackConfig
            .plugin('udock-bootstrap-plugin').use(udockBootstrapPlugin);
        // 框架 loader
        webpackConfig.module
            .rule('udock-bootstrap')
            .test(udockBootstrapEntry)
            .use('babel-loader').loader('babel-loader').end()
            .use('udock-bootstrap-loader').loader(udockBootstrapLoader).end();
        // 动态 babel-loader
        webpackConfig.module
            .rule('udock-dynamic-compile')
            .test(/\.js$/)
            .use('babel-loader').loader('babel-loader').end()
            .include
            .add(udockDynamicCompileIncludes);
    }
    else {
        // 通过直接修改 webpack config 配置
        var entry = lodash_1.default.get(webpackConfig, 'entry.app');
        if (entry) {
            entry.unshift('@udock/bootstrap');
        }
        webpackConfig.module = webpackConfig.module || {};
        var rules = webpackConfig.module.rules;
        webpackConfig.plugins = webpackConfig.plugins || [];
        webpackConfig.plugins.push(udockBootstrapPlugin);
        // 框架 loader
        rules.push({
            test: udockBootstrapEntry,
            loader: ['babel-loader', udockBootstrapLoader]
        });
        // 动态 babel-loader
        rules.push({
            test: /\.js$/,
            loader: 'babel-loader',
            include: udockDynamicCompileIncludes
        });
    }
    // 调试配置
    require('./lib/requireOptional')(FRAMEWORK_NAMESPACE + "/debug", function (debug) {
        try {
            debug.setup(webpackConfig, pluginOpts.tasks);
            console.log(chalk_1.default.yellow('Debuger setup success!'));
        }
        catch (e) {
            console.log(chalk_1.default.red('Debuger setup failed: '), e);
        }
    });
    return webpackConfig;
};
