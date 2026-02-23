"use client"

// This is a server-compatible component (no hooks) — receives parsed application data
// from the layout, which has already extracted json.data correctly.

interface Application {
  status: string
  documents?: Array<{ status: string }>
}

interface Props {
  application: Application | null
}

function getStep(application: Application | null): 1 | 2 | 3 {
  if (!application) return 1

  const status = application.status

  // Terminal / review states — show step 3
  if (["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].includes(status)) return 3

  // DRAFT — determine by whether docs have been uploaded
  const hasDocuments = application.documents?.some(d => d.status !== "WITHDRAWN") ?? false
  return hasDocuments ? 3 : 2
}

const STEPS = ["Business Details", "Documents", "Review & Submit"]

export function OnboardingStepIndicator({ application }: Props) {
  const current = getStep(application)

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3
        const done = step < current
        const active = step === current

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 text-sm font-medium
                ${done ? "text-green-600" : active ? "text-orange-500" : "text-stone-400"}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${done
                    ? "bg-green-100 text-green-600"
                    : active
                    ? "bg-orange-100 text-orange-600"
                    : "bg-stone-100 text-stone-400"
                  }`}
              >
                {done ? "✓" : step}
              </span>
              {label}
            </div>

            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${done ? "bg-green-300" : "bg-stone-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}