import React from 'react';
import Papa from 'papaparse';
import { UploadCloud } from 'lucide-react';
import compStyles from './Components.module.css';

export default function CSVImporter({ onDataParsed }) {
  const handleFileUpload = (e) => {
    // Prevent standard browser event escalation bubbling up to forms/headers
    e.stopPropagation();
    e.preventDefault();

    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.data) {
          onDataParsed(res.data);
        }
        // Safely reset input target value buffer so the same file can be re-uploaded if needed
        e.target.value = null;
      },
      error: (err) => {
        console.error("CSV Engine parsing fault:", err);
        alert(`Parsing failure: ${err.message}`);
      }
    });
  };

  return (
    <div className={compStyles.uploadContainer} onClick={(e) => e.stopPropagation()}>
      <label className={compStyles.uploadButton} htmlFor="ledger-file-input">
        <UploadCloud size={15} />
        <span>Import Ledger (.CSV)</span>
      </label>
      <input 
        id="ledger-file-input"
        type="file" 
        accept=".csv" 
        style={{ display: 'none' }} 
        onChange={handleFileUpload} 
      />
    </div>
  );
}