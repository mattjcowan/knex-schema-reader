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

describe('basics', () => {

  describe('error checks', () => {
    // variables

    // common methods
    beforeEach(() => {

    });

    it('fails if knex is null', () => {
      (() => {
        reader(null);
      }).should.throw(Error);
    });

    it('fails if knex client is missing', () => {
      (() => {
        reader({});
      }).should.throw(Error);
    });

    it('fails if knex client is empty', () => {
      (() => {
        reader({ client: '' });
      }).should.throw(Error);
    });

    it('fails if knex client dialect is unsupported', () => {
      (() => {
        reader({ client: 'sqlserver1999' });
      }).should.throw(Error);
    });

    it('fails if client connection cannot be established', () => {

      (() => { reader({ client: 'mssql', connectionstring: 'bogus connectionstring' }); })
        .should.throw(Error, /Knex client cannot be null/);

    });

    it('fails if knex client connection cannot be established', (done) => {

      reader(Knex({ client: 'mssql', connectionstring: 'bogus connectionstring' }))
        .extract()
        .then(function () { assert.fail(0, 1, 'Should have thrown exception'); })
        .catch(function () { done(); });

    });

  });

});
