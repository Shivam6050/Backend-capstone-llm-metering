import React from 'react';
import { Download, FileText } from 'lucide-react';

export const ExportButtons: React.FC = () => {
  const handleExportCsv = () => {
    window.open('/api/v1/user/export/csv', '_blank');
  };

  const handleDownloadInvoice = () => {
    window.open('/api/v1/user/export/invoice', '_blank');
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
        title="Download Formatted PDF Invoice"
      >
        <FileText className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">PDF Invoice</span>
      </button>
    </div>
  );
};
