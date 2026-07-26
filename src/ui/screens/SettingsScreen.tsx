import React from 'react';
import { useApp } from '../../store/appStore';
import type { AILevel, Settings } from '../../engine/types';

/** Keys of Settings whose value is a boolean (everything except aiLevel). */
type BoolSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

interface ToggleRow {
  key: BoolSettingKey;
  label: string;
  desc: string;
}

const TOGGLES: ToggleRow[] = [
  {
    key: 'sound',
    label: 'Âm thanh',
    desc: 'Bật/tắt hiệu ứng âm thanh trong trận đấu.',
  },
  {
    key: 'screenShake',
    label: 'Rung màn hình',
    desc: 'Màn hình rung nhẹ khi có đòn đánh mạnh.',
  },
  {
    key: 'bloodEffects',
    label: 'Hiệu ứng máu',
    desc: 'Hiệu ứng máu tràn viền màn hình khi nhận sát thương lớn.',
  },
  {
    key: 'screenFlash',
    label: 'Màn hình chớp',
    desc: 'Chớp sáng màn hình ở đòn chí mạng và ultimate.',
  },
  {
    key: 'reducedViolence',
    label: 'Giảm bạo lực hình ảnh',
    desc: 'Tắt hiệu ứng máu và làm dịu màu sát thương. Chú thích: tên lá bài giữ nguyên.',
  },
  {
    key: 'fastAnimations',
    label: 'Tăng tốc animation',
    desc: 'Rút ngắn mọi animation để trận đấu diễn ra nhanh hơn.',
  },
];

const AI_LEVELS: { value: AILevel; label: string }[] = [
  { value: 'easy', label: 'Dễ' },
  { value: 'normal', label: 'Thường' },
  { value: 'hard', label: 'Khó' },
];

export function SettingsScreen(): JSX.Element {
  const app = useApp();

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Cài Đặt</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }}>
        {TOGGLES.map((t) => (
          <div key={t.key} className="panel">
            <label className="row spread" style={{ cursor: 'pointer' }}>
              <span style={{ fontWeight: 700 }}>{t.label}</span>
              <input
                type="checkbox"
                checked={app.settings[t.key]}
                onChange={(e) => app.updateSettings({ [t.key]: e.target.checked } as Partial<Settings>)}
              />
            </label>
            <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>{t.desc}</div>
          </div>
        ))}

        <div className="panel">
          <label className="row spread">
            <span style={{ fontWeight: 700 }}>Độ khó AI mặc định</span>
            <select
              value={app.settings.aiLevel}
              onChange={(e) => app.updateSettings({ aiLevel: e.target.value as AILevel })}
            >
              {AI_LEVELS.map((lv) => (
                <option key={lv.value} value={lv.value}>{lv.label}</option>
              ))}
            </select>
          </label>
          <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
            Độ khó AI được chọn sẵn khi bắt đầu trận đấu mới.
          </div>
        </div>
      </div>
    </div>
  );
}
