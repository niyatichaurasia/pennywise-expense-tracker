// PennyWise — Expense Tracker (vanilla JS, localStorage)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const STORAGE_KEY = "pennywise.expenses.v1";
let expenses = loadExpenses();

// --- Elements
const tbody = $("#tbody");
const form = $("#expenseForm");
const editingIdInput = $("#editingId");
const dateInput = $("#date");
const catInput = $("#category");
const descInput = $("#description");
const amountInput = $("#amount");
const methodInput = $("#method");
const submitBtn = $("#submitBtn");
const cancelEditBtn = $("#cancelEditBtn");

const filterMonth = $("#filterMonth");
const filterCategory = $("#filterCategory");
const filterSearch = $("#filterSearch");
const sortBy = $("#sortBy");

const statTotal = $("#statTotal");
const statThisMonth = $("#statThisMonth");
const statMax = $("#statMax");
const countBadge = $("#countBadge");

const themeToggle = $("#themeToggle");
const exportBtn = $("#exportBtn");
const importBtn = $("#importBtn");
const importFile = $("#importFile");
const clearAllBtn = $("#clearAllBtn");

// --- Init
document.addEventListener("DOMContentLoaded", () => {
  // Set default date to today
  dateInput.valueAsDate = new Date();
  render();
});

// --- Storage
function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// --- Helpers
function currency(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
}

function id() { return crypto.randomUUID(); }

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
}

// --- Form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    id: editingIdInput.value || id(),
    date: dateInput.value,
    category: catInput.value,
    description: descInput.value.trim(),
    amount: Number(amountInput.value),
    method: methodInput.value
  };

  if (!data.date || !data.category || !data.description || !(data.amount >= 0)) {
    alert("Please fill all required fields correctly.");
    return;
  }

  if (editingIdInput.value) {
    // update
    const idx = expenses.findIndex(x => x.id === data.id);
    if (idx >= 0) expenses[idx] = data;
  } else {
    expenses.unshift(data); // newest first
  }

  saveExpenses();
  form.reset();
  dateInput.valueAsDate = new Date();
  editingIdInput.value = "";
  submitBtn.textContent = "Add expense";
  cancelEditBtn.hidden = true;
  render();
});

cancelEditBtn.addEventListener("click", () => {
  form.reset();
  dateInput.valueAsDate = new Date();
  editingIdInput.value = "";
  submitBtn.textContent = "Add expense";
  cancelEditBtn.hidden = true;
});

// --- Filters
[filterMonth, filterCategory, filterSearch, sortBy].forEach(el => {
  el.addEventListener("input", render);
});

// --- Actions (edit/delete) via event delegation
tbody.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const rowId = tr.dataset.id;

  if (e.target.matches(".btn-edit")) {
    const x = expenses.find(x => x.id === rowId);
    if (!x) return;
    editingIdInput.value = x.id;
    dateInput.value = x.date;
    catInput.value = x.category;
    descInput.value = x.description;
    amountInput.value = x.amount;
    methodInput.value = x.method;
    submitBtn.textContent = "Update expense";
    cancelEditBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (e.target.matches(".btn-delete")) {
    if (confirm("Delete this expense?")) {
      expenses = expenses.filter(x => x.id !== rowId);
      saveExpenses();
      render();
    }
  }
});

// --- Theme toggle
themeToggle.addEventListener("click", () => {
  const next = document.body.getAttribute("data-theme") === "light" ? "" : "light";
  if (next) document.body.setAttribute("data-theme", next);
  else document.body.removeAttribute("data-theme");
  localStorage.setItem("pennywise.theme", next);
});

// Restore theme on load
(function(){
  const t = localStorage.getItem("pennywise.theme");
  if (t) document.body.setAttribute("data-theme", t);
})();

// --- Export / Import / Reset
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pennywise-data-${Date.now()}.json`;
  a.click();
});

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid JSON shape");
    expenses = data;
    saveExpenses();
    render();
  } catch (err) {
    alert("Invalid file. Please choose a valid JSON exported from PennyWise.");
  } finally {
    importFile.value = "";
  }
});

clearAllBtn.addEventListener("click", () => {
  if (confirm("This will erase ALL expenses. Continue?")) {
    expenses = [];
    saveExpenses();
    render();
  }
});

// --- Rendering
function getFilteredSorted() {
  let out = [...expenses];

  // filter month
  const m = filterMonth.value;
  if (m) {
    out = out.filter(x => monthKey(x.date) === m);
  }
  // filter category
  if (filterCategory.value) {
    out = out.filter(x => x.category === filterCategory.value);
  }
  // search
  const q = filterSearch.value.trim().toLowerCase();
  if (q) {
    out = out.filter(x =>
      x.description.toLowerCase().includes(q) ||
      x.method.toLowerCase().includes(q) ||
      x.category.toLowerCase().includes(q)
    );
  }

  // sort
  switch (sortBy.value) {
    case "date-asc": out.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
    case "date-desc": out.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
    case "amount-asc": out.sort((a,b) => a.amount - b.amount); break;
    case "amount-desc": out.sort((a,b) => b.amount - a.amount); break;
  }
  return out;
}

function render() {
  const rows = getFilteredSorted();
  tbody.innerHTML = rows.map(x => `
    <tr data-id="${x.id}">
      <td>${new Date(x.date).toLocaleDateString()}</td>
      <td>${x.category}</td>
      <td>${escapeHtml(x.description)}</td>
      <td>${x.method}</td>
      <td class="num">${currency(x.amount)}</td>
      <td>
        <button class="btn ghost btn-edit" title="Edit">Edit</button>
        <button class="btn danger btn-delete" title="Delete">Delete</button>
      </td>
    </tr>
  `).join("");

  countBadge.textContent = String(rows.length);

  // stats
  const total = expenses.reduce((s,x) => s + Number(x.amount||0), 0);
  const thisMonthKey = monthKey(new Date());
  const thisMonth = expenses.filter(x => monthKey(x.date) === thisMonthKey)
                            .reduce((s,x) => s + Number(x.amount||0), 0);
  const max = expenses.reduce((m,x) => Math.max(m, Number(x.amount||0)), 0);

  statTotal.textContent = currency(total);
  statThisMonth.textContent = currency(thisMonth);
  statMax.textContent = currency(max);
}

// prevent basic HTML injection in description
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

// --- Sample seed data for first run (optional)
// Uncomment to seed some demo rows on empty storage.
// if (expenses.length === 0) {
//   expenses = [
//     { id: id(), date: new Date().toISOString().slice(0,10), category: "Food", description: "Paneer tikka wrap", amount: 120, method: "UPI" },
//     { id: id(), date: new Date().toISOString().slice(0,10), category: "Transport", description: "Auto to campus", amount: 80, method: "Cash" },
//   ];
//   saveExpenses();
//   render();
// }
