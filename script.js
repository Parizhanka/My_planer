const STORAGE_KEY = "weeklyTasks";
const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const state = {
  tasks: [],
  selectedDate: "",
  visibleWeekStart: "",
  draggedTaskId: ""
};

const moveCalendarState = {
  taskId: "",
  mode: "move",
  visibleYear: 0,
  visibleMonth: 0
};

window.state = state;

function toDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateId(dateId) {
  const [year, month, day] = dateId.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - daysFromMonday);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("ru-RU", options).format(date);
}

function formatWeekRange(startDate, endDate) {
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth && sameYear) {
    return `${startDate.getDate()}–${formatDate(endDate, {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}`;
  }

  if (sameYear) {
    return `${formatDate(startDate, {
      day: "numeric",
      month: "long"
    })} – ${formatDate(endDate, {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}`;
  }

  return `${formatDate(startDate, {
    day: "numeric",
    month: "long",
    year: "numeric"
  })} – ${formatDate(endDate, {
    day: "numeric",
    month: "long",
    year: "numeric"
  })}`;
}

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);

    if (storedTasks === null) {
      state.tasks = [];
      saveTasks();
      return;
    }

    const parsedTasks = JSON.parse(storedTasks);
    state.tasks = Array.isArray(parsedTasks) ? parsedTasks : [];

    if (!Array.isArray(parsedTasks)) {
      saveTasks();
    }
  } catch (error) {
    state.tasks = [];
    saveTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function createTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initializeDates() {
  const today = new Date();
  const weekStart = getWeekStart(today);

  state.selectedDate = toDateId(today);
  state.visibleWeekStart = toDateId(weekStart);
}

function getTaskStatsByDate(dateId) {
  return state.tasks
    .filter((task) => task.date === dateId)
    .reduce((stats, task) => {
      if (task.isCompleted) {
        stats.completed += 1;
        return stats;
      }

      if (isTaskOverdue(task)) {
        stats.overdue += 1;
        return stats;
      }

      stats.active += 1;
      return stats;
    }, {
      completed: 0,
      active: 0,
      overdue: 0
    });
}

function isTaskOverdue(task) {
  const todayId = toDateId(new Date());
  return task.date < todayId && !task.isCompleted;
}

function getOverdueDays(task) {
  const today = parseDateId(toDateId(new Date()));
  const taskDate = parseDateId(task.date);
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.round((today - taskDate) / millisecondsInDay));
}

function getDayWord(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }

  return "дней";
}

