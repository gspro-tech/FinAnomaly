/**
 * Advanced Multi-Heuristic Forensic Pre-Filter
 * Protects LLM token boundaries while handling small test samples safely.
 */
export function analyzeAnomalies(transactions = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const anomaliesMap = new Map();
  const n = transactions.length;

  // --- HEURISTIC 1: DUPLICATE TRANSACTION DETECTION ---
  // Look for identical description and absolute value on the exact same calendar date
  const lookupRegistry = {};
  
  transactions.forEach(t => {
    const absAmt = Math.abs(parseFloat(t.amount || 0));
    const normalizedDesc = String(t.description || '').trim().toUpperCase();
    const dateKey = String(t.date || '').trim();
    
    // Create a unique composite fingerprint for matching duplicates
    const fingerprint = `${dateKey}_${normalizedDesc}_${absAmt.toFixed(2)}`;
    
    if (!lookupRegistry[fingerprint]) {
      lookupRegistry[fingerprint] = [];
    }
    lookupRegistry[fingerprint].push(t);
  });

  // Flag any items that share a duplicate signature on the same day
  Object.values(lookupRegistry).forEach(matchingTxns => {
    if (matchingTxns.length > 1) {
      matchingTxns.forEach(t => {
        const itemCopy = { ...t, heuristicReasons: 'Potential Duplicate/Double-Billing Exception' };
        anomaliesMap.set(t.id, itemCopy);
      });
    }
  });

  // --- HEURISTIC 2: STATISTICAL VARIANCE / FALLBACK CONTROL ---
  const validAmounts = transactions.map(t => Math.abs(parseFloat(t.amount || 0))).filter(v => !isNaN(v));
  
  if (validAmounts.length > 0) {
    const sum = validAmounts.reduce((a, b) => a + b, 0);
    const mean = sum / validAmounts.length;
    
    const variance = validAmounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validAmounts.length;
    const stdDev = Math.sqrt(variance);

    transactions.forEach(t => {
      const absAmt = Math.abs(parseFloat(t.amount || 0));
      
      // If dataset is tiny, use an absolute benchmark fallback threshold instead of relative Z-score
      if (n < 10) {
        if (absAmt >= 2000) {
          const current = anomaliesMap.get(t.id) || { ...t };
          current.heuristicReasons = current.heuristicReasons 
            ? `${current.heuristicReasons} | High Absolute Threshold Outlier`
            : 'High Absolute Threshold Outlier';
          anomaliesMap.set(t.id, current);
        }
      } else if (stdDev > 0) {
        // Standard large dataset operational Z-score tracking
        const zScore = (absAmt - mean) / stdDev;
        if (zScore > 1.5) {
          const current = anomaliesMap.get(t.id) || { ...t };
          current.heuristicReasons = current.heuristicReasons 
            ? `${current.heuristicReasons} | High Statistical Deviation (Z=${zScore.toFixed(2)})`
            : `High Statistical Deviation (Z=${zScore.toFixed(2)})`;
          anomaliesMap.set(t.id, current);
        }
      }
    });
  }

  return Array.from(anomaliesMap.values());
}