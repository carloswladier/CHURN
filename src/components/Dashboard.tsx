import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Filter, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Table as TableIcon, 
  X, 
  ChevronDown, 
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DashboardData, FilterState } from '../types';

const CLARO_RED = '#EE2E24';
const COLORS = [CLARO_RED, '#D12820', '#B5221B', '#991D17', '#7D1713', '#61120F'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    nm_cidade: [],
    tamanho_base: [],
    class_mes_vol_m3: [],
    class_6_meses_vol: [],
    criticidade: []
  });

  const [activeTab, setActiveTab] = useState<'charts' | 'table'>('charts');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DashboardData; direction: 'asc' | 'desc' } | null>({
    key: 'med_churn_total',
    direction: 'desc'
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];
        
        if (jsonData.length === 0) {
          setError('A planilha está vazia.');
          setIsLoading(false);
          return;
        }

        // Normalize keys to lowercase for easier filtering
        const normalizedData = jsonData.map(item => {
          const newItem: any = {};
          Object.keys(item).forEach(key => {
            newItem[key.toLowerCase()] = item[key];
          });
          return newItem as DashboardData;
        });

        // Basic validation: check if required columns exist
        const firstRow = normalizedData[0];
        const required = ['nm_cidade', 'med_churn_total', 'cd_node', 'outage', 'at1', 'cr_retencao', 'cr_tecnico', 'cr_financeiro', 'tamanho_base', 'class_mes_vol_m3', 'class_6_meses_vol', 'marc_unico', 'criticidade', 'desc_vol_mes', 'base_mes'];
        const missing = required.filter(r => !(r in firstRow));
        
        if (missing.length > 0) {
          setError(`Colunas ausentes na planilha: ${missing.join(', ')}`);
          setIsLoading(false);
          return;
        }

        // Filter by MARC_UNICO === 1
        const filteredByMarc = normalizedData.filter(item => Number(item.marc_unico) === 1);
        
        if (filteredByMarc.length === 0) {
          setError('Nenhum dado encontrado com MARC_UNICO igual a 1.');
          setIsLoading(false);
          return;
        }

        setData(filteredByMarc);
        setIsLoading(false);
      } catch (err) {
        setError('Erro ao processar o arquivo. Verifique se é um Excel válido.');
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (
        (filters.nm_cidade.length === 0 || filters.nm_cidade.includes(String(item.nm_cidade))) &&
        (filters.tamanho_base.length === 0 || filters.tamanho_base.includes(String(item.tamanho_base))) &&
        (filters.class_mes_vol_m3.length === 0 || filters.class_mes_vol_m3.includes(String(item.class_mes_vol_m3))) &&
        (filters.class_6_meses_vol.length === 0 || filters.class_6_meses_vol.includes(String(item.class_6_meses_vol))) &&
        (filters.criticidade.length === 0 || filters.criticidade.includes(String(item.criticidade)))
      );
    });
  }, [data, filters]);

  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const requestSort = (key: keyof DashboardData) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const uniqueValues = useMemo(() => {
    const values: Record<keyof FilterState, string[]> = {
      nm_cidade: [],
      tamanho_base: [],
      class_mes_vol_m3: [],
      class_6_meses_vol: [],
      criticidade: []
    };

    data.forEach(item => {
      Object.keys(values).forEach(key => {
        const val = String(item[key as keyof DashboardData] || '');
        if (val && !values[key as keyof FilterState].includes(val)) {
          values[key as keyof FilterState].push(val);
        }
      });
    });

    return values;
  }, [data]);

  const filterConfig: { key: keyof FilterState; label: string }[] = [
    { key: 'nm_cidade', label: 'CIDADE' },
    { key: 'tamanho_base', label: 'TAMANHO BASE' },
    { key: 'criticidade', label: 'CRITICIDADE' },
    { key: 'class_mes_vol_m3', label: 'VOLUNTÁRIO 3 MESES' },
    { key: 'class_6_meses_vol', label: 'VOLUNTÁRIO 6 MESES' },
  ];

  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  const toggleFilterAccordion = (key: string) => {
    setOpenFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      nm_cidade: [],
      tamanho_base: [],
      class_mes_vol_m3: [],
      class_6_meses_vol: [],
      criticidade: []
    });
  };

  const churnByCityData = useMemo(() => {
    const cityTotals: Record<string, { sum: number; count: number }> = {};
    let totalSum = 0;
    let totalCount = 0;

    filteredData.forEach(item => {
      const val = Number(item.med_churn_total) || 0;
      if (!cityTotals[item.nm_cidade]) {
        cityTotals[item.nm_cidade] = { sum: 0, count: 0 };
      }
      cityTotals[item.nm_cidade].sum += val;
      cityTotals[item.nm_cidade].count += 1;
      
      totalSum += val;
      totalCount += 1;
    });
    
    const cityData = Object.entries(cityTotals)
      .map(([name, { sum, count }]) => ({ 
        name, 
        value: parseFloat(((sum / count) * 100).toFixed(2)) 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (totalCount > 0) {
      const generalAvg = parseFloat(((totalSum / totalCount) * 100).toFixed(2));
      cityData.unshift({ name: 'MÉDIA GERAL', value: generalAvg });
    }

    return cityData;
  }, [filteredData]);

  const baseDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const base = item.tamanho_base;
      counts[base] = (counts[base] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const nodesByCityData = useMemo(() => {
    const cityNodes: Record<string, number> = {};
    filteredData.forEach(item => {
      cityNodes[item.nm_cidade] = (cityNodes[item.nm_cidade] || 0) + 1;
    });
    return Object.entries(cityNodes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const crAveragesData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    let sumRet = 0;
    let sumTec = 0;
    let sumFin = 0;
    
    filteredData.forEach(item => {
      sumRet += Number(item.cr_retencao) || 0;
      sumTec += Number(item.cr_tecnico) || 0;
      sumFin += Number(item.cr_financeiro) || 0;
    });
    
    const count = filteredData.length;
    
    return [
      { name: 'CR RETENÇÃO', value: parseFloat((sumRet / count).toFixed(2)) },
      { name: 'CR TÉCNICO', value: parseFloat((sumTec / count).toFixed(2)) },
      { name: 'CR FINANCEIRO', value: parseFloat((sumFin / count).toFixed(2)) }
    ];
  }, [filteredData]);

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border border-gray-200 p-8 shadow-xl rounded-2xl"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-[#EE2E24] text-white flex items-center justify-center rounded-full shadow-lg shadow-red-200">
              <Upload size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold uppercase tracking-tighter text-gray-900">Dashboard de Operações</h1>
              <p className="text-sm text-gray-500">Importe sua planilha Excel para começar a analisar os dados.</p>
            </div>
            
            <div className="w-full space-y-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-[#EE2E24] text-white font-bold uppercase tracking-widest hover:bg-[#D12820] transition-all rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              >
                <Upload size={20} />
                Selecionar Planilha
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-left">
                <p className="text-[10px] font-mono uppercase text-gray-400 mb-2 flex items-center gap-1">
                  <Info size={10} /> Colunas Necessárias
                </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-600">
                    <span>• NM_CIDADE</span>
                    <span>• MED_CHURN_TOTAL</span>
                    <span>• CD_NODE</span>
                    <span>• OUTAGE</span>
                    <span>• AT1</span>
                    <span>• CR_RETENCAO</span>
                    <span>• CR_TECNICO</span>
                    <span>• CR_FINANCEIRO</span>
                    <span>• TAMANHO_BASE</span>
                    <span>• CLASS_MES_VOL_M3</span>
                    <span>• CLASS_6_MESES_VOL</span>
                    <span>• MARC_UNICO</span>
                    <span>• CRITICIDADE</span>
                    <span>• DESC_VOL_MES</span>
                    <span>• BASE_MES</span>
                  </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 text-red-600 text-xs text-left w-full rounded-lg"
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 bg-[#EE2E24] px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-white text-[#EE2E24] flex items-center justify-center rounded-lg">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-tighter text-white">DASH CHURN CLARO</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono uppercase text-red-100 hidden sm:block">
            {filteredData.length} de {data.length} registros
          </div>
          <button 
            onClick={() => setData([])}
            className="text-[10px] font-bold uppercase tracking-widest bg-white text-[#EE2E24] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all shadow-sm"
          >
            Novo Arquivo
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Filters */}
        <aside className="w-72 border-r border-gray-200 bg-white overflow-y-auto hidden lg:block custom-scrollbar">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#EE2E24]" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Filtros</span>
            </div>
            <button 
              onClick={clearFilters}
              className="text-[10px] uppercase font-bold text-gray-400 hover:text-[#EE2E24]"
            >
              Limpar
            </button>
          </div>

          <div className="p-4 space-y-2">
            {filterConfig.map(({ key, label }) => (
              <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
                <button 
                  onClick={() => toggleFilterAccordion(key)}
                  className={cn(
                    "w-full p-3 flex items-center justify-between text-left transition-colors",
                    openFilters[key] ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      filters[key].length > 0 ? "text-[#EE2E24]" : "text-gray-600"
                    )}>
                      {label}
                    </span>
                    {filters[key].length > 0 && (
                      <span className="bg-[#EE2E24] text-white px-1.5 py-0.5 rounded-full text-[9px]">
                        {filters[key].length}
                      </span>
                    )}
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={cn(
                      "text-gray-400 transition-transform duration-200",
                      openFilters[key] && "rotate-180"
                    )} 
                  />
                </button>
                
                <AnimatePresence>
                  {openFilters[key] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-white"
                    >
                      <div className="p-3 pt-0 space-y-1 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-50">
                        {uniqueValues[key].sort().map(val => (
                          <button
                            key={val}
                            onClick={() => toggleFilter(key, val)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs transition-colors rounded-lg border border-transparent",
                              filters[key].includes(val) 
                                ? "bg-red-50 text-[#EE2E24] border-red-100 font-bold" 
                                : "hover:bg-gray-50 text-gray-600"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Mobile Filter Toggle (Simplified) */}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {filterConfig.map(({ key, label }) => (
              <div key={key} className="shrink-0">
                <select 
                  className="text-[11px] font-bold uppercase border border-gray-200 bg-white px-2 py-1 rounded-lg"
                  onChange={(e) => {
                    if (e.target.value) toggleFilter(key, e.target.value);
                  }}
                  value=""
                >
                  <option value="">{label}</option>
                  {uniqueValues[key].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
            <button onClick={clearFilters} className="text-[11px] font-bold uppercase border border-gray-200 px-2 py-1 rounded-lg">Limpar</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('charts')}
              className={cn(
                "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                activeTab === 'charts' ? "bg-white text-[#EE2E24] shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Visualizações
            </button>
            <button 
              onClick={() => setActiveTab('table')}
              className={cn(
                "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                activeTab === 'table' ? "bg-white text-[#EE2E24] shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Painel de Dados
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'charts' ? (
              <motion.div 
                key="charts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Chart 1: Churn by City */}
                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-700">
                      <BarChart3 size={14} className="text-[#EE2E24]" /> Média Churn por Cidade
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={churnByCityData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          width={40}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Churn']}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #f3f4f6', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px'
                          }} 
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {churnByCityData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'MÉDIA GERAL' ? '#141414' : COLORS[index % COLORS.length]} 
                            />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            formatter={(value: number) => `${value.toFixed(2)}%`}
                            style={{ fontSize: '9px', fill: '#6b7280', fontWeight: 'bold' }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Volume de Nodes por Cidade */}
                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-700">
                      <BarChart3 size={14} className="text-[#EE2E24]" /> Volume de Nodes por Cidade (Total: {filteredData.length})
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nodesByCityData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          width={40}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #f3f4f6', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px'
                          }} 
                        />
                        <Bar dataKey="value" fill="#EE2E24" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {nodesByCityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            style={{ fontSize: '9px', fill: '#6b7280', fontWeight: 'bold' }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: Base Distribution */}
                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-700">
                      <PieChartIcon size={14} className="text-[#EE2E24]" /> Distribuição Base (Total: {filteredData.length})
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <Pie
                          data={baseDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {baseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#EE2E24', '#000000', '#8E9299', '#D12820', '#333333'][index % 5]} />
                          ))}
                          <LabelList dataKey="value" position="outside" style={{ fontSize: '10px', fill: '#6b7280', fontWeight: 'bold' }} />
                        </Pie>
                        <Tooltip 
                           contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #f3f4f6', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px'
                          }} 
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 5: CR Averages */}
                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-700">
                      <BarChart3 size={14} className="text-[#EE2E24]" /> Médias de CR (Retenção, Técnico, Financeiro)
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={crAveragesData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          width={40}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #f3f4f6', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px'
                          }} 
                        />
                        <Bar dataKey="value" fill="#EE2E24" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {crAveragesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            style={{ fontSize: '10px', fill: '#6b7280', fontWeight: 'bold' }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-gray-100 overflow-hidden rounded-2xl shadow-sm"
              >
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-4 text-[10px] font-mono uppercase text-gray-400">Cidade</th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('med_churn_total')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Média Churn Total
                            {sortConfig?.key === 'med_churn_total' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-mono uppercase text-gray-400">QTD Node</th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('outage')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            QTD Outage
                            {sortConfig?.key === 'outage' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-mono uppercase text-gray-400">AT1</th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('cr_retencao')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            CR Ret
                            {sortConfig?.key === 'cr_retencao' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('cr_tecnico')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            CR Técnico
                            {sortConfig?.key === 'cr_tecnico' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('cr_financeiro')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            CR Financeiro
                            {sortConfig?.key === 'cr_financeiro' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-mono uppercase text-gray-400">Criticidade</th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('desc_vol_mes')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Desc Vol Mês
                            {sortConfig?.key === 'desc_vol_mes' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                        <th 
                          className="p-4 text-[10px] font-mono uppercase text-[#EE2E24] cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => requestSort('base_mes')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Base Mês
                            {sortConfig?.key === 'base_mes' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            ) : <ArrowUpDown size={10} />}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-xs font-medium text-gray-700">{item.nm_cidade}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{(Number(item.med_churn_total) * 100).toFixed(2)}%</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.cd_node}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.outage}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.at1}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.cr_retencao}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.cr_tecnico}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.cr_financeiro}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.criticidade}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.desc_vol_mes}</td>
                          <td className="p-4 text-xs font-mono text-gray-600">{item.base_mes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredData.length > 50 && (
                  <div className="p-4 text-center border-t border-gray-100 bg-gray-50">
                    <p className="text-[10px] font-mono text-gray-400 uppercase">Mostrando primeiros 50 de {filteredData.length} registros</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #EE2E24;
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
