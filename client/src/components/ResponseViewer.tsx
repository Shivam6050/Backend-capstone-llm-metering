import React from 'react';
import { CheckCircle2, AlertOctagon, CreditCard, Code2 } from 'lucide-react';

interface ResponseViewerProps {
  response: {
    status: number;
    body: any;
  } | null;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response }) => {
  if (!response) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700/80 shadow-md p-6 text-center text-slate-400">
        <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-500" />
        <p className="text-xs font-medium text-slate-400">Execute an action above to inspect live API responses & status codes.</p>
      </div>
    );
  }

  const { status, body } = response;

  const getStatusBadge = (code: number) => {
    if (code === 200) {
      return (
        <span className="flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>200 OK — Request Processed</span>
        </span>
      );
    }
    if (code === 429) {
      return (
        <span className="flex items-center space-x-1 bg-amber-950/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-800">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>429 Too Many Requests — Quota Exceeded</span>
        </span>
      );
    }
    if (code === 402) {
      return (
        <span className="flex items-center space-x-1 bg-red-950/80 text-red-300 text-xs font-bold px-2.5 py-1 rounded-md border border-red-800">
          <CreditCard className="w-3.5 h-3.5 text-red-400" />
          <span>402 Payment Required — Sub Past Due</span>
        </span>
      );
    }
    return (
      <span className="bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-600">
        {code} Response
      </span>
    );
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/80 shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
          <span>Live Execution Response</span>
        </h3>
        {getStatusBadge(status)}
      </div>

      {/* JSON Viewer */}
      <div className="bg-slate-950 text-emerald-400 rounded-lg p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 max-h-72">
        <pre>{JSON.stringify(body, null, 2)}</pre>
      </div>
    </div>
  );
};
