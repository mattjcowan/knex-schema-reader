/* eslint-disable func-names */

import _ from 'lodash';
import co from 'co';
import cmds from './commands';

function extractor() {
  return {
    extract: function extract(knex) {
      return co(function*() {
        const db = {
          driver: 'mssql',
          dataTypes: _.keyBy(yield cmds.getDataTypes(knex), 'typeName'),
          schemas: {},
        };

        // get database users
        db.users = _.map(yield cmds.getUsers(knex), 'name');

        // get database schemas
        // but only include schemas that have tables in the output
        const schemaNames = _.map(yield cmds.getSchemas(knex), 'name');
        for (let i = 0; i < schemaNames.length; i++) {
          const schemaName = schemaNames[i];

          // get schema tables
          const tables = yield cmds.getTables(knex, schemaName);
          if (tables.length === 0) continue;
          const schema = {
            name: schemaName,
            tables: _.keyBy(_.map(tables, function (t) {
              return {
                name: t.name,
                description: t.description,
              };
            }), 'name'),
          };
          db.schemas[schemaName] = schema;

          // get schema table columns
          const schemaColumns = yield cmds.getColumns(knex, schema.name);
          const schemaColumnDescriptions = yield cmds.getColumnDescriptions(knex, schema.name);
          const schemaComputedColumnDefinitions =
            yield cmds.getComputedColumnDefinitions(knex, schema.name);
          _.forEach(schema.tables, function (table) {
            table.columns = _.keyBy(_.filter(schemaColumns, { table: table.name }), 'name');
            _.forEach(table.columns, function (col) {
              _.unset(col, 'table');
              col.isPrimaryKey = false; // this gets set later
              col.isComputed = false; // this gets set later
              col.isNullable = col.isNullable === 1;
            });
          });
          _.forEach(schemaColumnDescriptions, function (scd) {
            if (scd.description && scd.description.length > 0) {
              schema.tables[scd.table].columns[scd.name].description = scd.description;
            }
          });
          _.forEach(schemaComputedColumnDefinitions, function (scdd) {
            if (scdd.definition && scdd.definition.length > 0) {
              schema.tables[scdd.table].columns[scdd.name].isComputed = true;
              schema.tables[scdd.table].columns[scdd.name].computedDefinition = scdd.definition;
            }
          });

          // get check constraints
          const checkConstraints = yield cmds.getCheckConstraints(knex, schema.name);
          if (checkConstraints.length > 0) {
            _.forEach(schema.tables, function (table) {
              table.checkConstraints = _.keyBy(_.filter(checkConstraints, { table: table.name }), 'name');
              _.forEach(table.checkConstraints, function (ck) {
                _.unset(ck, 'schema');
                _.unset(ck, 'table');
              });
            });
          }

          // get foreign keys
          const foreignKeyConstraints = yield cmds.getForeignKeyConstraints(knex, schema.name);
          if (foreignKeyConstraints.length > 0) {
            schema.foreignKeys = foreignKeyConstraints;
          }

          // get primary key
          const primaryKeyConstraints = yield cmds.getPrimaryKeyConstraints(knex, schema.name);
          if (primaryKeyConstraints.length > 0) {
            _.forEach(_.groupBy(primaryKeyConstraints, 'name'), function (pk, pkName) {
              const table = schema.tables[pk[0].table];
              table.primaryKey = { name: pkName, columnCount: pk.length, columns: _.map(pk, 'column') };
              _.forEach(pk, function (pkc) {
                table.columns[pkc.column].isPrimaryKey = true;
              });
            });
          }

          // get unique keys
          const uniqueKeyConstraints = yield cmds.getUniqueKeyConstraints(knex, schema.name);
          if (uniqueKeyConstraints.length > 0) {
            schema.uniqueKeys = uniqueKeyConstraints;
          }
        }

        return db;
      });
    },
  };
}

const mssqlExtractor = extractor();
export default mssqlExtractor;
