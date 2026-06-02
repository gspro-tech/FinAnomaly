import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const app = express();
app.use(cors());
app.use(express.json());

// --- SERVE THE PUBLIC STATIC DIRECTORY ---
app.use(express.static('public'));

const PORT = 5002;

// --- LOG INTERCEPTOR FOR CONSOLE UI ---
const logBuffer = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const captureLog = (type, args) => {
  const timestamp = new Date().toLocaleTimeString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
  logBuffer.push({ timestamp, type, message });
  if (logBuffer.length > 200) logBuffer.shift(); 
};

console.log = (...args) => { originalLog(...args); captureLog('info', args); };
console.warn = (...args) => { originalWarn(...args); captureLog('warn', args); };
console.error = (...args) => { originalError(...args); captureLog('error', args); };

// Initialize Persistent SQLite Engine
const db = new sqlite3.Database('./ai_cache.db', (err) => {
  if (err) console.error('SQLite initialization failure:', err.message);
  else console.log('📁 SQLite Permanent Cache Store connected successfully.');
});

const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

// Establish schema
await dbRun(`
  CREATE TABLE IF NOT EXISTS compliance_audit_cache (
    transaction_id TEXT PRIMARY KEY,
    vendor_name TEXT,
    amount REAL,
    risk_reason TEXT,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const ACTIVE_PROVIDER = 'ollama'; 

async function callLLMProvider(promptText) {
  if (ACTIVE_PROVIDER === 'ollama') {
    const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/api/generate';
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: promptText.trim(),
        stream: false,
        format: 'json'
      })
    });
    if (!response.ok) throw new Error(`Ollama instance rejected request: ${response.statusText}`);
    const data = await response.json();
    return data.response;
  } 
  
  if (ACTIVE_PROVIDER === 'google') {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "YOUR_GEMINI_KEY_HERE";
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText.trim() }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    if (!response.ok) throw new Error(`Google API gateway rejected request: ${response.statusText}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error(`Unrecognized execution provider environment: ${ACTIVE_PROVIDER}`);
}

// UI API endpoint to pipe terminal buffer back to front-end polling framework
app.get('/api/logs', (req, res) => {
  res.json({ logs: logBuffer });
});

