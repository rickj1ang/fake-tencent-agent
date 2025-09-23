import { useState } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [quick, setQuick] = useState<string | null>(null)
  const [detailed, setDetailed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setQuick(null)
    setDetailed(null)
    if (!file) {
      setError('Please choose an image file.')
      return
    }
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch(`/api/analyze-photo`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by blank line. Process by lines.
        const parts = buffer.split('\n\n')
        // Keep the last partial chunk in buffer
        buffer = parts.pop() || ''

        for (const chunk of parts) {
          const lines = chunk.split('\n')
          let eventType: string | null = null
          let dataText = ''
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim()
            else if (line.startsWith('data:')) dataText += line.slice(5).trim()
          }
          if (!eventType) continue
          try {
            const data = dataText ? JSON.parse(dataText) : {}
            if (eventType === 'quick') {
              setQuick(data.quick_result ?? '')
            } else if (eventType === 'detailed') {
              // detailed.llm_output is text
              setDetailed(data.llm_output ?? '')
            } else if (eventType === 'error') {
              setError(data.error ?? 'stream error')
            }
          } catch (err: any) {
            setError(err?.message || 'parse error')
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 16 }}>Image Analyze Demo</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#111', color: '#fff' }}>
          {loading ? 'Processing… (streaming)' : 'Analyze (stream)'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: '#b00020' }}>Error: {error}</div>
      )}

      {quick && (
        <div style={{ marginTop: 16 }}>
          <h3>Quick result</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{quick}</pre>
        </div>
      )}

      {detailed && (
        <div style={{ marginTop: 16 }}>
          <h3>Detailed</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{detailed}</pre>
        </div>
      )}
    </div>
  )
}

export default App
