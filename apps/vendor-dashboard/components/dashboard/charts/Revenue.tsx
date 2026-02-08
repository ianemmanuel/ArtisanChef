'use client'

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

const chartData = [
  { date: "2024-01-01", revenue: 4000, orders: 2400 },
  { date: "2024-02-01", revenue: 3000, orders: 1398 },
  { date: "2024-03-01", revenue: 2000, orders: 9800 },
  { date: "2024-04-01", revenue: 2780, orders: 3908 },
  { date: "2024-05-01", revenue: 1890, orders: 4800 },
  { date: "2024-06-01", revenue: 2390, orders: 3800 },
  { date: "2024-07-01", revenue: 3490, orders: 4300 },
  { date: "2024-08-01", revenue: 4200, orders: 5200 },
  { date: "2024-09-01", revenue: 3800, orders: 4100 },
  { date: "2024-10-01", revenue: 4500, orders: 4800 },
  { date: "2024-11-01", revenue: 5200, orders: 5400 },
  { date: "2024-12-01", revenue: 6100, orders: 6200 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))", // Peach
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))", // Mint
  },
} satisfies ChartConfig

export function RevenueChart() {
  const [timeRange, setTimeRange] = React.useState("12m")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-12-01")
    let monthsToSubtract = 12
    if (timeRange === "6m") {
      monthsToSubtract = 6
    } else if (timeRange === "3m") {
      monthsToSubtract = 3
    }
    const startDate = new Date(referenceDate)
    startDate.setMonth(startDate.getMonth() - monthsToSubtract)
    return date >= startDate
  })

  // Calculate metrics
  const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0)
  const lastMonth = filteredData[filteredData.length - 1]?.revenue || 0
  const prevMonth = filteredData[filteredData.length - 2]?.revenue || 0
  const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0
  const isPositive = growth > 0

  return (
    <Card className="border border-border shadow-card">
      <CardHeader className="flex items-center gap-2 space-y-0 pb-4 sm:flex-row">
        <div className="grid flex-1 gap-2">
          <div className="flex items-center gap-2">
            {/* Peach gradient icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-peach-400 to-peach-600 shadow-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold">Revenue & Orders</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Monthly revenue and order trends comparison
          </CardDescription>
          
          {/* Revenue Summary - Using cream/gold color for money */}
          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-3xl font-bold text-cream-600 dark:text-cream-400">
              ${(totalRevenue / 1000).toFixed(1)}k
            </span>
            
            {/* Growth - mint for positive, red for negative */}
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive 
                ? 'text-mint-600 dark:text-mint-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(growth).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg border-border"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 12 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="12m" className="rounded-lg">
              Last 12 months
            </SelectItem>
            <SelectItem value="6m" className="rounded-lg">
              Last 6 months
            </SelectItem>
            <SelectItem value="3m" className="rounded-lg">
              Last 3 months
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              {/* Peach gradient for revenue */}
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-peach-500)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-peach-500)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              {/* Mint gradient for orders */}
              <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mint-500)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mint-500)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid 
              vertical={false} 
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                })
              }}
            />
            <ChartTooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  className="bg-popover border-border"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            {/* Peach line for revenue */}
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="var(--color-peach-500)"
              strokeWidth={2}
            />
            {/* Mint line for orders */}
            <Area
              dataKey="orders"
              type="natural"
              fill="url(#fillOrders)"
              stroke="var(--color-mint-500)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}