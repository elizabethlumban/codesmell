
let webpack = require('webpack');
let path = require('path');

let fs = require('fs');
let nodeModules = {};
let ClosureCompilerPlugin = require('webpack-closure-compiler');

const ENV = 'local';

console.info(`$running webpack on: ${ENV}`);

module.exports = {
    cache: false,

    devtool: 'source-map',

    entry: './src/server/app.ts',

    target: 'node',

    output: {
        path: __basedir + "/",
        filename: 'server/app.js',
        sourceMapFilename: 'server/app.map',
    },

    externals: nodeModules,

    module: {

        rules: [
            {
                loader: 'awesome-typescript-loader',
                test: /\.ts$/,
                options: {
                    configFileName: './src/server/tsconfig.json',
                },
            }
        ]
    },

    plugins: [

        new ClosureCompilerPlugin({
            compiler: {
                language_in: 'ECMASCRIPT6',
                language_out: 'ECMASCRIPT6',
                compilation_level: 'ADVANCED',
                process_common_js_modules: true,
                create_source_map: 'server/app.map',
            },
            concurrency: 3,
        }),
    ],

    resolve: {
        modules: [
            path.join(__dirname, "src/server"),
            "node_modules"
        ],
        extensions: ['.ts', '.js'],
    },

    performance: {
        hints: false
    }


};
