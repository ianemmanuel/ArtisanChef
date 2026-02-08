import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Settings } from "lucide-react";

export default function BasicInfoSection({ form, isSubmitting }: { form: any, isSubmitting: boolean }) {
  return (
    <Card className="border shadow-sm dark:border-muted">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings className="w-5 h-5" />
          Basic Information
        </CardTitle>
        <CardDescription className="text-base">
          Provide the essential details for your category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Category Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Appetizers, Main Courses, Desserts"
                    className="h-12 text-base"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Choose a clear, descriptive name that customers will easily understand
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <FormField
          control={form.control}
          name="shortDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Short Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description shown in category listings..."
                  className="min-h-[80px] resize-none text-base"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A concise description displayed in category cards and previews
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Full Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed description of what types of items belong in this category..."
                  className="min-h-[120px] resize-none text-base"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional detailed description to help customers understand this category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}