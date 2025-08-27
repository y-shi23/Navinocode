if (import.meta.hot) {
  import.meta.hot.on("vite:error", (error) => {
    console.log("hmr-error", error);
    window.parent.postMessage(
      {
        type: "hmr-error",
        data: {
          error: error,
        },
      },
      "*"
    );
  });
  import.meta.hot.on("vite:afterUpdate", (update) => {
    console.log("hmr-update-complete", update);
    window.parent.postMessage(
      {
        type: "hmr-update-complete"
      },
      "*"
    );
  });
}
