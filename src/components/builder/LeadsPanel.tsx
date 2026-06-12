import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LeadsPanel() {
  const t = useT();
  const leads = useFunnelStore((s) => s.leads);
  const clearLeads = useFunnelStore((s) => s.clearLeads);

  const exportCsv = () => {
    if (leads.length === 0) return;
    const keys = Array.from(
      new Set(leads.flatMap((l) => Object.keys(l.answers))),
    );
    const header = ["id", "createdAt", ...keys];
    const rows = leads.map((l) => [
      l.id,
      new Date(l.createdAt).toISOString(),
      ...keys.map((k) => JSON.stringify(l.answers[k] ?? "")),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCompletions = leads.length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t.leads}</h2>
            <p className="text-sm text-muted-foreground">
              Total: {totalCompletions}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearLeads} disabled={!leads.length}>
              Limpar
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!leads.length}>
              {t.exportCsv}
            </Button>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            {t.noLeads}
          </div>
        ) : (
          <div className="rounded-lg border bg-background overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Respostas</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(l.answers).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded bg-muted px-2 py-0.5 text-xs"
                          >
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
