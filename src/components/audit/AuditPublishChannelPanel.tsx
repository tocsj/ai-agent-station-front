import { ExternalLink } from 'lucide-react';
import { STATUS_LABELS } from './config';
import type { AuditPublishChannelItem } from './types';

type AuditPublishChannelPanelProps = {
  items: AuditPublishChannelItem[];
  loading: boolean;
  error?: string;
  selectedChannel: string;
  onSelectChannel: (channel: string) => void;
};

const AuditPublishChannelPanel = ({ items, loading, error, selectedChannel, onSelectChannel }: AuditPublishChannelPanelProps) => {
  return (
    <div className="card flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">发布渠道状态</div>
        {selectedChannel && (
          <button className="btn btn-sm" type="button" onClick={() => onSelectChannel('')}>
            清除渠道筛选
          </button>
        )}
      </div>
      {error ? (
        <div className="text-sm text-danger">渠道指标加载失败：{error}</div>
      ) : loading ? (
        <div className="text-sm text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted">暂无渠道数据</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {items.map((item) => {
            const active = selectedChannel === item.channel;
            return (
              <button
                key={item.channel}
                type="button"
                className={`card text-left flex-col gap-2 ${active ? 'border-primary bg-primary-bg' : ''}`}
                style={{ padding: 16 }}
                onClick={() => onSelectChannel(active ? '' : item.channel)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{item.channelName}</div>
                  <span className={`badge ${item.successRate >= 80 ? 'badge-green' : item.failedTotal > 0 ? 'badge-orange' : 'badge-blue'}`}>
                    {item.successRate.toFixed(2)}%
                  </span>
                </div>
                <div className="text-sm text-muted">
                  尝试 {item.attemptTotal} / 成功 {item.successTotal} / 失败 {item.failedTotal}
                </div>
                <div className="text-xs text-muted">最近状态：{STATUS_LABELS[item.lastStatus || ''] || item.lastStatus || '-'}</div>
                <div className="text-xs break-words">{item.lastMessage || '暂无最近消息'}</div>
                {item.lastExternalUrl && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <ExternalLink size={12} />
                    {item.lastExternalUrl}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditPublishChannelPanel;
