'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Avatar, AvatarFallback } from '@repo/ui/components/avatar';
import { ArrowUpRight, Clock, CheckCircle, Truck, ChefHat, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const orders = [
  {
    id: '#ORD-1234',
    customer: 'John Doe',
    category: 'meal',
    amount: 45.99,
    status: 'delivered',
    time: '5 min ago',
    items: 3,
  },
  {
    id: '#ORD-1235',
    customer: 'Sarah Smith',
    category: 'meal-plan',
    amount: 89.99,
    status: 'in-transit',
    time: '12 min ago',
    items: 1,
  },
  {
    id: '#ORD-1236',
    customer: 'Mike Johnson',
    category: 'meal',
    amount: 78.20,
    status: 'preparing',
    time: '18 min ago',
    items: 5,
  },
  {
    id: '#ORD-1237',
    customer: 'Emma Wilson',
    category: 'meal-plan',
    amount: 120.50,
    status: 'delivered',
    time: '25 min ago',
    items: 2,
  },
  {
    id: '#ORD-1238',
    customer: 'Chris Brown',
    category: 'meal',
    amount: 56.80,
    status: 'in-transit',
    time: '32 min ago',
    items: 3,
  },
];

const statusConfig = {
  delivered: {
    icon: CheckCircle,
    className: "bg-mint-500/10 text-mint-700 dark:text-mint-300 border border-mint-300 dark:border-mint-600",
  },
  'in-transit': {
    icon: Truck,
    className: "bg-peach-500/10 text-peach-700 dark:text-peach-300 border border-peach-300 dark:border-peach-600",
  },
  preparing: {
    icon: ChefHat,
    className: "bg-cream-500/10 text-cream-700 dark:text-cream-300 border border-cream-300 dark:border-cream-600",
  },
};

const categoryConfig = {
  meal: {
    label: 'Single Meal',
    className: "bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600",
  },
  'meal-plan': {
    label: 'Meal Plan',
    className: "bg-lavender-500/10 text-lavender-700 dark:text-lavender-300 border border-lavender-300 dark:border-lavender-600",
  },
};

export function RecentOrders() {
  return (
    <Card className="border border-border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Peach icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-peach-400 to-peach-600 shadow-sm">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Latest customer orders with real-time updates
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator - mint green */}
          <Badge className="bg-mint-500/10 text-mint-700 dark:text-mint-300 border border-mint-300 dark:border-mint-600">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-mint-500 animate-pulse" />
              Live Updates
            </div>
          </Badge>
          <Button variant="outline" size="sm" className="hover:border-peach-400 dark:hover:border-peach-500 group" asChild>
            <Link href="/orders">
              See More
              <ArrowUpRight className="h-4 w-4 ml-2 group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="px-6 py-4 text-muted-foreground font-medium">Customer</TableHead>
                <TableHead className="px-6 py-4 text-muted-foreground font-medium">Category</TableHead>
                <TableHead className="px-6 py-4 text-muted-foreground font-medium">Items</TableHead>
                <TableHead className="px-6 py-4 text-right text-muted-foreground font-medium">Amount</TableHead>
                <TableHead className="px-6 py-4 text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="px-6 py-4 text-muted-foreground font-medium">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const StatusIcon = statusConfig[order.status as keyof typeof statusConfig].icon;
                const categoryInfo = categoryConfig[order.category as keyof typeof categoryConfig];
                
                return (
                  <TableRow key={order.id} className="group border-b border-border transition-colors">
                    <TableCell className="px-6 py-4">
                      <Link href={`/customers/${order.id}`} className="group/link block">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border shadow-sm">
                            <AvatarFallback className="text-sm font-semibold bg-muted text-foreground group-hover/link:bg-peach-500/10 group-hover/link:text-peach-600 dark:group-hover/link:text-peach-400 transition-colors">
                              {order.customer.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground group-hover/link:text-peach-600 dark:group-hover/link:text-peach-400 transition-colors truncate">
                              {order.customer}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {order.id}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <Badge className={categoryInfo.className}>
                        {categoryInfo.label}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="bg-muted/50 text-foreground">
                        {order.items} {order.items === 1 ? 'item' : 'items'}
                      </Badge>
                    </TableCell>
                    
                    {/* Amount - use cream/gold for money */}
                    <TableCell className="px-6 py-4 text-right">
                      <div className="font-semibold text-cream-600 dark:text-cream-400">
                        ${order.amount.toFixed(2)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <Badge className={statusConfig[order.status as keyof typeof statusConfig].className}>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className="h-3 w-3" />
                          <span className="capitalize">{order.status}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-sm">{order.time}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}