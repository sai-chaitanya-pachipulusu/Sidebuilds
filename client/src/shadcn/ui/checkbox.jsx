import * as React from "react"
import { cn } from "../../utils/cn"

// Lightweight checkbox that mimics shadcn UI API without Radix (avoids React hook instance issues)
const Checkbox = React.forwardRef(({ className = "", checked, onCheckedChange, onChange, disabled, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-purple-500 bg-transparent ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-purple-600" : "",
        className
      )}
      disabled={disabled}
      checked={!!checked}
      onChange={(e) => {
        const next = e.target.checked
        if (typeof onCheckedChange === "function") {
          onCheckedChange(next)
        }
        if (typeof onChange === "function") {
          onChange(e)
        }
      }}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }