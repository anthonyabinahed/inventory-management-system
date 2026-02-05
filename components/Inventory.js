import { Wrench } from "lucide-react";

export function Inventory() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[250px] sm:min-h-[400px] p-4 sm:p-6">
      <Wrench className="size-12 sm:size-16 text-warning mb-3 sm:mb-4" />
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Under Construction</h2>
      <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md px-4">
        The Inventory management page is currently being developed. Check back soon to manage your stock items.
      </p>
    </div>
  );
}
