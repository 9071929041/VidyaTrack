// ========================================================
// VIDYATRACK MODULAR PLUGIN EXTENSIONS
// Runs independently without modifying index.html core
// ========================================================

(function () {
  console.log("VidyaTrack Plugin System Loaded.");

  // Feature 1: Live Daily Collection Status Ribbon
  async function injectDailyCollectionTracker() {
    if (!window.sbClient) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: records } = await sbClient
        .from("fees")
        .select("amount_paid, paid_at")
        .gte("paid_at", today);

      const dailyTotal = (records || []).reduce(
        (sum, r) => sum + parseFloat(r.amount_paid || 0),
        0
      );

      // Create lightweight ribbon under header
      const header = document.querySelector("header");
      if (header && !document.getElementById("vtDailyRibbon")) {
        const ribbon = document.createElement("div");
        ribbon.id = "vtDailyRibbon";
        ribbon.className =
          "bg-emerald-600/10 border-b border-emerald-500/20 px-4 py-1.5 flex justify-between items-center text-[10px] text-emerald-800 dark:text-emerald-300 font-bold no-print";
        ribbon.innerHTML = `
          <span>📈 Today's Collections: ₹${dailyTotal.toLocaleString("en-IN")}</span>
          <span class="text-[9px] uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded">Live Ledger</span>
        `;
        header.parentNode.insertBefore(ribbon, header.nextSibling);
      }
    } catch (err) {
      console.warn("Plugin tracker error:", err);
    }
  }

  // Feature 2: Attendance Quick-Observer
  // Hooks directly into window.setAttendance without breaking original code
  const originalSetAttendance = window.setAttendance;
  if (typeof originalSetAttendance === "function") {
    window.setAttendance = async function (studentId, date, status, name, mobile) {
      // Run the primary working function first
      await originalSetAttendance.apply(this, arguments);

      // Add auto-alert confirmation if absent
      if (status === "Absent" && mobile) {
        const clean = mobile.replace(/[^0-9]/g, "").slice(-10);
        const text = encodeURIComponent(
          `*VidyaTrack Alert*\nStudent: *${name}* was marked absent on ${date}. Please reach out if this was unplanned.`
        );
        const sendNow = confirm(`Send absent alert WhatsApp notice to ${name}'s parent?`);
        if (sendNow) {
          window.open(`https://wa.me/91${clean}?text=${text}`, "_blank");
        }
      }
    };
  }

  // Observe tab changes and mount extensions smoothly
  const observer = new MutationObserver(() => {
    injectDailyCollectionTracker();
  });

  const appNode = document.getElementById("app");
  if (appNode) {
    observer.observe(appNode, { childList: true, subtree: true });
  }

  // Initial load run
  setTimeout(injectDailyCollectionTracker, 2000);
})();
