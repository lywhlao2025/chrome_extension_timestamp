// Toast component: transient bottom message.
export function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/85 px-3 py-2 text-xs text-white shadow-lg">
      {text}
    </div>
  );
}
