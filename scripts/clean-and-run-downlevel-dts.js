/**
 * @script clean-and-run-downlevel-dts.js
 * @description Removes '{repo-root}/ts3.5' directory, re-creates it, runs
 *  `npm run downlevel-dts` from repo-root, and copies the root tsconfig.json file into new directory.
 */
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const { log, warn, error } = console;
const rootDir = path.join(__dirname, '..');
const outputDir = path.resolve(path.join(__dirname, '../ts3.5'));
const tsConfigFilePath = path.join(rootDir, 'tsconfig.json');
const tsConfigOutFilePath = path.join(outputDir, 'tsconfig.json');

// Run 'clean-and-run' process
(async () =>
  // @note Conditional check here since we have a relaxed 'package.json.engines.node' value,
  //   and `fs.rmdir` is being deprecated in later versions of node (node v18+).
  // ----
  (fs.rm ? fs.rm : fs.rmdir)(outputDir, { recursive: true })
    // If error is any other than "file doesn't exist"/"ENOENT" ensure error is thrown.
    .catch((err) => (err.code !== 'ENOENT' ? error(err) : null))

    .then(() => fs.mkdir(outputDir))

    .then(() => fs.copyFile(tsConfigFilePath, tsConfigOutFilePath))

    // Run downlevel-dts
    .then(
      () =>
        new Promise((resolve, reject) => {
          // Start downlevel-dts package script
          const subProcess = spawn('npm', ['run', 'downlevel-dts'], {
            cwd: rootDir,
          });

          // Log child process buffer data as `string`
          subProcess.stdout.on('data', (data) =>
            log(data.toString().trim() + '\n'),
          );

          // Log stderr, child process, buffer data as a `string`
          subProcess.stderr.on('data', (data) =>
            warn(data.toString().trim() + '\n'),
          );

          // Handle process end
          subProcess.on('close', (code) =>
            code !== 0
              ? reject(`Child process existed with code ${code}.\n`)
              : resolve(
                  '"clean-and-run-downlevel-dts" completed successfully.\n',
                ),
          );

          // Catch process start errors
          subProcess.on('error', reject);
        }),
    ))().then(log, error);
