import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [quick, setQuick] = useState<string | null>(null)
  const [detailed, setDetailed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile)
        setError(null)
        setQuick(null)
        setDetailed(null)
      } else {
        setError('Please upload an image file.')
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setQuick(null)
      setDetailed(null)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

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
      <h1 style={{ marginBottom: 16 }}>Vicky - Image Analysis</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{
            border: '2px dashed #ccc',
            borderRadius: 8,
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? '#f0f8ff' : '#fafafa',
            transition: 'all 0.2s ease',
            borderColor: dragActive ? '#007bff' : '#ccc'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          {file ? (
            <div>
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  borderRadius: 4,
                  marginBottom: 12
                }}
              />
              <p style={{ margin: 0, color: '#666' }}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
                Click to change image
              </p>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#666' }}>
                📷 Drop an image here or click to select
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
                Supports JPG, PNG, GIF, WebP
              </p>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading || !file} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: 6, 
            border: 'none', 
            background: loading || !file ? '#ccc' : '#007bff', 
            color: '#fff',
            fontSize: '16px',
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {loading ? 'Processing… (streaming)' : 'Analyze Image'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#ffe6e6', color: '#b00020', borderRadius: 6 }}>
          Error: {error}
        </div>
      )}

      {quick && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1890ff' }}>Quick Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{quick}</pre>
        </div>
      )}

      {detailed && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#24292e' }}>Detailed Analysis</h3>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{detailed}</pre>
        </div>
      )}
    </div>
  )
}

export default App
