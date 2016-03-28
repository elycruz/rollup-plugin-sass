'use strict';

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
                nodeSass.render(Object.assign({
                    data: code
                }, options.config || {}), function (error, result) {
                    var temp = {
                        code: result,
                        map: { mappings: '' }
                    };

                    if (error) {
                        temp.error = error;
                        reject(error);
                    }

                    resolve(temp);
                });
            });
        }
    };
}

module.exports = plugin;
