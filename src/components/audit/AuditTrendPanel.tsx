import { useEffect, useMemo, useState } from 'react';
import type { AuditTaskTrendItem } from './types';

type AuditTrendPanelProps = {
  items: AuditTaskTrendItem[];
  loading: boolean;
  error?: string;
};

type TrendSeriesItem = {
  key: keyof AuditTaskTrendItem;
  label: string;
  color: string;
  border: string;
};

const TASK_SERIES: TrendSeriesItem[] = [
  { key: 'taskTotal', label: '总量', color: 'linear-gradient(180deg, rgba(22,119,255,0.95) 0%, rgba(94,158,255,0.95) 100%)', border: 'rgba(22,119,255,0.34)' },
  { key: 'successTotal', label: '成功', color: 'linear-gradient(180deg, rgba(24,169,87,0.95) 0%, rgba(68,206,122,0.92) 100%)', border: 'rgba(24,169,87,0.3)' },
  { key: 'failedTotal', label: '失败', color: 'linear-gradient(180deg, rgba(228,79,94,0.95) 0%, rgba(246,128,128,0.92) 100%)', border: 'rgba(228,79,94,0.28)' },
];

const TOKEN_SERIES: TrendSeriesItem[] = [
  { key: 'promptTokens', label: 'Prompt', color: 'linear-gradient(180deg, rgba(124,58,237,0.95) 0%, rgba(167,110,255,0.9) 100%)', border: 'rgba(124,58,237,0.28)' },
  { key: 'completionTokens', label: 'Completion', color: 'linear-gradient(180deg, rgba(245,158,11,0.95) 0%, rgba(251,191,36,0.92) 100%)', border: 'rgba(245,158,11,0.28)' },
  { key: 'totalTokens', label: '总 Tokens', color: 'linear-gradient(180deg, rgba(20,184,166,0.95) 0%, rgba(45,212,191,0.9) 100%)', border: 'rgba(20,184,166,0.28)' },
];

const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const BarChart = ({
  title,
  items,
  series,
}: {
  title: string;
  items: AuditTaskTrendItem[];
  series: TrendSeriesItem[];
}) => {
  const [hoveredKey, setHoveredKey] = useState<string>('');
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const timer = window.setTimeout(() => setAnimateIn(true), 24);
    return () => window.clearTimeout(timer);
  }, [items, series]);

  const maxValue = Math.max(1, ...items.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0))));

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-3 text-xs text-muted">
          {series.map((item) => (
            <span key={item.key} className="flex items-center gap-1">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  display: 'inline-block',
                  background: item.color,
                  border: `1px solid ${item.border}`,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          gap: 14,
          padding: '22px 6px 0',
          minHeight: 252,
          alignItems: 'end',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(239,244,251,0.42) 100%)',
          borderRadius: 8,
        }}
      >
        {[25, 50, 75, 100].map((percent) => (
          <div
            key={percent}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${percent}%`,
              borderTop: '1px dashed rgba(196, 212, 232, 0.7)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {items.map((item, index) => (
          <div key={item.date} className="flex-col justify-end" style={{ minWidth: 0, display: 'flex', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flex: 1, minHeight: 200 }}>
              {series.map((entry, entryIndex) => {
                const value = Number(item[entry.key] || 0);
                const height = Math.max(10, (value / maxValue) * 176);
                const active = hoveredKey === `${item.date}-${String(entry.key)}`;

                return (
                  <div
                    key={entry.key}
                    style={{
                      flex: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'end',
                      justifyContent: 'center',
                      minWidth: 0,
                    }}
                    onMouseEnter={() => setHoveredKey(`${item.date}-${String(entry.key)}`)}
                    onMouseLeave={() => setHoveredKey('')}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: height + 10,
                        opacity: active ? 1 : 0,
                        transform: active ? 'translateY(0)' : 'translateY(6px)',
                        transition: 'opacity 0.18s ease, transform 0.18s ease',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        padding: '6px 9px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        background: 'rgba(255,255,255,0.96)',
                        border: `1px solid ${entry.border}`,
                        boxShadow: '0 12px 22px rgba(17,35,58,0.12)',
                        zIndex: 2,
                      }}
                    >
                      {entry.label}：{formatNumber(value)}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 34,
                        height,
                        borderRadius: '8px 8px 4px 4px',
                        background: entry.color,
                        border: `1px solid ${active ? 'rgba(17,35,58,0.24)' : entry.border}`,
                        boxShadow: active ? '0 18px 28px rgba(17,35,58,0.18)' : '0 10px 18px rgba(17,35,58,0.08)',
                        transform: animateIn ? 'scaleY(1)' : 'scaleY(0.12)',
                        transformOrigin: 'bottom center',
                        transition:
                          'transform 0.5s cubic-bezier(0.2, 0.9, 0.2, 1), border-color 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                        transitionDelay: `${index * 50 + entryIndex * 35}ms`,
                        filter: active ? 'brightness(1.04)' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted text-center">{item.date.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuditTrendPanel = ({ items, loading, error }: AuditTrendPanelProps) => {
  const chartItems = useMemo(() => items.slice(-Math.min(items.length, 14)), [items]);

  return (
    <div className="card flex-col gap-4">
      <div className="font-bold">任务趋势</div>
      {error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-danger">趋势数据加载失败：{error}</div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">加载中...</div>
      ) : chartItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">暂无趋势数据</div>
      ) : (
        <div className="flex-col gap-6">
          <BarChart title="任务量趋势" items={chartItems} series={TASK_SERIES} />
          <BarChart title="Token 趋势" items={chartItems} series={TOKEN_SERIES} />
        </div>
      )}
    </div>
  );
};

export default AuditTrendPanel;
