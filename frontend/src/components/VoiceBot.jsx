import { useRealtimeVoice } from '../hooks/useRealtimeVoice'

const STATUS_CONFIG = {
  idle:        { label: 'Ready to connect',   color: '#6b7280', ring: false },
  connecting:  { label: 'Connecting...',      color: '#f59e0b', ring: true  },
  listening:   { label: 'Listening...',       color: '#10b981', ring: true  },
  thinking:    { label: 'Aria is thinking...',color: '#6366f1', ring: true  },
  speaking:    { label: 'Aria is speaking',   color: '#3b82f6', ring: true  },
  error:       { label: 'Connection error',   color: '#ef4444', ring: false },
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-1 h-8">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="wave-bar w-1 rounded-full bg-blue-400" style={{ height: '100%' }} />
      ))}
    </div>
  )
}

function StatusOrb({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {cfg.ring && <div className="pulse-ring absolute w-full h-full rounded-full" style={{ border: `2px solid ${cfg.color}` }} />}
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${cfg.color}33, ${cfg.color}11)`,
          border: `2px solid ${cfg.color}55`,
          boxShadow: `0 0 30px ${cfg.color}44`,
        }}>
        {status === 'idle' && '🎙️'}
        {status === 'connecting' && '⚡'}
        {status === 'listening' && '👂'}
        {status === 'thinking' && '🧠'}
        {status === 'speaking' && '💬'}
        {status === 'error' && '⚠️'}
      </div>
    </div>
  )
}

export default function VoiceBot() {
  const { status, transcript, startCall, endCall } = useRealtimeVoice()
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle
  const isActive = ['connecting', 'listening', 'thinking', 'speaking'].includes(status)

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-10">
      <div className="text-center mb-10">
        <div className="text-xs font-semibold tracking-[0.3em] text-blue-400 uppercase mb-2">Alpharive Tech</div>
        <h1 className="text-3xl font-bold text-white mb-1">Meet <span className="text-blue-400">Aria</span></h1>
        <p className="text-gray-400 text-sm">Your AI voice assistant</p>
      </div>

      <StatusOrb status={status} />

      <div className="mt-6 text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</div>

      {status === 'speaking' && <div className="mt-4"><WaveAnimation /></div>}

      <div className="mt-8 flex gap-4">
        {!isActive ? (
          <button onClick={startCall} className="px-8 py-3 rounded-full font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 shadow-lg shadow-blue-900/40">Start Call</button>
        ) : (
          <button onClick={endCall} className="px-8 py-3 rounded-full font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-lg shadow-red-900/40">End Call</button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="mt-10 w-full max-w-xl">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Conversation Transcript</div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {transcript.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-xs ${msg.role === 'user' ? 'bg-blue-700/40 text-blue-100 rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                  <div className="text-xs opacity-50 mb-1">{msg.role === 'user' ? 'You' : 'Aria'} · {msg.time}</div>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
