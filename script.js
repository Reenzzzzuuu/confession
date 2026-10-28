const CONFIG = {
  from: "me",
  serial: "000143",
  ntfyTopic: "tomybossinggg",
  calendarLabel: "I’ll suggest one",
  teaseMessage: "So you do like me HAHAHA",
  teaseDelayMs: 3000,
  days: ["Friday evening", "Saturday", "Next week"],
  places: ["Dinner", "Coffee and a walk", "Something casual", "Surprise me"],
  showSealedNote: true,
  sealedNote: [
    "I’m not good at saying things like this out loud, so I wrote it down.",
    "I like you, more than just as a friend, and I’d like to see where this could go if you’d want that too.",
    "We can talk about it on our date. Whatever you think, I’d rather it be honest than polite."
  ]
};

const DAY_OPTIONS = [...CONFIG.days, CONFIG.calendarLabel];
const state = { when: "", where: "" };

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function btn(label, className, onClick) {
  const node = el("button", className, label);
  node.onclick = onClick;
  return node;
}

function setMain(...nodes) {
  $("main").replaceChildren(...nodes);
}

function setStub(...nodes) {
  $("stub").replaceChildren(...nodes);
}

async function notify(message) {
  const res = await fetch("https://ntfy.sh/" + encodeURIComponent(CONFIG.ntfyTopic), {
    method: "POST",
    body: message,
    headers: { Title: "Her reply" }
  });
  if (!res.ok) throw new Error("Notification failed");
}

function fieldsView() {
  const row = el("div", "fields");
  [["When", state.when], ["Where", state.where], ["With", CONFIG.from]].forEach(([label, value]) => {
    const field = el("div", "f");
    field.append(el("i", "", label), el("b", value ? "" : "empty", value || "you choose"));
    row.appendChild(field);
  });
  return row;
}

function sliderView(label, onComplete) {
  const track = el("div", "track");
  const handle = el("button", "handle", "→");
  const text = el("span", "tl", label);
  handle.setAttribute("aria-label", label);
  track.append(text, handle);

  let offset = 0;
  let startX = 0;
  let dragging = false;

  const maxOffset = () => track.clientWidth - handle.offsetWidth - 8;

  const moveTo = (value) => {
    offset = Math.max(0, Math.min(maxOffset(), value));
    handle.style.transform = "translateX(" + offset + "px)";
    text.style.opacity = 1 - offset / maxOffset();
  };

  const release = () => {
    if (!dragging) return;
    dragging = false;
    handle.style.transition = "transform .25s";
    if (offset >= maxOffset() * 0.85) {
      moveTo(maxOffset());
      setTimeout(onComplete, 180);
    } else {
      moveTo(0);
    }
  };

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX - offset;
    handle.setPointerCapture(e.pointerId);
    handle.style.transition = "none";
  });
  handle.addEventListener("pointermove", (e) => {
    if (dragging) moveTo(e.clientX - startX);
  });
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);
  handle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onComplete();
    }
  });

  return track;
}

function calendarView() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 3, 1);
  let month = firstMonth;
  const box = el("div", "cal");

  const shiftMonth = (delta) => {
    month = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    draw();
  };

  const pickDay = (date) => {
    state.when = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    planView();
  };

  function draw() {
    const header = el("div", "cal-h");
    const prev = btn("‹", "", () => shiftMonth(-1));
    const next = btn("›", "", () => shiftMonth(1));
    prev.disabled = month <= firstMonth;
    next.disabled = month >= lastMonth;
    prev.setAttribute("aria-label", "Previous month");
    next.setAttribute("aria-label", "Next month");
    header.append(
      prev,
      el("span", "", month.toLocaleDateString(undefined, { month: "long", year: "numeric" })),
      next
    );

    const grid = el("div", "cal-g");
    ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => grid.appendChild(el("i", "", d)));
    for (let i = 0; i < month.getDay(); i++) grid.appendChild(el("span"));

    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const cell = btn(String(day), "d", () => pickDay(date));
      if (date < today) cell.disabled = true;
      if (+date === +today) cell.classList.add("today");
      grid.appendChild(cell);
    }

    box.replaceChildren(header, grid);
  }

  draw();
  return box;
}

