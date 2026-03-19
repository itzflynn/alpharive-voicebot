import { useState, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const REALTIME_MODEL = 'gpt-realtime'

export function useRealtimeVoice() {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState([])
  const [sessionId] = useState(() => uuidv4())

  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const audioRef = useRef(null)
  const streamRef = useRef(null)

  const addMessage = useCallback((role, content) => {
    if (!content) return
    setTranscript(prev => [...prev, { role, content, time: new Date().toLocaleTimeString() }])
  }, [])

  const handleRealtimeEvent = useCallback((event) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setStatus('listening')
        break
      case 'response.created':
        setStatus('thinking')
        break
      case 'response.audio.delta':
        setStatus('speaking')
        break
      case 'response.audio.done':
        setStatus('listening')
        break
      case 'conversation.item.input_audio_transcription.completed':
        addMessage('user', event.transcript?.trim())
        break
      case 'response.audio_transcript.done':
      case 'response.output_text.done':
        addMessage('assistant', event.transcript?.trim() || event.text?.trim())
        break
      case 'error':
        console.error('Realtime error:', event.error)
        setStatus('error')
        break
      default:
        break
    }
  }, [addMessage])

  const startCall = useCallback(async () => {
    try {
      setStatus('connecting')

      const res = await fetch(`${BACKEND_URL}/session`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get session token')
      const sessionData = await res.json()
      const ephemeralKey = sessionData.client_secret?.value
      if (!ephemeralKey) throw new Error('Missing ephemeral key')

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      document.body.appendChild(audioEl)
      audioRef.current = audioEl

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = micStream
      micStream.getTracks().forEach(track => pc.addTrack(track, micStream))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => setStatus('listening')
      dc.onmessage = (e) => {
        try {
          handleRealtimeEvent(JSON.parse(e.data))
        } catch (err) {
          console.error('Event parse error', err)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      )

      if (!sdpResponse.ok) throw new Error(await sdpResponse.text())

      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      setStatus('listening')
    } catch (err) {
      console.error('Start call error:', err)
      setStatus('error')
    }
  }, [handleRealtimeEvent])

  const endCall = useCallback(async () => {
    try {
      if (dcRef.current) dcRef.current.close()
      if (pcRef.current) pcRef.current.close()
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioRef.current) {
        audioRef.current.srcObject = null
        audioRef.current.remove()
      }

      if (transcript.length > 0) {
        await fetch(`${BACKEND_URL}/save-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, transcript, outcome: 'inquiry' }),
        })
      }
    } catch (err) {
      console.error('End call error:', err)
    } finally {
      setStatus('idle')
    }
  }, [transcript, sessionId])

  return { status, transcript, sessionId, startCall, endCall }
}
