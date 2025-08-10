import Link from 'next/link';
import { 
  BarChart3, 
  MessageSquare, 
  Brain, 
  Database, 
  Zap, 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowRight,
  CheckCircle,
  Activity
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              Multi-Agent AI System
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Hotel Analytics
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {" "}Intelligence
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Powerful AI-driven analytics platform dengan <strong>multi-agent orchestration</strong> untuk 
              mengoptimalkan operasional hotel, revenue management, dan customer insights.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <BarChart3 className="w-5 h-5" />
                Executive Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="w-5 h-5" />
                AI Chat Interface
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: 'Orchestrator Agent',
                description: 'Master coordinator yang mengatur routing task dan koordinasi antar agen untuk efisiensi optimal.',
                color: 'from-purple-500 to-indigo-600',
                features: ['Task Classification', 'Intelligent Routing', 'Workflow Coordination']
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'Analytics Agent',
                description: 'Spesialis business intelligence untuk revenue analysis, forecasting, dan guest behavior insights.',
                color: 'from-blue-500 to-cyan-600',
                features: ['Revenue Analysis', 'KPI Calculation', 'Forecasting', 'Guest Analytics']
              },
              {
                icon: <Database className="w-8 h-8" />,
                title: 'Data Quality Agent',
                description: 'Expert dalam data cleaning, deduplication, dan quality validation dengan human-in-the-loop.',
                color: 'from-green-500 to-emerald-600',
                features: ['Guest Deduplication', 'Data Validation', 'Quality Scoring', 'Entity Resolution']
              }
            ].map((agent, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
                <div className={`w-16 h-16 bg-gradient-to-r ${agent.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {agent.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3">{agent.title}</h3>
                <p className="text-gray-600 mb-4">{agent.description}</p>
                
                <ul className="space-y-2">
                  {agent.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {feature}
          </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Capabilities Grid */}
          <div className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-100 mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Analytics Capabilities</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Dari revenue optimization hingga guest experience enhancement, sistem kami mengcover semua aspek hotel analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <DollarSign className="w-6 h-6" />,
                  title: 'Revenue Management',
                  items: ['Total Revenue', 'ADR Analysis', 'RevPAR Calculation', 'Pricing Trends', 'Revenue Forecast']
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  title: 'Guest Analytics',
                  items: ['Demographics', 'Length of Stay', 'Repeat Guests', 'Guest Segmentation', 'Behavior Patterns']
                },
                {
                  icon: <TrendingUp className="w-6 h-6" />,
                  title: 'Performance Metrics',
                  items: ['Occupancy Rate', 'Seasonal Trends', 'Channel Performance', 'Market Analysis', 'Benchmarking']
                },
                {
                  icon: <Activity className="w-6 h-6" />,
                  title: 'Data Quality',
                  items: ['Guest Deduplication', 'Data Validation', 'Entity Resolution', 'Quality Scoring', 'Human Approval']
                }
              ].map((category, index) => (
                <div key={index} className="p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      {category.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900">{category.title}</h3>
                  </div>
                  
                  <ul className="space-y-2">
                    {category.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        {item}
          </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Powered by Advanced Technology</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { name: 'OpenAI Agents SDK', description: 'Multi-agent orchestration' },
                { name: 'Next.js 15', description: 'Modern web framework' },
                { name: 'SQLite', description: 'High-performance database' },
                { name: 'TypeScript', description: 'Type-safe development' }
              ].map((tech, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{tech.name}</h3>
                  <p className="text-sm text-gray-600">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Hotel Analytics?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Gunakan kekuatan AI multi-agent untuk mendapatkan insights yang actionable dan meningkatkan performa hotel Anda.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                View Dashboard
              </Link>
              
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                Start Chatting
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}