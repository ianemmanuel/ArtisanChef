"use client"

import { TrendingUp, Users } from "lucide-react"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { ChartConfig, ChartContainer } from "@repo/ui/components/chart"

const chartData = [
  { metric: "adoption", value: 68, fill: "var(--color-peach-500)" },
]

const chartConfig = {
  value: {
    label: "Meal Plan Adoption",
  },
  adoption: {
    label: "Adoption Rate",
    color: "hsl(var(--chart-1))", // Peach
  },
} satisfies ChartConfig

export function MealPlanPerformance() {
  return (
    <Card className="flex flex-col h-full border border-border shadow-card">
      <CardHeader className="items-center pb-0">
        <div className="flex items-center gap-2">
          {/* Lavender icon for premium/subscription */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-lavender-400 to-lavender-600 shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl font-semibold">Meal Plans</CardTitle>
        </div>
        <CardDescription className="pt-1">Subscription growth & engagement</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[270px]" 
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={75}  
            outerRadius={150} 
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[90, 78]}  
            />
            <RadialBar 
              dataKey="value" 
              background 
              cornerRadius={12}  
              strokeWidth={0}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {chartData[0].value}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 28}  
                          className="fill-muted-foreground text-sm"
                        >
                          Adoption
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      
      <CardFooter className="flex-col gap-2 text-sm">
        {/* Positive growth - use mint */}
        <div className="flex items-center gap-2 leading-none font-medium text-mint-600 dark:text-mint-400">
          <TrendingUp className="h-4 w-4" />
          +24% growth this quarter
        </div>
        <div className="text-muted-foreground leading-none text-center">
          2,340 active meal plan subscribers
        </div>
      </CardFooter>
    </Card>
  )
}