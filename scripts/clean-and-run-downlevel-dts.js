/**
 * @script clean-and-run-downlevel-dts.js
 * @description Removes '{repo-root}/ts3.5' directory, re-creates it, runs
 *  `npm run downlevel-dts` from repo-root, and copies the root tsconfig.json file into new directory.
 */
 const fs = require('fs').promises,
  path = require('path'),
  {spawn} = require('child_process'),

  {log, warn, error} = console,

  rootDir = path.join(__dirname, '..'),
  outputDir = path.resolve(path.join(__dirname, '../ts3.5')),

  tsConfigFilePath = path.join(rootDir, 'tsconfig.json'),
  tsConfigOutFilePath = path.join(outputDir, 'tsconfig.json');

(async () =>
    fs.rmdir(outputDir, {recursive: true})

      .then(() => fs.mkdir(outputDir))

      .then(() => fs.copyFile(tsConfigFilePath, tsConfigOutFilePath))

      // Run downlevel-dts
      .then(() => new Promise((resolve, reject) => {

        // Start downlevel-dts package script
        const subProcess = spawn('npm', ['run', 'downlevel-dts'], {cwd: rootDir});

        // Log child process buffer data as `string`
        subProcess.stdout.on('data', data => log(data.toString().trim() + '\n'));

        // Log stderr, child process, buffer data as a `string`
        subProcess.stderr.on('data', data => warn(data.toString().trim() + '\n'));

        // Handle process end
        subProcess.on('close', (code) => code !== 0 ?
          reject(`Child process existed with code ${code}.\n`) :
          resolve('Process completed successfully.\n')
        );

        // Catch process start errors
        subProcess.on('error', reject);
      }))

)().then(log, error);
