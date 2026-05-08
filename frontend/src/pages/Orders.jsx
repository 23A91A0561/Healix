import DashboardLayout from '../layouts/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useFetch } from '../hooks/useFetch.js';
export default function Orders() { const { data } = useFetch('/orders'); return <DashboardLayout><h1 className="text-3xl font-bold">Medicine Orders</h1><div className="mt-6"><DataTable columns={[{ key: 'items', label: 'Items', render: (r) => r.items?.map((i) => i.name).join(', ') }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Status' }]} rows={data} /></div></DashboardLayout>; }
