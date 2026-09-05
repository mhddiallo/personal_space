export default function PageHeader({ kicker, title, description, statNumber, statLabel, children }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {(statNumber !== undefined || children) && (
        <div className="page-stat">
          {statNumber !== undefined && <div className="page-stat-number serif-italic">{statNumber}</div>}
          {statLabel && <div className="page-stat-label">{statLabel}</div>}
          {children}
        </div>
      )}
    </div>
  )
}
