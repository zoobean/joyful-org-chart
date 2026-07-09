import './Toolbar.css'

// Page controls: a direct PDF export (rasterizes the chart and downloads a
// PDF — see OrgChart's exportPdf — no print dialog in between).
export default function Toolbar({ onSavePdf, isSavingPdf }) {
  return (
    <div className="oc-toolbar">
      <button type="button" className="oc-print-btn" onClick={onSavePdf} disabled={isSavingPdf}>
        {isSavingPdf ? 'Saving…' : 'Save as PDF'}
      </button>
    </div>
  )
}
