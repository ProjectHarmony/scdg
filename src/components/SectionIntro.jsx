export function SectionIntro({ tag, title, highlight, copy, align = 'left' }) {
  return (
    <div className={`section-intro ${align === 'center' ? 'center' : ''}`}>
      <div className="section-tag">{tag}</div>
      <h2 className="section-title">
        {title} {highlight && <span>{highlight}</span>}
      </h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}
