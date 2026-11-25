'use client';

/**
 * 省流播放按钮
 * 落点：src/components/TranscodeButton.tsx（注意是 src/components，不是 src/app/components）
 *
 * 受控组件：是否已开启由父组件用 active 传入，避免换集/换源后状态错乱。
 * 点击「省流播放」时先请求一次 /api/tc 预热（网关会在这次请求里启动 ffmpeg），
 * 再通知父组件切源，用户就不会对着黑屏等首片。
 */

import { useState } from 'react';

interface Props {
  /** 原始播放地址（未经 /api/tc、未经代理包装的真地址） */
  url: string;
  /** 当前是否已是省流模式 */
  active: boolean;
  /** 父组件执行真实切源，next 为要设置的新地址 */
  onSwitch: (next: string) => void | Promise<void>;
  /** 档位，默认 1m（480p / 约 0.9Mbps） */
  profile?: string;
  /** 与页面工具栏其它按钮保持一致的样式 */
  className?: string;
}

export default function TranscodeButton({
  url,
  active,
  onSwitch,
  profile = '1m',
  className = '',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState('');

  const usable = !!url && /^https?:\/\//i.test(url);
  if (!usable) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setTip('');
    try {
      if (active) {
        await onSwitch(url);
      } else {
        const next = `/api/tc?q=${encodeURIComponent(profile)}&url=${encodeURIComponent(url)}`;
        // 预热：等网关吐出首个分片（3–8 秒，慢时更久），再切源
        const res = await fetch(next, { cache: 'no-store' });
        if (!res.ok && !res.redirected) throw new Error('gateway');
        await onSwitch(next);
      }
    } catch {
      setTip('切换失败');
      setTimeout(() => setTip(''), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={active ? '当前为省流模式，点击切回原画' : '网速慢时点这里，转成约 0.9Mbps 播放'}
      className={className}
    >
      <svg
        className='w-4 h-4 flex-shrink-0'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
      >
        {active ? (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        ) : (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        )}
      </svg>
      <span className='whitespace-nowrap'>
        {busy ? '转码中…' : active ? '原画' : '省流'}
      </span>
      {tip ? <span className='ml-1 text-red-400'>{tip}</span> : null}
    </button>
  );
}
