import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#5e5eff] text-white hover:bg-[#4b4bff]",
        secondary:
          "border-transparent bg-[#333] text-white hover:bg-[#444]",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "border-[#5e5eff] text-[#5e5eff] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 