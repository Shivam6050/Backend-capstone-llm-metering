import React from 'react';
import { Download, FileText } from 'lucide-react';

export const ExportButtons: React.FC = () => {
  const handleExportCsv = () => {
    window.open('/api/v1/user/export/csv', '_blank');
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await fetch('/api/v1/user/export/invoice');
      const data = await res.json();
      if (res.ok && data.success) {
        const invStr = JSON.stringify(data.invoice, null, 2);
        const blob = new Blob([invStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${data.invoice.invoiceNumber}.json`;
        a.click();
      } else {
        alert('Failed to generate invoice');
      }
    } catch (err: any) {
      alert(`Invoice error: ${err.message}`);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleExportCsv}
        className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-semibold px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-700 transition-all duration-200"
        title="Export CSV Data Report"
      >
        <Download className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">CSV</span>
      </button>

      <button
        onClick={handleDownloadInvoice}
        className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-semibold px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-700 transition-all duration-200"
        title="Download Formatted Invoice"
      >
        <FileText className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">Invoice</span>
      </button>
    </div>
  );
};
