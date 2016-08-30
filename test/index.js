import test from 'ava';
import { readFileSync } from 'fs';
import { rollup } from 'rollup';
import sass from '..';

const sassOptions = {
    outputStyle: 'compressed'
};

test('should import *.scss and *.sass files', t => {
    return rollup({
        entry: 'samples/basic/index.js',
        plugins: [
            sass({
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style1 = readFileSync('samples/basic/style1.scss').toString();
        const style2 = readFileSync('samples/basic/style2.sass').toString();

        t.true(code.indexOf(style1) > -1);
        t.true(code.indexOf(style2) > -1);
    });
});

test('should process code with output function', t => {
    let outputCode = '';

    return rollup({
        entry: 'samples/output-function/index.js',
        plugins: [
            sass({
                output(code) {
                    return outputCode = code;
                },
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('samples/output-function/style.scss').toString();

        t.truthy(outputCode);
        t.is(outputCode, `${style}\n`);
    })
});

test('should process support promise', t => {
    let outputCode = '';

    return rollup({
        entry: 'samples/output-promise/index.js',
        plugins: [
            sass({
                output(code) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(outputCode = code)
                        }, 100);
                    });
                },
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('samples/output-promise/style.scss').toString();

        t.truthy(outputCode);
        t.is(outputCode, `${style}\n`);
    });
});

test('should insert CSS into head tag', t => {
    return rollup({
        entry: 'samples/insert-css/index.js',
        plugins: [
            sass({
                insert: true,
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('samples/insert-css/style.scss').toString();

        global.window = {};
        global.document = {
            innerHTML: '',
            head: {
                appendChild(mockNode) {
                    t.true(mockNode.hasOwnProperty('setAttribute'));
                    t.is(mockNode.innerHTML, `${style}\n`);
                }
            },
            createElement() {
                return {
                    setAttribute(key, value) {
                        if (key === 'type') {
                            t.is(value, 'text/css');
                        }
                    }
                };
            }
        };

        new Function(code)();
    });
});