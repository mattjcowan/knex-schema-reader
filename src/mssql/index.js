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

        // get database schemas, but only include schemas that have tables in the output,
        // we also want to pre-populate all the tables on each schema before we iterate
        // through and populate table details
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
          _.forEach(schema.tables, function (table) {
            table.columns = _.keyBy(_.filter(schemaColumns, { table: table.name }), 'name');
            _.forEach(table.columns, function (col) {
              _.unset(col, 'table');
              _.unset(col, 'default');
              col.isIdentity = false;
              col.isPrimaryKey = false; // this gets set later
              col.isComputed = false; // this gets set later
              col.isNullable = col.isNullable === 1; // we're changing the type here from int to bool (thank you javascript)
              col.isPartOfUniqueKey = false;
              col.isUnique = false;
              col.isForeignKey = false;
            });
          });
        }

        // now that all tables are populated on all schemas with their columns
        // let's get the rest of the info
        for (let i = 0; i < schemaNames.length; i++) {
          const schemaName = schemaNames[i];
          const schema = db.schemas[schemaName];
          if (!schema) continue;

          const schemaColumnDescriptions = yield cmds.getColumnDescriptions(knex, schema.name);
          const schemaColumnDefaultConstraint = yield cmds.getDefaultConstraints(knex, schema.name);
          const schemaColumnIdentityDefinitions = yield cmds.getIdentityDefinitions(knex, schema.name);
          const schemaComputedColumnDefinitions =
            yield cmds.getComputedColumnDefinitions(knex, schema.name);

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
          _.forEach(schemaColumnDefaultConstraint, function (scdc) {
            if (scdc.expression && scdc.expression.length > 0) {
              const dcc = schema.tables[scdc.table].columns[scdc.column];
              dcc.default = { expression: scdc.expression, contraintName: scdc.name };
            }
          });
          _.forEach(schemaColumnIdentityDefinitions, function (idcd) {
            let idc = schema.tables[idcd.table].columns[idcd.column];
            idc.isIdentity = true;
            idc.identity = {
              seed: idcd.seed,
              increment: idcd.increment
            };
          });

          // get check constraints
          const checkConstraints = yield cmds.getCheckConstraints(knex, schema.name);
          const checkConstraintDescriptions = yield cmds.getCheckConstraintDescriptions(knex, schema.name);
          if (checkConstraints.length > 0) {
            _.forEach(schema.tables, function (table) {
              var tableCheckConstraints = _.filter(checkConstraints, { table: table.name });
              if (tableCheckConstraints.length > 0) {
                table.checkConstraints = _.keyBy(tableCheckConstraints, 'name');
                _.forEach(table.checkConstraints, function (ck) {
                  _.unset(ck, 'schema');
                  _.unset(ck, 'table');
                });
              }
            });
            _.forEach(checkConstraintDescriptions, function (ccd) {
              if (ccd.description && ccd.description.length > 0) {
                schema.tables[ccd.table].checkConstraints[ccd.name].description = ccd.description;
              }
            });
          }

          // get indexes
          const indexes = yield cmds.getIndexes(knex, schema.name);
          if (indexes.length > 0) {
            _.forEach(_.groupBy(indexes, 'name'), function (idx, idxName) {
              if (!idx[0].isPrimary && !idx[0].isUnique) {
                const table = schema.tables[idx[0].table];
                const idxc = {
                  name: idxName,
                  columnCount: idx.length,
                  columns: _.map(idx, 'column'),
                  type: idx[0].type
                };
                table.indexes = table.indexes || {};
                table.indexes[idxName] = idxc;
                _.forEach(idxc.columns, function (idxcc) {
                  table.columns[idxcc].isPartOfIndex = true;
                });
              }
            });
          }


          // get primary key
          const primaryKeyConstraints = yield cmds.getPrimaryKeyConstraints(knex, schema.name);
          if (primaryKeyConstraints.length > 0) {
            _.forEach(_.groupBy(primaryKeyConstraints, 'name'), function (pk, pkName) {
              const table = schema.tables[pk[0].table];
              table.primaryKey = { name: pkName, columnCount: pk.length, columns: _.map(pk, 'column') };
              _.forEach(pk, function (pkc) {
                table.columns[pkc.column].isPartOfPrimaryKey = true;
              });
            });
          }

          // get unique keys
          const uniqueKeyConstraints = yield cmds.getUniqueKeyConstraints(knex, schema.name);
          if (uniqueKeyConstraints.length > 0) {
            _.forEach(_.groupBy(uniqueKeyConstraints, 'name'), function (uk, ukName) {
              const table = schema.tables[uk[0].table];
              const ukk = { name: ukName, columnCount: uk.length, columns: _.map(uk, 'column') };
              table.uniqueKeys = table.uniqueKeys || {};
              table.uniqueKeys[ukName] = ukk;
              _.forEach(ukk.columns, function (ukc) {
                table.columns[ukc].isPartOfUniqueKey = true;
                table.columns[ukc].uniqueKeyName = ukName;
              });
            });
          }

          // get sequences
          const hasSequences = yield cmds.hasSequences(knex, schema.name);
          if (hasSequences) {
            const sequences = yield cmds.getSequences(knex, schemaName);
            if (sequences.length > 0) {
              schema.sequences = _.keyBy(sequences, 'name');
            }
          }

          // get foreign keys
          const foreignKeyConstraints = yield cmds.getForeignKeyConstraints(knex, schema.name);
          if (foreignKeyConstraints.length > 0) {
            schema.foreignKeys = _.keyBy(_.map(foreignKeyConstraints, function (fkc) {
              return {
                name: fkc.name,
                fkSchemaName: fkc.schema,
                fkTableName: fkc.table,
                fkColumnName: fkc.column,
                pkSchemaName: fkc.ucSchema,
                pkTableName: fkc.ucTable,
                pkName: fkc.ucName,
                deleteRule: fkc.deleteRule,
                updateRule: fkc.updateRule
              };
            }), 'name');
            _.forEach(schema.foreignKeys, function (fk) {
              let fkc = schema.tables[fk.fkTableName].columns[fk.fkColumnName];
              fkc.isForeignKey = true;
              fkc.foreignKeyName = fk.name;

              let pkt = db.schemas[fk.pkSchemaName].tables[fk.pkTableName];
              pkt.reverseForeignKeys = pkt.reverseForeignKeys || [];
              pkt.reverseForeignKeys.push({
                name: fk.name,
                schemaName: fk.fkSchemaName,
                tableName: fk.fkTableName,
                columnName: fk.fkColumnName
              });
            });
          }

          // get schema functions
          const functions = yield cmds.getFunctions(knex, schemaName);
          if (functions.length > 0) {
            schema.functions = _.keyBy(functions, 'name');
          }

          // get schema procedures
          const procedures = yield cmds.getStoredProcedures(knex, schemaName);
          if (procedures.length > 0) {
            schema.procedures = _.keyBy(procedures, 'name');
          }

          // get procedure arguments
          const procedureArguments = yield cmds.getProcedureArguments(knex, schemaName);
          //schema.procedureArguments = procedureArguments;
          if (procedureArguments.length > 0) {
            _.forEach(_.groupBy(procedureArguments, 'procedureName'), function (pargs, procedureName) {
              var pargs = _.map(pargs, function(parg) {
                return {
                  name: parg.parameterName,
                  ordinal: parg.ordinal,
                  isIn: parg.parameterMode && parg.parameterMode.indexOf('IN') >= 0,
                  isOut: parg.parameterMode && parg.parameterMode.indexOf('OUT') >= 0, // can be INOUT
                  isResult: parg.isResult != 'NO',
                  asLocator: parg.asLocator != 'NO',
                  dataType: parg.dataType,
                  maxLength: parg.maxLength,
                  precision: parg.precision,
                  radix: parg.radix,
                  scale: parg.scale,
                  dateTimePrecision: parg.dateTimePrecision,
                  characterSet: parg.characterSetName,
                  characterOctetLength: parg.characterOctetLength,
                  collation: parg.collation
                };
              });

              let p;
              if(schema.functions && schema.functions[procedureName])
                p = schema.functions[procedureName];
              else if (schema.procedures && schema.procedures[procedureName])
                p = schema.procedures[procedureName];

              if (p) {
                p.arguments = pargs;
              }
            });
          }
        }

        return db;
      });
    },
  };
}

const mssqlExtractor = extractor();
export default mssqlExtractor;
