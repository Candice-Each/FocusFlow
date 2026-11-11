"use client";

export function ToggleSwitch({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      aria-pressed={checked}
      title={title}
      className={`w-9 h-5 rounded-full p-0.5 flex items-center shrink-0 transition-colors ${
        checked ? "bg-stone-900 justify-end" : "bg-stone-300 justify-start"
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow" />
    </button>
  );
}