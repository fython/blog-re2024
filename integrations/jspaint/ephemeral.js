// All JS Paint preferences and edits stay in this frame's memory, never browser storage.
(() => {
  function memoryStorage() {
    const values = new Map();
    const methods = {
      getItem: key => values.get(String(key)) ?? null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: key => values.delete(String(key)),
      clear: () => values.clear(),
      key: index => [...values.keys()][index] ?? null,
    };
    return new Proxy(methods, {
      get: (target, key) =>
        key === "length"
          ? values.size
          : key in target
            ? target[key]
            : values.get(String(key)),
      set: (_, key, value) => {
        values.set(String(key), String(value));
        return true;
      },
      deleteProperty: (_, key) => {
        values.delete(String(key));
        return true;
      },
    });
  }
  Object.defineProperty(window, "localStorage", { value: memoryStorage() });
  Object.defineProperty(window, "sessionStorage", { value: memoryStorage() });
  localStorage["jspaint language"] = "zh";
  localStorage["jspaint theme"] = "classic.css";
  localStorage["jspaint disable seasonal theme"] = "true";
  window.new_local_session = () => {};
  window.systemHooks = {
    showSaveFileDialog: async () => {},
    writeBlobToHandle: async () => false,
  };
  // Keep file/browser shortcuts from opening save dialogs in this disposable widget.
  window.addEventListener(
    "keydown",
    event => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["s", "o"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
})();
