import { cn } from "cn"
import { LoaderCircle } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return <LoaderCircle aria-hidden className={cn("size-4 animate-spin", className)} {...props} />
}

export { Spinner }
