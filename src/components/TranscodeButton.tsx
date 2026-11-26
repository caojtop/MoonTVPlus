'use client';

/**
 * 省流播放按钮
 * 落点：src/components/TranscodeButton.tsx（注意是 src/components，不是 src/app/components）
 *
 * 只做展示与点击：拼「不带 t0 的基础地址」，t0 由父组件的 handleTranscodeSwitch
 * 从 artPlayerRef.current.currentTime 取出并补上（跟页面保存播放进度用的是同一个来源）。
 * 这样组件不依赖任何额外 prop，避免 prop 传不进来导致的静默失效。
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
        // 不带 t0：父组件补上，并负责预热 + 切源，本组件不碰 artPlayerRef
        await onSwitch(
          `/api/tc?q=${encodeURIComponent(profile)}&url=${encodeURIComponent(url)}`
        );
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
