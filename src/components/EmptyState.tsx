export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">✓</span>
      <p>{text}</p>
    </div>
  )
}
