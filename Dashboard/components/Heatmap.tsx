import React from 'react';
import { ROBOT_IDS } from '../data/robots';

export const Heatmap: React.FC<{
  data: { from: string; to: string; value: number }[];
  rowLabel?: string;
  colLabel?: string;
}> = ({ data, rowLabel = 'Sender', colLabel = 'Receiver' }) => {
  const max = Math.max(1, ...data.map((d) => d.value));

  const colorFor = (v: number) => {
    if (v === 0) return '#EEF5FB';
    const t = Math.min(1, v / max);
    if (t < 0.34) return '#DCECF9';
    if (t < 0.67) return '#A9CFF2';
    return '#5B8DEF';
  };

  const cellOf = (from: string, to: string) =>
    data.find((d) => d.from === from && d.to === to)?.value ?? 0;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid" style={{ gridTemplateColumns: '70px repeat(4, 1fr)', gap: 6 }}>
          <div />
          <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-[#64748B] pb-1">
            {colLabel}
          </div>
          {ROBOT_IDS.map((id) => (
            <div key={`col-${id}`} className="text-center text-[11px] font-semibold text-[#17263A] pb-1">
              {id}
            </div>
          ))}

          <div className="flex items-center justify-end pr-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            {rowLabel}
          </div>
          <div />
          {ROBOT_IDS.map((id) => (
            <div key={`row-label-${id}`} className="flex items-center text-[11px] font-semibold text-[#17263A] pr-2">
              {id}
            </div>
          ))}

          {ROBOT_IDS.map((from) => (
            <React.Fragment key={`row-${from}`}>
              {ROBOT_IDS.map((to) => {
                const v = cellOf(from, to);
                return (
                  <div
                    key={`${from}-${to}`}
                    className="rounded-md flex items-center justify-center h-12 border border-[#E3EEF9]"
                    style={{ backgroundColor: colorFor(v) }}
                    title={`${from} → ${to}: ${v}`}
                  >
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: v === 0 || v < max * 0.5 ? '#64748B' : '#FFFFFF' }}
                    >
                      {v}
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};