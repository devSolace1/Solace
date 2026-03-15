'use client';

import clsx from 'clsx';

type Props = {
  message: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    isOwn?: boolean;
  };
};

export default function ChatMessageBubble({ message }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={clsx(
        'flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3 shadow-sm',
        message.isOwn ? 'self-end bg-calm-600 text-white' : 'self-start bg-slate-100 text-slate-800'
      )}
    >
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
      <span className="self-end text-[11px] opacity-70">{time}</span>
    </div>
  );
}
