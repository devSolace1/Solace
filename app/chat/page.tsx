import ChatSession from '../../components/chat/ChatSession';

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Chat with a listener</h1>
        <p className="text-sm text-slate-600">
          You are anonymous. Your session is encrypted and private. Use the panic button if you need immediate support.
        </p>
      </header>

      <ChatSession />
    </div>
  );
}
