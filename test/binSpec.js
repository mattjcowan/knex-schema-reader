import fs from 'fs';
import path from 'path';
import walkBack from 'walk-back';
import dotenv from 'dotenv';
import { expect } from 'chai';
import cli from '../bin/cliRunner';

// environment variables and database connection strings are all stored in a separate file
// that is not checked into the source code repository

dotenv.config({ silent: true, path: walkBack(path.resolve('./'), '.env') });

describe('knexschemareader', () => {

  describe('option checks', () => {

    it('unsupported dialect should trigger message', () => {
      try {
        cli(['mocha', 'knexschemareader', '--dialect', 'mssql2018', '--connectionstring', 'blah', '--output', 'blah.json']);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.source).to.be.equal('knex');
        expect(err.message).to.contain('Invalid dialect');
      }
    });

    it('bad connectionstring should trigger message', () => {
      try {
        cli(['mocha', 'knexschemareader', '--dialect', 'mssql', '--connectionstring', 'blah', '--output', 'blah.json']);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.source).to.be.equal('knex');
        expect(err.message).to.contain('Invalid connectionstring');
      }
    });

  });

  function exportSchemaToFileTest(dialect, connectionstring) {
    describe(`${dialect} dialect checks`, () => {

      it(`able to export schema for ${dialect} database to a file`, () => {

        const fileName = `${dialect}-database.json`;
        cli(['mocha', 'knexschemareader', '--dialect', dialect, '--connectionstring', connectionstring, '--output', fileName], function () {
          expect(fs.existsSync(path)).to.be.true;
          fs.deleteFileSync(fileName);
        });

      });
    });
  }

  const dialects = ['pg', 'sqlite3', 'mysql', 'mysql2', 'mariasql', 'strong-oracle', 'oracle', 'mssql'];
  for (let i = 0; i < dialects.length; i++) {
    const dialect = dialects[i];
    const connectionstring = process.env[`${dialect.toUpperCase()}_CONNECTION_STRING`];
    if (connectionstring && connectionstring.length > 0) {
      exportSchemaToFileTest(dialect, connectionstring);
    }
  }
});
