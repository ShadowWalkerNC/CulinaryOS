export function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>404</div>
      <div style={{ color: 'var(--text-muted)' }}>Restaurant not found.</div>
    </div>
  );
}
