import { Ban, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/*
 * Minimal, honest status notice for a vendor whose VendorAccount is
 * SUSPENDED or BANNED. Rendered inline by "/" rather than redirected to
 * a dedicated route — there's nowhere else for a restricted account to
 * go. A full account status experience is out of scope for this pass;
 * this is the smallest correct thing to show instead of nothing.
 */
export function AccountStatusNotice({
  variant,
  reason,
}: {
  variant: "SUSPENDED" | "BANNED"
  reason: string | null
}) {
  const isBanned = variant === "BANNED"

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive-bg">
          {isBanned ? (
            <Ban className="size-6 text-destructive" />
          ) : (
            <ShieldAlert className="size-6 text-destructive" />
          )}
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          {isBanned ? "This account has been banned" : "This account is suspended"}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {reason ?? "Contact DailyBread support for more information about your account status."}
        </p>
      </CardContent>
    </Card>
  )
}
