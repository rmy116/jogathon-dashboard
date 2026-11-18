/* Reads the public aggregate in data.json. A full student roster is refused. */

const GRADE_NAME = {
  PS: "Preschool",
  TK: "TK",
  K: "Kindergarten",
  1: "1st grade",
  2: "2nd grade",
  3: "3rd grade",
  4: "4th grade",
  5: "5th grade",
  6: "6th grade",
};

const GRADE_HINT = {
  TK: "Transitional kindergarten",
};

const GRADE_ORDER = ["PS", "TK", "K", "1", "2", "3", "4", "5", "6"];

function $(id) {
  return document.getElementById(id);
}

function asNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(/[$,]/g, "").trim());
  return Number(value);
}

function cents(value) {
  const n = asNumber(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

const DEFAULT_GOAL = 40000;

function money(value) {
  const n = asNumber(value);
  if (!Number.isFinite(n)) return "—";
  const dollars = Math.round(n);
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US")}`;
}

function formatPercent(pct) {
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function gradeCode(value) {
  return String(value ?? "").trim();
}

function gradeName(value) {
  const code = gradeCode(value);
  return GRADE_NAME[code] || code || "Grade";
}

function teacherLabel(value) {
  return String(value ?? "").replace(/\//g, " / ").trim();
}

function peopleLabel(value) {
  const n = asNumber(value);
  if (!Number.isFinite(n)) return "";
  const count = Math.max(0, Math.round(n));
  const noun = count === 1 ? "student" : "students";
  return `${count.toLocaleString("en-US")} ${noun} with donations`;
}

function asOfLabel(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return "As of the latest update";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return `As of ${formatted}`;
}

function jogCountdown() {
  const event = new Date(2026, 10, 20);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((event.getTime() - today.getTime()) / 86400000);
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow";
  if (days === 0) return "Today";
  return "";
}

function looksLikeRoster(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.students) || Array.isArray(data.snapshots)) return true;
  if (data.campaignTotalShown && typeof data.campaignTotalShown === "object") return true;
  const earners = Array.isArray(data.topEarners) ? data.topEarners : [];
  return earners.some((row) => row && typeof row === "object" && row.snapshots);
}

function showError(message) {
  const error = $("error");
  error.hidden = false;
  error.textContent = message;
  document.querySelectorAll("main section, .jump, #lede").forEach((node) => {
    node.hidden = true;
  });
  $("total").textContent = "—";
  const sponsor = $("sponsor-line");
  if (sponsor) {
    sponsor.hidden = true;
    sponsor.textContent = "";
  }
  const fill = $("thermo-fill");
  if (fill) fill.style.height = "0%";
}

function sponsorshipDollars(data) {
  if (!data || typeof data !== "object" || !Object.prototype.hasOwnProperty.call(data, "sponsorships")) {
    return 0;
  }
  const n = asNumber(data.sponsorships);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

function medal(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "";
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function addRow(list, { rank, title, meta, amount, pct }) {
  const li = document.createElement("li");
  li.className = "row";
  li.style.setProperty("--pct", String(pct));
  li.value = rank;

  const bar = document.createElement("span");
  bar.className = "bar";
  bar.setAttribute("aria-hidden", "true");

  const badge = document.createElement("span");
  badge.className = `rank ${medal(rank)}`.trim();
  badge.textContent = String(rank);

  const who = document.createElement("div");
  who.className = "who";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = title;
  who.appendChild(name);
  if (meta) {
    const sub = document.createElement("div");
    sub.className = "meta";
    sub.textContent = meta;
    who.appendChild(sub);
  }

  const amt = document.createElement("div");
  amt.className = "amt";
  amt.textContent = money(amount);

  li.append(bar, badge, who, amt);
  list.appendChild(li);
}

function ranked(list, valueOf) {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff = (cents(valueOf(b.item)) ?? -1) - (cents(valueOf(a.item)) ?? -1);
      return diff || a.index - b.index;
    })
    .map((entry, index, all) => {
      const value = cents(valueOf(entry.item));
      const previous = index > 0 ? cents(valueOf(all[index - 1].item)) : null;
      entry.rank = value !== null && value === previous ? all[index - 1].rank : index + 1;
      if (index > 0 && value === previous) all[index].rank = all[index - 1].rank;
      return entry;
    });
}

function fillBoard(list, rows, textOf, valueOf) {
  clear(list);
  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing in this update yet.";
    list.appendChild(li);
    return;
  }
  const amounts = rows.map((row) => cents(valueOf(row.item)) ?? 0);
  const max = Math.max(...amounts, 1);
  rows.forEach((row) => {
    const { title, meta } = textOf(row.item);
    const amount = valueOf(row.item);
    const value = cents(amount) ?? 0;
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    addRow(list, { rank: row.rank, title, meta, amount, pct });
  });
}

function render(data) {
  if (looksLikeRoster(data)) {
    showError("This data.json looks like a full student roster. The public site only reads the pre-aggregated scoreboard file.");
    return;
  }

  const campaign = asNumber(data.campaignTotalShown);
  if (!Number.isFinite(campaign)) {
    showError("data.json needs a numeric campaignTotalShown value.");
    return;
  }

  const sponsorships = sponsorshipDollars(data);
  const headline = campaign + sponsorships;
  const goalValue = asNumber(data.goal);
  const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : DEFAULT_GOAL;
  const pct = (headline / goal) * 100;
  const pctText = formatPercent(pct);
  const fillPct = Math.max(0, Math.min(100, pct));

  $("asof").textContent = asOfLabel(data.updated);
  $("total").textContent = money(headline);
  const sponsor = $("sponsor-line");
  if (sponsorships > 0) {
    sponsor.hidden = false;
    sponsor.textContent = `Includes ${money(sponsorships)} in sponsorships`;
  } else {
    sponsor.hidden = true;
    sponsor.textContent = "";
  }

  const thermo = $("thermo");
  thermo.classList.toggle("is-past", pct >= 100);
  $("thermo-fill").style.height = `${fillPct}%`;
  $("thermo-pct").textContent = `${pctText}% of goal`;
  $("thermo-goal").textContent = money(goal);
  const past = $("thermo-past");
  if (pct > 100) {
    past.hidden = false;
    past.textContent = "Past the goal!";
  } else if (pct === 100) {
    past.hidden = false;
    past.textContent = "Goal reached!";
  } else {
    past.hidden = true;
    past.textContent = "";
  }

  const earners = Array.isArray(data.topEarners) ? data.topEarners : [];
  const classes = Array.isArray(data.classes) ? data.classes.slice() : [];
  const grades = Array.isArray(data.grades) ? data.grades.slice() : [];

  const counted = grades.every((row) => Number.isFinite(asNumber(row.studentsWithMoney)));
  const lede = $("lede");
  if (grades.length && counted) {
    const kids = grades.reduce((sum, row) => sum + Math.round(asNumber(row.studentsWithMoney)), 0);
    const classCount = classes.length;
    const classBit = classCount === 1 ? "1 class" : `${classCount} classes`;
    lede.textContent = `${kids.toLocaleString("en-US")} students with donations across ${classBit}.`;
  } else if (classes.length) {
    lede.textContent = classes.length === 1 ? "1 class on the board." : `${classes.length} classes on the board.`;
  }

  const rankedEarners = ranked(earners, (row) => row.amount).map((entry) => {
    const given = asNumber(entry.item.rank);
    if (Number.isFinite(given)) entry.rank = Math.round(given);
    return entry;
  });
  fillBoard(
    $("earners-list"),
    rankedEarners,
    (row) => {
      const bits = [gradeName(row.grade), teacherLabel(row.teacher)].filter(Boolean);
      return {
        title: String(row.name ?? "").trim() || "Student page",
        meta: bits.join(" · "),
      };
    },
    (row) => row.amount,
  );

  const rankedClasses = classes
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff = (cents(b.item.total) ?? -1) - (cents(a.item.total) ?? -1);
      if (diff) return diff;
      return teacherLabel(a.item.teacher).localeCompare(teacherLabel(b.item.teacher)) || a.index - b.index;
    })
    .map((entry, index, all) => {
      const value = cents(entry.item.total);
      const previous = index > 0 ? cents(all[index - 1].item.total) : null;
      entry.rank = value !== null && value === previous ? all[index - 1].rank : index + 1;
      return entry;
    });

  fillBoard(
    $("classes-list"),
    rankedClasses,
    (row) => ({
      title: teacherLabel(row.teacher) || "Class",
      meta: [gradeName(row.grade), peopleLabel(row.studentsWithMoney)].filter(Boolean).join(" · "),
    }),
    (row) => row.total,
  );

  const rankedGrades = grades
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff = (cents(b.item.total) ?? -1) - (cents(a.item.total) ?? -1);
      if (diff) return diff;
      const ai = GRADE_ORDER.indexOf(gradeCode(a.item.grade));
      const bi = GRADE_ORDER.indexOf(gradeCode(b.item.grade));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.index - b.index;
    })
    .map((entry, index, all) => {
      const value = cents(entry.item.total);
      const previous = index > 0 ? cents(all[index - 1].item.total) : null;
      entry.rank = value !== null && value === previous ? all[index - 1].rank : index + 1;
      return entry;
    });

  fillBoard(
    $("grades-list"),
    rankedGrades,
    (row) => {
      const code = gradeCode(row.grade);
      const hint = GRADE_HINT[code];
      const count = peopleLabel(row.studentsWithMoney);
      return {
        title: gradeName(code),
        meta: [hint, count].filter(Boolean).join(" · "),
      };
    },
    (row) => row.total,
  );
}

function setCountdown() {
  const node = $("countdown");
  const label = jogCountdown();
  node.textContent = label;
  node.hidden = !label;
}

setCountdown();

fetch(`data.json?t=${Date.now()}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("missing");
    return response.json();
  })
  .then(render)
  .catch(() => {
    showError("The scoreboard could not load data.json.");
  });
