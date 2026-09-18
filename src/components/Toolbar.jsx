import './Toolbar.css'

// Arrow into a tray — the conventional "download a file" glyph, which is what
// this button does (no print dialog in between; see OrgChart's exportPdf).
function DownloadIcon() {
  return (
    <svg className="oc-print-btn__icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2v7.5M5.25 6.75 8 9.5l2.75-2.75" />
      <path d="M2.75 11v1.25A1.75 1.75 0 0 0 4.5 14h7a1.75 1.75 0 0 0 1.75-1.75V11" />
    </svg>
  )
}

// Swaps in for the icon while the export runs, so the button changes in place
// rather than just relabelling itself.
function Spinner() {
  return (
    <svg className="oc-print-btn__icon oc-print-btn__icon--spin" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" opacity="0.35" />
      <path d="M8 2a6 6 0 0 1 6 6" />
    </svg>
  )
}

// Page controls: a direct PDF export (rasterizes the chart and downloads a
// PDF — see OrgChart's exportPdf — no print dialog in between).
export default function Toolbar({ onSavePdf, isSavingPdf }) {
  return (
    <div className="oc-toolbar">
      <button type="button" className="oc-print-btn" onClick={onSavePdf} disabled={isSavingPdf}>
        {isSavingPdf ? <Spinner /> : <DownloadIcon />}
        {isSavingPdf ? 'Saving…' : 'Save as PDF'}
      </button>
    </div>
  )
}
