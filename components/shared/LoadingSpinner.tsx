export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  )
}
