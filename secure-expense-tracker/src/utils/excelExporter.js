import * as XLSX from 'xlsx';

export const exportFraudReportToExcel = (fraudLogs) => {
  if (!fraudLogs || fraudLogs.length === 0) return;
  const datasetRows = fraudLogs.map(item => ({
    "Transaction Identifier": item.transaction_id,
    "Flagged Vendor Domain": item.vendor_name,
    "Financial Outlay Amount ($)": item.amount,
    "Threat Evaluation Summary": item.risk_reason
  }));
  const worksheet = XLSX.utils.json_to_sheet(datasetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "AI Security Risk Output");
  worksheet['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 65 }];
  XLSX.writeFile(workbook, `AI_Financial_Forensic_Log_${new Date().toISOString().slice(0,10)}.xlsx`);
};