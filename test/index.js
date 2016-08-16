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
    let timestamp = String(Date.now());

    return rollup({
        entry: 'samples/output-function/index.js',
        plugins: [
            sass({
                output(code) {
                    return outputCode = code + timestamp;
                },
                options: sassOptions
            })
        ]
    }).then(bundle => {
        const code = bundle.generate().code;
        const style = readFileSync('samples/output-function/style.scss').toString();

        t.truthy(outputCode);
        t.is(outputCode, `${style}\n${timestamp}`);
    })
});

test('should process support promise', t => {
    let outputCode;
    let timestamp = String(Date.now());

    return rollup({
        entry: 'samples/output-promise/index.js',
        plugins: [
            sass({
                output(code) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(outputCode = code + timestamp)
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
        t.is(outputCode, `${style}\n${timestamp}`);
    });
});

test( 'rollup-plugin-less', t => {
    return rollup({
        entry: 'samples/html/test.js',
        plugins: [ sass() ]
    }).then((bundle) => {
        bundle.write({
            dest: './samples/html/dist.js',
            format: 'cjs'
        });
   });
});