import React, { useMemo } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ExpenseChart({ transactions = [], timeScale = 'daily', currencyConfig = { symbol: '$', code: 'USD' } }) {
  
  const aggregatedDataset = useMemo(() => {
    const processingRegistry = {};

    transactions.forEach(item => {
      if (!item || item.amount >= 0) return; 
      const absExpense = Math.abs(item.amount);
      
      const dateToken = new Date(item.date);
      if (isNaN(dateToken.getTime())) return;

      let keyTimelineNode = item.date; 
      
      if (timeScale === 'monthly') {
        keyTimelineNode = `${dateToken.getFullYear()}-${String(dateToken.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeScale === 'yearly') {
        keyTimelineNode = `${dateToken.getFullYear()}`;
      }

      if (!processingRegistry[keyTimelineNode]) {
        processingRegistry[keyTimelineNode] = { timelineLabel: keyTimelineNode, Expenditure: 0 };
      }
      processingRegistry[keyTimelineNode].Expenditure += absExpense;
    });

    return Object.values(processingRegistry).sort((a, b) => new Date(a.timelineLabel) - new Date(b.timelineLabel));
  }, [transactions, timeScale]);

  const computedStats = useMemo(() => {
    if (aggregatedDataset.length === 0) return { peak: 0, aggregate: 0 };
    const numericValues = aggregatedDataset.map(d => d.Expenditure);
    return {
      peak: Math.max(...numericValues),
      aggregate: numericValues.reduce((a, b) => a + b, 0)
    };
  }, [aggregatedDataset]);

  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const targetData = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '11px', color: '#f8fafc' }}>
          <div style={{ color: '#64748b', marginBottom: '0.25rem', fontWeight: 'bold' }}>INTERVAL: {targetData.timelineLabel}</div>
          <div style={{ color: 'var(--color-rose-400)' }}>
            Net Expenditure: <span style={{ fontWeight: 'bold' }}>{currencyConfig.symbol}{targetData.Expenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '340px' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-slate-500)', fontFamily: 'monospace' }}>
            Net Expenditure Analytics
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '11px', color: 'var(--color-slate-300)' }}>
            Aggregating historical transaction density across <span style={{ color: 'var(--color-indigo-400)', fontWeight: 'bold', textTransform: 'uppercase' }}>{timeScale}</span> intervals
          </p>
        </div>
        
        {aggregatedDataset.length > 0 && (
          <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'monospace', fontSize: '10px' }}>
            <div>
              <span style={{ color: 'var(--color-slate-500)' }}>PEAK OUTFLOW: </span>
              <span style={{ color: 'var(--color-rose-400)', fontWeight: 800 }}>{currencyConfig.symbol}{computedStats.peak.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-slate-500)' }}>TOTAL NET EXPENDITURE: </span>
              <span style={{ color: 'var(--color-indigo-400)', fontWeight: 800 }}>{currencyConfig.symbol}{computedStats.aggregate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={aggregatedDataset} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="netExpenditureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-indigo-600)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--color-indigo-600)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="timelineLabel" stroke="#64748b" fontSize={9} tickLine={false} dy={8} />
            <YAxis 
              stroke="#64748b" 
              fontSize={9} 
              tickLine={false} 
              dx={-8}
              tickFormatter={(value) => `${currencyConfig.symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
            />
            
            <Tooltip content={renderCustomTooltip} cursor={{ fill: '#1e293b', opacity: 0.3 }} />
            <Legend verticalAlign="top" height={28} iconSize={8} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', marginTop: '-12px' }} />
            
            <Area 
              name={`Net Expenditure History (${currencyConfig.code})`}
              type="monotone" 
              dataKey="Expenditure" 
              stroke="var(--color-indigo-600)" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#netExpenditureGradient)" 
            />

            <Bar 
              name="Interval Magnitude Spike"
              dataKey="Expenditure" 
              barSize={timeScale === 'daily' ? 8 : timeScale === 'monthly' ? 24 : 45} 
              fill="var(--color-rose-600)" 
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}