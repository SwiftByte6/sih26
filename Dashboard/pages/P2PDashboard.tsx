'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { Section, KPIRow, TwoColGrid } from '../components/Section';
import { Heatmap } from '../components/Heatmap';
import { theme, chartPalette } from '../components/theme';
import { axisStyle, gridStyle, tooltipStyle, legendStyle } from '../components/chartStyles';
import { useLiveMetrics } from '../data/useLiveMetrics';

const tooltip = {
  contentStyle: tooltipStyle,
  itemStyle: { color: theme.navy },
  labelStyle: { color: theme.secondaryText, fontSize: 11 },
};

const labelTick = { ...axisStyle };

const messageTypeColors = [
  chartPalette.blue1,
  chartPalette.blue2,
  chartPalette.blue3,
  chartPalette.blue5,
  chartPalette.blue6,
];

export const P2PDashboard: React.FC = () => {
  const { p2pData } = useLiveMetrics();
  const {
    p2pKpis,
    messageTrafficOverTime,
    sentVsReceived,
    messageTypeDistribution,
    messagesByAMR,
    messageRateOverTime,
    communicationMatrix,
  } = p2pData;

  return (
  <div style={{ backgroundColor: theme.pageBg }} className="min-h-screen px-4 md:px-8 lg:px-10 py-8 md:py-10">
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        context="Current Session"
        title="P2P Network Messages"
        subtitle="Real-time AMR communication & P2P network consensus activity."
      />

      <KPIRow>
        <KPICard label="Total Messages" value={p2pKpis.totalMessages.toLocaleString()} gradient />
        <KPICard label="Messages Sent" value={p2pKpis.sent.toLocaleString()} />
        <KPICard label="Messages Received" value={p2pKpis.received.toLocaleString()} />
        <KPICard label="Messages / sec" value={p2pKpis.messagesPerSec} />
        <KPICard label="Active Nodes" value={`${p2pKpis.activeNodes} / 4`} />
        <KPICard label="Avg Message Latency" value={p2pKpis.avgLatencyMs} unit="ms" />
      </KPIRow>

      <Section>
        <ChartCard
          title="Message Traffic Over Time"
          subtitle="Total messages exchanged per hour"
          height={340}
          hero
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={messageTrafficOverTime} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="p2pArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v.toLocaleString()} msgs`} />
              <Area
                type="monotone"
                dataKey="messages"
                stroke={chartPalette.blue1}
                strokeWidth={3}
                fill="url(#p2pArea)"
                dot={{ r: 4, stroke: chartPalette.blue1, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Messages"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <TwoColGrid>
        <ChartCard title="Sent vs Received" subtitle="Symmetric traffic between AMRs" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sentVsReceived} barCategoryGap={16} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} />
              <Tooltip {...tooltip} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Bar dataKey="sent" fill={chartPalette.blue1} radius={[8, 8, 0, 0]} name="Sent" />
              <Bar dataKey="received" fill={chartPalette.blue3} radius={[8, 8, 0, 0]} name="Received" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Message Type Distribution" subtitle="8,640 total messages" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip {...tooltip} formatter={(v: number, _n, p: any) => `${p.payload.type}: ${v}`} />
              <Legend {...legendStyle} verticalAlign="bottom" height={24} />
              <Pie
                data={messageTypeDistribution}
                dataKey="value"
                nameKey="type"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {messageTypeDistribution.map((_d, i) => (
                  <Cell key={i} fill={messageTypeColors[i % messageTypeColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <TwoColGrid>
        <ChartCard title="Messages by AMR" subtitle="Total messages generated by each robot" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={messagesByAMR}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis dataKey="amr" type="category" tick={labelTick} stroke={axisStyle.stroke} width={64} />
              <Tooltip {...tooltip} formatter={(v: number) => `${v.toLocaleString()} msgs`} />
              <Bar
                dataKey="messages"
                fill={chartPalette.blue2}
                radius={[0, 10, 10, 0]}
                name="Messages"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Message Rate Over Time" subtitle="Messages per second across the shift" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={messageRateOverTime} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="time" tick={labelTick} stroke={axisStyle.stroke} />
              <YAxis tick={labelTick} stroke={axisStyle.stroke} unit=" msg/s" />
              <Tooltip {...tooltip} formatter={(v: number) => `${v} msg/s`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={chartPalette.blue5}
                strokeWidth={3}
                dot={{ r: 4, stroke: chartPalette.blue5, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                name="Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </TwoColGrid>

      <Section>
        <ChartCard
          title="Robot-to-Robot Communication Matrix"
          subtitle="Messages sent from sender (rows) to receiver (columns)"
          height={300}
        >
          <Heatmap data={communicationMatrix} />
        </ChartCard>
      </Section>
    </div>
  </div>
  );
};