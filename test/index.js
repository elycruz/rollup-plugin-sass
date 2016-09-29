import test from 'ava';
import { readFileSync, writeFileSync } from 'fs';
import { rollup } from 'rollup';
import sass from '..';

const sassOptions = {
    outputStyle: 'compressed'
};

test('should import *.scss and *.sass files', t => {
    return rollup({
        entry: 'fixtures/basic/index.js',
        plugins: [
            sass({
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style1 = readFileSync('fixtures/basic/style1.scss').toString();
        const style2 = readFileSync('fixtures/basic/style2.sass').toString();

        t.true(code.indexOf(style1) > -1);
        t.true(code.indexOf(style2) > -1);
    });
});

test('should process code with output function', t => {
    let outputCode = '';

    return rollup({
        entry: 'fixtures/output-function/index.js',
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
        const style = readFileSync('fixtures/output-function/style.scss').toString();

        t.truthy(outputCode);
        t.is(outputCode.trim(), `${style}`);
    })
});

test('should process code with output path', t => {
    writeFileSync('fixtures/output-string/output.css', '');

    return rollup({
        entry: 'fixtures/output-string/index.js',
        plugins: [
            sass({
                output: 'fixtures/output-string/output.css',
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('fixtures/output-string/style.scss').toString();
        const output = readFileSync('fixtures/output-string/output.css').toString();

        t.is(output.trim(), `${style}`);
    })
});


test('should process support promise', t => {
    let outputCode = '';

    return rollup({
        entry: 'fixtures/output-promise/index.js',
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
        const style = readFileSync('fixtures/output-promise/style.scss').toString();

        t.truthy(outputCode);
        t.is(outputCode.trim(), `${style}`);
    });
});

test('should insert CSS into head tag', t => {
    return rollup({
        entry: 'fixtures/insert-css/index.js',
        plugins: [
            sass({
                insert: true,
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('fixtures/insert-css/style.scss').toString();

        global.window = {};
        global.document = {
            innerHTML: '',
            head: {
                appendChild(mockNode) {
                    t.true(mockNode.hasOwnProperty('setAttribute'));
                    t.is(mockNode.innerHTML.trim(), `${style}`);
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