function updateSelectedDayTitle() {
  const selectedDayTitle = document.querySelector("#selectedDayTitle");
  const selectedDate = parseDateId(state.selectedDate);

  selectedDayTitle.textContent = formatDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function createDayCard(date, index) {
  const todayId = toDateId(new Date());
  const dateId = toDateId(date);
  const taskStats = getTaskStatsByDate(dateId);
  const dayCard = document.createElement("article");

  dayCard.className = "day-card";
  dayCard.dataset.date = dateId;
  dayCard.setAttribute("role", "button");
  dayCard.setAttribute("tabindex", "0");
  dayCard.setAttribute("aria-label", `Выбрать ${formatDate(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })}`);

  if (index >= 5) {
    dayCard.classList.add("is-weekend");
  }

  if (dateId === todayId) {
    dayCard.classList.add("is-today");
  }

  if (dateId === state.selectedDate) {
    dayCard.classList.add("is-selected");
    dayCard.setAttribute("aria-current", "date");
  }

  dayCard.innerHTML = `
    <span class="day-name">${DAY_NAMES[index]}</span>
    <span class="day-number">${date.getDate()}</span>
    <span class="day-month">${formatDate(date, { month: "short" })}</span>
    <span class="day-task-stats" aria-label="Статистика задач">
      <span class="day-task-stat">
        <span>Сделано</span>
        <strong>${taskStats.completed}</strong>
      </span>
      <span class="day-task-stat">
        <span>В работе</span>
        <strong>${taskStats.active}</strong>
      </span>
      <span class="day-task-stat is-overdue">
        <span>Просрочено</span>
        <strong>${taskStats.overdue}</strong>
      </span>
    </span>
  `;

  return dayCard;
}

function renderWeek() {
  const weekPanel = document.querySelector("#weekPanel");
  const weekRange = document.querySelector("#weekRange");
  const weekStart = parseDateId(state.visibleWeekStart);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = weekDates[6];

  weekRange.textContent = formatWeekRange(weekStart, weekEnd);
  weekPanel.innerHTML = "";

  weekDates.forEach((date, index) => {
    weekPanel.append(createDayCard(date, index));
  });

  updateSelectedDayTitle();
}

function getTasksForSelectedDate() {
  const todayId = toDateId(new Date());
  const isViewingToday = state.selectedDate === todayId;

  return state.tasks
    .filter((task) => task.date === state.selectedDate || (isViewingToday && isTaskOverdue(task)))
    .sort((taskA, taskB) => {
      const taskARank = getTaskSortRank(taskA);
      const taskBRank = getTaskSortRank(taskB);
      const rankOrder = taskARank - taskBRank;

      if (rankOrder !== 0) {
        return rankOrder;
      }

      return new Date(taskA.createdAt) - new Date(taskB.createdAt);
    });
}

function getTaskSortRank(task) {
  if (isTaskOverdue(task)) {
    return 0;
  }

  if (!task.isCompleted) {
    return 1;
  }

  return 2;
}

function createTaskElement(task) {
  const taskCard = document.createElement("article");
  const checkbox = document.createElement("input");
  const taskContent = document.createElement("div");
  const taskText = document.createElement("p");
  const taskActions = document.createElement("div");
  const moveButton = document.createElement("button");
  const copyButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const isOverdue = isTaskOverdue(task);

  taskCard.className = "task-card";
  taskCard.dataset.taskId = task.id;
  taskCard.draggable = true;

  if (task.isCompleted) {
    taskCard.classList.add("is-completed");
  }

  if (isOverdue) {
    taskCard.classList.add("is-overdue");
  }

  checkbox.className = "task-checkbox";
  checkbox.type = "checkbox";
  checkbox.draggable = false;
  checkbox.checked = task.isCompleted;
  checkbox.setAttribute("aria-label", "Отметить задачу выполненной");

  taskContent.className = "task-content";

  taskText.className = "task-text";
  taskText.textContent = task.text;
  taskText.setAttribute("tabindex", "0");
  taskText.setAttribute("title", "Нажмите, чтобы редактировать");

  taskContent.append(taskText);

  if (isOverdue) {
    const overdueMeta = document.createElement("div");
    const overdueBadge = document.createElement("span");
    const overdueDetails = document.createElement("span");
    const overdueDays = getOverdueDays(task);

    overdueMeta.className = "overdue-meta";

    overdueBadge.className = "overdue-badge";
    overdueBadge.textContent = "Просрочено";

    overdueDetails.className = "overdue-details";
    overdueDetails.textContent = `${formatDate(parseDateId(task.date), {
      day: "numeric",
      month: "long",
      year: "numeric"
    })} · ${overdueDays} ${getDayWord(overdueDays)} просрочки`;

    overdueMeta.append(overdueBadge, overdueDetails);
    taskContent.append(overdueMeta);
  }

  deleteButton.className = "delete-task";
  deleteButton.type = "button";
  deleteButton.title = "Удалить";
  deleteButton.setAttribute("aria-label", "Удалить задачу");
  deleteButton.innerHTML = `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `;

  moveButton.className = "move-task";
  moveButton.type = "button";
  moveButton.draggable = false;
  moveButton.title = "Перенести";
  moveButton.setAttribute("aria-label", "Перенести задачу на другую дату");
  moveButton.innerHTML = `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M7 3v3"></path>
      <path d="M17 3v3"></path>
      <path d="M4 8h16"></path>
      <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"></path>
      <path d="M8 12h3"></path>
      <path d="M8 16h6"></path>
    </svg>
  `;

  copyButton.className = "copy-task";
  copyButton.type = "button";
  copyButton.draggable = false;
  copyButton.title = "Скопировать";
  copyButton.setAttribute("aria-label", "Скопировать задачу на другую дату");
  copyButton.innerHTML = `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M8 8h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"></path>
      <path d="M5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"></path>
      <path d="M11 14h4"></path>
      <path d="M13 12v4"></path>
    </svg>
  `;

  deleteButton.draggable = false;

  taskActions.className = "task-actions";
  taskActions.append(moveButton, copyButton, deleteButton);

  taskCard.append(checkbox, taskContent, taskActions);

  return taskCard;
}

function renderTasks() {
  const tasksList = document.querySelector("#tasksList");
  const selectedTasks = getTasksForSelectedDate();

  tasksList.innerHTML = "";

  if (selectedTasks.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "На этот день задач пока нет";
    tasksList.append(emptyState);
    return;
  }

  selectedTasks.forEach((task) => {
    tasksList.append(createTaskElement(task));
  });
}

function renderApp() {
  renderWeek();
  renderTasks();
}

function addTask(text) {
  const trimmedText = text.trim();

  if (trimmedText === "") {
    return false;
  }

  const now = new Date().toISOString();
  const task = {
    id: createTaskId(),
    text: trimmedText,
    date: state.selectedDate,
    isCompleted: false,
    createdAt: now,
    updatedAt: now
  };

  state.tasks.push(task);
  saveTasks();
  renderApp();
  console.log("Weekly Task Planner state:", state);

  return true;
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.isCompleted = !task.isCompleted;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function updateTaskText(taskId, nextText) {
  const task = state.tasks.find((item) => item.id === taskId);
  const trimmedText = nextText.trim();

  if (!task || trimmedText === "") {
    renderApp();
    return;
  }

  if (task.text !== trimmedText) {
    task.text = trimmedText;
    task.updatedAt = new Date().toISOString();
    saveTasks();
  }

  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function finishTaskEditing(input, shouldSave) {
  if (input.dataset.finished === "true") {
    return;
  }

  input.dataset.finished = "true";

  if (shouldSave) {
    updateTaskText(input.dataset.taskId, input.value);
    return;
  }

  renderApp();
}

function startTaskEditing(taskText) {
  const taskCard = taskText.closest(".task-card");
  const currentEditor = document.querySelector(".task-edit-input");

  if (!taskCard || currentEditor) {
    return;
  }

  const task = state.tasks.find((item) => item.id === taskCard.dataset.taskId);

  if (!task) {
    return;
  }

  const editInput = document.createElement("input");
  editInput.className = "task-edit-input";
  editInput.type = "text";
  editInput.value = task.text;
  editInput.dataset.taskId = task.id;

  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishTaskEditing(editInput, true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finishTaskEditing(editInput, false);
    }
  });

  editInput.addEventListener("blur", () => {
    finishTaskEditing(editInput, true);
  });

  taskText.replaceWith(editInput);
  editInput.focus();
  editInput.select();
}

function closeMoveCalendar() {
  const calendar = document.querySelector(".move-calendar");

  if (calendar) {
    calendar.remove();
  }

  moveCalendarState.taskId = "";
  moveCalendarState.mode = "move";
}

function clearDropZoneHighlights() {
  document.querySelectorAll(".day-card.is-drop-target").forEach((dayCard) => {
    dayCard.classList.remove("is-drop-target");
  });
}

function clearDraggedTaskState() {
  state.draggedTaskId = "";
  document.querySelectorAll(".task-card.is-dragging").forEach((taskCard) => {
    taskCard.classList.remove("is-dragging");
  });
  clearDropZoneHighlights();
}

function openMoveCalendar(taskId, mode = "move") {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  const taskDate = parseDateId(task.date);

  closeMoveCalendar();
  moveCalendarState.taskId = taskId;
  moveCalendarState.mode = mode;
  moveCalendarState.visibleYear = taskDate.getFullYear();
  moveCalendarState.visibleMonth = taskDate.getMonth();
  renderMoveCalendar();
}

function openCopyCalendar(taskId) {
  openMoveCalendar(taskId, "copy");
}

function changeMoveCalendarMonth(delta) {
  const nextMonth = new Date(
    moveCalendarState.visibleYear,
    moveCalendarState.visibleMonth + delta,
    1
  );

  moveCalendarState.visibleYear = nextMonth.getFullYear();
  moveCalendarState.visibleMonth = nextMonth.getMonth();
  renderMoveCalendar();
}

function createCalendarDayButton(day, taskDateId) {
  const date = new Date(
    moveCalendarState.visibleYear,
    moveCalendarState.visibleMonth,
    day
  );
  const dateId = toDateId(date);
  const dayButton = document.createElement("button");

  dayButton.className = "calendar-day";
  dayButton.type = "button";
  dayButton.dataset.date = dateId;
  dayButton.textContent = String(day);

  if (dateId === taskDateId) {
    dayButton.classList.add("is-task-date");
  }

  if (dateId === toDateId(new Date())) {
    dayButton.classList.add("is-today");
  }

  return dayButton;
}

function renderMoveCalendar() {
  const task = state.tasks.find((item) => item.id === moveCalendarState.taskId);

  if (!task) {
    closeMoveCalendar();
    return;
  }

  const oldCalendar = document.querySelector(".move-calendar");
  const calendar = document.createElement("div");
  const monthTitle = formatDate(
    new Date(moveCalendarState.visibleYear, moveCalendarState.visibleMonth, 1),
    { month: "long", year: "numeric" }
  );
  const firstDay = new Date(
    moveCalendarState.visibleYear,
    moveCalendarState.visibleMonth,
    1
  ).getDay();
  const leadingEmptyCells = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(
    moveCalendarState.visibleYear,
    moveCalendarState.visibleMonth + 1,
    0
  ).getDate();
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  calendar.className = "move-calendar";
  calendar.setAttribute("role", "dialog");
  calendar.setAttribute(
    "aria-label",
    moveCalendarState.mode === "copy"
      ? "Календарь копирования задачи"
      : "Календарь переноса задачи"
  );

  calendar.innerHTML = `
    <div class="calendar-header">
      <button class="calendar-nav" type="button" data-calendar-action="prev" aria-label="Предыдущий месяц">&lt;</button>
      <p class="calendar-title">${monthTitle}</p>
      <button class="calendar-nav" type="button" data-calendar-action="next" aria-label="Следующий месяц">&gt;</button>
    </div>
    <div class="calendar-weekdays"></div>
    <div class="calendar-days"></div>
  `;

  const weekdaysGrid = calendar.querySelector(".calendar-weekdays");
  const daysGrid = calendar.querySelector(".calendar-days");

  weekdays.forEach((weekday) => {
    const weekdayCell = document.createElement("span");
    weekdayCell.textContent = weekday;
    weekdaysGrid.append(weekdayCell);
  });

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-empty";
    emptyCell.setAttribute("aria-hidden", "true");
    daysGrid.append(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    daysGrid.append(createCalendarDayButton(day, task.date));
  }

  if (oldCalendar) {
    oldCalendar.replaceWith(calendar);
    return;
  }

  document.body.append(calendar);
}

function moveTaskToDate(taskId, dateId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    closeMoveCalendar();
    return;
  }

  if (task.date === dateId) {
    closeMoveCalendar();
    clearDraggedTaskState();
    return;
  }

  task.date = dateId;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  closeMoveCalendar();
  clearDraggedTaskState();
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function copyTaskToDate(taskId, dateId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    closeMoveCalendar();
    return;
  }

  const sameTaskAlreadyExists = state.tasks.some((item) => {
    return item.date === dateId && item.text === task.text;
  });

  if (sameTaskAlreadyExists) {
    closeMoveCalendar();
    return;
  }

  const now = new Date().toISOString();
  const taskCopy = {
    id: createTaskId(),
    text: task.text,
    date: dateId,
    isCompleted: false,
    createdAt: now,
    updatedAt: now
  };

  state.tasks.push(taskCopy);
  saveTasks();
  closeMoveCalendar();
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function selectDate(dateId) {
  state.selectedDate = dateId;
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function changeVisibleWeek(days) {
  const nextWeekStart = addDays(parseDateId(state.visibleWeekStart), days);

  state.visibleWeekStart = toDateId(nextWeekStart);
  state.selectedDate = state.visibleWeekStart;
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function goToToday() {
  initializeDates();
  renderApp();
  console.log("Weekly Task Planner state:", state);
}

function bindEvents() {
  const taskForm = document.querySelector("#taskForm");
  const taskInput = document.querySelector("#taskInput");
  const tasksList = document.querySelector("#tasksList");
  const weekPanel = document.querySelector("#weekPanel");
  const prevWeekButton = document.querySelector("#prevWeek");
  const nextWeekButton = document.querySelector("#nextWeek");
  const todayButton = document.querySelector("#todayButton");

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (addTask(taskInput.value)) {
      taskInput.value = "";
      taskInput.focus();
    }
  });

  prevWeekButton.addEventListener("click", () => {
    changeVisibleWeek(-7);
  });

  nextWeekButton.addEventListener("click", () => {
    changeVisibleWeek(7);
  });

  todayButton.addEventListener("click", goToToday);

  weekPanel.addEventListener("click", (event) => {
    const dayCard = event.target.closest(".day-card");

    if (!dayCard) {
      return;
    }

    selectDate(dayCard.dataset.date);
  });

  weekPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const dayCard = event.target.closest(".day-card");

    if (!dayCard) {
      return;
    }

    event.preventDefault();
    selectDate(dayCard.dataset.date);
  });

  weekPanel.addEventListener("dragover", (event) => {
    const dayCard = event.target.closest(".day-card");

    if (!dayCard || !state.draggedTaskId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  weekPanel.addEventListener("dragenter", (event) => {
    const dayCard = event.target.closest(".day-card");

    if (!dayCard || !state.draggedTaskId) {
      return;
    }

    clearDropZoneHighlights();
    dayCard.classList.add("is-drop-target");
  });

  weekPanel.addEventListener("dragleave", (event) => {
    const dayCard = event.target.closest(".day-card");

    if (!dayCard || dayCard.contains(event.relatedTarget)) {
      return;
    }

    dayCard.classList.remove("is-drop-target");
  });

  weekPanel.addEventListener("drop", (event) => {
    const dayCard = event.target.closest(".day-card");

    if (!dayCard || !state.draggedTaskId) {
      return;
    }

    event.preventDefault();
    moveTaskToDate(state.draggedTaskId, dayCard.dataset.date);
  });

  tasksList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("task-checkbox")) {
      return;
    }

    const taskCard = event.target.closest(".task-card");

    if (!taskCard) {
      return;
    }

    toggleTask(taskCard.dataset.taskId);
  });

  tasksList.addEventListener("click", (event) => {
    const moveButton = event.target.closest(".move-task");
    const copyButton = event.target.closest(".copy-task");
    const deleteButton = event.target.closest(".delete-task");

    if (moveButton) {
      const taskCard = moveButton.closest(".task-card");

      if (!taskCard) {
        return;
      }

      openMoveCalendar(taskCard.dataset.taskId);
      return;
    }

    if (copyButton) {
      const taskCard = copyButton.closest(".task-card");

      if (!taskCard) {
        return;
      }

      openCopyCalendar(taskCard.dataset.taskId);
      return;
    }

    if (deleteButton) {
      const taskCard = deleteButton.closest(".task-card");

      if (!taskCard) {
        return;
      }

      deleteTask(taskCard.dataset.taskId);
      return;
    }

    if (event.target.classList.contains("task-text")) {
      startTaskEditing(event.target);
    }
  });

  tasksList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.target.classList.contains("task-text")) {
      return;
    }

    event.preventDefault();
    startTaskEditing(event.target);
  });

  tasksList.addEventListener("dragstart", (event) => {
    if (event.target.closest("input, button, .task-edit-input")) {
      event.preventDefault();
      return;
    }

    const taskCard = event.target.closest(".task-card");

    if (!taskCard) {
      return;
    }

    state.draggedTaskId = taskCard.dataset.taskId;
    taskCard.classList.add("is-dragging");
    closeMoveCalendar();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggedTaskId);
  });

  tasksList.addEventListener("dragend", () => {
    clearDraggedTaskState();
  });

  document.addEventListener("click", (event) => {
    const calendar = event.target.closest(".move-calendar");

    if (calendar) {
      const actionButton = event.target.closest("[data-calendar-action]");
      const dayButton = event.target.closest(".calendar-day");

      if (actionButton) {
        changeMoveCalendarMonth(actionButton.dataset.calendarAction === "next" ? 1 : -1);
        return;
      }

      if (dayButton) {
        if (moveCalendarState.mode === "copy") {
          copyTaskToDate(moveCalendarState.taskId, dayButton.dataset.date);
          return;
        }

        moveTaskToDate(moveCalendarState.taskId, dayButton.dataset.date);
      }

      return;
    }

    if (event.target.closest(".move-task, .copy-task")) {
      return;
    }

    closeMoveCalendar();
  });
}

function init() {
  loadTasks();
  initializeDates();
  bindEvents();
  renderApp();

  console.log("Weekly Task Planner state:", state);
}

init();
