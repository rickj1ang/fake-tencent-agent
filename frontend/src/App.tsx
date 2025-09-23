import { useState } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
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
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      setError(err?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
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
          {loading ? 'Uploading…' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: '#b00020' }}>Error: {error}</div>
      )}

      {result && (
        <pre style={{ marginTop: 16, background: '#f6f8fa', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default App
