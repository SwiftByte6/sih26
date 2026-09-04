'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { PageHeader } from '../components/PageHeader';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { Section, TwoColGrid } from '../components/Section';
import { theme, chartPalette } from '../components/theme';
import { axisStyle, gridStyle, tooltipStyle } from '../components/chartStyles';
import {
  latencyKpis,
  latencyOverTime,
  latencyDistribution,
  avgLatencyByAMR,
  latencyByTaskType,
  latencyByPriority,
  slowestTasks,
} from '../data/latency';

const tooltip = {
  contentStyle: tooltipStyle,
  itemStyle: { color: theme.navy },
  labelStyle: { color: theme.secondaryText, fontSize: 11 },
};

const labelTick = { ...axisStyle };

export const LatencyDashboard: React.FC = () => (
  <div style={{ backgroundColor: theme.pageBg }} className="min-h-screen px-4 md:px-8 lg:px-10 py-8 md:py-10">
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        context="Simulation Performance"
        title="Task Execution Latency"
        subtitle="Execution speed and delay diagnostics across the AMR fleet."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        <KPICard label="Average Latency" value={latencyKpis.average} unit="s" gradient />
        <KPICard label="Median Latency" value={latencyKpis.median} unit="s" />
        <KPICard label="Minimum Latency" value={latencyKpis.minimum} unit="s" />
        <KPICard label="Maximum Latency" value={latencyKpis.maximum} unit="s" />
      </div>

      <Section>
        <ChartCard
          title="Task Latency Over Time"
          subtitle="Average execution time across the shift"
          height={340}
          hero
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyOverTime} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} s`} />
              <Line
                type="monotone"
                dataKey="latency"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Latency"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <TwoColGrid>
        <ChartCard title="Latency Distribution" subtitle="96 completed tasks bucketed by execution time" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyDistribution} barCategoryGap={18} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="bucket" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} tasks`} />
              <Bar
                dataKey="count"
                fill={chartPalette.blue3}
                radius={[10, 10, 0, 0]}
                name="Tasks"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Latency by AMR" subtitle="Per-robot execution time" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={avgLatencyByAMR}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <YAxis dataKey="amr" type="category" tick={labelTick} stroke={axisStyle.stroke} width={64} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} s`} />
              <Bar
                dataKey="latency"
                fill={chartPalette.blue2}
                radius={[0, 10, 10, 0]}
                name="Average Latency"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <TwoColGrid>
        <ChartCard title="Latency by Task Type" subtitle="Where time is being spent across operations" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyByTaskType} barCategoryGap={18} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="type" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} s`} />
              <Bar dataKey="latency" fill={chartPalette.blue1} radius={[10, 10, 0, 0]} name="Latency" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Latency by Priority" subtitle="How urgency affects execution time" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyByPriority} barCategoryGap={22} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="priority" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} s`} />
              <Bar dataKey="latency" fill={chartPalette.blue5} radius={[10, 10, 0, 0]} name="Latency" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <Section>
        <ChartCard
          title="Slowest Tasks"
          subtitle="Top 5 outliers by execution time"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={slowestTasks}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={16}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <YAxis dataKey="taskId" type="category" tick={labelTick} stroke={axisStyle.stroke} width={80} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} s`} />
              <Bar dataKey="latency" fill={chartPalette.blue5} radius={[0, 10, 10, 0]} name="Latency" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>
    </div>
  </div>
);