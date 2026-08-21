import { UserCheck, Clock, CheckCircle2, ArrowRightLeft, TriangleAlert } from "lucide-react"

const STEPS = [
  {
    icon : UserCheck,
    badge: "icon-badge-primary",
    title: "1. Claim",
    body : "Claiming an application makes you its reviewer — everyone else's action buttons stay hidden until it's reassigned.",
  },
  {
    icon : Clock,
    badge: "icon-badge-warning",
    title: "2. Review",
    body : "Mark it under review, check documents, and request revisions if something's missing or unclear.",
  },
  {
    icon : CheckCircle2,
    badge: "icon-badge-success",
    title: "3. Decide",
    body : "Approve to create the vendor account automatically, or reject with a reason the applicant can act on.",
  },
]

const FALLBACKS = [
  {
    icon: ArrowRightLeft,
    title: "Reassign",
    body: "Hand a claimed application to another eligible reviewer — useful when workload needs to shift.",
  },
  {
    icon: TriangleAlert,
    title: "Escalate",
    body: "Send it up for higher-level attention. You lose access to it once escalated — only the receiving team can pick it up from there.",
  },
]

/** Static, educational — orients admins new to the claim/review/escalate workflow. */
export function VendorsWorkflowGuide() {
  return (
    <div className="admin-card space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">How application review works</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">The path most applications take, start to finish.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, badge, title, body }) => (
          <div key={title} className="space-y-2">
            <div className={`icon-badge ${badge} h-9 w-9`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
        {FALLBACKS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{title}.</span> {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
