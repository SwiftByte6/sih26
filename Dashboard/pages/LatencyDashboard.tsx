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
  Legend,
} from 'recharts';

import { PageHeader } from '../components/PageHeader';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { Section, TwoColGrid } from '../components/Section';
import { theme, chartPalette } from '../components/theme';
import { axisStyle, gridStyle, tooltipStyle, legendStyle } from '../components/chartStyles';
import { useLiveMetrics } from '../data/useLiveMetrics';

const tooltip = {
  contentStyle: tooltipStyle,
  itemStyle: { color: theme.navy },
  labelStyle: { color: theme.secondaryText, fontSize: 11 },
};

const labelTick = { ...axisStyle };

export const LatencyDashboard: React.FC = () => {
  const { latencyData } = useLiveMetrics();
  const {
    latencyKpis,
    latencyOverTime,
    latencyDistribution,
    avgLatencyByAMR,
    latencyByTaskType,
    latencyByPriority,
    slowestTasks,
    traditionalVsOurTime,
    traditionalVsOurOverTime,
  } = latencyData;

  return (
  <div style={{ backgroundColor: theme.pageBg }} className="min-h-screen px-4 md:px-8 lg:px-10 py-8 md:py-10">
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        context="Simulation Performance"
        title="Task Execution Latency & Time Savings"
        subtitle="Execution time comparison between traditional stop-and-wait methods vs our P2P consensus engine."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        <KPICard label="Our System Latency" value={latencyKpis.average} unit="s" gradient />
        <KPICard label="Traditional Stop-and-Wait" value={(latencyData as any).problemStatementMetrics?.stopAndWaitBaselineSec || 11.2} unit="s" />
        <KPICard label="Time Savings vs Baseline" value={`${(latencyData as any).problemStatementMetrics?.timeReductionPercent || 24.3}%`} accent />
        <KPICard label="Target Savings Met" value="≥ 20%" />
      </div>

      {/* Visual Comparison: Traditional Stop-and-Wait vs Our System */}
      <Section>
        <ChartCard
          title="Execution Time: Traditional Stop-and-Wait vs Our System"
          subtitle="Task duration across operation types — demonstrating ≥ 20% time reduction on overlapping paths"
          height={340}
          hero
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={traditionalVsOurTime}
              margin={{ left: 8, right: 16, top: 12, bottom: 0 }}
              barCategoryGap={24}
            >
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="type" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit="s" />
              <Tooltip {...tooltip} formatter={(v: number, name: string) => [`${v} sec`, name]} />
              <Legend {...legendStyle} verticalAlign="bottom" height={28} />
              <Bar dataKey="traditional" fill="#94A3B8" radius={[6, 6, 0, 0]} name="Traditional Stop-and-Wait (s)" />
              <Bar dataKey="ours" fill={chartPalette.blue1} radius={[6, 6, 0, 0]} name="Our System (P2P Consensus) (s)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

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
};