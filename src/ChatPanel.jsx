import { useEffect, useRef, useState } from 'react'
import './ChatPanel.css'

import { API_URL as API } from './config'

const SUGGESTIONS = [
  'What should I fix first?',
  'Explain the critical issues in plain language',
  'Who is affected by these problems?',
]

// Pass the scan report you got from the scanner: <ChatPanel report={report} />
export default function ChatPanel({ report }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Start a fresh conversation when a new scan comes in.
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [report])

  async function send(text) {
    const content = text.trim()
    if (!content || loading) return

    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message)
      setMessages(messages) // drop the failed question so the user can retry
      setInput(content)
    } finally {
      setLoading(false)
    }
  }

  if (!report) return null

  return (
    <section className="chat" aria-label="Ask about this scan">
      <h2>Ask about this scan</h2>

      <div className="chat-log" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content}
          </div>
        ))}

        {loading && <div className="msg assistant thinking">Thinking…</div>}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <label htmlFor="chat-box" className="visually-hidden">
          Your question
        </label>
        <input
          id="chat-box"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How do I fix #3?"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}