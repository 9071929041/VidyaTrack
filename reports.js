// ==========================================
// TOOL 5: ADVANCED REPORTS (MODULAR)
// ==========================================
let currentReportPayload = null;
let selectedRemarkLang = "English";

async function renderReportsTab(container) {
  const { data: students } = await sbClient.from("students").select("id, name, grade_class").eq("is_active", true).order("name");

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center no-print">
        <h3 class="text-xs font-bold uppercase text-slate-400">Student Progress Reports</h3>
      </div>

      <div class="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-2 items-center no-print">
        <select id="reportStudentSelect" class="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none">
          ${(students || []).map(s => `<option value="${s.id}">${s.name} (${s.grade_class})</option>`).join("")}
        </select>
        <select id="remarkLangSelect" onchange="selectedRemarkLang = this.value" class="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none">
          <option value="English">English</option>
          <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
        </select>
        <button onclick="renderSelectedReport()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs">Generate</button>
      </div>

      <div id="reportSheetContainer"></div>
    </div>
  `;

  if (students && students.length > 0) renderSelectedReport();
}

window.renderSelectedReport = async () => {
  const sel = document.getElementById("reportStudentSelect");
  const target = document.getElementById("reportSheetContainer");
  if (!sel || !sel.value) return;

  const studentId = sel.value;
  target.innerHTML = `<div class="py-12 text-center text-xs text-slate-400 animate-pulse">Aggregating live student records from Supabase...</div>`;

  const { data: student, error: stuErr } = await sbClient.from("students").select("*").eq("id", studentId).single();
  if (stuErr || !student) {
    target.innerHTML = `<div class="p-4 text-rose-500 text-xs">Student record not found.</div>`;
    return;
  }

  const { data: fees } = await sbClient.from("fees").select("*").eq("student_id", studentId).order("month_year", { ascending: false });
  const totalBilled = (fees || []).reduce((sum, f) => sum + parseFloat(f.amount_due || 0), 0);
  const totalPaid = (fees || []).reduce((sum, f) => sum + parseFloat(f.amount_paid || 0), 0);
  const feeBalance = totalBilled - totalPaid;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: attendance } = await sbClient.from("attendance").select("*").eq("student_id", studentId);
  const monthAtt = (attendance || []).filter(a => a.record_date && a.record_date.startsWith(currentMonth));
  const totalMonthDays = monthAtt.length;
  const monthPresent = monthAtt.filter(a => a.status === 'Present').length;
  const monthAbsent = monthAtt.filter(a => a.status === 'Absent').length;
  const attendanceRate = totalMonthDays > 0 ? ((monthPresent / totalMonthDays) * 100).toFixed(1) : "N/A";

  const { data: testMarks } = await sbClient.from("test_marks").select("*").eq("student_id", studentId).order("created_at", { ascending: true });

  const testGroups = {};
  (testMarks || []).forEach(m => {
    if (!testGroups[m.test_name]) {
      testGroups[m.test_name] = { testName: m.test_name, testDate: m.test_date, subjects: [] };
    }
    testGroups[m.test_name].subjects.push(m);
  });

  currentReportPayload = {
    student,
    fees: { totalBilled, totalPaid, feeBalance, list: fees || [] },
    attendance: { currentMonth, totalMonthDays, monthPresent, monthAbsent, attendanceRate },
    tests: Object.values(testGroups),
    aiRemark: ""
  };

  target.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2 justify-end no-print">
        <button id="aiRemarkBtn" onclick="generateAIRemark()" class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
          <span>✨</span> Generate AI Remark
        </button>
        <button onclick="sendReportWhatsApp()" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
          <span>💬</span> Push via WhatsApp
        </button>
        <button onclick="downloadReportCSV()" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs">
          <span>📥</span> Download CSV
        </button>
        <button onclick="window.print()" class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
          <span>🖨️</span> Print / PDF
        </button>
      </div>

      <div id="printReportArea" class="bg-white text-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div class="text-center border-b border-slate-300 pb-3">
          <h1 class="text-xl font-black uppercase tracking-wider text-indigo-900">VidyaTrack Academy</h1>
          <p class="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Comprehensive Student Progress Report</p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
          <div>
            <p class="text-slate-500 text-[10px] uppercase font-bold">Student Details</p>
            <p class="font-extrabold text-sm text-slate-900">${student.name}</p>
            <p class="text-slate-600">${student.grade_class} • ID: ${student.student_id || 'N/A'}</p>
          </div>
          <div class="text-right">
            <p class="text-slate-500 text-[10px] uppercase font-bold">Parent / Guardian</p>
            <p class="font-bold text-slate-800">${student.parent_name || 'N/A'}</p>
            <p class="text-slate-600">${student.parent_mobile || 'N/A'}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Attendance</span>
            <div class="flex justify-between items-baseline mt-1">
              <span class="text-base font-black text-indigo-700">${attendanceRate === "N/A" ? 'N/A' : attendanceRate + '%'}</span>
              <span class="text-[10px] text-slate-500">${monthPresent}P / ${monthAbsent}A</span>
            </div>
          </div>

          <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fee Standing</span>
            <div class="flex justify-between items-baseline mt-1">
              <span class="text-base font-black ${feeBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                ₹${feeBalance > 0 ? feeBalance.toLocaleString("en-IN") + ' Due' : 'Paid in Full'}
              </span>
              <span class="text-[10px] text-slate-500">Paid: ₹${totalPaid.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div id="remarkBoxContainer" class="hidden bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
          <span class="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block">Teacher's Personalized Remark (AI Powered)</span>
          <p id="remarkText" class="text-xs text-slate-800 italic leading-relaxed"></p>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Academic Performance</h4>
          ${currentReportPayload.tests.map(t => {
            const totalObtained = t.subjects.reduce((sum, s) => sum + parseFloat(s.obtained_score || 0), 0);
            const totalMax = t.subjects.reduce((sum, s) => sum + parseFloat(s.max_score || 100), 0);
            const pct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
            return `
              <div class="border border-slate-200 rounded-xl overflow-hidden mb-2">
                <div class="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-bold">
                  <span>${t.testName}</span>
                  <span class="text-indigo-600">${pct}% (${totalObtained}/${totalMax})</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
};

