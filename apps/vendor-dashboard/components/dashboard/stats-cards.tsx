

import Link from 'next/link';
import { Card, CardContent } from '@repo/ui/components/card';
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, Users, Store } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'from-emerald-400 to-emerald-600',
    href: '/revenue',
  },
  {
    title: 'Active Orders',
    value: '2,350',
    change: '+12.5%',
    trend: 'up' as const,
    icon: ShoppingBag,
    color: 'from-amber-400 to-orange-500',
    href: '/orders',
  },
  {
    title: 'Total Customers',
    value: '12,234',
    change: '+8.2%',
    trend: 'up' as const,
    icon: Users,
    color: 'from-blue-400 to-blue-600',
    href: '/customers',
  },
  {
    title: 'Active Vendors',
    value: '573',
    change: '-2.4%',
    trend: 'down' as const,
    icon: Store,
    color: 'from-violet-400 to-violet-600',
    href: '/vendors',
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;

        return (
          <Link key={stat.title} href={stat.href} className="block">
            <Card className="overflow-hidden transition-all hover:shadow-lg cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <h3 className="text-3xl font-bold">{stat.value}</h3>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <TrendIcon
                        className={cn(
                          'h-4 w-4',
                          stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                        )}
                      >
                        {stat.change}
                      </span>
                      <span className="text-sm text-muted-foreground">from last month</span>
                    </div>
                  </div>
                  <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br', stat.color)}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}