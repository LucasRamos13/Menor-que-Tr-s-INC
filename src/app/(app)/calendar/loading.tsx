import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
