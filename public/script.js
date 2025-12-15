import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

window.addEventListener("load", async () => {
  const root = document.getElementById("app");
  const { bootHeadlineUI } = await import("./Headline-ui.js");

  let isMini = false;
  try {
    isMini = await sdk.isInMiniApp();
  } catch {
    isMini = false;
  }

  const ui = bootHeadlineUI({
    root,
    onReadyText: isMini ? "mini app detected ✓" : "web mode ✓"
  });
  ui.setEnv(isMini);

  // ALWAYS call ready()
  try {
    await sdk.actions.ready();
  } catch {
    // ignore in web mode
  }
});