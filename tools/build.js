/* eslint no-useless-escape:0 */
/**
 * Knex Schema Reader (https://github.com/mattjcowan/knex-schema-reader)
 *
 * Copyright © 2016 Matt Cowan, MJCZone Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const del = require('del');
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const pkg = require('../package.json');

// From https://github.com/leecrossley/replaceall/blob/master/replaceall.js
const replaceall = function (replaceThis, withThis, inThis) {
  withThis = withThis.replace(/\$/g, '$$$$');
  return inThis.replace(new RegExp(replaceThis.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&])/g, '\\$&'), 'g'), withThis);
};

let promise = Promise.resolve();

// Clean up the output directory
promise = promise.then(() => del(['dist/*']));

// Compile source code into a distributable format with Babel
['es', 'cjs', 'umd'].forEach((format) => {
  promise = promise.then(() => rollup.rollup({
    entry: 'src/index.js',
    external: Object.keys(pkg.dependencies),
    plugins: [babel(Object.assign(pkg.babel, {
      babelrc: false,
      exclude: 'node_modules/**',
      runtimeHelpers: true,
      presets: pkg.babel.presets.map(x => (x === 'latest' ? ['latest', { es2015: { modules: false } }] : x)),
    }))],
  }).then(bundle => bundle.write({
    dest: `dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`,
    format,
    sourceMap: true,
    moduleName: format === 'umd' ? pkg.name : undefined,
  })));
});

// Copy package.json and LICENSE.txt
promise = promise.then(() => {
  delete pkg.private;
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.eslintConfig;
  delete pkg.babel;
  if (!fs.existsSync('dist/bin')) {
    fs.mkdirSync('dist/bin');
  }
  fs.writeFileSync('dist/bin/cli.js', fs.readFileSync('bin/cli.js', 'utf-8'), 'utf-8');
  fs.writeFileSync('dist/package.json', replaceall('dist/', '', JSON.stringify(pkg, null, '  ')), 'utf-8');
  fs.writeFileSync('dist/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8');
});

promise.catch(err => console.error(err.stack)); // eslint-disable-line no-console
