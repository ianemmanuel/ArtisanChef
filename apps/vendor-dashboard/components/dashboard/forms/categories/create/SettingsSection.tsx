import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card"
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@repo/ui/components/form"
import { Switch } from "@repo/ui/components/switch"
import { Eye, EyeOff, Star } from "lucide-react"



export default function SettingsSection({ form, isSubmitting }: { form: any, isSubmitting: boolean }) {
  const watchIsActive = form.watch("isActive")
  const watchIsFeatured = form.watch("isFeatured")

  return (
    <Card className="border shadow-sm dark:border-muted">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Star className="w-5 h-5" />
          Category Settings
        </CardTitle>
        <CardDescription className="text-base">
          Configure how this category appears to customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    {watchIsActive ? (
                      <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    Active Status
                  </FormLabel>
                  <FormDescription>
                    {watchIsActive ? "Category is visible to customers" : "Category is hidden from customers"}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold flex items-center gap-2">
                    <Star className={`w-4 h-4 ${watchIsFeatured ? 'text-amber-500 fill-current dark:text-amber-400' : 'text-muted-foreground'}`} />
                    Featured Category
                  </FormLabel>
                  <FormDescription>
                    {watchIsFeatured ? "Promote this category prominently" : "Display normally with other categories"}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
