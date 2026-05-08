export default function DataTable({ columns, rows, empty = 'No records yet' }) {
  if (!rows?.length) return <div className="card p-8 text-center text-slate-500">{empty}</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>{columns.map((c) => <th className="px-4 py-3 font-semibold" key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr className="border-t border-slate-100" key={row._id || JSON.stringify(row)}>{columns.map((c) => <td className="px-4 py-3" key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
