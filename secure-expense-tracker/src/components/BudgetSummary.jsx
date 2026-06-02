import React from 'react';
import { ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import compStyles from './Components.module.css';

export default function BudgetSummary({ totalExpenses, remainingBalance, budgetGoal }) {
  return (
    <div className={compStyles.cardGrid}>
      <div className={compStyles.summaryCard}>
        <div className={compStyles.textGroup}>
          <p className={compStyles.metricLabel}>Dynamic Goal Ceiling</p>
          <h4 className={compStyles.metricValue} style={{ color: 'white' }}>${budgetGoal.toLocaleString()}</h4>
        </div>
        <div className={compStyles.iconWrapper} style={{ backgroundColor: 'var(--color-indigo-950)', color: 'var(--color-indigo-400)' }}><Target size={18} /></div>
      </div>

      <div className={compStyles.summaryCard}>
        <div className={compStyles.textGroup}>
          <p className={compStyles.metricLabel}>Outflow Volume</p>
          <h4 className={compStyles.metricValue} style={{ color: 'var(--color-rose-400)' }}>${totalExpenses.toLocaleString()}</h4>
        </div>
        <div className={compStyles.iconWrapper} style={{ backgroundColor: 'var(--color-rose-950)', color: 'var(--color-rose-400)' }}><ArrowUpRight size={18} /></div>
      </div>

      <div className={compStyles.summaryCard}>
        <div className={compStyles.textGroup}>
          <p className={compStyles.metricLabel}>Net Standing Balance</p>
          <h4 className={compStyles.metricValue} style={{ color: remainingBalance >= 0 ? 'var(--color-emerald-400)' : 'var(--color-amber-500)' }}>
            ${remainingBalance.toLocaleString()}
          </h4>
        </div>
        <div className={compStyles.iconWrapper} style={{ 
          backgroundColor: remainingBalance >= 0 ? 'var(--color-emerald-950)' : 'var(--color-amber-950)', 
          color: remainingBalance >= 0 ? 'var(--color-emerald-400)' : 'var(--color-amber-500)' 
        }}>
          <ArrowDownRight size={18} />
        </div>
      </div>
    </div>
  );
}