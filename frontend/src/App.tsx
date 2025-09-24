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
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflow: 'auto'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 400, 
        minHeight: 500,
        background: 'white', 
        borderRadius: 20, 
        padding: 30, 
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
        <h1 style={{ marginBottom: 30, color: '#333', fontSize: '24px', fontWeight: '600' }}>Vicky</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
            style={{
              border: '2px dashed #ddd',
              borderRadius: 16,
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragActive ? '#f0f8ff' : '#fafafa',
              transition: 'all 0.3s ease',
              borderColor: dragActive ? '#007bff' : '#ddd',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
              <div style={{ position: 'relative' }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 150,
                    borderRadius: 8,
                    marginBottom: 12,
                    position: 'relative',
                    zIndex: 1
                  }}
                />
                {loading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 12,
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    color: 'white'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #fff',
                      borderTop: '3px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '12px'
                    }}></div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>Scanning...</div>
                    <div style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
                      animation: 'scan 2s linear infinite'
                    }}></div>
                  </div>
                )}
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
                  Click to change image
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#666' }}>
                  Drop an image here or click to select
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  Supports JPG, PNG, GIF, WebP
                </p>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !file} 
            style={{ 
              padding: '16px 32px', 
              borderRadius: 12, 
              border: 'none', 
              background: loading || !file ? '#ddd' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading || !file ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Scanning...
              </div>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, padding: 12, backgroundColor: '#ffe6e6', color: '#b00020', borderRadius: 8, fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ 
          marginTop: 20, 
          minHeight: 200,
          maxHeight: 300,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {quick && (
            <div style={{ padding: 16, backgroundColor: '#e6f7ff', borderRadius: 12, textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1890ff', fontSize: '16px' }}>Quick Result</h3>
              <div style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}>{quick}</div>
            </div>
          )}

          {detailed && (
            <div style={{ padding: 16, backgroundColor: '#f6f8fa', borderRadius: 12, textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#24292e', fontSize: '16px' }}>Detailed Analysis</h3>
              <div style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}>{detailed}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

export default App
