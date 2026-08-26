// script.js
//
// This file runs in the browser. It does four things, in order:
// 1. Waits for the user to upload a file
// 2. Reads the file (csv or xlsx) into a table of data
// 3. Calculates statistics and flags anomalies — all in the browser, no server needed for this part
// 4. Sends a SUMMARY (not the raw data) to our backend (/api/insights) to get an AI-written explanation
// 5. Displays everything: the AI insight, the anomaly list, a stats table, and a chart

// ---------- Grab references to the HTML elements we'll need to update ----------
const fileInput = document.getElementById("file-input");
const uploadText = document.getElementById("upload-text");

const loadingSection = document.getElementById("loading-section");
const errorSection = document.getElementById("error-section");
const errorText = document.getElementById("error-text");
const resultsSection = document.getElementById("results-section");

const datasetOverviewEl = document.getElementById("dataset-overview");
const statsSummaryEl = document.getElementById("stats-summary");
const anomalyNotesEl = document.getElementById("anomaly-notes");
const anomaliesListEl = document.getElementById("anomalies-list");
const statsTableWrapper = document.getElementById("stats-table-wrapper");
const chartsGrid = document.getElementById("charts-grid");

const chatMessagesEl = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

let chartInstances = []; // keeps track of all mini charts so we can destroy/redraw them on a new upload
let currentRows = null;   // the parsed dataset, kept around so the chatbot can reference it
let chatHistory = [];     // { role: "user"|"bot", text: "..." } pairs, for conversational context

// ---------- Step 1: Listen for a file being selected ----------
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploadText.textContent = file.name;
  showOnly(loadingSection);

  try {
    const rows = await parseFile(file);

    if (!rows || rows.length === 0) {
      throw new Error("The file appears to be empty or couldn't be read.");
    }

    const { columns, anomalies } = analyzeData(rows);

    if (columns.length === 0) {
      throw new Error("No numeric columns were found to analyze.");
    }

    // Ask our backend (which calls Gemini) for a structured plain-English report
    const report = await fetchReport(columns, anomalies, rows.length);

    currentRows = rows;
    chatHistory = [];
    chatMessagesEl.innerHTML = "";

    renderResults({ columns, anomalies, report });

  } catch (err) {
    console.error(err);
    showError(err.message || "Something went wrong while processing your file.");
  }
});

// ---------- Step 2: Parse the uploaded file into an array of row objects ----------
function parseFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  return new Promise((resolve, reject) => {
    if (extension === "csv") {
      // PapaParse handles CSV files
      Papa.parse(file, {
        header: true,          // treat the first row as column names
        dynamicTyping: true,   // automatically convert "123" -> 123 (number)
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: (err) => reject(err),
      });
    } else if (extension === "xlsx" || extension === "xls") {
      // SheetJS handles Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(sheet); // converts sheet -> array of row objects
        resolve(data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    } else {
      reject(new Error("Unsupported file type. Please upload a .csv or .xlsx file."));
    }
  });
}

// ---------- Step 3: Compute stats per numeric column + detect anomalies ----------
function analyzeData(rows) {
  const columnNames = Object.keys(rows[0]);
  const columns = [];
  const anomalies = [];

  const ANOMALY_THRESHOLD_STD_DEV = 3; // stricter threshold — 2σ flags ~5% of any normal dataset by pure chance
  const MAX_ANOMALIES_TO_SHOW = 15;    // keep only the most severe ones, otherwise large datasets flood the list

  columnNames.forEach((name) => {
    // Pull out all values for this column, keep only actual numbers
    const values = rows
      .map((row) => row[name])
      .filter((v) => typeof v === "number" && !isNaN(v));

    // Skip columns that aren't numeric (e.g. names, dates as text)
    if (values.length === 0) return;

    const mean = average(values);
    const stdDev = standardDeviation(values, mean);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latestValue = values[values.length - 1];

    columns.push({
      name,
      mean: round(mean),
      stdDev: round(stdDev),
      min: round(min),
      max: round(max),
      latestValue: round(latestValue),
      values, // keep raw values around for charting
    });

    // Flag any individual value that's far from the mean
    values.forEach((value, index) => {
      if (stdDev === 0) return; // avoid divide-by-zero if all values are identical
      const deviation = Math.abs(value - mean) / stdDev;
      if (deviation >= ANOMALY_THRESHOLD_STD_DEV) {
        anomalies.push({
          column: name,
          rowIndex: index,
          value: round(value),
          deviation: round(deviation),
          direction: value > mean ? "up" : "down",
        });
      }
    });
  });

  // Keep only the most severe anomalies — sort by how many std-devs away, take the top N
  const sortedAnomalies = anomalies
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, MAX_ANOMALIES_TO_SHOW);

  return { columns, anomalies: sortedAnomalies };
}

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values, mean) {
  const variance = average(values.map((v) => (v - mean) ** 2));
  return Math.sqrt(variance);
}

function round(num) {
  return Math.round(num * 100) / 100;
}

// ---------- Step 4: Send summary stats to our backend for an AI-written report ----------
async function fetchReport(columns, anomalies, sampleSize) {
  // We only send the stats (mean, stdDev, min, max, latestValue) — not the raw `values`
  // array — to keep the request small and avoid sending unnecessary raw data.
  const columnsForApi = columns.map(({ name, mean, stdDev, min, max, latestValue }) => ({
    name, mean, stdDev, min, max, latestValue,
  }));

  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      columns: columnsForApi,
      anomalies,
      sampleSize,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const fullMessage = data.detail ? `${data.error} — ${data.detail}` : data.error;
    throw new Error(fullMessage || "The insight service returned an error.");
  }

  return data.report; // { dataset_overview, stats_summary, anomaly_notes }
}

