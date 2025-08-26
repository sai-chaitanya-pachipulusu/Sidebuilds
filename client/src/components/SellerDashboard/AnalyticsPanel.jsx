import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shadcn/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { Area, Bar, BarChart, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../shadcn/ui/chart";
import AnalyticsService from '../../services/analytics.service';

const StatCard = ({ title, value, change, changeType }) => (
    <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-white">{value}</div>
            <p className={`text-xs ${changeType === 'increase' ? 'text-green-400' : 'text-red-400'}`}>
                {change}
            </p>
        </CardContent>
    </Card>
);

const AnalyticsPanel = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const data = await AnalyticsService.getSellerAnalytics(timeRange);
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchAnalytics();
  }, [timeRange]);

  if (loading || !analytics) return <div className="text-white p-4">Loading analytics...</div>;

  const chartConfig = {
      revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
      visits: { label: "Visits", color: "hsl(var(--chart-2))" },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select time range" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString()}`} change={`${Math.abs(analytics.revenueChange)}%`} changeType={analytics.revenueChange > 0 ? 'increase' : 'decrease'} />
        <StatCard title="Active Projects" value={analytics.activeProjects} change={`${analytics.newProjects} new`} changeType="increase" />
        <StatCard title="Conversion Rate" value={`${analytics.conversionRate}%`} change={`${Math.abs(analytics.conversionChange)}%`} changeType={analytics.conversionChange > 0 ? 'increase' : 'decrease'} />
        <StatCard title="Avg. Sale Price" value={`$${analytics.avgSalePrice.toLocaleString()}`} change={`${analytics.totalSales} sales`} changeType="increase" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-2">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <AreaChart data={analytics.revenueTrend}>
                        <defs>
                            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" stackId="a" />
                    </AreaChart>
                </ChartContainer>
              </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-2">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart data={analytics.trafficSources}>
                        <XAxis dataKey="source" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
                    </BarChart>
                </ChartContainer>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default AnalyticsPanel; 