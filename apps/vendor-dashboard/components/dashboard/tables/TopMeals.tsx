'use client'

import * as React from "react"
import Link from "next/link"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { Button } from "@repo/ui/components/button"
import { ArrowUpRight, TrendingUp, TrendingDown, Cake } from "lucide-react"
import { Badge } from "@repo/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"

export type Meal = {
  id: string
  name: string
  image: string
  orders: number
  revenue: number
  category: string
  growth: number
}

const data: Meal[] = [
  {
    id: "1",
    name: "Margherita Pizza",
    image: "/api/placeholder/40/40",
    orders: 342,
    revenue: 8542,
    category: "Italian",
    growth: 12.5
  },
  {
    id: "2",
    name: "Classic Burger",
    image: "/api/placeholder/40/40",
    orders: 298,
    revenue: 7450,
    category: "Fast Food",
    growth: 8.3
  },
  {
    id: "3",
    name: "California Roll",
    image: "/api/placeholder/40/40",
    orders: 267,
    revenue: 10680,
    category: "Japanese",
    growth: 15.2
  },
  {
    id: "4",
    name: "Beef Tacos",
    image: "/api/placeholder/40/40",
    orders: 234,
    revenue: 4680,
    category: "Mexican",
    growth: -2.3 // Negative growth example
  },
  {
    id: "5",
    name: "Chicken Alfredo",
    image: "/api/placeholder/40/40",
    orders: 198,
    revenue: 5940,
    category: "Italian",
    growth: 0 // No change example
  }
]

export const columns: ColumnDef<Meal>[] = [
  {
    accessorKey: "name",
    header: "Meal",
    cell: ({ row }) => {
      const meal = row.original
      return (
        <Link href={`/meals/${meal.id}`} className="group/link block">
          <div className="flex items-center gap-3 py-2">
            <Avatar className="h-10 w-10 border border-border shadow-sm">
              <AvatarImage src={meal.image} alt={meal.name} />
              <AvatarFallback className="text-sm font-semibold bg-muted text-foreground group-hover/link:bg-peach-500/10 group-hover/link:text-peach-600 dark:group-hover/link:text-peach-400 transition-colors">
                {meal.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground group-hover/link:text-peach-600 dark:group-hover/link:text-peach-400 transition-colors truncate">
                {meal.name}
              </p>
              <Badge variant="secondary" className="mt-1 text-xs bg-muted/50 text-foreground">
                {meal.category}
              </Badge>
            </div>
          </div>
        </Link>
      )
    },
  },
  {
    accessorKey: "orders",
    header: "Orders",
    cell: ({ row }) => {
      const orders = row.getValue("orders") as number
      return (
        <div className="text-right font-medium py-2">
          <span className="text-foreground">{orders.toLocaleString()}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => {
      const revenue = row.getValue("revenue") as number
      const growth = row.original.growth
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(revenue)
      
      // Profit = mint green, Loss = red, No change = blue
      const isProfit = growth > 0
      const isLoss = growth < 0
      const isStandard = growth === 0
      
      return (
        <div className="text-right py-2">
          {/* Revenue amount - cream/gold */}
          <div className="font-semibold text-cream-600 dark:text-cream-400">
            {formatted}
          </div>
          
          {/* Growth indicator */}
          <div className={`flex items-center justify-end gap-1 text-xs mt-1 font-medium ${
            isProfit ? 'text-mint-600 dark:text-mint-400' : 
            isLoss ? 'text-red-600 dark:text-red-400' : 
            'text-blue-600 dark:text-blue-400'
          }`}>
            {isProfit && <TrendingUp className="h-3 w-3" />}
            {isLoss && <TrendingDown className="h-3 w-3" />}
            <span>
              {isStandard ? '±0%' : `${growth > 0 ? '+' : ''}${growth}%`}
            </span>
          </div>
        </div>
      )
    },
  },
]

export function TopMeals() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="border border-border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Peach gradient icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-peach-400 to-peach-600 shadow-sm">
              <Cake className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold">Top Performing Meals</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Best-selling meals this month across all restaurants
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="hover:border-peach-400 dark:hover:border-peach-500 group" asChild>
          <Link href="/analytics/meals">
            See More
            <ArrowUpRight className="h-4 w-4 ml-2 group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors" />
          </Link>
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead 
                        key={header.id} 
                        className={`${header.index > 0 ? "text-right px-6 py-4" : "px-6 py-4"} text-muted-foreground font-medium`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group border-b border-border transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className="px-6"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center px-6 py-8 text-muted-foreground"
                  >
                    No meals found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}