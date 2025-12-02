const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin')

module.exports = {
    entry: './dist/index.js',
    output: {
        filename: 'multyxcreate/browser-emulator.js',
        path: __dirname,
        library: 'Multyx', // Specify the global variable name
        libraryTarget: 'umd', // Attach to the global object in a universal module definition (UMD) fashion
        libraryExport: 'default',
    },
    resolve: {
        alias: {
            // Replace Node.js modules with browser-compatible versions
            'ws': path.resolve(__dirname, 'multyxcreate/browser-stubs/ws.js'),
            'nanotimer': path.resolve(__dirname, 'multyxcreate/browser-stubs/nanotimer.js')
        }
    },
    plugins: [
      new CircularDependencyPlugin({
        include: /src/,
        failOnError: false,
        allowAsyncCycles: false,
        cwd: process.cwd(),
      })
    ],
    mode: 'production',
    target: 'web'
};
