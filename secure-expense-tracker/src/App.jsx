import React, { useState, useMemo, useEffect } from 'react';
import CSVImporter from './components/CSVImporter';
import TransactionTable from './components/TransactionTable';
import ExpenseChart from './components/ExpenseChart';
import BudgetSummary from './components/BudgetSummary';
import FraudReportCard from './components/FraudReportCard';
import { exportFraudReportToExcel } from './utils/excelExporter';
import { Wallet, ShieldCheck, ShieldAlert, FileSpreadsheet, Loader2, Sliders, RotateCcw, Calendar, Globe } from 'lucide-react';
import styles from './App.module.css';

const CURRENCY_REGISTRY = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' }
];

function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('fininsight_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [fraudFlags, setFraudFlags] = useState(() => {
    const saved = localStorage.getItem('fininsight_fraud_flags');
    return saved ? JSON.parse(saved) : [];
  });

  const [netMonthlyRevenue, setNetMonthlyRevenue] = useState(() => {
    const saved = localStorage.getItem('fininsight_net_revenue');
    return saved ? Number(saved) : 50000;
  });

  const [activeCurrency, setActiveCurrency] = useState(() => {
    const saved = localStorage.getItem('fininsight_currency');
    return saved ? JSON.parse(saved) : CURRENCY_REGISTRY[0];
  });

  const [timeScale, setTimeScale] = useState('daily'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('fininsight_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fininsight_fraud_flags', JSON.stringify(fraudFlags));
  }, [fraudFlags]);

  useEffect(() => {
    localStorage.setItem('fininsight_net_revenue', String(netMonthlyRevenue));
  }, [netMonthlyRevenue]);

  useEffect(() => {
    localStorage.setItem('fininsight_currency', JSON.stringify(activeCurrency));
  }, [activeCurrency]);

  const handleClearSession = () => {
    localStorage.removeItem('fininsight_transactions');
    localStorage.removeItem('fininsight_fraud_flags');
    setTransactions([]);
    setFraudFlags([]);
    setStartDate('');
    setEndDate('');
  };

  const normalizeDateTime = (rawDateString) => {
    if (!rawDateString) return new Date().toISOString().split('T')[0];
    const isolatedSegment = String(rawDateString).trim().split(' ')[0];
    const parsedObject = new Date(isolatedSegment);
    if (isNaN(parsedObject.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return parsedObject.toISOString().split('T')[0];
  };

  const handleDataParsed = async (csvRows) => {
    const formatted = csvRows.map((row, index) => {
      const rawDate = row.Date || row.date || row.Timestamp || row.timestamp;
      const rawDesc = row.Description || row.description || row.Merchant || row.merchant;
      const rawAmt = row.Amount || row.amount || row.Value || row.value || 0;
      
      const standardizedDate = normalizeDateTime(rawDate);
      const parsedAmount = parseFloat(String(rawAmt).replace(/[^\d.-]/g, ''));

      return {
        id: `TXN-${2000 + index}`,
        date: standardizedDate,
        description: String(rawDesc || 'Unknown Merchant').trim(),
        amount: parsedAmount,
        isOverBudget: Math.abs(parsedAmount) > 2000,
      };
    }).filter(item => !isNaN(item.amount) && item.amount !== 0);

    if (formatted.length > 0) {
      const sortedTimestamps = [...formatted].sort((a, b) => new Date(a.date) - new Date(b.date));
      setStartDate(sortedTimestamps[0].date);
      setEndDate(sortedTimestamps[sortedTimestamps.length - 1].date);
    }

    setTransactions(formatted);
    setFraudFlags([]);
    setIsAnalyzing(true);

    try {
      const response = await fetch('http://localhost:5001/api/analyze-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allTransactions: formatted })
      });
      const data = await response.json();
      if (data.analysis) {
        setFraudFlags(data.analysis);
      }
    } catch (err) {
      console.error("Local microservice broker connection fault.", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const totalSpent = useMemo(() => {
    return dateFilteredTransactions.reduce((acc, c) => acc + (c.amount < 0 ? Math.abs(c.amount) : 0), 0);
  }, [dateFilteredTransactions]);

  const currentStanding = netMonthlyRevenue - totalSpent;

  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBox}><Wallet size={22} /></div>
          <div>
            <h1 className={styles.titleMain}>FinInsight <span className={styles.titleSub}>Enterprise</span></h1>
            <p className={styles.subtitle}>Unified Accounting Ledger Core</p>
          </div>
        </div>
        
        <div className={styles.controlsGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-slate-900)', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--color-slate-800)' }}>
            <Globe size={14} style={{ color: 'var(--color-indigo-400)' }} />
            <select 
              value={activeCurrency.code} 
              onChange={(e) => {
                const selected = CURRENCY_REGISTRY.find(c => c.code === e.target.value);
                if (selected) setActiveCurrency(selected);
              }}
              style={{ backgroundColor: 'transparent', color: '#f8fafc', border: 'none', fontSize: '11px', outline: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              {CURRENCY_REGISTRY.map(c => <option key={c.code} value={c.code} style={{ backgroundColor: '#0f172a' }}>{c.label}</option>)}
            </select>
          </div>

          <div className={styles.sliderContainer}>
            <div className={styles.sliderLabelBlock}>
              <Sliders size={14} style={{ color: 'var(--color-indigo-400)' }} />
              <span className={styles.sliderLabelText}>Net Monthly Revenue Limit</span>
            </div>
            <input 
              type="range" min="10000" max="150000" step="5000" 
              value={netMonthlyRevenue}
              onChange={(e) => setNetMonthlyRevenue(Number(e.target.value))}
              className={styles.rangeInput}
            />
            <span className={styles.budgetValueDisplay}>{activeCurrency.symbol}{netMonthlyRevenue.toLocaleString()}</span>
          </div>

          {transactions.length > 0 && (
            <button onClick={handleClearSession} className={styles.exportButton} style={{ backgroundColor: 'var(--color-slate-800)', border: '1px solid var(--color-slate-700)' }}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <CSVImporter onDataParsed={handleDataParsed} />
        </div>
      </header>

      <main className={styles.mainContent}>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}><Wallet size={32} /></div>
            <p className={styles.emptyTitle}>Inbound Ledger Disengaged</p>
            <p className={styles.emptyDesc}>Upload a structured CSV accounting matrix to generate visual asset intelligence metrics.</p>
          </div>
        ) : (
          <>
            <BudgetSummary totalExpenses={totalSpent} remainingBalance={currentStanding} budgetGoal={netMonthlyRevenue} currencySymbol={activeCurrency.symbol} />
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
                <Calendar size={14} /> <span>AUDIT SCOPE DATE RANGE:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '0.25rem 0.5rem', fontSize: '11px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>TO</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '0.25rem 0.5rem', fontSize: '11px', outline: 'none' }} />
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', backgroundColor: '#1e293b', padding: '0.25rem', borderRadius: '10px' }}>
                {['daily', 'monthly', 'yearly'].map(scale => (
                  <button 
                    key={scale} onClick={() => setTimeScale(scale)}
                    style={{
                      backgroundColor: timeScale === scale ? 'var(--color-indigo-600)' : 'transparent',
                      color: '#f8fafc', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.panelCard}>
              {isAnalyzing ? (
                <div className={styles.loaderBlock}>
                  <Loader2 className={styles.spinner} size={18} />
                  <span className={styles.pulseText}>PROCESSING LOCALIZED SEMANTIC FORENSIC SWEEP...</span>
                </div>
              ) : (
                <FraudReportCard fraudFlags={fraudFlags} currencySymbol={activeCurrency.symbol} />
              )}
            </div>

            <div className={styles.layoutGrid}>
              <div className={styles.chartColumn}>
                <div className={styles.panelCard}>
                  <ExpenseChart transactions={dateFilteredTransactions} timeScale={timeScale} currencyConfig={activeCurrency} />
                </div>
              </div>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarMetaInfo}>
                  <span className={styles.policyTag}>Policy Control</span>
                  <h4 className={styles.sidebarTitle}>Net Threshold Balance</h4>
                  <p className={styles.sidebarDesc}>Evaluates cumulative outlays against your configured Net Monthly Revenue target metrics.</p>
                </div>
                <div className={`${styles.complianceBadge} ${currentStanding >= 0 ? styles.compliant : styles.breached}`}>
                  <span>{currentStanding >= 0 ? "✓ LIQUIDITY OPERATIONAL" : "✕ BUDGET CAPACITY BREACHED"}</span>
                </div>
              </div>
            </div>

            <div className={styles.tableContainerCard}>
              <TransactionTable transactions={dateFilteredTransactions} localAiFlags={fraudFlags} currencySymbol={activeCurrency.symbol} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;