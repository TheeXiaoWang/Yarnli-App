import React from 'react'

const presets = [
  { label: 'Auto (Recommended)', key: 'auto', note: 'Adapts quality to your computer' },
  { label: 'Fast', dpr: [0.75, 1], note: 'For older computers' },
  { label: 'Standard', dpr: [1, 1.25], note: 'Good balance' },
  { label: 'Crisp', dpr: [1.25, 2], note: 'Sharper view, uses more power' },
]

const ResolutionModal = ({ open, onClose, onApply, current }) => {
  if (!open) return null
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50 }}>
      <div style={{ background:'#2b2536', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:20, width:360, color:'#f4f1f7', boxShadow:'0 12px 32px rgba(0,0,0,0.45)' }}>
        <h3 style={{ marginBottom:12, fontSize:18 }}>Display Resolution</h3>
        <p style={{ color:'#b6aec5', fontSize:13, marginBottom:12 }}>Pick a simple quality level. You can change this anytime.</p>
        <div style={{ display:'grid', gap:10 }}>
          {presets.map((p) => (
            <button key={p.label} className="btn" style={{ justifyContent:'space-between', display:'flex', alignItems:'center' }} onClick={() => onApply(p.key || p.dpr)}>
              <span>{p.label}</span>
              <span style={{ color:'#b6aec5', fontSize:12 }}>{p.note}</span>
            </button>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default ResolutionModal


