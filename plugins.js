(function () {
  console.log("VidyaTrack Plugin Active");

  function injectBanner() {
    if (document.getElementById("vtDailyRibbon")) return;
    const header = document.querySelector("header");
    if (!header) return;

    const banner = document.createElement("div");
    banner.id = "vtDailyRibbon";
    banner.className = "bg-indigo-600 text-white px-4 py-2 flex justify-between items-center text-xs font-bold shadow-sm no-print";
    banner.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span>🚀</span>
        <span>Plugin System: Active</span>
      </div>
      <button onclick="alert('Plugin running smoothly!')" class="bg-white/20 hover:bg-white/30 text-white text-[10px] px-2 py-1 rounded-lg">
        Test
      </button>
    `;
    header.insertAdjacentElement("afterend", banner);
  }

  // Monitor DOM changes to keep banner persistent across tabs
  const observer = new MutationObserver(() => injectBanner());
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });

  setInterval(injectBanner, 500);
})();
