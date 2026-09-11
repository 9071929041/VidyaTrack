(function () {
  console.log("VidyaTrack Plugin: Active Features Loaded");

  // Remove test banner if present
  document.getElementById("vtDailyRibbon")?.remove();

  // FEATURE 1: Daily Collection Tracker Widget
  async function renderDailyCollectionWidget() {
    if (!window.sbClient || document.getElementById("vtDailyTracker")) return;
    const header = document.querySelector("header");
    if (!header) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: fees } = await window.sbClient
        .from("fees")
        .select("amount_paid, paid_at")
        .gte("paid_at", today);

      const todayTotal = (fees || []).reduce((sum, f) => sum + parseFloat(f.amount_paid || 0), 0);

      const tracker = document.createElement("div");
      tracker.id = "vtDailyTracker";
      tracker.className = "bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-4 py-2 flex justify-between items-center text-xs border-b border-indigo-500/30 no-print";
      tracker.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="p-1 bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold">TODAY</span>
          <span class="font-bold text-slate-200">Collected: <strong class="text-emerald-400">₹${todayTotal.toLocaleString("en-IN")}</strong></span>
        </div>
        <button onclick="window.quickDefaulterNotice()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold">
          📢 Fee Notice
        </button>
      `;
      header.insertAdjacentElement("afterend", tracker);
    } catch (e) {
      console.warn("Collection widget error", e);
    }
  }

  // FEATURE 2: Quick WhatsApp Fee Defaulter Alert
  window.quickDefaulterNotice = async () => {
    if (!window.sbClient) return;
    const { data: unpaid } = await window.sbClient
      .from("fees")
      .select("*, students(name, parent_mobile, parent_name)")
      .neq("status", "Paid");

    if (!unpaid || unpaid.length === 0) {
      alert("Great news! There are zero pending fee dues.");
      return;
    }

    const first = unpaid[0];
    const student = first.students || {};
    const bal = parseFloat(first.amount_due) - parseFloat(first.amount_paid);

    if (confirm(`Found ${unpaid.length} pending statements.\n\nOpen WhatsApp reminder for next student: ${student.name} (Due: ₹${bal})?`)) {
      window.sendWhatsAppNotice(
        student.name,
        student.parent_mobile,
        student.parent_name,
        first.month_year,
        first.amount_due,
        first.amount_paid,
        first.receipt_no,
        first.status
      );
    }
  };

  // Keep widget rendered across tab switches
  const observer = new MutationObserver(() => renderDailyCollectionWidget());
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });

  setTimeout(renderDailyCollectionWidget, 800);
})();
