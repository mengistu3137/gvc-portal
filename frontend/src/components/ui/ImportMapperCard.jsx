import { useMemo, useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { parseSpreadsheet, mapImportedRows } from '../../lib/importService';

export function ImportMapperCard({
  open,
  title,
  requiredFields,
  onClose,
  onImport,
}) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  const mappedPreview = useMemo(() => mapImportedRows(rows, mapping).slice(0, 3), [rows, mapping]);

  if (!open) {
    return null;
  }

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setSummary(null);
    try {
      const parsed = await parseSpreadsheet(file);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      const suggested = {};
      requiredFields.forEach((field) => {
        suggested[field] = parsed.headers.find(
          (header) => String(header).trim().toLowerCase() === field.toLowerCase()
        ) || '';
      });
      setMapping(suggested);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const mappedRows = mapImportedRows(rows, mapping);
    if (mappedRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    setSummary(null);

    try {
      const result = await onImport(mappedRows, setProgress);
      setSummary(result);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
          {isParsing ? <p className="text-xs text-slate-500">Parsing file...</p> : null}
        </div>

        {headers.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {requiredFields.map((field) => (
              <label key={field} className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                <span>{field}</span>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                  value={mapping[field] || ''}
                  onChange={(event) =>
                    setMapping((value) => ({
                      ...value,
                      [field]: event.target.value,
                    }))
                  }
                >
                  <option value="">-- Select source column --</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}

        {isImporting ? (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500">Import progress: {progress}%</p>
          </div>
        ) : null}

        {summary ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
            Successes: {summary.successes} | Errors: {summary.errors}
          </div>
        ) : null}

        {mappedPreview.length > 0 ? (
          <div className="rounded-md border border-slate-200 p-2">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
            <pre className="max-h-40 overflow-auto text-xs text-slate-700">{JSON.stringify(mappedPreview, null, 2)}</pre>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleImport} disabled={isImporting || rows.length === 0}>
            {isImporting ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
