/* eslint no-console: 0 */

import fs from 'fs';
import path from 'path';
import walkBack from 'walk-back';
import dotenv from 'dotenv';
import chai from 'chai';
import Knex from 'knex';
import assert from 'assert';
import reader from '../src/index';

// environment variables and database connection strings are all stored in a separate file
// that is not checked into the source code repository

dotenv.config({ silent: true, path: walkBack(path.resolve('./'), '.env') });

// Tell chai that we'll be using the "should" style assertions.
chai.should();

describe('postgresql', () => {

  describe('postgresql extract checks', () => {

    // variables

    // common methods
    beforeEach(() => {
      if (!fs.existsSync('./samples')) fs.mkdirSync('./samples');
      if (!fs.existsSync('./samples/postgresql')) fs.mkdirSync('./samples/postgresql');
    });

    it('able to extract schema from Pagila database', function (done) {

      this.timeout(0);

      const connectionFile = './test/knexfiles/knexfile.postgresql.pagila.json';
      const connectionInfo = fs.existsSync(connectionFile) ?
        JSON.parse(fs.readFileSync(connectionFile)) : null;

      if (connectionInfo) {

        const k = Knex(connectionInfo);
        k.raw('select 1+1 as result').then(function () {
          reader(k).extract().then(function (db) {
            k.destroy();
            db.should.not.be.null;
            fs.writeFileSync('./samples/postgresql/pagila.json', JSON.stringify(db, null, '\t'), 'utf-8');
            done();
          }).catch(function (err) {
            k.destroy();
            assert.fail(err);
            done();
          });
        }).catch(function (err) {
          console.log(err);
          console.log('Unable to connect to database');
          done();
        });

      } else {
        console.log(`No connection file: ${connectionFile}`);
      }

    });

    it('able to extract schema from SportsDB database', function (done) {

      this.timeout(0);

      const connectionFile = './test/knexfiles/knexfile.postgresql.sportsdb.json';
      const connectionInfo = fs.existsSync(connectionFile) ?
        JSON.parse(fs.readFileSync(connectionFile)) : null;

      if (connectionInfo) {

        const k = Knex(connectionInfo);
        k.raw('select 1+1 as result').then(function () {

          reader(k).extract().then(function (db) {
            k.destroy();
            db.should.not.be.null;
            fs.writeFileSync('./samples/postgresql/sportsdb.json', JSON.stringify(db, null, '\t'), 'utf-8');
            done();
          }).catch(function (err) {
            k.destroy();
            assert.fail(err);
            done();
          });

        }).catch(function () {
          console.log('Unable to connect to database');
          done();
        });

      }

    });
  });
});
