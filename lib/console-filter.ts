if (
  typeof window !== "undefined" &&
  !(window as unknown as { __mpErrFiltered?: boolean }).__mpErrFiltered
) {
  (window as unknown as { __mpErrFiltered?: boolean }).__mpErrFiltered = true;
  const origError = window.console.error.bind(window.console);
  window.console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
    if (
      msg.includes("INFO:") || msg.includes("WARNING:") ||
      msg.includes("XNNPACK") || msg.includes("Created TensorFlow Lite") ||
      msg.includes("gl_context")
    ) return;
    origError(...args);
  };
}
export {};