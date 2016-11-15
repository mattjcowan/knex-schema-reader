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
          catalog: (yield cmds.getCatalog(knex))[0].name,
          dataTypes: _.keyBy(yield cmds.getDataTypes(knex), 'typeName'),
          schemas: {},
        };

        // get database users
        // db.users = _.map(yield cmds.getUsers(knex), 'name');

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
          const schemaTableColumns = _.map(yield cmds.getTableColumns(knex, schema.name), function (row) {
            return {
              table: row.table,
              name: row.name,
              description: '', // gets populated later
              ordinal: row.ordinal,
              dataType: row.dataType,
              maxLength: row.maxLength,
              precision: row.precision,
              scale: row.scale,
              dateTimePrecision: row.dateTimePrecision,
              characterSet: row.characterSet,
              collation: row.collation,
              isNullable: row.isNullable === 1,
              default: row.default ? { expression: row.default } : null, // gets populated later
              isIdentity: false, // gets populated later
              isPrimaryKey: false, // gets populated later
              isComputed: false, // gets populated later
              isPartOfUniqueKey: false, // gets populated later
              isUnique: false, // gets populated later
              isForeignKey: false // gets populated later
            };
          });
          _.forEach(schema.tables, function (table) {
            table.columns = _.keyBy(_.filter(schemaTableColumns, { table: table.name }), 'name');
            // remove the table property
            _.forEach(table.columns, function (col) {
              _.unset(col, 'schema');
              _.unset(col, 'table');
            });
          });

          // get schema views
          const views = yield cmds.getViews(knex, schemaName);
          const viewSources = _.keyBy(yield cmds.getViewSources(knex, schema.name), 'name');
          if (views.length > 0) {
            schema.views = _.keyBy(_.map(views, function (v) {
              return {
                name: v.name,
                description: v.description,
                sql: viewSources[v.name].sql
              };
            }), 'name');
          }

          // get schema view columns
          const schemaViewColumns = _.map(yield cmds.getViewColumns(knex, schema.name), function (row) {
            return {
              view: row.view,
              name: row.name,
              ordinal: row.ordinal,
              dataType: row.dataType,
              maxLength: row.maxLength,
              precision: row.precision,
              scale: row.scale,
              dateTimePrecision: row.dateTimePrecision,
              characterSet: row.characterSet,
              collation: row.collation,
              isNullable: row.isNullable === 1
            };
          });
          _.forEach(schema.views, function (view) {
            view.columns = _.keyBy(_.filter(schemaViewColumns, { view: view.name }), 'name');
            // remove the view property
            _.forEach(view.columns, function (col) {
              _.unset(col, 'schema');
              _.unset(col, 'view');
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
          const schemaComputedColumnDefinitions = yield cmds.getComputedColumnDefinitions(knex, schema.name);

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
            const idc = schema.tables[idcd.table].columns[idcd.column];
            idc.isIdentity = true;
            idc.identity = {
              seed: idcd.seed,
              increment: idcd.increment,
            };
          });

          // get check constraints
          const checkConstraints = yield cmds.getCheckConstraints(knex, schema.name);
          const checkConstraintDescriptions = yield cmds.getCheckConstraintDescriptions(knex, schema.name);
          if (checkConstraints.length > 0) {
            _.forEach(schema.tables, function (table) {
              const tableCheckConstraints = _.filter(checkConstraints, { table: table.name });
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
              if (!idx[0].isPrimary === 1) {
                const table = schema.tables[idx[0].table];
                const idxc = {
                  name: idxName,
                  columnCount: idx.length,
                  columns: _.map(idx, 'column'),
                  type: idx[0].type,
                  isUnique: idx[0].isUnique === 1,
                };
                table.indexes = table.indexes || {};
                table.indexes[idxName] = idxc;
                _.forEach(idxc.columns, function (idxcc) {
                  table.columns[idxcc].isPartOfIndex = true;
                  if (idxc.isUnique) {
                    table.columns[idxcc].isUnique = true;
                  }
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
                updateRule: fkc.updateRule,
              };
            }), 'name');
            _.forEach(schema.foreignKeys, function (fk) {
              const fkc = schema.tables[fk.fkTableName].columns[fk.fkColumnName];
              fkc.isForeignKey = true;
              fkc.foreignKeyName = fk.name;

              const pkt = db.schemas[fk.pkSchemaName].tables[fk.pkTableName];
              pkt.reverseForeignKeys = pkt.reverseForeignKeys || [];
              pkt.reverseForeignKeys.push({
                name: fk.name,
                schemaName: fk.fkSchemaName,
                tableName: fk.fkTableName,
                columnName: fk.fkColumnName,
              });
            });
          }

          // get schema functions
          const functions = _.map(yield cmds.getFunctions(knex, schemaName), function (row) {
            return {
              name: row.name,
              sql: row.sql
            };
          });
          if (functions.length > 0) {
            schema.functions = _.keyBy(functions, 'name');
          }

          // get schema procedures
          const procedures = _.map(yield cmds.getStoredProcedures(knex, schemaName), function (row) {
            return {
              name: row.name,
              sql: row.sql
            };
          });
          if (procedures.length > 0) {
            schema.procedures = _.keyBy(procedures, 'name');
          }

          // get procedure arguments
          const procedureArguments = yield cmds.getProcedureArguments(knex, schemaName);
          if (procedureArguments.length > 0) {
            _.forEach(_.groupBy(procedureArguments, 'procedureName'), function (groupedArguments, procedureName) {
              const pargs = _.map(groupedArguments, function (parg) {
                return {
                  name: parg.parameterName,
                  ordinal: parg.ordinal,
                  isIn: parg.parameterMode && parg.parameterMode.indexOf('IN') >= 0, // can be INOUT
                  isOut: parg.parameterMode && parg.parameterMode.indexOf('OUT') >= 0, // can be INOUT
                  isResult: parg.isResult === 1,
                  asLocator: parg.asLocator === 1,
                  dataType: parg.dataType,
                  maxLength: parg.maxLength,
                  precision: parg.precision,
                  scale: parg.scale,
                  dateTimePrecision: parg.dateTimePrecision,
                  characterSet: parg.characterSetName,
                  collation: parg.collation,
                };
              });

              if (schema.functions && schema.functions[procedureName]) {
                schema.functions[procedureName].arguments = pargs;
              } else if (schema.procedures && schema.procedures[procedureName]) {
                schema.procedures[procedureName].arguments = pargs;
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
