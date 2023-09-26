const path = require('path');

module.exports = {
    entry: './dist/index.js',
    output: {
        filename: 'multyx.js',
        path: path.resolve(__dirname),
        library: 'Multyx', // Specify the global variable name
        libraryTarget: 'umd', // Attach to the global object in a universal module definition (UMD) fashion
        libraryExport: 'default'
    },
    mode: 'production'
};
