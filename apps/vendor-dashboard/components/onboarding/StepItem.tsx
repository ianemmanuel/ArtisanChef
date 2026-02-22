"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

export type StepStatus = "complete" | "active" | "upcoming" | "locked"

interface Props {
  index: number
  label: string
  href: string
  status: StepStatus
}

export function StepItem({ index, label, href, status }: Props) {
  const isClickable = status !== "locked" && status !== "active"

  const content = (
    <>
      {/* Dot */}
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
          status === "active" && "bg-orange-500 text-white ring-4 ring-orange-100",
          status === "complete" && "bg-orange-500 text-white",
          status === "upcoming" &&
            "bg-white border-2 border-stone-300 text-stone-500",
          status === "locked" &&
            "bg-stone-100 border-2 border-stone-200 text-stone-300"
        )}
      >
        {status === "complete" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          index + 1
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          status === "active" && "text-stone-900",
          status === "complete" && "text-orange-600 group-hover:text-orange-700",
          status === "upcoming" && "text-stone-500 group-hover:text-stone-700",
          status === "locked" && "text-stone-400"
        )}
      >
        {label}
      </span>
    </>
  )

  if (isClickable) {
    return (
      <Link href={href} className="group flex items-center gap-2.5">
        {content}
      </Link>
    )
  }

  return <div className="flex items-center gap-2.5">{content}</div>
}