'use strict';

var path = require('path');
var nodeSass = require('node-sass');
var rollupPluginutils = require('rollup-pluginutils');

function plugin() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var filter = rollupPluginutils.createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');

    return {
        transform: function transform(code, id) {
            if (!filter(id)) {
                return null;
            }

            return new Promise(function (resolve, reject) {
                var paths = [path.dirname(id), process.cwd()];
                var sassConfig = Object.assign({
                    file: id
                });

                sassConfig.includePaths = sassConfig.includePaths
                    ? sassConfig.includePaths.concat(paths)
                    : paths;

                nodeSass.render(sassConfig, function (error, result) {
                    var temp = {
                        code: `export default ${JSON.stringify(result.css.toString())};`,
                        map: { mappings: '' }
                    };

                    if (error) {
                        temp.error = error.codeFrame;
                        reject(error);
                    }

                    resolve(temp);
                });
            });
        }
    };
}

module.exports = plugin;
