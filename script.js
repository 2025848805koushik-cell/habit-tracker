const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
let calendarData = JSON.parse(localStorage.getItem("calendar")) || {};
let habits = JSON.parse(localStorage.getItem("habits")) || [];

function save() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function updateStats() {
  const total = habits.length;
  const done = habits.filter(h => h.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("total").innerText = total;
  document.getElementById("done").innerText = done;
  document.getElementById("progress").innerText = percent + "%";
}

function render() {
  const list = document.getElementById("habitList");
  list.innerHTML = "";

  habits.forEach((h, i) => {
    const li = document.createElement("li");
    li.textContent = h.name;
    if (h.done) li.classList.add("done");
    li.onclick = () => toggle(i);
    list.appendChild(li);
  });

  updateStats();
}

function addHabit() {
  const input = document.getElementById("habitInput");
  if (!input.value) return;

  habits.push({ name: input.value, done: false });
  input.value = "";
  save();
  render();
}

function toggle(i) {
  habits[i].done = !habits[i].done;
  save();
  render();
}

render();
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const key = `${year}-${month}`;

  if (!calendarData[key]) {
    calendarData[key] = {};
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = day;

    if (calendarData[key][day]) {
      div.classList.add("done");
    }

    div.onclick = () => {
      calendarData[key][day] = !calendarData[key][day];
      localStorage.setItem("calendar", JSON.stringify(calendarData));
      renderCalendar();
    };

    calendar.appendChild(div);
  }
}
render();
renderCalendar();
renderChart();
updateRings();
renderHabitTable();
renderWeeklyChart();
function getMonthlyStats() {
  const key = `${year}-${month}`;
  const days = calendarData[key] || {};

  let completed = 0;
  let labels = [];
  let values = [];

  for (let d in days) {
    labels.push(d);
    values.push(days[d] ? 1 : 0);
    if (days[d]) completed++;
  }

  return { labels, values, completed };
}
function renderChart() {
  const stats = getMonthlyStats();
  const ctx = document.getElementById("monthlyChart");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: stats.labels,
      datasets: [{
        label: "Daily Completion",
        data: stats.values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        tension: 0.3
      }]
    },
    options: {
      scales: {
        y: {
          ticks: {
            stepSize: 1,
            callback: v => v === 1 ? "Done" : "Miss"
          }
        }
      }
    }
  });
}
function setRing(id, percent) {
  const circle = document.getElementById(id);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;
}
function calculateWeeklyProgress() {
  const key = `${year}-${month}`;
  const days = calendarData[key] || {};
  let done = 0;
  let total = 0;

  for (let d in days) {
    total++;
    if (days[d]) done++;
  }

  return total === 0 ? 0 : Math.round((done / total) * 100);
}
function updateRings() {
  const daily = habits.length === 0 ? 0 :
    Math.round((habits.filter(h => h.done).length / habits.length) * 100);

  const weekly = calculateWeeklyProgress();
  const monthly = weekly; // same logic for now

  setRing("dailyRing", daily);
  setRing("weeklyRing", weekly);
  setRing("monthlyRing", monthly);
}
function renderHabitTable() {
  const tbody = document.getElementById("habitTableBody");
  tbody.innerHTML = "";

  habits.forEach(habit => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.innerText = habit.name;

    const statusTd = document.createElement("td");
    statusTd.innerText = habit.done ? "Done" : "Pending";
    statusTd.className = habit.done ? "status-done" : "status-pending";

    tr.appendChild(nameTd);
    tr.appendChild(statusTd);
    tbody.appendChild(tr);
  });
}
function renderWeeklyChart() {
  const ctx = document.getElementById("weeklyChart");

  const completed = habits.filter(h => h.done).length;
  const pending = habits.length - completed;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [{
        data: [completed, pending],
        backgroundColor: ["#22c55e", "#ef4444"]
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      }
    }
  });
}
function toggleTheme() {
  document.documentElement.classList.toggle("light");
}
function exportData() {
  let csv = "Habit,Status\n";
  habits.forEach(h => {
    csv += `${h.name},${h.done ? "Done" : "Pending"}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "habit-data.csv";
  a.click();

  URL.revokeObjectURL(url);
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
function setReminder() {
  const time = document.getElementById("reminderTime").value;
  if (!time) return alert("Please select a time");

  localStorage.setItem("reminderTime", time);

  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      alert("Daily reminder set at " + time);
      scheduleNotification();
    } else {
      alert("Notification permission denied");
    }
  });
}

function scheduleNotification() {
  const time = localStorage.getItem("reminderTime");
  if (!time) return;

  const [hour, minute] = time.split(":").map(Number);
  const now = new Date();
  let notifyAt = new Date();
  notifyAt.setHours(hour, minute, 0, 0);

  if (notifyAt < now) {
    notifyAt.setDate(notifyAt.getDate() + 1);
  }

  const delay = notifyAt - now;

  setTimeout(() => {
    new Notification("Habit Tracker ⏰", {
      body: "Don’t forget to complete your habits today!",
      icon: "icon-192.png"
    });

    // schedule again for next day
    setTimeout(scheduleNotification, 24 * 60 * 60 * 1000);
  }, delay);
}

// auto-start if already set
if ("Notification" in window && localStorage.getItem("reminderTime")) {
  scheduleNotification();
}



