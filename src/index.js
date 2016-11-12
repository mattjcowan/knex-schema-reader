/**
 * Knex Schema Reader (https://github.com/mattjcowan/knex-schema-reader)
 *
 * Copyright © 2016 Matt Cowan, MJCZone Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
import mssqlExtractor from './mssql/index';

function read(knex) {
  let extractor;

  if (!knex) {
    throw new Error('What are you doing???');
  }

  if (!knex.client || knex.client.length === 0) {
    throw new Error('Knex client property is missing');
  }

  switch (knex.client.config.client) {
    case 'mssql':
      extractor = mssqlExtractor; break;
    default:
      throw new Error(`The ${knex.client.config.client} knex client is not yet supported`);
  }
  return extractor.extract(knex);
}

export default read;