// ---------- Step 5: Render everything on the page ----------
function renderResults({ columns, anomalies, report }) {
  showOnly(resultsSection);

  // Report — three short sections instead of one blended paragraph
  datasetOverviewEl.textContent = report.dataset_overview || "No overview available.";
  statsSummaryEl.textContent = report.stats_summary || "";
  anomalyNotesEl.textContent = report.anomaly_notes || "";

  // Anomalies list
  anomaliesListEl.innerHTML = "";
  if (anomalies.length === 0) {
    anomaliesListEl.innerHTML = `<p class="no-anomalies">No significant anomalies detected.</p>`;
  } else {
    anomalies.forEach((a) => {
      const div = document.createElement("div");
      div.className = "anomaly-item";
      div.innerHTML = `<span class="col-name">${a.column}</span> — value ${a.value} is ${a.deviation}σ ${a.direction === "up" ? "above" : "below"} the average (row ${a.rowIndex + 1})`;
      anomaliesListEl.appendChild(div);
    });
  }

  // Stats table
  let tableHtml = `<table><thead><tr><th>Column</th><th>Mean</th><th>Std Dev</th><th>Min</th><th>Max</th><th>Latest</th></tr></thead><tbody>`;
  columns.forEach((c) => {
    tableHtml += `<tr><td>${c.name}</td><td>${c.mean}</td><td>${c.stdDev}</td><td>${c.min}</td><td>${c.max}</td><td>${c.latestValue}</td></tr>`;
  });
  tableHtml += `</tbody></table>`;
  statsTableWrapper.innerHTML = tableHtml;

  // Dashboard: one mini chart per numeric column, capped so huge datasets don't create 30 charts
  renderChartGrid(columns, anomalies);
}

function renderChartGrid(columns, anomalies) {
  // Clean up any charts from a previous upload
  chartInstances.forEach((c) => c.destroy());
  chartInstances = [];
  chartsGrid.innerHTML = "";

  const MAX_CHARTS = 8; // dashboard stays readable even on wide datasets
  const columnsToChart = columns.slice(0, MAX_CHARTS);

  columnsToChart.forEach((column) => {
    // Build a small card with its own canvas for this column
    const card = document.createElement("div");
    card.className = "mini-chart-card";
    card.innerHTML = `<h3>${column.name}</h3><canvas></canvas>`;
    chartsGrid.appendChild(card);
    const canvas = card.querySelector("canvas");

    const anomalyRowIndexes = new Set(
      anomalies.filter((a) => a.column === column.name).map((a) => a.rowIndex)
    );

    const pointColors = column.values.map((_, i) =>
      anomalyRowIndexes.has(i) ? "#ef4444" : "#3b82f6"
    );

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: column.values.map((_, i) => i + 1),
        datasets: [{
          data: column.values,
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f620",
          pointBackgroundColor: pointColors,
          pointRadius: column.values.map((_, i) => (anomalyRowIndexes.has(i) ? 4 : 0)),
          borderWidth: 1.5,
          tension: 0.2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { ticks: { color: "#9ca3af", font: { size: 10 } }, grid: { color: "#2a2e37" } },
        },
      },
    });

    chartInstances.push(chart);
  });

  if (columns.length > MAX_CHARTS) {
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = `Showing the first ${MAX_CHARTS} of ${columns.length} numeric columns.`;
    chartsGrid.appendChild(note);
  }
}

// ---------- Helpers for showing/hiding sections ----------
function showOnly(sectionToShow) {
  [loadingSection, errorSection, resultsSection].forEach((s) => s.classList.add("hidden"));
  sectionToShow.classList.remove("hidden");
}

function showError(message) {
  errorText.textContent = message;
  showOnly(errorSection);
}

// ---------- Chatbot ----------
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question || !currentRows) return;

  chatInput.value = "";
  appendChatMessage("user", question);
  const thinkingBubble = appendChatMessage("bot", "Thinking...");

  try {
    const csvData = rowsToCsv(currentRows, MAX_ROWS_FOR_CHAT);
    const answer = await fetchChatAnswer(question, csvData, chatHistory);

    thinkingBubble.textContent = answer;
    chatHistory.push({ role: "user", text: question });
    chatHistory.push({ role: "bot", text: answer });
  } catch (err) {
    console.error(err);
    thinkingBubble.textContent = "Sorry, something went wrong answering that.";
    thinkingBubble.classList.add("chat-error");
  }
});

const MAX_ROWS_FOR_CHAT = 500; // keep requests fast and within free-tier token limits

function rowsToCsv(rows, maxRows) {
  const limitedRows = rows.slice(0, maxRows);
  const headers = Object.keys(limitedRows[0]);
  const lines = [headers.join(",")];
  limitedRows.forEach((row) => {
    lines.push(headers.map((h) => row[h]).join(","));
  });
  return lines.join("\n");
}

async function fetchChatAnswer(question, csvData, history) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, csvData, history }),
  });

  const data = await response.json();

  if (!response.ok) {
    const fullMessage = data.detail ? `${data.error} — ${data.detail}` : data.error;
    throw new Error(fullMessage || "The chat service returned an error.");
  }

  return data.answer;
}

function appendChatMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-${role}`;
  bubble.textContent = text;
  chatMessagesEl.appendChild(bubble);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return bubble;
}