// Engine operational route
app.post('/v1/models/analyze', async (req, res) => {
  console.log('\n🧠 [AI PROXY INGEST] Processing evaluation request packet...');
  const { filteredOutliers } = req.body;

  if (!filteredOutliers || !Array.isArray(filteredOutliers) || filteredOutliers.length === 0) {
    return res.json({ success: true, flags: [] });
  }

  try {
    const finalReport = [];
    const cacheMissItems = [];

    for (const txn of filteredOutliers) {
      const cachedRecord = await dbGet(
        'SELECT * FROM compliance_audit_cache WHERE transaction_id = ?', 
        [String(txn.id).trim()]
      );

      if (cachedRecord) {
        console.log(`💾 [CACHE HIT] Found historical record for: ${txn.id}`);
        finalReport.push({
          transaction_id: cachedRecord.transaction_id,
          vendor_name: cachedRecord.vendor_name,
          amount: cachedRecord.amount,
          risk_reason: cachedRecord.risk_reason
        });
      } else {
        cacheMissItems.push(txn);
      }
    }

    if (cacheMissItems.length === 0) {
      console.log('⚡ All items found in local storage. Bypassing engine layer runtime.');
      return res.json({ success: true, flags: finalReport });
    }

    console.log(`📡 [CACHE MISS] Sending ${cacheMissItems.length} novel items to provider: [${ACTIVE_PROVIDER.toUpperCase()}]`);

    const telemetryBlock = cacheMissItems.map(t =>
      `TXN_REF: ${t.id} | Merchant: ${t.description} | Value: $${t.amount} | Signal: ${t.heuristicReasons || 'Threshold Variance'}`
    ).join('\n');

    const strictSystemPrompt = `
You are a Forensic Accountant auditing flagged transactions.
Analyze these anomalies:
"""
${telemetryBlock}
"""
Isolate high-risk vendor billing strings or fraud patterns. Drop false positives.
Return ONLY raw data. No conversational introductory filler or markdown structural syntax wrapping.
Your response must be exclusively a valid JSON array of objects following this exact schema:
[
  {
    "transaction_id": "The precise string reference ID from the input logs",
    "vendor_name": "Merchant Name isolated",
    "amount": "Dollar value mapping",
    "risk_reason": "Specific structural risk reasoning description"
  }
]
`;

    const providerRawResponse = await callLLMProvider(strictSystemPrompt);
    console.log("🤖 [RAW MODEL OUTPUT RECEIVED]:", providerRawResponse);
    
    let rawParsedResult = JSON.parse(providerRawResponse);
    let parsedLLMArray = [];

    const normalizeKeys = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const normalized = {};
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'transaction_id' || lowerKey === 'txn_ref' || lowerKey === 'id') {
          normalized.transaction_id = obj[key];
        } else if (lowerKey === 'vendor_name' || lowerKey === 'merchant' || lowerKey === 'vendor') {
          normalized.vendor_name = obj[key];
        } else if (lowerKey === 'amount' || lowerKey === 'value') {
          normalized.amount = obj[key];
        } else if (lowerKey === 'risk_reason' || lowerKey === 'reason' || lowerKey === 'signal') {
          normalized.risk_reason = obj[key];
        } else {
          normalized[key] = obj[key];
        }
      }
      return normalized;
    };

    if (Array.isArray(rawParsedResult)) {
      parsedLLMArray = rawParsedResult.map(normalizeKeys);
    } else if (rawParsedResult && typeof rawParsedResult === 'object') {
      console.warn("⚠️ [MODEL FORMAT VARIANCE] Model returned an object wrapper. Normalizing data keys...");
      const normalizedRoot = normalizeKeys(rawParsedResult);
      const keyContainingArray = Object.keys(rawParsedResult).find(key => Array.isArray(rawParsedResult[key]));
      
      if (keyContainingArray) {
        parsedLLMArray = rawParsedResult[keyContainingArray].map(normalizeKeys);
      } else if (normalizedRoot.transaction_id || normalizedRoot.vendor_name) {
        console.log("🧩 [SINGLE OBJECT HEALED] Isolated single transaction block and structured into array pipeline.");
        parsedLLMArray = [normalizedRoot];
      } else {
        const structuralValues = Object.values(rawParsedResult);
        const looksLikeTransactionObjects = structuralValues.every(val => val && typeof val === 'object');
        
        if (looksLikeTransactionObjects && structuralValues.length > 0) {
          console.log("🧩 [DICTIONARY EXTRACTION] Converting key/map values into a clean linear array.");
          parsedLLMArray = structuralValues.map(normalizeKeys);
        } else {
          throw new Error("Unable to locate a valid transaction array data structure inside the model's object payload.");
        }
      }
    }

    if (!Array.isArray(parsedLLMArray)) {
      throw new Error("Failed validation pass: Normalized LLM data structure is still not an iterable array.");
    }

    for (const evaluatedRisk of parsedLLMArray) {
      if (!evaluatedRisk) continue;
      const rawTxnId = evaluatedRisk.transaction_id;
      if (!rawTxnId) continue;

      let cleanAmount = 0;
      if (evaluatedRisk.amount !== undefined) {
        const amtStr = String(evaluatedRisk.amount).replace(/[$\s,]/g, '');
        cleanAmount = parseFloat(amtStr) || 0;
      }

      await dbRun(
        `INSERT OR REPLACE INTO compliance_audit_cache (transaction_id, vendor_name, amount, risk_reason) 
         VALUES (?, ?, ?, ?)` ,
        [
          String(rawTxnId).trim(),
          evaluatedRisk.vendor_name || 'Unknown Merchant',
          cleanAmount,
          evaluatedRisk.risk_reason || 'Flagged by security heuristics'
        ]
      );
      finalReport.push({
        transaction_id: String(rawTxnId).trim(),
        vendor_name: evaluatedRisk.vendor_name || 'Unknown Merchant',
        amount: cleanAmount,
        risk_reason: evaluatedRisk.risk_reason || 'Flagged by security heuristics'
      });
    }

    console.log(`✅ Cache updated. Combined output generated (${finalReport.length} items flagged total).`);
    res.json({ success: true, flags: finalReport });

  } catch (error) {
    console.error('💥 [PROXIED ENGINE EXCEPTION]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`🧠 AI Orchestration Microservice operating on Port: ${PORT}`));