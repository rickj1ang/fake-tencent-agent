import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [quick, setQuick] = useState<string | null>(null)
  const [detailed, setDetailed] = useState<any[] | null>(null)
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
              // detailed.detailed_products is array
              setDetailed(data.detailed_products ?? [])
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
                {loading && !quick && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 12,
                    borderRadius: 8,
                    zIndex: 2,
                    pointerEvents: 'none',
                    overflow: 'hidden'
                  }}>
                    {/* 激光扫描线 */}
                    <div style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, transparent, #00ff00, #00ff00, transparent)',
                      boxShadow: '0 0 10px #00ff00, 0 0 20px #00ff00',
                      animation: 'laserScan 1.5s ease-in-out infinite'
                    }}></div>
                    
                    {/* 扫描网格效果 */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        linear-gradient(90deg, transparent 48%, rgba(0, 255, 0, 0.3) 49%, rgba(0, 255, 0, 0.3) 51%, transparent 52%),
                        linear-gradient(0deg, transparent 48%, rgba(0, 255, 0, 0.3) 49%, rgba(0, 255, 0, 0.3) 51%, transparent 52%)
                      `,
                      backgroundSize: '20px 20px',
                      animation: 'gridPulse 2s ease-in-out infinite'
                    }}></div>
                    
                    {/* 角落扫描点 */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #00ff00',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ff00',
                      animation: 'cornerPulse 1s ease-in-out infinite'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #00ff00',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ff00',
                      animation: 'cornerPulse 1s ease-in-out infinite 0.5s'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '8px',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #00ff00',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ff00',
                      animation: 'cornerPulse 1s ease-in-out infinite 1s'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      right: '8px',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #00ff00',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ff00',
                      animation: 'cornerPulse 1s ease-in-out infinite 1.5s'
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
        {/* Quick Result Section */}
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          backgroundColor: '#e6f7ff', 
          borderRadius: 12, 
          textAlign: 'left',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#1890ff' }}>
              {quick || '让我看看这是虾米东东'}
            </span>
            {loading && !quick && (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #1890ff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
          </div>
        </div>

        {/* Detailed Analysis Section */}
        {detailed && detailed.length > 0 && (
          <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f6f8fa', borderRadius: 12, textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#24292e', fontSize: '16px', fontWeight: '600' }}>
              看看还有啥信息
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {detailed.map((product: any, index: number) => (
                <div key={index} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e1e4e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#24292e' }}>
                        {product.product_name}
                      </span>
                      {product.brand && (
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 6px', 
                          backgroundColor: '#f1f8ff', 
                          color: '#0366d6',
                          borderRadius: '4px'
                        }}>
                          {product.brand}
                        </span>
                      )}
                    </div>
                    {product.model_or_specific_name && (
                      <div style={{ fontSize: '13px', color: '#586069' }}>
                        型号: {product.model_or_specific_name}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {product.product_category && (
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px', 
                          backgroundColor: '#f6f8fa', 
                          color: '#586069',
                          borderRadius: '4px'
                        }}>
                          {product.product_category}
                        </span>
                      )}
                      {product.manufacturer_or_parent_company && (
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px', 
                          backgroundColor: '#fff5b4', 
                          color: '#735c0f',
                          borderRadius: '4px'
                        }}>
                          {product.manufacturer_or_parent_company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes laserScan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes cornerPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default App
