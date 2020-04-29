/**
 * @author: @AngularClass
 */
// Look in ./config folder for webpack.dev.js

global.__basedir = __dirname;

switch (process.env.webpackenv.trim()) {  
    case 'node':
        module.exports = require('./src/config/webpack.node');
        break;
    case 'server':
        module.exports = require('./src/config/webpack.server');
        break;
    default:
        module.exports = require('./src/config/webpack.node');
}