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
  PieChart,
  Pie,
  Cell,
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

const outcomeColors = [chartPalette.blue1, theme.danger];

export const CollisionDashboard: React.FC = () => {
  const { collisionData } = useLiveMetrics();
  const {
    collisionKpis,
    detectedVsAvoided,
    successRateOverTime,
    conflictTypePerformance,
    interventionsByAMR,
    conflictPressureOverTime,
    avoidanceOutcomes,
  } = collisionData;

  return (
  <div style={{ backgroundColor: theme.pageBg }} className="min-h-screen px-4 md:px-8 lg:px-10 py-8 md:py-10">
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        context="Safety Monitoring"
        title="Collision Avoidance Performance"
        subtitle="Real-time effectiveness of the collision-avoidance algorithm — detection, avoidance and successful resolution."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 md:mb-8">
        <KPICard label="Potential Conflicts Detected" value={collisionKpis.detected} />
        <KPICard label="Avoidance Success Rate" value={`${collisionKpis.successRate}%`} gradient accent />
        <KPICard label="Conflicts Avoided" value={collisionKpis.avoided} />
        <KPICard label="Actual Collisions" value={collisionKpis.collisions} />
        <KPICard label="Avoidance Interventions" value={collisionKpis.interventions} />
      </div>

      <Section>
        <ChartCard
          title="Detected vs Avoided Conflicts"
          subtitle="62 conflicts detected, 60 successfully avoided"
          height={340}
          hero
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={detectedVsAvoided} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} allowDecimals={false} />
              <Tooltip {...tooltip} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Line
                type="monotone"
                dataKey="detected"
                stroke={chartPalette.blue5}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue5, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Detected"
              />
              <Line
                type="monotone"
                dataKey="avoided"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Avoided"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <Section>
        <ChartCard
          title="Avoidance Success Rate Over Time"
          subtitle="Hourly success rate of the avoidance algorithm"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={successRateOverTime} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} domain={[70, 105]} unit="%" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Success Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <TwoColGrid>
        <ChartCard title="Conflict Type Performance" subtitle="Detected / Avoided / Failed per conflict type" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conflictTypePerformance} barCategoryGap={20} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="type" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} allowDecimals={false} />
              <Tooltip {...tooltip} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Bar dataKey="detected" fill={chartPalette.blue3} radius={[8, 8, 0, 0]} name="Detected" />
              <Bar dataKey="avoided" fill={chartPalette.blue1} radius={[8, 8, 0, 0]} name="Avoided" />
              <Bar dataKey="failed" fill={theme.danger} radius={[8, 8, 0, 0]} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avoidance Interventions by AMR" subtitle="74 total interventions" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={interventionsByAMR}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} allowDecimals={false} />
              <YAxis dataKey="amr" type="category" tick={labelTick} stroke={axisStyle.stroke} width={64} />
              <Tooltip {...tooltip} />
              <Bar
                dataKey="count"
                fill={chartPalette.blue2}
                radius={[0, 10, 10, 0]}
                name="Interventions"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <TwoColGrid>
        <ChartCard title="Conflict Pressure Over Time" subtitle="Number of conflicts detected per hour" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conflictPressureOverTime} barCategoryGap={18} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} allowDecimals={false} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} conflicts`} />
              <Bar dataKey="pressure" fill={chartPalette.blue3} radius={[10, 10, 0, 0]} name="Conflicts" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avoidance Outcomes" subtitle="62 total conflicts" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip {...tooltip} formatter={(v: number, _n, p: any) => `${p.payload.outcome}: ${v}`} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Pie
                data={avoidanceOutcomes}
                dataKey="value"
                nameKey="outcome"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {avoidanceOutcomes.map((_d, i) => (
                  <Cell key={i} fill={outcomeColors[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>
    </div>
  </div>
  );
};