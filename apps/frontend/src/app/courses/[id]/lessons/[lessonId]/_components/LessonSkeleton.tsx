// Loading skeleton for the lesson detail page.

export function LessonSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-7 bg-muted rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-8 bg-muted rounded w-20" />
        <div className="h-8 bg-muted rounded w-20" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-16 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
    </div>
  );
}
