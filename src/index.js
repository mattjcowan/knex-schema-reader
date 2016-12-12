/**
 * Knex Schema Reader (https://github.com/mattjcowan/knex-schema-reader)
 *
 * Copyright © 2016 Matt Cowan, MJCZone Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
import mssqlExtractor from './mssql/index';
import mysqlExtractor from './mysql/index';

const extractors = {
  mssql: mssqlExtractor,
  mysql: mysqlExtractor
};

function reader(knex) {
  const db = knex;

  if (!db || !db.client || !db.client.config || !db.client.config.client) {
    throw new Error('Knex client cannot be null');
  }

  const extractor = extractors[db.client.config.client];

  if (!extractor) {
    throw new Error(`The ${db.client.config.client} knex client is not yet supported`);
  }

  return {
    extract: () => extractor.extract(db),
  };
}

export default reader;

