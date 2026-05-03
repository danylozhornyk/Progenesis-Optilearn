// Loading skeleton for the course detail page.

export function CourseSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="w-full h-56 bg-muted rounded-lg" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-7 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
      <div className="space-y-2 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
