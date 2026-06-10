import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { ChevronDown, Info, Key } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

const MODEL_COLORS = ['#c026d3', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState('28 Days')
  
  const { data, isLoading } = useQuery({
    queryKey: ['usageStats'],
    queryFn: async () => {
      const [statsRes, historyRes] = await Promise.all([
        api.get('/usage'),
        api.get('/usage/history')
      ])
      return {
        stats: statsRes.data,
        history: historyRes.data.history || []
      }
    }
  })

  const processedData = useMemo(() => {
    if (!data?.history) return { overviewData: [], models: [] }

    const grouped = {}
    const modelSet = new Set()

    data.history.forEach(item => {
      const dateLabel = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const rawDate = new Date(item.date).getTime()
      
      if (!grouped[dateLabel]) {
        grouped[dateLabel] = {
          date: dateLabel,
          rawDate,
          requests: 0,
          errors: 0, // Mocking errors as backend currently doesn't return them
          successRate: 100
        }
      }

      grouped[dateLabel].requests += item.requests

      const safeModel = item.model ? item.model.replace(/[^a-zA-Z0-9]/g, '') : 'unknown'
      modelSet.add(safeModel)

      if (grouped[dateLabel][`${safeModel}_tokensIn`] === undefined) {
        grouped[dateLabel][`${safeModel}_tokensIn`] = 0
        grouped[dateLabel][`${safeModel}_tokensOut`] = 0
        grouped[dateLabel][`${safeModel}_requests`] = 0
      }

      grouped[dateLabel][`${safeModel}_tokensIn`] += item.tokens_in || 0
      grouped[dateLabel][`${safeModel}_tokensOut`] += item.tokens_out || 0
      grouped[dateLabel][`${safeModel}_requests`] += item.requests || 0
    })

    // Sort by date
    const sortedData = Object.values(grouped).sort((a, b) => a.rawDate - b.rawDate)
    
    return {
      overviewData: sortedData,
      models: Array.from(modelSet)
    }
  }, [data?.history])

  const { overviewData, models } = processedData

  if (isLoading) return <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center"><div className="text-white">Loading Dashboard...</div></div>

  return (
    <div className="min-h-screen bg-[#131314] text-white p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">MADHAV API Usage</h1>
            <span className="text-[10px] bg-[#303030] px-2 py-0.5 rounded-md text-gray-300 font-bold tracking-wide border border-gray-600">
              {data?.stats?.current_plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
          <Link to="/api-keys" className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl transition-all text-sm font-semibold">
            <Key className="w-4 h-4" /> Manage API Keys
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Project</span>
            <button className="bg-[#1e1e1e] border border-[#444] px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-[#2a2a2a] transition-colors">
              MADHAV Standard Project <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Time Range</span>
            <button className="bg-[#1e1e1e] border border-[#444] px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-[#2a2a2a] transition-colors">
              {timeRange} <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="mb-10">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
          Overview <Info className="w-4 h-4 text-gray-500" />
        </h2>
        <div className="grid grid-cols-2 gap-4">
          
          {/* Total API Requests Chart */}
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 transition-all hover:border-[#444]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs text-gray-400 font-medium">Total API Requests</h3>
              <button className="text-xs text-gray-400 flex items-center gap-1 hover:text-white transition-colors">
                All API Keys <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }} />
                  <Line yAxisId="left" type="stepAfter" dataKey="requests" stroke="#c026d3" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="linear" dataKey="successRate" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c026d3]"></span> API Key</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Success Rate</div>
            </div>
          </div>

          {/* Total API Errors Chart */}
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 transition-all hover:border-[#444]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs text-gray-400 font-medium">Total API Errors</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#2a2a2a'}} contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }} />
                  <Bar dataKey="errors" fill="#f97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> 400 BadRequest</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span> 429 TooManyRequests</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c026d3]"></span> 500 InternalServerError</div>
            </div>
          </div>

        </div>
      </div>

      {/* Generate content & Live API Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            Generate content & Live API <Info className="w-4 h-4 text-gray-500" />
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Model</span>
            <button className="bg-[#1e1e1e] border border-[#444] px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-[#2a2a2a] transition-colors">
              All Models <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Input Tokens */}
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium mb-6">Input Tokens per model <Info className="w-3 h-3 inline text-gray-600" /></h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickFormatter={(val) => `${(val/1000).toFixed(1)}K`} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }} />
                  {models.map((m, i) => (
                    <Line key={m} type="monotone" dataKey={`${m}_tokensIn`} name={m} stroke={MODEL_COLORS[i % MODEL_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Output Tokens */}
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium mb-6">Output Tokens per model</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickFormatter={(val) => `${(val/1000).toFixed(1)}K`} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }} />
                  {models.map((m, i) => (
                    <Line key={m} type="monotone" dataKey={`${m}_tokensOut`} name={m} stroke={MODEL_COLORS[i % MODEL_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Requests per model */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium mb-6">Requests per model</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }} />
                  {models.map((m, i) => (
                    <Line key={m} type="monotone" dataKey={`${m}_requests`} name={m} stroke={MODEL_COLORS[i % MODEL_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-400 pl-8">
              {models.map((m, i) => (
                <div key={m} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }}></span>
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate media Section */}
      <div className="mb-10">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
          Generate media <Info className="w-4 h-4 text-gray-500" />
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 flex flex-col items-center justify-center h-64 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium self-start absolute mt-4 ml-4">Imagen Requests per model</h3>
            <span className="text-xs text-gray-600 italic">No data available</span>
          </div>
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 flex flex-col items-center justify-center h-64 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium self-start absolute mt-4 ml-4">Veo Requests per model</h3>
            <span className="text-xs text-gray-600 italic">No data available</span>
          </div>
        </div>
      </div>

      {/* Embed content Section */}
      <div className="mb-10">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
          Embed content <Info className="w-4 h-4 text-gray-500" />
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 flex flex-col items-center justify-center h-64 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium self-start absolute mt-4 ml-4">Embedding Tokens per model</h3>
            <span className="text-xs text-gray-600 italic">No data available</span>
          </div>
          <div className="bg-[#1e1e1f] border border-[#333] rounded-xl p-4 flex flex-col items-center justify-center h-64 transition-all hover:border-[#444]">
            <h3 className="text-xs text-gray-400 font-medium self-start absolute mt-4 ml-4">Embedding Requests per model</h3>
            <span className="text-xs text-gray-600 italic">No data available</span>
          </div>
        </div>
      </div>
      
      <div className="text-[10px] text-gray-500 mt-8 mb-4 max-w-4xl">
        Usage data may take up to 15 minutes to update. Usage information displayed is for the API and does not reflect AI Studio Usage, which is offered free of charge (when no API key is selected). For latency/traffic data & method filtering please visit the <a href="#" className="text-blue-400 hover:underline">Google Cloud Console</a>.
      </div>
    </div>
  )
}
