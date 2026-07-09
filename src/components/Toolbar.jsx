import './Toolbar.css'

// Page controls: a switch to show/hide job titles, and a direct PDF export
// (rasterizes the chart and downloads a PDF — see OrgChart's exportPdf — no
// print dialog in between).
export default function Toolbar({ showTitles, onToggleTitles, onSavePdf, isSavingPdf }) {
  return (
    <div className="oc-toolbar">
      <button
        type="button"
        role="switch"
        aria-checked={showTitles}
        aria-label="Show job titles"
        className={`oc-toggle${showTitles ? ' is-on' : ''}`}
        onClick={onToggleTitles}
      >
        <span className="oc-toggle__track">
          <span className="oc-toggle__thumb" />
        </span>
        <span className="oc-toggle__text">Titles</span>
      </button>

      <button type="button" className="oc-print-btn" onClick={onSavePdf} disabled={isSavingPdf}>
        {isSavingPdf ? 'Saving…' : 'Save as PDF'}
      </button>
    </div>
  )
}
