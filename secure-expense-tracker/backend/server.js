import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { analyzeAnomalies } from './utils/fraudEngine.js';

const app = express();
app.use(cors());
app.use(express.json());

// Main App hits the localized AI internal orchestration entry point directly
const AI_PROXY_URL = 'http://127.0.0.1:5002/v1/models/analyze';

app.post('/api/analyze-fraud', async (req, res) => {
  console.log('\n==================================================');
  console.log('📥 [APP BACKEND INGEST] Processing Ledger Array...');
  console.log('==================================================');
  
  const { allTransactions } = req.body;
  
  if (!allTransactions || !Array.isArray(allTransactions) || allTransactions.length === 0) {
    return res.json({ success: true, analysis: [] });
  }

  try {
    // 1. Run local mathematical heuristic anomaly screening filter
    const localHeuristicDetections = analyzeAnomalies(allTransactions);
    console.log(`🧮 Heuristics extracted: ${localHeuristicDetections.length} candidate fields.`);

    if (localHeuristicDetections.length === 0) {
      return res.json({ success: true, analysis: [] });
    }

    // 2. Dispatch data package directly to the decoupled proxy service layer
    console.log('📡 Forwarding payload package to AI Orchestration microservice node...');
    const proxyResponse = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filteredOutliers: localHeuristicDetections })
    });

    if (!proxyResponse.ok) {
      throw new Error(`AI Orchestration microservice rejected transaction bundle: ${proxyResponse.statusText}`);
    }

    const data = await proxyResponse.json();
    
    res.json({ 
      success: true, 
      analysis: data.flags || [] 
    });

  } catch (error) {
    console.error("❌ [MAIN GATEWAY INTERFACE FAULT]:", error.message);
    res.status(500).json({ 
      success: false, 
      error: "Primary service broker pipeline connection interrupted.",
      details: error.message 
    });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Primary Core Application Server running on Port: ${PORT}`));