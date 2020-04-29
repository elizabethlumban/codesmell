
let webpack = require('webpack');
let path = require('path');

let fs = require('fs');
let nodeModules = {};
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ClosureCompilerPlugin = require('webpack-closure-compiler');
const NodeMonPlugin = require('nodemon-webpack-plugin');

const ENV = 'local';

console.info(`$running webpack on: ${ENV}`);

fs.readdirSync('node_modules')
    .filter(function (x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function (mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

module.exports = {
    cache: false,

    devtool: 'source-map',

    entry: './src/server/config/server-start.ts',

    target: 'node',

    output: {
        path: __basedir + "/",
        filename: 'server/server.js',
        sourceMapFilename: 'server/server.map',
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

        new CopyWebpackPlugin([
            // {output}/file.txt
            {
                from: 'src/server/common/eseuprd.arm',
                to: 'server/eseuprd.arm'
            },
            {
                from: 'src/server/common/sqldb_ssl_245.arm',
                to: 'server/sqldb_ssl_245.arm'
            }
        ]),

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

        new NodeMonPlugin(),

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