function introView() {
  setMain(
    el("h1", "", "I like you."),
    el("p", "", "I’d like to take you on a date Kristel."),
    el("p", "sub", "There’s more I want to tell you, but I’d rather say it in person.")
  );
  setStub(
    fieldsView(),
    sliderView("Slide to say yes", teaseView),
    btn("Maybe another time", "link", laterView)
  );
}

function teaseView() {
  setMain(el("h1", "tease", CONFIG.teaseMessage));
  setStub(fieldsView(), btn("Continue", "link", planView));
  setTimeout(() => {
    if ($("main").querySelector(".tease")) planView();
  }, CONFIG.teaseDelayMs);
}

function pickDateView() {
  setMain(el("h1", "", "Pick a day."), el("p", "", "Whatever works for you. I’ll make it work.😉"));
  setStub(
    fieldsView(),
    calendarView(),
    btn("Back", "link", () => {
      state.when = "";
      planView();
    })
  );
}

function planView() {
  if (state.when && state.where) return confirmView();

  setMain(el("h1", "long", "I had a feeling."), el("p", "", "Now let’s plan it. Two quick choices."));

  const choosingPlace = Boolean(state.when);
  const options = choosingPlace ? CONFIG.places : DAY_OPTIONS;
  const chips = el("div", "chips");

  options.forEach((option) => {
    chips.appendChild(btn(option, "chip", () => {
      if (choosingPlace) {
        state.where = option;
      } else if (option === CONFIG.calendarLabel) {
        return pickDateView();
      } else {
        state.when = option;
      }
      planView();
    }));
  });

  setStub(
    fieldsView(),
    el("p", "q", choosingPlace ? "What sounds good?" : "When works for you?"),
    chips
  );
}

function confirmView() {
  setMain(el("h1", "", "Almost there baby."), el("p", "", "Anything you’d like me to know baby? You can leave it empty. But I prefer if you say something."));

  const note = el("textarea");
  note.placeholder = "Optional note, like a time that suits you";

  const status = el("p", "sub");
  const send = btn("Send to " + CONFIG.from, "go", async () => {
    send.disabled = true;
    send.textContent = "Sending…";
    status.textContent = "";
    try {
      await notify(buildReply(note.value.trim()));
      doneView();
    } catch {
      send.disabled = false;
      send.textContent = "Try again";
      status.textContent = "That didn’t go through.";
    }
  });

  setStub(
    fieldsView(),
    note,
    status,
    send,
    btn("Change the plan", "link", () => {
      state.when = "";
      state.where = "";
      planView();
    })
  );
}

function buildReply(note) {
  let message = "She said yes.\nWhen: " + state.when + "\nWhat: " + state.where;
  if (note) message += "\nNote: " + note;
  return message;
}

function doneView() {
  const hasNote = CONFIG.showSealedNote && CONFIG.sealedNote.length > 0;
  const content = [
    el("h1", "", "See you then."),
    el("p", "", state.when + ", " + state.where.toLowerCase() + ".")
  ];
  if (hasNote) {
    content.push(el("p", "sub", "There’s a short note from me. Read it now, or wait until we’re together."));
  }

  setMain(...content);
  $("main").appendChild(el("div", "stamp", "Confirmed"));
  setStub(fieldsView(), ...(hasNote ? [btn("Open the note", "go", noteView)] : []));
}

function noteView() {
  setMain(...CONFIG.sealedNote.map((line) => el("p", "", line)));
  setStub(fieldsView());
}

function laterView() {
  setMain(
    el("h1", "", "Of course."),
    el("p", "", "Thank you for being honest with me. There’s no pressure at all.")
  );

  const attempt = async () => {
    setStub(el("p", "sub", "Letting " + CONFIG.from + " know…"));
    try {
      await notify("She said maybe another time.");
      setStub(el("p", "sub", "Sent. Thank you for being honest."));
    } catch {
      setStub(el("p", "sub", "That didn’t go through."), btn("Try again", "go", attempt));
    }
  };
  attempt();
}

$("serial").textContent = "No. " + CONFIG.serial;
introView();
