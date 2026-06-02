import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import compStyles from './Components.module.css';

export default function TransactionTable({ transactions = [], localAiFlags = [] }) {
  // Defensive normalization pass: Ensure every flagged token is handled purely as a safe primitive string
  const targetedFlags = new Set(
    Array.isArray(localAiFlags) 
      ? localAiFlags.map(f => f && f.transaction_id ? String(f.transaction_id).trim() : '') 
      : []
  );

  return (
    <div className={compStyles.tableWrapper}>
      <table className={compStyles.mainTable}>
        <thead>
          <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <th className={compStyles.tableHeaderCell} style={{ textAlign: 'left', fontFamily: 'monospace' }}>Reference token</th>
            <th className={compStyles.tableHeaderCell} style={{ textAlign: 'left' }}>Merchant Endpoint String</th>
            <th className={compStyles.tableHeaderCell} style={{ textAlign: 'right', fontFamily: 'monospace' }}>Financial Outlay Amount</th>
            <th className={compStyles.tableHeaderCell} style={{ textAlign: 'center' }}>Threat Flag Allocation</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            if (!t) return null; // Safe fallback guard clause

            // Defensive ID lookup conversion checks to prevent undefined execution faults
            const safeTxnId = t.id ? String(t.id).trim() : '';
            const isAiRisk = safeTxnId ? targetedFlags.has(safeTxnId) : false;
            const parsedAmtValue = t.amount ? Math.abs(parseFloat(t.amount)) : 0;

            let rowBgColor = 'transparent';
            if (isAiRisk) {
              rowBgColor = 'rgba(76, 5, 30, 0.15)';
            } else if (t.isOverBudget) {
              rowBgColor = 'rgba(69, 26, 3, 0.15)';
            }

            return (
              <tr key={safeTxnId} className={compStyles.tableRow} style={{ backgroundColor: rowBgColor }}>
                <td className={compStyles.tableCell} style={{ fontFamily: 'monospace', color: 'var(--color-slate-500)', textAlign: 'left' }}>
                  {safeTxnId || '—'}
                </td>
                <td className={compStyles.tableCell} style={{ fontWeight: '700', color: 'white', textAlign: 'left' }}>
                  {t.description || 'Unknown Merchant'}
                </td>
                <td className={compStyles.tableCell} style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>
                  -${parsedAmtValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={compStyles.tableCell} style={{ textAlign: 'center' }}>
                  <div className={compStyles.badgeRowFlex} style={{ justifyContent: 'center' }}>
                    {t.isOverBudget && (
                      <span className={`${compStyles.pillBadge} ${compStyles.budgetLimit}`}>
                        <AlertTriangle size={10} /> &gt; 2K LIMIT
                      </span>
                    )}
                    {isAiRisk && (
                      <span className={`${compStyles.pillBadge} ${compStyles.aiRisk}`}>
                        <ShieldAlert size={10} /> CORE CORRELATION RISK
                      </span>
                    )}
                    {!t.isOverBudget && !isAiRisk && (
                      <span style={{ color: 'var(--color-slate-700)', fontFamily: 'monospace' }}>—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}