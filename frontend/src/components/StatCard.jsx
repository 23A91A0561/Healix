export default function StatCard({ title, value, note, icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold">{value}</h3>
        </div>
        {Icon && <div className="rounded-lg bg-blue-50 p-3 text-primary"><Icon /></div>}
      </div>
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
