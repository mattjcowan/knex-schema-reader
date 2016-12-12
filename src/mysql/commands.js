/* eslint-disable prefer-template, no-tabs */

function commands() {
  function getConstraints(knex, schemaOwner, tableName, constraintType) {
    const sql = `SELECT DISTINCT
                  cons.constraint_name as 'name', 
                  cons.constraint_schema as 'schema',
                  keycolumns.table_name as 'table', 
                  column_name as 'column', 
                  ordinal_position as 'ordinal', 
                  refs.unique_constraint_name as 'ucName', 
                  cons2.table_name AS ucTable,
                  cons2.table_schema AS ucSchema,
                  refs.delete_rule AS deleteRule,
                  refs.update_rule AS updateRule
                  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons
                      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS keycolumns
                          ON (cons.constraint_catalog = keycolumns.constraint_catalog
                              OR cons.constraint_catalog IS NULL) AND
                          cons.constraint_schema = keycolumns.constraint_schema AND
                          cons.constraint_name = keycolumns.constraint_name AND
                          cons.table_name = keycolumns.table_name
                      LEFT OUTER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS refs
                          ON (cons.constraint_catalog = refs.constraint_catalog
                              OR cons.constraint_catalog IS NULL) AND
                          cons.constraint_schema = refs.constraint_schema AND
                          cons.constraint_name = refs.constraint_name
                      LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons2
                          ON (cons2.constraint_catalog = refs.constraint_catalog
                              OR cons2.constraint_catalog IS NULL) AND
                          cons2.constraint_schema = refs.unique_constraint_schema AND
                          cons2.constraint_name = refs.unique_constraint_name AND
		                      cons2.table_name = refs.referenced_table_name
                  WHERE ` +
      (schemaOwner && schemaOwner.length > 0 ? '(cons.constraint_schema = :schemaOwner) AND ' : '') +
      (tableName && tableName.length > 0 ? '(keycolumns.table_name = :tableName) AND ' : '') + `
                      cons.constraint_type = :constraintType
                  ORDER BY
                      cons.constraint_schema, keycolumns.table_name, cons.constraint_name, ordinal_position`;
    return knex.raw(sql, {
      schemaOwner, tableName, constraintType,
    });
  }

  return {

    getTables: (knex, schemaOwner) => {
      const sql = `SELECT 
                        TABLE_SCHEMA as 'schema',
                        TABLE_NAME as 'name',
                        TABLE_COMMENT as 'description'
                   FROM INFORMATION_SCHEMA.TABLES
                   WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(TABLE_SCHEMA = :schemaOwner) AND ' : '') + `
                      TABLE_TYPE = 'BASE TABLE' 
                   ORDER BY TABLE_SCHEMA, TABLE_NAME
                    `;
      return knex.raw(sql, { schemaOwner });
    },

    getViewColumns: (knex, schemaOwner, viewName) => {
      const sql = `
        SELECT 
          c.TABLE_SCHEMA as 'schema', 
          c.TABLE_NAME as 'view', 
          COLUMN_NAME as 'name', 
          ORDINAL_POSITION as 'ordinal', 
          COLUMN_DEFAULT as 'default', 
          (IS_NULLABLE <> 'NO') as 'isNullable', 
          DATA_TYPE as 'dataType', 
          COLUMN_TYPE as 'dataTypeDescriptor',
          CHARACTER_MAXIMUM_LENGTH as 'maxLength', 
          NUMERIC_PRECISION as 'precision', 
          NUMERIC_SCALE as 'scale', 
          COLUMN_COMMENT as 'description',
          DATETIME_PRECISION as 'dateTimePrecision',
          CHARACTER_SET_NAME as 'characterSet',
          COLLATION_NAME as 'collation'
        FROM INFORMATION_SCHEMA.COLUMNS c
          JOIN INFORMATION_SCHEMA.VIEWS t 
           ON 
              c.TABLE_SCHEMA = t.TABLE_SCHEMA AND 
              c.TABLE_NAME = t.TABLE_NAME
        where ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (viewName && viewName.length > 0 ? '(c.TABLE_NAME = :viewName) AND ' : '') + `
            0 = 0
         order by 
            c.TABLE_SCHEMA, c.TABLE_NAME, ORDINAL_POSITION`;
      return knex.raw(sql, { schemaOwner, viewName });
    },

    getTableColumns: (knex, schemaOwner, tableName) => {
      const sql = `
        SELECT 
          c.TABLE_SCHEMA as 'schema', 
          c.TABLE_NAME as 'table', 
          COLUMN_NAME as 'name', 
          ORDINAL_POSITION as 'ordinal', 
          COLUMN_DEFAULT as 'default', 
          (IS_NULLABLE <> 'NO') as 'isNullable', 
          DATA_TYPE as 'dataType', 
          COLUMN_TYPE as 'dataTypeDescriptor',
          CHARACTER_MAXIMUM_LENGTH as 'maxLength', 
          NUMERIC_PRECISION as 'precision', 
          NUMERIC_SCALE as 'scale', 
          COLUMN_COMMENT as 'description',
          DATETIME_PRECISION as 'dateTimePrecision',
          CHARACTER_SET_NAME as 'characterSet',
          COLLATION_NAME as 'collation'
        FROM INFORMATION_SCHEMA.COLUMNS c
          JOIN INFORMATION_SCHEMA.TABLES t 
           ON 
              c.TABLE_SCHEMA = t.TABLE_SCHEMA AND 
              c.TABLE_NAME = t.TABLE_NAME
        where ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(c.TABLE_NAME = :tableName) AND ' : '') + `
            t.TABLE_TYPE = 'BASE TABLE'
         order by 
            c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getComputedColumnDefinitions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                      c.TABLE_SCHEMA AS 'schema', 
                      c.TABLE_NAME AS 'table', 
                      c.COLUMN_NAME AS 'column',
                      c.GENERATION_EXPRESSION as 'definition'
                    FROM information_schema.columns c
                      JOIN information_schema.TABLES t on 
                        c.TABLE_SCHEMA = t.TABLE_SCHEMA AND
                        c.TABLE_NAME = t.TABLE_NAME
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(c.TABLE_NAME = :tableName) AND ' : '') + `
                        t.TABLE_TYPE = 'BASE TABLE' AND c.GENERATION_EXPRESSION  <> ''
                    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getIdentityDefinitions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                      c.TABLE_SCHEMA AS 'schema', 
                      c.TABLE_NAME AS 'table', 
                      c.COLUMN_NAME AS 'column',
                      1 as 'seed',
                      1 as 'increment'
                    FROM information_schema.columns c
                      JOIN information_schema.TABLES t on 
                        c.TABLE_SCHEMA = t.TABLE_SCHEMA AND
                        c.TABLE_NAME = t.TABLE_NAME
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(c.TABLE_NAME = :tableName) AND ' : '') + `
                      t.TABLE_TYPE = 'BASE TABLE' AND c.EXTRA = 'auto_increment'
                    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    // getCheckConstraints: (knex, schemaOwner, tableName) => {
    //   const sql = `SELECT
    //                 cons.constraint_name as 'name',
    //                 cons.constraint_schema as 'schema',
    //                 cons.table_name as 'table',
    //                 cons2.check_clause AS 'expression'
    //                 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons
    //                 INNER JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS AS cons2
    //                  ON cons2.constraint_catalog = cons.constraint_catalog AND
    //                   cons2.constraint_schema = cons.constraint_schema AND
    //                   cons2.constraint_name = cons.constraint_name
    //                 WHERE  ` +
    //     (schemaOwner && schemaOwner.length > 0 ? '(cons.constraint_schema = :schemaOwner) AND ' : '') +
    //     (tableName && tableName.length > 0 ? '(cons.table_name = :tableName) AND ' : '') + `
    //                      cons.constraint_type = 'CHECK'
    //                 ORDER BY cons.table_name, cons.constraint_name
    //                 `;
    //   return knex.raw(sql, { schemaOwner, tableName });
    // },

    getIndexes: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                         TABLE_SCHEMA as 'schema',
                         TABLE_NAME as 'table',
                         concat(TABLE_NAME, '.', INDEX_NAME) as 'long_name',
                         INDEX_NAME as 'name',
                         COLUMN_NAME as 'column',
                         SEQ_IN_INDEX as 'ordinal',
                         INDEX_TYPE as 'type',
                         (INDEX_NAME = 'PRIMARY') as 'isPrimary',
                         NON_UNIQUE as 'isUnique'
                    FROM 
                         INFORMATION_SCHEMA.STATISTICS 
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(TABLE_NAME = :tableName) AND ' : '') + `
                        0 = 0
                    ORDER BY 
                         TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    // getCheckConstraintDescriptions: (knex, schemaOwner, tableName) => {
    //   const sql = `SELECT
    //               s.name as 'schema',
    //               OBJECT_NAME(o.parent_obj) as 'table',
    //               cc.name as 'name',
    //               p.value as 'description'
    //               FROM sysobjects o
    //               INNER JOIN sys.check_constraints cc ON o.id = cc.object_id
    //               INNER JOIN  sys.schemas s
    //               ON s.schema_id = o.uid
    //               LEFT JOIN sys.extended_properties p
    //               ON p.major_id = cc.object_id
    //               AND	p.name = 'MS_Description'
    //               WHERE ` +
    //     (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
    //     (tableName && tableName.length > 0 ? '(OBJECT_NAME(o.parent_obj) = :tableName) AND ' : '') + `
    //               o.type= 'C'
    //               ORDER BY s.name, o.name`;
    //   return knex.raw(sql, { schemaOwner, tableName });
    // },

    getForeignKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'FOREIGN KEY'),

    getUniqueKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'UNIQUE'),

    getPrimaryKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'PRIMARY KEY'),

    getDefaultConstraints: (knex, schemaOwner, tableName) => {
      const sql = `
        SELECT  c.table_schema as 'schema', 
                c.table_name as 'table', 
                c.column_name as 'column', 
                '' as 'name', 
                c.column_default as 'expression', 
                c.extra as 'extra' 
        FROM information_schema.COLUMNS c
          JOIN information_schema.TABLES t on 
            c.TABLE_SCHEMA = t.TABLE_SCHEMA AND
            c.TABLE_NAME = t.TABLE_NAME
        WHERE ` +
          (schemaOwner && schemaOwner.length > 0 ? '(c.table_schema = :schemaOwner) AND ' : '') +
          (tableName && tableName.length > 0 ? '(c.table_name = :tableName) AND ' : '') + `
          t.table_type = 'BASE TABLE' AND c.column_default is not null
        ORDER BY c.table_schema, c.table_name, c.column_name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getUsers: (knex) => {
      const sql = `SELECT User as 'name' FROM mysql.user`; // be careful: MUST BE ADMIN to run this query
      return knex.raw(sql);
    },

    getDataTypes: (knex) => {
      const sql = `SELECT DISTINCT
                      c.DATA_TYPE as 'typeName', false as 'isUserDefined', false as 'isAssemblyType', 
                      (!isnull(c.CHARACTER_MAXIMUM_LENGTH) && c.CHARACTER_MAXIMUM_LENGTH > 0) as 'hasMaxLength', 
                      (!isnull(c.NUMERIC_PRECISION) && c.NUMERIC_PRECISION > 0) as 'hasPrecision', 
                      (!isnull(c.NUMERIC_SCALE) && c.NUMERIC_SCALE > 0) as 'hasScale'
                    FROM INFORMATION_SCHEMA.COLUMNS c
                      JOIN information_schema.TABLES t on 
                        c.TABLE_SCHEMA = t.TABLE_SCHEMA AND
                        c.TABLE_NAME = t.TABLE_NAME
                    WHERE t.table_type = 'BASE TABLE'
                    ORDER BY c.DATA_TYPE`;
      return knex.raw(sql);
    },

    getCatalog: knex => knex.raw(`select DATABASE() as 'name'`),

    getVersionInfo: (knex) => {
      const sql = `SHOW VARIABLES LIKE '%version%'`;
      return knex.raw(sql);
    },

    getSchemas: (knex) => {
      const sql = `SELECT distinct schema_name as 'name' from INFORMATION_SCHEMA.SCHEMATA 
                   WHERE schema_name not in ('information_schema', 'mysql', 'performance_schema', 'sys')`;
      return knex.raw(sql);
    },

    getFunctions: (knex, schemaOwner) => {
      const sql = `SELECT
                      ROUTINE_SCHEMA as 'schema',
                      ROUTINE_NAME as 'name',
                      ROUTINE_COMMENT as 'description',
                      ROUTINE_DEFINITION as 'sql',
                      ROUTINE_BODY as 'language',
                      DATA_TYPE as 'dataType',
                      DTD_IDENTIFIER as 'dataTypeDescriptor',
                      CHARACTER_MAXIMUM_LENGTH as 'maxLength',
                      CHARACTER_OCTET_LENGTH as 'characterOctetLength',
                      NUMERIC_PRECISION as 'precision',
                      NUMERIC_SCALE as 'scale',
                      DATETIME_PRECISION as 'dateTimePrecision',
                      COLLATION_NAME as 'collation',
                      CHARACTER_SET_NAME as 'characterSetName'
                    FROM INFORMATION_SCHEMA.ROUTINES
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(ROUTINE_SCHEMA = :schemaOwner) AND ' : '') + `
                          (ROUTINE_TYPE = 'FUNCTION')
                    ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getStoredProcedures: (knex, schemaOwner) => {
      const sql = `SELECT
                      ROUTINE_SCHEMA as 'schema',
                      ROUTINE_NAME as 'name',
                      ROUTINE_COMMENT as 'description',
                      ROUTINE_DEFINITION as 'sql',
                      ROUTINE_BODY as 'language',
                      DATA_TYPE as 'dataType',
                      DTD_IDENTIFIER as 'dataTypeDescriptor',
                      CHARACTER_MAXIMUM_LENGTH as 'maxLength',
                      CHARACTER_OCTET_LENGTH as 'characterOctetLength',
                      NUMERIC_PRECISION as 'precision',
                      NUMERIC_SCALE as 'scale',
                      DATETIME_PRECISION as 'dateTimePrecision',
                      COLLATION_NAME as 'collation',
                      CHARACTER_SET_NAME as 'characterSetName'
                    FROM INFORMATION_SCHEMA.ROUTINES
                    WHERE ` +
                        (schemaOwner && schemaOwner.length > 0 ? '(ROUTINE_SCHEMA = :schemaOwner) AND ' : '') + `
                          (ROUTINE_TYPE = 'PROCEDURE')
                    ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getProcedureArguments: (knex, schemaOwner) => {
      const sql = `SELECT
                      SPECIFIC_SCHEMA as 'schema',
                      SPECIFIC_NAME as 'procedureName',
                      PARAMETER_NAME as 'parameterName',
                      ORDINAL_POSITION as 'ordinal',
                      PARAMETER_MODE as 'parameterMode',
                      DATA_TYPE as 'dataType',
                      DTD_IDENTIFIER as 'dataTypeDescriptor',
                      CHARACTER_MAXIMUM_LENGTH as 'maxLength',
                      CHARACTER_OCTET_LENGTH as 'characterOctetLength',
                      NUMERIC_PRECISION as 'precision',
                      NUMERIC_SCALE as 'scale',
                      DATETIME_PRECISION as 'dateTimePrecision',
                      COLLATION_NAME as 'collation',
                      CHARACTER_SET_NAME as 'characterSetName'
                    FROM INFORMATION_SCHEMA.PARAMETERS
                      WHERE (SPECIFIC_SCHEMA = :schemaOwner) AND
                            PARAMETER_MODE IS NOT NULL
                    ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME, ORDINAL_POSITION, PARAMETER_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getViews: (knex, schemaOwner) => {
      const sql = `SELECT 
                      TABLE_SCHEMA as 'schema', 
                      TABLE_NAME as 'name', 
                      '' as 'description', 
                      VIEW_DEFINITION as 'sql'
                   FROM INFORMATION_SCHEMA.VIEWS
                   WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(TABLE_SCHEMA = :schemaOwner) ' : '') + `
                   ORDER BY TABLE_SCHEMA, TABLE_NAME
                    `;
      return knex.raw(sql, { schemaOwner });
    },


  };
}

const CMDS = commands();
export default CMDS;
