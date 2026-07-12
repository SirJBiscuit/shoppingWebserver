import React, { useState, useEffect } from 'react';
import { 
  Database, Plus, Trash2, Save, Download, Play, 
  Table, Columns, Key, Link, FileText, AlertCircle
} from 'lucide-react';

const DatabaseSchemaEditor = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [migrationSQL, setMigrationSQL] = useState('');
  const [showSQL, setShowSQL] = useState(false);

  const dataTypes = [
    'INTEGER', 'BIGINT', 'SERIAL', 'BIGSERIAL',
    'VARCHAR', 'TEXT', 'CHAR',
    'BOOLEAN',
    'DATE', 'TIMESTAMP', 'TIME',
    'DECIMAL', 'NUMERIC', 'REAL', 'DOUBLE PRECISION',
    'JSON', 'JSONB',
    'UUID',
    'ARRAY'
  ];

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/admin/database/tables', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const createNewTable = () => {
    const name = prompt('Enter table name (lowercase, use underscores):');
    if (!name) return;

    const newTable = {
      id: Date.now(),
      name,
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true },
        { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP', nullable: false }
      ],
      indexes: [],
      foreignKeys: [],
      isNew: true
    };
    
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
  };

  const addColumn = () => {
    if (!selectedTable) return;
    
    const name = prompt('Enter column name:');
    if (!name) return;

    const newColumn = {
      name,
      type: 'VARCHAR(255)',
      nullable: true,
      unique: false,
      default: null,
      primaryKey: false
    };

    const updated = {
      ...selectedTable,
      columns: [...selectedTable.columns, newColumn]
    };
    
    setSelectedTable(updated);
    setTables(tables.map(t => t.id === updated.id ? updated : t));
  };

  const updateColumn = (index, field, value) => {
    const updated = { ...selectedTable };
    updated.columns[index][field] = value;
    setSelectedTable(updated);
    setTables(tables.map(t => t.id === updated.id ? updated : t));
  };

  const deleteColumn = (index) => {
    const updated = {
      ...selectedTable,
      columns: selectedTable.columns.filter((_, i) => i !== index)
    };
    setSelectedTable(updated);
    setTables(tables.map(t => t.id === updated.id ? updated : t));
  };

  const addForeignKey = () => {
    const column = prompt('Enter column name:');
    if (!column) return;
    const refTable = prompt('Enter referenced table:');
    if (!refTable) return;
    const refColumn = prompt('Enter referenced column (default: id):') || 'id';

    const fk = {
      column,
      refTable,
      refColumn,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    };

    const updated = {
      ...selectedTable,
      foreignKeys: [...(selectedTable.foreignKeys || []), fk]
    };
    
    setSelectedTable(updated);
    setTables(tables.map(t => t.id === updated.id ? updated : t));
  };

  const addIndex = () => {
    const columns = prompt('Enter column name(s) separated by comma:');
    if (!columns) return;
    const name = prompt('Enter index name:') || `idx_${selectedTable.name}_${columns.replace(/,/g, '_')}`;

    const index = {
      name,
      columns: columns.split(',').map(c => c.trim()),
      unique: window.confirm('Should this be a unique index?')
    };

    const updated = {
      ...selectedTable,
      indexes: [...(selectedTable.indexes || []), index]
    };
    
    setSelectedTable(updated);
    setTables(tables.map(t => t.id === updated.id ? updated : t));
  };

  const generateMigrationSQL = () => {
    if (!selectedTable) return;

    let sql = `-- Migration: Create ${selectedTable.name} table\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${selectedTable.name} (\n`;
    
    // Columns
    selectedTable.columns.forEach((col, idx) => {
      sql += `  ${col.name} ${col.type}`;
      if (col.primaryKey) sql += ' PRIMARY KEY';
      if (!col.nullable) sql += ' NOT NULL';
      if (col.unique && !col.primaryKey) sql += ' UNIQUE';
      if (col.default) sql += ` DEFAULT ${col.default}`;
      if (idx < selectedTable.columns.length - 1 || (selectedTable.foreignKeys && selectedTable.foreignKeys.length > 0)) {
        sql += ',';
      }
      sql += '\n';
    });
    
    // Foreign Keys
    if (selectedTable.foreignKeys && selectedTable.foreignKeys.length > 0) {
      selectedTable.foreignKeys.forEach((fk, idx) => {
        sql += `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn})`;
        sql += ` ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`;
        if (idx < selectedTable.foreignKeys.length - 1) sql += ',';
        sql += '\n';
      });
    }
    
    sql += `);\n\n`;
    
    // Indexes
    if (selectedTable.indexes && selectedTable.indexes.length > 0) {
      selectedTable.indexes.forEach(index => {
        sql += `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${selectedTable.name}(${index.columns.join(', ')});\n`;
      });
      sql += '\n';
    }
    
    // Comments
    sql += `COMMENT ON TABLE ${selectedTable.name} IS 'Auto-generated table';\n`;
    
    setMigrationSQL(sql);
    setShowSQL(true);
  };

  const executeMigration = async () => {
    if (!migrationSQL) {
      alert('Generate SQL first');
      return;
    }

    if (!window.confirm('Execute this migration? This will modify the database!')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/database/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (response.ok) {
        alert('Migration executed successfully!');
        loadTables();
      } else {
        const error = await response.json();
        alert(`Migration failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error executing migration:', error);
      alert('Failed to execute migration');
    }
  };

  const downloadMigration = () => {
    if (!migrationSQL) return;
    
    const blob = new Blob([migrationSQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${Date.now()}_create_${selectedTable?.name}.sql`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Database Schema Editor</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Design and modify database tables visually
            </p>
          </div>
        </div>
        <button onClick={createNewTable} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Table</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="font-bold mb-4 flex items-center">
            <Table className="w-5 h-5 mr-2" />
            Tables
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedTable?.id === table.id
                    ? 'bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-600'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{table.name}</div>
                <div className="text-xs text-gray-500">
                  {table.columns?.length || 0} columns
                </div>
                {table.isNew && (
                  <span className="text-xs text-green-600">New</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table Editor */}
        {selectedTable && (
          <div className="lg:col-span-3 space-y-6">
            {/* Table Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Table: {selectedTable.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Columns className="w-4 h-4" />
                <span>{selectedTable.columns.length} columns</span>
                <span>•</span>
                <Key className="w-4 h-4" />
                <span>{selectedTable.foreignKeys?.length || 0} foreign keys</span>
                <span>•</span>
                <FileText className="w-4 h-4" />
                <span>{selectedTable.indexes?.length || 0} indexes</span>
              </div>
            </div>

            {/* Columns */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Columns</h3>
                <button onClick={addColumn} className="text-sm text-purple-600 hover:text-purple-800">
                  + Add Column
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Nullable</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Unique</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Default</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedTable.columns.map((col, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                            className="input-field text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={col.type}
                            onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                            className="input-field text-sm"
                          >
                            {dataTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={col.nullable}
                            onChange={(e) => updateColumn(idx, 'nullable', e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={col.unique}
                            onChange={(e) => updateColumn(idx, 'unique', e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={col.default || ''}
                            onChange={(e) => updateColumn(idx, 'default', e.target.value)}
                            className="input-field text-sm"
                            placeholder="NULL"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => deleteColumn(idx)}
                            className="text-red-600 hover:text-red-800"
                            disabled={col.primaryKey}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Foreign Keys */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center">
                  <Link className="w-5 h-5 mr-2" />
                  Foreign Keys
                </h3>
                <button onClick={addForeignKey} className="text-sm text-purple-600 hover:text-purple-800">
                  + Add Foreign Key
                </button>
              </div>
              
              <div className="space-y-2">
                {selectedTable.foreignKeys?.map((fk, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <div className="font-mono text-sm">
                      {fk.column} → {fk.refTable}.{fk.refColumn}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ON DELETE {fk.onDelete} | ON UPDATE {fk.onUpdate}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Indexes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Indexes</h3>
                <button onClick={addIndex} className="text-sm text-purple-600 hover:text-purple-800">
                  + Add Index
                </button>
              </div>
              
              <div className="space-y-2">
                {selectedTable.indexes?.map((index, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{index.name}</span>
                      {index.unique && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">UNIQUE</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Columns: {index.columns.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate SQL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Migration SQL</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={generateMigrationSQL}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Generate
                  </button>
                  {migrationSQL && (
                    <>
                      <button
                        onClick={downloadMigration}
                        className="btn-secondary text-sm"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={executeMigration}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                      >
                        Execute
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {showSQL && migrationSQL && (
                <>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Warning:</strong> Executing migrations will modify your database. Always backup first!
                    </div>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
                    {migrationSQL}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSchemaEditor;
