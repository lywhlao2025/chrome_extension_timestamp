// Reusable confirmation modal.
type ConfirmModalProps = {
  open: boolean; // 是否显示
  message: string; // 提示文案
  confirmText: string; // 确认按钮文案
  cancelText: string; // 取消按钮文案
  onConfirm: () => void; // 确认回调
  onCancel: () => void; // 取消回调
};

export function ConfirmModal({ open, message, confirmText, cancelText, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <div className="w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-sm font-semibold text-slate-800">{message}</div>
          <div className="flex w-full gap-2 pt-1">
            <button
              className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              className="flex-1 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
