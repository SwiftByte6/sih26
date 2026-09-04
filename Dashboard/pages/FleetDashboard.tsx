'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { PageHeader } from '../components/PageHeader';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { Section, KPIRow, TwoColGrid } from '../components/Section';
import { theme, chartPalette } from '../components/theme';
import { axisStyle, gridStyle, tooltipStyle, legendStyle } from '../components/chartStyles';
import {
  fleetKpis,
  fleetThroughputOverTime,
  tasksCompletedByAMR,
  amrThroughputComparison,
  amrUtilization,
  taskStatusDistribution,
  cumulativeCompletion,
} from '../data/fleet';

const tooltip = {
  contentStyle: tooltipStyle,
  itemStyle: { color: theme.navy },
  labelStyle: { color: theme.secondaryText, fontSize: 11 },
};

const blueShades = [
  chartPalette.blue1,
  chartPalette.blue2,
  chartPalette.blue3,
  chartPalette.blue5,
];

const labelTick = { ...axisStyle };

export const FleetDashboard: React.FC = () => (
  <div style={{ backgroundColor: theme.pageBg }} className="min-h-screen px-4 md:px-8 lg:px-10 py-8 md:py-10">
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        context="Warehouse Overview"
        title="Fleet Throughput & Efficiency"
        subtitle="Productivity overview for the four-AMR fleet — completion, throughput, utilization and status distribution."
      />

      <KPIRow>
        <KPICard label="Total Tasks" value={fleetKpis.totalTasks} />
        <KPICard label="Completed Tasks" value={fleetKpis.completedTasks} />
        <KPICard label="Fleet Throughput" value={fleetKpis.fleetThroughput} unit="tasks/hour" accent gradient />
        <KPICard label="Task Success Rate" value={`${fleetKpis.successRate}%`} />
        <KPICard label="Active Robots" value={`${fleetKpis.activeRobots} / 4`} />
        <KPICard label="Fleet Utilization" value={`${fleetKpis.fleetUtilization}%`} />
      </KPIRow>

      <Section>
        <ChartCard
          title="Fleet Throughput Over Time"
          subtitle="Tasks completed per hour across the shift"
          height={340}
          hero
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fleetThroughputOverTime} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fleetArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit="" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} tasks/hr`} />
              <Area
                type="monotone"
                dataKey="tasks"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                fill="url(#fleetArea)"
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Throughput"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <TwoColGrid>
        <ChartCard title="Tasks Completed by AMR" subtitle="Absolute completed tasks per robot" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tasksCompletedByAMR}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis dataKey="amr" type="category" tick={labelTick} stroke={axisStyle.stroke} width={64} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} tasks`} />
              <Bar
                dataKey="tasks"
                fill={chartPalette.blue1}
                radius={[0, 10, 10, 0]}
                name="Completed Tasks"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AMR Throughput Comparison" subtitle="Tasks per hour per robot" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={amrThroughputComparison}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} unit="" />
              <YAxis dataKey="amr" type="category" tick={labelTick} stroke={axisStyle.stroke} width={64} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} tasks/hr`} />
              <Bar
                dataKey="rate"
                fill={chartPalette.blue2}
                radius={[0, 10, 10, 0]}
                name="Tasks / hour"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <TwoColGrid>
        <ChartCard title="AMR Utilization" subtitle="Share of time each robot is actively working" height={280}>
          <div className="flex flex-col gap-4 pt-2">
            {amrUtilization.map((row) => (
              <div key={row.amr} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#17263A]">{row.amr}</span>
                  <span className="text-[13px] font-semibold text-[#17263A]">{row.utilization}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#EEF5FB] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.utilization}%`,
                      background: 'linear-gradient(90deg, #78ACE8, #5B8DEF)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Task Status Distribution" subtitle="124 total tasks across statuses" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip {...tooltip} formatter={(v: number, _n, p: any) => `${p.payload.status}: ${v}`} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Pie
                data={taskStatusDistribution}
                dataKey="value"
                nameKey="status"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {taskStatusDistribution.map((_d, i) => (
                  <Cell key={i} fill={blueShades[i % blueShades.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <Section>
        <ChartCard
          title="Cumulative Task Completion"
          subtitle="Running total of completed tasks across the shift"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeCompletion} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} tasks`} />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Cumulative Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>
    </div>
  </div>
);