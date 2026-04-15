import React, { useState, useEffect } from 'react';
import { Database, Table, Play, AlertCircle, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/src/components/ui/modal';
import { Button } from '@/src/components/ui/button';

export function DatabaseManager() {
  const [tables, setTables] = useState<{ name: string }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'schema' | 'sql'>('data');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchSchema(selectedTable);
      if (activeTab === 'data') {
        fetchTableData(selectedTable);
      }
    }
  }, [selectedTable, activeTab]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/db/tables');
      const data = await res.json();
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].name);
      }
    } catch (error) {
      toast.error("Failed to fetch tables");
    }
  };

  const fetchSchema = async (tableName: string) => {
    try {
      const res = await fetch(`/api/db/schema/${tableName}`);
      const data = await res.json();
      setSchema(data);
    } catch (error) {
      toast.error("Failed to fetch schema");
    }
  };

  const fetchTableData = async (tableName: string) => {
    try {
      // Check if table has 'id' or 'created_at' for sorting
      const orderBy = tableName === 'suspended_flows' ? 'created_at' : 'id';
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `SELECT * FROM ${tableName} ORDER BY ${orderBy} DESC LIMIT 100` })
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setTableData(data);
    } catch (error) {
      toast.error("Failed to fetch table data");
    }
  };

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryError(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      });
      const data = await res.json();
      if (!res.ok) {
        setQueryError(data.error || "Query failed");
        setQueryResults(null);
      } else {
        setQueryResults(data);
        toast.success("Query executed successfully");
      }
    } catch (error: any) {
      setQueryError(error.message || "Query failed");
      setQueryResults(null);
    }
  };

  const handleAddRow = () => {
    setEditingRow(null);
    const initialData: Record<string, any> = {};
    schema.forEach(col => {
      if (!col.pk) {
        initialData[col.name] = '';
      }
    });
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleEditRow = (row: any) => {
    setEditingRow(row);
    setFormData({ ...row });
    setIsModalOpen(true);
  };

  const handleDeleteRow = async (row: any) => {
    const pkCol = schema.find(c => c.pk);
    if (!pkCol) {
      toast.error("无法删除：未找到主键");
      return;
    }

    try {
      const pkValue = typeof row[pkCol.name] === 'string' ? `'${row[pkCol.name]}'` : row[pkCol.name];
      const query = `DELETE FROM ${selectedTable} WHERE ${pkCol.name} = ${pkValue}`;
      
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("删除成功");
      fetchTableData(selectedTable!);
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const handleSaveRow = async () => {
    if (!selectedTable) return;
    
    try {
      let query = '';
      if (editingRow) {
        // Update
        const pkCol = schema.find(c => c.pk);
        if (!pkCol) throw new Error("No primary key found");
        
        const updates = Object.entries(formData)
          .filter(([key]) => key !== pkCol.name)
          .map(([key, val]) => {
            const formattedVal = val === '' || val === null ? 'NULL' : (typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val);
            return `${key} = ${formattedVal}`;
          })
          .join(', ');
          
        const pkValue = typeof editingRow[pkCol.name] === 'string' ? `'${editingRow[pkCol.name]}'` : editingRow[pkCol.name];
        query = `UPDATE ${selectedTable} SET ${updates} WHERE ${pkCol.name} = ${pkValue}`;
      } else {
        // Insert
        const keys = Object.keys(formData).filter(k => formData[k] !== '');
        const values = keys.map(k => {
          const val = formData[k];
          return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });
        
        query = `INSERT INTO ${selectedTable} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
      }

      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      
      toast.success(editingRow ? "更新成功" : "添加成功");
      setIsModalOpen(false);
      fetchTableData(selectedTable);
    } catch (error: any) {
      toast.error(error.message || "保存失败");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据管理</h1>
          <p className="text-sm text-gray-500">管理和查询本地 SQLite 数据库中的表和数据</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar - Tables */}
        <div className="w-64 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Table className="w-4 h-4" />
              数据表 ({tables.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {tables.map(table => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedTable === table.name 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {table.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center border-b border-gray-200 px-4 shrink-0">
            <button 
              onClick={() => setActiveTab('data')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              数据预览
            </button>
            <button 
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schema' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              表结构
            </button>
            <button 
              onClick={() => setActiveTab('sql')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sql' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              SQL 查询
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'data' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-gray-200 flex justify-end shrink-0">
                  <Button onClick={handleAddRow} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    添加数据
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-0">
                  {tableData.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">暂无数据</div>
                  ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          {Object.keys(tableData[0]).map(key => (
                            <th key={key} className="px-4 py-3 font-medium text-gray-700">{key}</th>
                          ))}
                          <th className="px-4 py-3 font-medium text-gray-700 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {tableData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-2 text-gray-600">
                                {val !== null ? String(val) : <span className="text-gray-400 italic">null</span>}
                              </td>
                            ))}
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditRow(row)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRow(row)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">字段名 (name)</th>
                      <th className="px-4 py-3 font-medium text-gray-700">类型 (type)</th>
                      <th className="px-4 py-3 font-medium text-gray-700">非空 (notnull)</th>
                      <th className="px-4 py-3 font-medium text-gray-700">默认值 (dflt_value)</th>
                      <th className="px-4 py-3 font-medium text-gray-700">主键 (pk)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {schema.map((col, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-600">{col.name}</td>
                        <td className="px-4 py-3 text-gray-600">{col.type}</td>
                        <td className="px-4 py-3 text-gray-600">{col.notnull ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-gray-600">{col.dflt_value || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{col.pk ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'sql' && (
              <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
                <div className="shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">输入 SQL 语句 (仅支持 SELECT)</label>
                  <div className="relative">
                    <textarea 
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder={`SELECT * FROM ${selectedTable || 'table_name'} LIMIT 10;`}
                      className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <button 
                      onClick={executeQuery}
                      className="absolute bottom-3 right-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      执行查询
                    </button>
                  </div>
                </div>

                {queryError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800 font-mono break-all">{queryError}</div>
                  </div>
                )}

                {queryResults && (
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 shrink-0">
                      查询结果 ({queryResults.length} 行)
                    </div>
                    <div className="flex-1 overflow-auto">
                      {queryResults.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">查询结果为空</div>
                      ) : (
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <tr>
                              {Object.keys(queryResults[0]).map(key => (
                                <th key={key} className="px-4 py-2 font-medium text-gray-700">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {queryResults.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                {Object.values(row).map((val: any, j) => (
                                  <td key={j} className="px-4 py-1.5 text-gray-600">
                                    {val !== null ? String(val) : <span className="text-gray-400 italic">null</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRow ? "编辑数据" : "添加数据"}
      >
        <div className="space-y-4">
          {schema.map(col => {
            if (col.pk && !editingRow) return null; // Don't show PK for insert if it's auto-increment usually
            return (
              <div key={col.name} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {col.name} {col.pk && <span className="text-xs text-gray-400">(主键)</span>}
                </label>
                <input
                  type="text"
                  value={formData[col.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                  disabled={col.pk && editingRow}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            );
          })}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button onClick={handleSaveRow}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
