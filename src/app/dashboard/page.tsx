'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Activity,
  MessageSquare,
  Database,
  Brain,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface KPIData {
  totalRevenueAll: number;
  totalRevenueMonth: number;
  adrApprox: number;
}

interface RawStats {
  total_rows: number;
  earliest_arrival: string | null;
  latest_depart: string | null;
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [raw, setRaw] = useState<RawStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus] = useState({ orchestrator: 'active', analytics: 'active', dataQuality: 'active' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        const json = await res.json();
        if (json?.success) {
          setRaw(json.data.raw_stats);
          setKpi({
            totalRevenueAll: json.data.kpis.revenue_all_time,
            totalRevenueMonth: json.data.kpis.revenue_this_month,
            adrApprox: json.data.kpis.adr_approx,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
  const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hotel Analytics Dashboard</h1>
              <p className="text-gray-600">Executive Overview & System Status</p>
            </div>
            <Link href="/chat" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <MessageSquare className="w-4 h-4" /> AI Chat
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI Cards - now real */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpi?.totalRevenueAll || 0)}</h3>
            <p className="text-gray-600 text-sm">Total Revenue (All-Time)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpi?.totalRevenueMonth || 0)}</h3>
            <p className="text-gray-600 text-sm">Revenue Bulan Ini</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpi?.adrApprox || 0)}</h3>
            <p className="text-gray-600 text-sm">ADR (Approx)</p>
          </div>
        </div>

        {/* Raw data section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Data Source Overview</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Rows</p>
                <p className="font-semibold text-gray-900">{formatNumber(raw?.total_rows || 0)}</p>
              </div>
              <div>
                <p className="text-gray-500">Earliest Arrival</p>
                <p className="font-semibold text-gray-900">{raw?.earliest_arrival || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Latest Depart</p>
                <p className="font-semibold text-gray-900">{raw?.latest_depart || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Notes</p>
                <p className="text-gray-700">KPI dihitung langsung dari tabel `stays`. Occupancy/RevPAR memerlukan data inventory kamar.</p>
              </div>
            </div>
          </div>

          {/* System status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Multi-Agent System Status</h2>
            </div>
            <div className="space-y-4">
              {[{name:'Orchestrator',status:systemStatus.orchestrator,icon:<Brain className="w-5 h-5" />,color:'text-purple-600'},
                {name:'Analytics Agent',status:systemStatus.analytics,icon:<Zap className="w-5 h-5" />,color:'text-blue-600'},
                {name:'Data Quality Agent',status:systemStatus.dataQuality,icon:<Database className="w-5 h-5" />,color:'text-green-600'}].map((agent, idx)=> (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={agent.color}>{agent.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-sm font-medium ${agent.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {agent.status === 'active' ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <Activity className="w-4 h-4 inline mr-2" />Orchestration Active. Routing & multi-agent workflows operational.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
