import React from 'react';
import compStyles from './Components.module.css';

export default function FraudReportCard({ fraudFlags }) {
  if (fraudFlags.length === 0) {
    return (
      <div className={compStyles.cleanTextAlert}>
        ✓ CLEAN COMPLIANCE AUDIT: ZERO SYSTEMIC THREAT CONTEXTS VERIFIED BY SECURE EDGE MODEL INTERFACING.
      </div>
    );
  }

  return (
    <div className={compStyles.fraudCardsGrid}>
      {fraudFlags.map((flag, idx) => (
        <div key={idx} className={compStyles.fraudCardItem}>
          <div className={compStyles.fraudCardTop}>
            <span className={compStyles.fraudToken}>{flag.transaction_id}</span>
            <span className={compStyles.fraudAmountText}>${parseFloat(flag.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div>
            <h4 className={compStyles.fraudVendorName}>{flag.vendor_name}</h4>
            <p className={compStyles.fraudReasonText}>{flag.risk_reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}