window.generateAIRemark = async () => {
  if (!currentReportPayload) return;
  let apiKey = localStorage.getItem("vt_gemini_key");
  if (!apiKey) {
    apiKey = prompt("Enter your Gemini API Key:");
    if (!apiKey) return;
    localStorage.setItem("vt_gemini_key", apiKey.trim());
  }

  const btn = document.getElementById("aiRemarkBtn");
  const box = document.getElementById("remarkBoxContainer");
  const text = document.getElementById("remarkText");
  btn.disabled = true;
  btn.innerText = "Generating...";

  const p = currentReportPayload;
  const promptText = `Write exactly 2 encouraging teacher remarks for report card. Student: ${p.student.name}, Class: ${p.student.grade_class}, Attendance: ${p.attendance.attendanceRate}%. Language: ${selectedRemarkLang}. Output only the 2 sentences without any intro.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    const data = await res.json();
    const remark = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Good progress.";
    currentReportPayload.aiRemark = remark;
    text.innerText = `"${remark}"`;
    box.classList.remove("hidden");
    btn.innerText = "✨ Regenerate Remark";
  } catch (err) {
    alert("Error: " + err.message);
    btn.innerText = "✨ Generate AI Remark";
  } finally {
    btn.disabled = false;
  }
};

window.sendReportWhatsApp = () => {
  if (!currentReportPayload) return;
  const { student, fees, attendance, aiRemark } = currentReportPayload;
  if (!student.parent_mobile) return alert("No phone number registered.");

  const cleanMobile = student.parent_mobile.replace(/[^0-9]/g, "").slice(-10);
  let msg = `*VIDYATRACK REPORT*\nStudent: ${student.name} (${student.grade_class})\nAttendance: ${attendance.attendanceRate}%\nFee Balance: ₹${fees.feeBalance}\n`;
  if (aiRemark) msg += `\n*Teacher's Remark:*\n"${aiRemark}"\n`;

  window.open("https://wa.me/91" + cleanMobile + "?text=" + encodeURIComponent(msg), "_blank");
};
