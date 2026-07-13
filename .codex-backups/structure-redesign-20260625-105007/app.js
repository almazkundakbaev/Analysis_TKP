const CATALOG_URL = "../data/kz_weather_catalog.json";
const CITY_COORDS_URL = "../data/kz_city_coords.json";
const STORAGE_KEY = "omarta_tkp_projects_v1";
const CITY_GEO_CACHE_KEY = "omarta_city_geo_v1";
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const AIR_QUALITY_ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OSM_TILE_URL = "https://tile.openstreetmap.org";
const GOOGLE_MAPS_JS_API_URL = "https://maps.googleapis.com/maps/api/js";
const TILE_SIZE = 256;
const DEFAULT_CITY_COORDS = [48.0196, 66.9237];
let googleMapsApiPromise = null;

const pageMode = document.body?.dataset.page || "project";
const isProjectsPage = pageMode === "projects";
const isProjectPage = pageMode === "project";
const AUTH_KEY = "omarta_auth_v1";
const PROFILE_KEY = "omarta_profile_v1";
const USERS_KEY = "omarta_users_v1";
const PROJECT_TRASH_KEY = "omarta_project_trash_v1";
if (!localStorage.getItem(AUTH_KEY)) {
  window.location.href = "../login.html";
}
const citySearch = document.getElementById("city-search");
const cityResults = document.getElementById("city-results");
const projectName = document.getElementById("project-name");
const projectLocation = document.getElementById("project-location");
const saveProjectButton = document.getElementById("save-project");
const newProjectButton = document.getElementById("new-project");
const deleteProjectButton = document.getElementById("delete-project");
const projectList = document.getElementById("project-list");
const projectCount = document.getElementById("project-count");
const methodNav = document.getElementById("method-nav");
const sectionOutput = document.getElementById("section-output");
const projectViewButtons = [...document.querySelectorAll("[data-project-view]")];
const projectViewPanels = [...document.querySelectorAll("[data-project-panel]")];
const globalSearch = document.getElementById("global-search");
const searchResults = document.getElementById("search-results");
const profilePhotoPreview = document.getElementById("profile-photo-preview");
const profilePhotoInput = document.getElementById("profile-photo-input");
const profileComment = document.getElementById("profile-comment");
const saveProfileButton = document.getElementById("save-profile");
const optionalTextNode = { textContent: "" };
const profileAccountRole = document.getElementById("profile-account-role") || optionalTextNode;
const userFullName = document.getElementById("user-full-name");
const userLogin = document.getElementById("user-login");
const userPassword = document.getElementById("user-password");
const userRole = document.getElementById("user-role");
const createUserButton = document.getElementById("create-user");
const usersList = document.getElementById("users-list");
const trashList = document.getElementById("trash-list");
const trashCount = document.getElementById("trash-count") || optionalTextNode;
const clearTrashButton = document.getElementById("clear-trash");
const logoutButton = document.getElementById("logout-button");
const sidebarToggleButtons = [...document.querySelectorAll("[data-sidebar-toggle]")];
const adminUsersCount = document.getElementById("admin-users-count") || optionalTextNode;
const adminProjectsCount = document.getElementById("admin-projects-count") || optionalTextNode;
const adminTrashCount = document.getElementById("admin-trash-count") || optionalTextNode;
const catalogCount = document.getElementById("catalog-count") || optionalTextNode;
const activeProjectTitle = document.getElementById("active-project-title") || optionalTextNode;
const activeProjectMeta = document.getElementById("active-project-meta") || optionalTextNode;
const statSections = document.getElementById("stat-sections") || optionalTextNode;
const statWeather = document.getElementById("stat-weather") || optionalTextNode;

const methodology = [
  {
    id: "place-analysis",
    title: "Анализ места",
    items: [
      ["geo", "1", "Географические характеристики", "карта / рельеф / местность"],
      ["climate", "2", "Климат и сезонность", "WeatherSpark / графики / туристический балл"],
      ["transport", "3", "Транспортная доступность", "маршрут / время / подъезд"],
      ["ecology", "4", "Экологическая обстановка", "экология / ограничения / источники"],
      ["surrounding", "5", "Окружающая инфраструктура", "сервисы рядом / конкуренты / радиусы"],
      ["attractions", "6", "Туристические точки и досуг", "достопримечательности / маршруты"],
      ["socio", "7", "Социально-экономический фон", "население / спрос / туризм"],
      ["restrictions", "8", "Ограничения участка", "земля / санитарные зоны / риски"],
      ["swot-object", "9", "Итоговая оценка места", "SWOT / выводы"],
    ],
  },
];

const allSections = methodology.flatMap((chapter) =>
  chapter.items.map(([id, number, title, formats]) => ({ id, number, title, formats, chapter: chapter.title })),
);

function customSections(project = currentProject()) {
  if (!project || !Array.isArray(project.customSections)) return [];
  return project.customSections.map((section, index) => ({
    id: section.id,
    number: section.number || String(10 + index),
    title: section.title || `Ручная глава ${index + 1}`,
    formats: section.formats || "ручные данные / текст / графики / изображения",
    chapter: "Ручные главы",
    custom: true,
    source: section,
  })).filter((section) => section.id);
}

function getAllSections(project = currentProject()) {
  return [...allSections, ...customSections(project)];
}

function makeCustomSectionId() {
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureCustomSections(project) {
  if (!project) return [];
  if (!Array.isArray(project.customSections)) project.customSections = [];
  return project.customSections;
}

function findCustomSection(sectionId, project = currentProject()) {
  return customSections(project).find((section) => section.id === sectionId) || null;
}

const SECTION_SUBCHAPTERS = {
  geo: [
    "Основные географические данные",
    "Рельеф и характер местности",
  ],
  climate: [
    "Климатический профиль",
    "Лучшее время посещения",
    "Применение для базы отдыха",
  ],
  transport: [
    "Расчёт доступности от центра города",
    "Остановки рядом с точкой",
    "Маршруты общественного транспорта",
  ],
  ecology: [
    "Показатели воздуха и их значение",
    "Зелёные зоны и природное окружение",
    "Потенциальные источники экологической нагрузки",
    "Что проверить перед выбором участка",
  ],
  surrounding: [
    "Краткий вывод по инфраструктуре",
    "Магазины, кафе, АЗС и полезные сервисы",
    "Конкуренты и рекреационные объекты рядом",
    "Числовая сводка по объектам",
  ],
  attractions: [
    "Краткий туристический вывод",
    "Ближайшие туристические точки",
    "Природные места",
    "Культурные и исторические объекты",
  ],
  socio: [
    "Потенциальная аудитория",
    "Экономическая активность вокруг точки",
    "Что добрать из официальной статистики",
  ],
  restrictions: [
    "Земельные ограничения",
    "Санитарные и природоохранные зоны",
    "Инженерия и подъезд",
  ],
  "swot-object": [
    "Итоговая пригодность",
    "Сводная оценка по факторам",
    "SWOT по базе",
    "Риски и проверки",
    "Рекомендация по концепции",
  ],
};

function navSubchapters(sectionId) {
  const custom = findCustomSection(sectionId);
  if (custom) {
    const blocks = Array.isArray(custom.source?.blocks) ? custom.source.blocks : [];
    return blocks.map((block, index) => block.title || `Блок ${index + 1}`);
  }
  if (sectionId === "climate") {
    const city = selectedCity();
    const detail = city ? state.weatherCache.get(city.slug) : null;
    const dynamic = Array.isArray(detail?.sections)
      ? detail.sections.map((item) => String(item?.title || "").trim()).filter(Boolean)
      : [];
    return dynamic.length ? dynamic : ["Климатический профиль", "Средняя температура", "Облачность", "Осадки", "Солнце"];
  }
  return SECTION_SUBCHAPTERS[sectionId] || [];
}

function openSubchapterInOutput(title) {
  if (!title) return false;
  const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const target = normalizeText(title);

  const sectionButtons = [
    ...sectionOutput.querySelectorAll(".analysis-section > button"),
    ...sectionOutput.querySelectorAll(".weather-section > button"),
  ];
  const matchedButton = sectionButtons.find((button) => normalizeText(button.textContent).includes(target));
  if (matchedButton) {
    matchedButton.parentElement?.classList.add("is-open");
    matchedButton.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  const headings = [...sectionOutput.querySelectorAll("h2, h3, h4")];
  const matchedHeading = headings.find((heading) => normalizeText(heading.textContent).includes(target));
  if (matchedHeading) {
    matchedHeading.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  return false;
}

function activatePendingSubchapter() {
  const pending = state.pendingSubchapter;
  if (!pending || pending.sectionId !== state.activeSectionId) return;
  openSubchapterInOutput(pending.title);
  state.pendingSubchapter = null;
}

const cityCoordinates = {
  "астана": [51.1282, 71.4304],
  "алматы": [43.2389, 76.8897],
  "шымкент": [42.3417, 69.5901],
  "караганда": [49.8047, 73.1094],
  "актобе": [50.2839, 57.167],
  "тараз": [42.8999, 71.3775],
  "павлодар": [52.2873, 76.9674],
  "усть-каменогорск": [49.9483, 82.6275],
  "семей": [50.4111, 80.2275],
  "атырау": [47.0945, 51.9238],
  "костанай": [53.2198, 63.6354],
  "кызылорда": [44.8488, 65.4823],
  "актау": [43.6588, 51.1975],
  "кокшетау": [53.2833, 69.3833],
  "петропавловск": [54.8732, 69.1505],
  "уральск": [51.2278, 51.3865],
  "туркестан": [43.2973, 68.2518],
  "талдыкорган": [45.0178, 78.3828],
  "жезказган": [47.7833, 67.7667],
  "экибастуз": [51.7298, 75.3266],
  "темиртау": [50.0549, 72.9646],
  "байконур": [45.6167, 63.3167],
};

const state = {
  catalog: [],
  cities: [],
  cityCoordIndex: new Map(),
  projects: [],
  activeProjectId: null,
  selectedCitySlug: null,
  activeSectionId: "geo",
  weatherCache: new Map(),
  liveCache: new Map(),
  cityGeoCache: new Map(),
  cityGeoPending: new Map(),
  navExpanded: {},
  pendingSubchapter: null,
};

function normalize(value) {
  return (value || "").toLowerCase().replace(/ё/g, "е").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(String(value || ""));
}

function hasLatin(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

const KNOWN_RUSSIAN_NAMES = new Map([
  ["lake essik", "Есік көлі"],
  ["lake issyk", "Есік көлі"],
  ["lake esik", "Есік көлі"],
  ["essik lake", "Есік көлі"],
  ["issyk lake", "Есік көлі"],
  ["esik lake", "Есік көлі"],
  ["krasivyy obzor", "Красивый обзор"],
  ["krasivy obzor", "Красивый обзор"],
  ["krasiviy obzor", "Красивый обзор"],
  ["berezovaya roshcha", "Березовая роща"],
  ["berezovaya roscha", "Березовая роща"],
  ["berezovaya rosha", "Березовая роща"],
  ["almaty zharyk kompaniyasy", "Алматы Жарық Компаниясы"],
  ["almaty zharyk", "Алматы Жарық"],
  ["almaty zharyk company", "Алматы Жарық Компаниясы"],
  ["kazpost", "Казпочта"],
  ["kaspi bank", "Каспи Банк"],
  ["halyk bank", "Халык Банк"],
  ["fortebank", "ФортеБанк"],
  ["bank centercredit", "Банк ЦентрКредит"],
  ["jusan bank", "Жусан Банк"],
  ["home credit bank", "Хоум Кредит Банк"],
  ["technodom", "Технодом"],
  ["sulpak", "Сулпак"],
  ["magnum", "Магнум"],
  ["small", "Смолл"],
  ["ramstore", "Рамстор"],
  ["arbuz", "Арбуз"],
  ["gasenergy", "ГазЭнерджи"],
  ["qazaq oil", "Казак Ойл"],
  ["kazmunaygas", "КазМунайГаз"],
  ["helioс", "Гелиос"],
  ["helios", "Гелиос"],
  ["sinooil", "Синойл"],
]);

const LATIN_WORDS_RU = new Map([
  ["almaty", "Алматы"],
  ["astana", "Астана"],
  ["shymkent", "Шымкент"],
  ["aktau", "Актау"],
  ["atyrau", "Атырау"],
  ["taraz", "Тараз"],
  ["turkestan", "Туркестан"],
  ["karaganda", "Караганда"],
  ["kostanay", "Костанай"],
  ["pavlodar", "Павлодар"],
  ["semey", "Семей"],
  ["zharyk", "Жарық"],
  ["kompaniyasy", "Компаниясы"],
  ["kompaniyasi", "Компаниясы"],
  ["kompaniya", "Компания"],
  ["company", "Компания"],
  ["bank", "Банк"],
  ["pharmacy", "Аптека"],
  ["market", "Маркет"],
  ["hotel", "Отель"],
  ["cafe", "Кафе"],
  ["restaurant", "Ресторан"],
  ["park", "Парк"],
  ["mall", "Торговый центр"],
  ["center", "Центр"],
  ["centre", "Центр"],
  ["oil", "Ойл"],
  ["gas", "Газ"],
  ["energy", "Энерджи"],
  ["station", "Станция"],
  ["airport", "Аэропорт"],
  ["museum", "Музей"],
]);

function transliterateLatinToRu(value) {
  const source = String(value || "").trim();
  if (!source || hasCyrillic(source) || !hasLatin(source)) return source;
  const normalized = source.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const known = KNOWN_RUSSIAN_NAMES.get(normalized);
  if (known) return known;

  const parts = source.split(/(\s+|[-–—_/.,()]+)/);
  const words = parts.filter((part) => /[A-Za-z]/.test(part));
  const canTranslateSafely = words.length > 0 && words.every((part) => LATIN_WORDS_RU.has(part.toLowerCase()));
  if (!canTranslateSafely) return source;

  return parts.map((part) => {
    if (!/[A-Za-z]/.test(part)) return part;
    return LATIN_WORDS_RU.get(part.toLowerCase()) || part;
  }).join("");
}
function displayName(value, fallback = "Без названия") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return transliterateLatinToRu(text);
}

function formatDate(value) {
  if (!value) return "сегодня";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requestedProjectId() {
  return new URLSearchParams(window.location.search).get("id");
}

function projectUrl(projectId) {
  return `./project.html?id=${encodeURIComponent(projectId)}`;
}

function openProject(projectId) {
  window.location.href = projectUrl(projectId);
}

function setProjectDashboardView(view) {
  if (!isProjectsPage) return;
  const nextView = view || "create";
  projectViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.projectView === nextView);
  });
  projectViewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.projectPanel === nextView);
  });
  if (nextView === "projects") renderProjects();
  if (nextView === "search") renderProjectSearch();
  if (nextView === "profile") renderProfile();
  if (nextView === "admin") renderAdminDashboard();
  if (nextView === "users") renderUsersAdmin();
  if (nextView === "trash") renderTrash();
}

function defaultProfilePhoto() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112">
      <rect width="112" height="112" rx="56" fill="#e7f3f1"/>
      <circle cx="56" cy="43" r="19" fill="#1f8a83"/>
      <path d="M23 96c6-21 20-32 33-32s27 11 33 32" fill="#1f8a83"/>
    </svg>
  `);
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function renderProfile() {
  if (!profilePhotoPreview && !profileComment) return;
  const profile = loadProfile();
  const auth = currentAuthUser();
  if (profilePhotoPreview) profilePhotoPreview.src = profile.photo || defaultProfilePhoto();
  if (profileComment) profileComment.value = profile.comment || "";
  profileAccountRole.textContent = auth.role === "admin" ? "Администратор" : "Пользователь";
}

function persistProfileComment() {
  const profile = loadProfile();
  profile.comment = profileComment?.value || "";
  saveProfile(profile);
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function currentAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}");
  } catch {
    return {};
  }
}

function ensureCurrentUserInUsers() {
  const auth = currentAuthUser();
  const username = auth.username || "admin";
  const users = loadUsers();
  if (!users.some((user) => user.login === "123")) {
    users.unshift({
      id: makeId(),
      fullName: "Тестовый админ",
      login: "123",
      password: "123",
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    });
  }
  if (!users.some((user) => user.login === username)) {
    users.unshift({
      id: makeId(),
      fullName: username,
      login: username,
      password: "",
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
  }
}

function loadTrashProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECT_TRASH_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTrashProjects(projects) {
  localStorage.setItem(PROJECT_TRASH_KEY, JSON.stringify(projects));
}

function renderAdminDashboard() {
  const trash = loadTrashProjects();
  adminUsersCount.textContent = String(loadUsers().length);
  adminProjectsCount.textContent = String(state.projects.length);
  adminTrashCount.textContent = String(trash.length);
  trashCount.textContent = String(trash.length);
}

function renderUsersAdmin() {
  if (!usersList) return;
  const users = loadUsers();
  usersList.innerHTML = "";
  if (!users.length) {
    usersList.innerHTML = `
      <section class="empty-state">
        <h2>Пользователей пока нет</h2>
        <p>Создайте первого пользователя через форму выше.</p>
      </section>
    `;
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("article");
    row.className = "user-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(user.fullName || user.login || "Пользователь")}</strong>
        <span>${escapeHtml(user.login || "-")} · ${user.role === "admin" ? "Администратор" : "Пользователь"} · ${user.active === false ? "Отключён" : "Активен"}</span>
      </div>
      <div class="row-actions">
        <button class="restore-button" type="button" data-toggle-user="${escapeHtml(user.id)}">${user.active === false ? "Включить" : "Отключить"}</button>
        <button class="delete-button" type="button" data-delete-user="${escapeHtml(user.id)}">Удалить</button>
      </div>
    `;
    usersList.appendChild(row);
  });

  usersList.querySelectorAll("[data-toggle-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const users = loadUsers();
      const user = users.find((item) => item.id === button.dataset.toggleUser);
      if (user) user.active = user.active === false;
      saveUsers(users);
      renderUsersAdmin();
      renderAdminDashboard();
    });
  });

  usersList.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const auth = currentAuthUser();
      let users = loadUsers();
      const user = users.find((item) => item.id === button.dataset.deleteUser);
      if (user?.login === auth.username) {
        window.alert("Нельзя удалить текущего пользователя.");
        return;
      }
      users = users.filter((item) => item.id !== button.dataset.deleteUser);
      saveUsers(users);
      renderUsersAdmin();
      renderAdminDashboard();
    });
  });
}

function createUserFromAdmin() {
  if (!userLogin || !userPassword || !userRole) return;
  const login = userLogin.value.trim();
  const password = userPassword.value.trim();
  if (!login || !password) {
    window.alert("Введите логин и пароль.");
    return;
  }
  const users = loadUsers();
  if (users.some((user) => user.login.toLowerCase() === login.toLowerCase())) {
    window.alert("Пользователь с таким логином уже есть.");
    return;
  }
  users.unshift({
    id: makeId(),
    fullName: userFullName?.value.trim() || login,
    login,
    password,
    role: userRole.value === "admin" ? "admin" : "user",
    active: true,
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
  if (userFullName) userFullName.value = "";
  userLogin.value = "";
  userPassword.value = "";
  userRole.value = "user";
  renderUsersAdmin();
  renderAdminDashboard();
}

function moveProjectToTrash(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  const auth = currentAuthUser();
  state.projects = state.projects.filter((item) => item.id !== projectId);
  const trash = loadTrashProjects();
  trash.unshift({
    ...project,
    deletedAt: new Date().toISOString(),
    deletedBy: auth.username || "local",
  });
  saveProjects();
  saveTrashProjects(trash);
  renderProjects();
  renderTrash();
  renderAdminDashboard();
}

function restoreProjectFromTrash(projectId) {
  const trash = loadTrashProjects();
  const project = trash.find((item) => item.id === projectId);
  if (!project) return;
  const restored = { ...project };
  delete restored.deletedAt;
  delete restored.deletedBy;
  restored.updatedAt = new Date().toISOString();
  state.projects.unshift(restored);
  saveProjects();
  saveTrashProjects(trash.filter((item) => item.id !== projectId));
  renderProjects();
  renderTrash();
  renderAdminDashboard();
}

function renderTrash() {
  const trash = loadTrashProjects();
  trashCount.textContent = String(trash.length);
  if (!trashList) return;
  trashList.innerHTML = "";
  if (!trash.length) {
    trashList.innerHTML = `
      <section class="empty-state">
        <h2>Корзина пуста</h2>
        <p>Удалённые проекты будут отображаться здесь.</p>
      </section>
    `;
    return;
  }
  trash.forEach((project) => {
    const row = document.createElement("article");
    row.className = "trash-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(project.name || "Проект")}</strong>
        <span>${escapeHtml(project.cityName || "Город не выбран")} · удалил ${escapeHtml(project.deletedBy || "local")} · ${formatDate(project.deletedAt)}</span>
      </div>
      <div class="row-actions">
        <button class="restore-button" type="button" data-restore-project="${escapeHtml(project.id)}">Восстановить</button>
        <button class="delete-button" type="button" data-remove-trash="${escapeHtml(project.id)}">Удалить окончательно</button>
      </div>
    `;
    trashList.appendChild(row);
  });

  trashList.querySelectorAll("[data-restore-project]").forEach((button) => {
    button.addEventListener("click", () => restoreProjectFromTrash(button.dataset.restoreProject));
  });
  trashList.querySelectorAll("[data-remove-trash]").forEach((button) => {
    button.addEventListener("click", () => {
      saveTrashProjects(loadTrashProjects().filter((project) => project.id !== button.dataset.removeTrash));
      renderTrash();
      renderAdminDashboard();
    });
  });
}

function clearTrash() {
  if (!loadTrashProjects().length) return;
  if (!window.confirm("Очистить корзину окончательно?")) return;
  saveTrashProjects([]);
  renderTrash();
  renderAdminDashboard();
}

function currentProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || null;
}

function selectedCity() {
  const project = currentProject();
  const slug = project?.citySlug || state.selectedCitySlug;
  return state.cities.find((city) => city.slug === slug) || null;
}

function resolveCityFromInput() {
  if (!citySearch) return null;
  const query = normalize(citySearch.value);
  if (!query) return null;
  return (
    state.cities.find((city) => normalize(cityDisplayName(city)) === query) ||
    state.cities.find((city) => normalize(city.name) === query) ||
    state.cities.find((city) => normalize(cityDisplayName(city)).includes(query)) ||
    null
  );
}

function cityDisplayName(city) {
  return `${city.name} · ${city.regionName}`;
}

function cityCoords(city) {
  if (!city) return [48.0196, 66.9237];
  const key = normalize(city.name).replace(/^город\s+/, "");
  return cityCoordinates[key] || cityCoordinates[normalize(city.regionName).replace(/^город\s+/, "")] || [48.0196, 66.9237];
}

function projectCoords(project, city) {
  const lat = Number(project?.lat);
  const lng = Number(project?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return cityCoords(city);
}

function cityGeoCacheKey(city) {
  return `${normalize(city?.name)}|${normalize(city?.regionName)}`;
}

function loadCityGeoCache() {
  try {
    const payload = JSON.parse(localStorage.getItem(CITY_GEO_CACHE_KEY) || "{}");
    state.cityGeoCache = new Map(
      Object.entries(payload).filter(([, value]) =>
        Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng))),
    );
  } catch {
    state.cityGeoCache = new Map();
  }
}

async function loadCityCoordinateIndex() {
  try {
    const response = await fetch(CITY_COORDS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const entries = Object.entries(payload?.cities || {}).filter(([, value]) =>
      Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng)),
    );
    state.cityCoordIndex = new Map(entries);
  } catch {
    state.cityCoordIndex = new Map();
  }
}

function indexedCityCoords(city) {
  const indexed = state.cityCoordIndex.get(city?.slug);
  if (!indexed) return null;
  const lat = Number(indexed.lat);
  const lng = Number(indexed.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function saveCityGeoCache() {
  localStorage.setItem(CITY_GEO_CACHE_KEY, JSON.stringify(Object.fromEntries(state.cityGeoCache)));
}

function cachedCityCoords(city) {
  const cached = state.cityGeoCache.get(cityGeoCacheKey(city));
  if (!cached) return null;
  const lat = Number(cached.lat);
  const lng = Number(cached.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function setCachedCityCoords(city, lat, lng) {
  state.cityGeoCache.set(cityGeoCacheKey(city), { lat, lng });
  saveCityGeoCache();
}

function shouldAutoSyncProjectCenter(project) {
  const centerLat = Number(project?.mapCenterLat);
  const centerLng = Number(project?.mapCenterLng);
  const lat = Number(project?.lat);
  const lng = Number(project?.lng);
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return true;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  return Math.abs(centerLat - lat) < 0.000001 && Math.abs(centerLng - lng) < 0.000001;
}

function syncProjectCityCoordinates(project, coords, options = {}) {
  if (!project || !Array.isArray(coords) || coords.length < 2 || project.locationLocked) return false;
  const [lat, lng] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  const nextLat = String(lat);
  const nextLng = String(lng);
  const forceCenter = Boolean(options.forceCenter);
  const syncCenter = forceCenter || shouldAutoSyncProjectCenter(project);
  let changed = false;

  if (project.lat !== nextLat || project.lng !== nextLng) {
    project.lat = nextLat;
    project.lng = nextLng;
    changed = true;
  }

  if (syncCenter && (project.mapCenterLat !== nextLat || project.mapCenterLng !== nextLng)) {
    project.mapCenterLat = nextLat;
    project.mapCenterLng = nextLng;
    changed = true;
  }

  if (changed) project.updatedAt = new Date().toISOString();
  return changed;
}

async function ensureCityCoordinates(city, projectId = null) {
  if (!city) return null;
  const indexed = indexedCityCoords(city);
  if (indexed) {
    setCachedCityCoords(city, indexed[0], indexed[1]);
    if (projectId) {
      const project = state.projects.find((item) => item.id === projectId);
      if (syncProjectCityCoordinates(project, indexed)) {
        saveProjects();
      }
    }
    return indexed;
  }
  const cached = cachedCityCoords(city);
  if (cached) {
    if (projectId) {
      const project = state.projects.find((item) => item.id === projectId);
      if (syncProjectCityCoordinates(project, cached)) {
        saveProjects();
      }
    }
    return cached;
  }

  const cacheKey = cityGeoCacheKey(city);
  if (state.cityGeoPending.has(cacheKey)) return state.cityGeoPending.get(cacheKey);

  const params = new URLSearchParams({
    q: `${city.name}, ${city.regionName}, Kazakhstan`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "kz",
    "accept-language": "ru",
  });

  const pending = fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Nominatim ${response.status}`);
      return response.json();
    })
    .then((items) => {
      const match = Array.isArray(items) ? items[0] : null;
      const lat = Number(match?.lat);
      const lng = Number(match?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      setCachedCityCoords(city, lat, lng);
      if (projectId) {
        const project = state.projects.find((item) => item.id === projectId);
        if (syncProjectCityCoordinates(project, [lat, lng])) {
          saveProjects();
          if (state.activeProjectId === projectId) renderAll();
        }
      }
      return [lat, lng];
    })
    .catch(() => null)
    .finally(() => {
      state.cityGeoPending.delete(cacheKey);
    });

  state.cityGeoPending.set(cacheKey, pending);
  return pending;
}

function cityCoords(city) {
  if (!city) return DEFAULT_CITY_COORDS;
  const indexed = indexedCityCoords(city);
  if (indexed) return indexed;
  const cached = cachedCityCoords(city);
  if (cached) return cached;
  const key = normalize(city.name).replace(/^РіРѕСЂРѕРґ\s+/, "");
  return cityCoordinates[key] || cityCoordinates[normalize(city.regionName).replace(/^РіРѕСЂРѕРґ\s+/, "")] || DEFAULT_CITY_COORDS;
}

function projectCoords(project, city) {
  if (project && !project.locationLocked && !(Array.isArray(project.basePolygon) && project.basePolygon.length >= 3) && city) {
    return cityCoords(city);
  }
  const lat = Number(project?.lat);
  const lng = Number(project?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return cityCoords(city);
}

function clampLatitude(lat) {
  return Math.max(-85.0511, Math.min(85.0511, lat));
}

function wrapLongitude(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function mapCenterCoords(project, city) {
  const lat = Number(project?.mapCenterLat);
  const lng = Number(project?.mapCenterLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return projectCoords(project, city);
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function googleOpenUrl(lat, lng, zoom) {
  const params = new URLSearchParams({
    api: "1",
    query: `${lat},${lng}`,
    zoom: String(zoom),
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function googleMapsApiKey() {
  return String(window.TKP_MAPS_CONFIG?.googleMapsApiKey || "").trim();
}

function hasGoogleMapsKey() {
  return Boolean(googleMapsApiKey());
}

function loadGoogleMapsApi() {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsApiPromise) {
    return googleMapsApiPromise;
  }

  const key = googleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("missing-google-maps-key"));
  }

  googleMapsApiPromise = new Promise((resolve, reject) => {
    const callbackName = `omartaGoogleMapsReady${Date.now()}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      callback: callbackName,
      libraries: "places",
    });

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = `${GOOGLE_MAPS_JS_API_URL}?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsApiPromise = null;
      reject(new Error("google-maps-load-failed"));
    };

    document.head.appendChild(script);
  });

  return googleMapsApiPromise;
}

function basePolygon(project) {
  if (!Array.isArray(project?.basePolygon)) return [];
  return project.basePolygon
    .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function polygonCentroid(points) {
  if (!points.length) return null;
  const sum = points.reduce((acc, point) => {
    acc.lat += point.lat;
    acc.lng += point.lng;
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: sum.lat / points.length,
    lng: wrapLongitude(sum.lng / points.length),
  };
}

function polygonAreaSqMeters(points) {
  if (points.length < 3) return 0;
  const earth = 6378137;
  const meanLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);
  const projected = points.map((point) => ({
    x: earth * ((point.lng * Math.PI) / 180) * cosLat,
    y: earth * ((point.lat * Math.PI) / 180),
  }));
  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const next = projected[(index + 1) % projected.length];
    area += projected[index].x * next.y - next.x * projected[index].y;
  }
  return Math.abs(area) / 2;
}

function formatArea(areaSqMeters) {
  if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) return "0 м²";
  const hectares = areaSqMeters / 10000;
  const squareMeters = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(areaSqMeters);
  if (hectares >= 1) {
    return `${hectares.toFixed(2)} га (${squareMeters} м²)`;
  }
  return `${squareMeters} м²`;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
}

function loadProjects() {
  try {
    state.projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map((project) => ({
      ...project,
      mapProvider: "2gis",
      locationLocked: Boolean(project.locationLocked || (Array.isArray(project.basePolygon) && project.basePolygon.length >= 3)),
    }));
  } catch {
    state.projects = [];
  }
}

function flattenCatalog(payload) {
  return (payload.regions || []).flatMap((region) =>
    (region.cities || []).map((city) => ({
      ...city,
      regionName: region.name,
      regionSlug: region.slug,
      regionType: region.type,
    })),
  ).sort((a, b) => cityDisplayName(a).localeCompare(cityDisplayName(b), "ru"));
}

function chooseInitialCity() {
  const astana = state.cities.find((city) => normalize(city.name) === "астана");
  return astana || state.cities[0] || null;
}

function createDefaultProject() {
  const city = chooseInitialCity();
  if (!city) return;
  const [lat, lng] = cityCoords(city);
  const project = {
    id: makeId(),
    name: "Новый проект",
    location: "Загородная база отдыха вблизи выбранного города",
    citySlug: city.slug,
    cityName: city.name,
    regionName: city.regionName,
    regionSlug: city.regionSlug,
    lat: String(lat),
    lng: String(lng),
    mapCenterLat: String(lat),
    mapCenterLng: String(lng),
    mapProvider: "2gis",
    locationLocked: false,
    basePolygon: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.projects.unshift(project);
  state.activeProjectId = project.id;
  state.selectedCitySlug = city.slug;
  saveProjects();
}

function syncFormFromProject() {
  if (!projectName || !projectLocation || !citySearch) return;
  const project = currentProject();
  if (!project) {
    projectName.value = "";
    projectLocation.value = "";
    citySearch.value = "";
    return;
  }
  projectName.value = project.name;
  projectLocation.value = project.location;
  const city = state.cities.find((item) => item.slug === project.citySlug);
  citySearch.value = city ? cityDisplayName(city) : project.cityName || "";
  state.selectedCitySlug = project.citySlug;
}

function renderCityResults() {
  if (!cityResults || !citySearch) return;
  const query = normalize(citySearch.value);
  const results = state.cities
    .filter((city) => !query || normalize(cityDisplayName(city)).includes(query))
    .slice(0, 8);

  cityResults.innerHTML = "";
  results.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = city.slug === state.selectedCitySlug ? "city-option is-selected" : "city-option";
    button.innerHTML = `<strong>${escapeHtml(city.name)}</strong><span>${escapeHtml(city.regionName)} · ${city.kind === "airport" ? "аэропорт" : "город"}</span>`;
    button.addEventListener("click", async () => {
      state.selectedCitySlug = city.slug;
      citySearch.value = cityDisplayName(city);
      await applyCityToProject(city);
      renderCityResults();
      await renderAll();
    });
    cityResults.appendChild(button);
  });
}

async function applyCityToProject(city) {
  const project = currentProject();
  if (!project || !city) return;
  project.citySlug = city.slug;
  project.cityName = city.name;
  project.regionName = city.regionName;
  project.regionSlug = city.regionSlug;
  project.locationLocked = false;
  project.basePolygon = [];
  const [lat, lng] = cityCoords(city);
  syncProjectCityCoordinates(project, [lat, lng], { forceCenter: true });
  project.updatedAt = new Date().toISOString();
  saveProjects();
  const resolved = await ensureCityCoordinates(city, project.id);
  if (resolved && syncProjectCityCoordinates(project, resolved, { forceCenter: true })) {
    saveProjects();
  }
}

function renderProjects() {
  if (!projectCount || !projectList) return;
  projectCount.textContent = String(state.projects.length);
  projectList.innerHTML = "";
  if (!state.projects.length) {
    projectList.innerHTML = `
      <section class="empty-state">
        <h2>Проектов пока нет</h2>
        <p>Откройте раздел «Создать проект», заполните данные и создайте первый проект.</p>
      </section>
    `;
    return;
  }
  state.projects.forEach((project) => {
    const row = document.createElement("article");
    row.className = "project-card-row";
    row.innerHTML = `
      <button type="button" class="${project.id === state.activeProjectId ? "project-card is-active" : "project-card"}" data-open-project="${escapeHtml(project.id)}">
        <strong>${escapeHtml(project.name)}</strong>
        <span>${escapeHtml(project.cityName || "Город не выбран")} · ${formatDate(project.updatedAt)}</span>
      </button>
      <button type="button" class="project-trash-button" data-trash-project="${escapeHtml(project.id)}">Удалить</button>
    `;
    row.querySelector("[data-open-project]").addEventListener("click", () => {
      state.activeProjectId = project.id;
      syncFormFromProject();
      if (isProjectsPage) {
        openProject(project.id);
      } else {
        renderAll();
      }
    });
    row.querySelector("[data-trash-project]").addEventListener("click", () => moveProjectToTrash(project.id));
    projectList.appendChild(row);
  });
}

function renderProjectSearch() {
  if (!searchResults || !globalSearch) return;
  const query = normalize(globalSearch.value);
  if (!query) {
    searchResults.innerHTML = "";
    return;
  }
  const projectMatches = state.projects
    .filter((project) => {
      const haystack = normalize(`${project.name || ""} ${project.cityName || ""} ${project.regionName || ""} ${project.location || ""}`);
      return !query || haystack.includes(query);
    })
    .slice(0, 8);
  const cityMatches = state.cities
    .filter((city) => {
      const haystack = normalize(`${city.name || ""} ${city.regionName || ""}`);
      return query && haystack.includes(query);
    })
    .slice(0, 8);

  searchResults.innerHTML = "";

  projectMatches.forEach((project) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result-card";
    button.innerHTML = `
      <strong>${escapeHtml(project.name || "Проект")}</strong>
      <span>${escapeHtml(project.cityName || "Город не выбран")} · ${formatDate(project.updatedAt)}</span>
    `;
    button.addEventListener("click", () => openProject(project.id));
    searchResults.appendChild(button);
  });

  cityMatches.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result-card";
    button.innerHTML = `
      <strong>${escapeHtml(city.name)}</strong>
      <span>${escapeHtml(city.regionName)} · город из каталога</span>
    `;
    button.addEventListener("click", async () => {
      if (!isProjectsPage) {
        window.location.href = "./projects.html";
        return;
      }
      setProjectDashboardView("create");
      state.selectedCitySlug = city.slug;
      if (citySearch) citySearch.value = cityDisplayName(city);
      await applyCityToProject(city);
      renderCityResults();
    });
    searchResults.appendChild(button);
  });

  if (!projectMatches.length && !cityMatches.length) {
    searchResults.innerHTML = `
      <section class="empty-state">
        <h2>Ничего не найдено</h2>
        <p>Попробуйте ввести название проекта, города или региона.</p>
      </section>
    `;
  }
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("is-sidebar-collapsed", collapsed);
  sidebarToggleButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(!collapsed));
  });
}

function toggleSidebar() {
  setSidebarCollapsed(!document.body.classList.contains("is-sidebar-collapsed"));
}

function logoutCurrentUser() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "../login.html";
}

function renderNav() {
  if (!methodNav) return;
  methodNav.innerHTML = "";
  methodology.forEach((chapter) => {
    const group = document.createElement("section");
    group.className = "nav-group";
    group.innerHTML = `<h3>${escapeHtml(chapter.title)}</h3>`;
    chapter.items.forEach(([id, number, title, formats]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = id === state.activeSectionId ? "nav-item is-active" : "nav-item";
      button.innerHTML = `
        <span>${escapeHtml(number)}</span>
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(formats.replaceAll(",", " · "))}</em>
      `;
      button.addEventListener("click", () => {
        state.activeSectionId = id;
        renderNav();
        renderSection();
      });
      group.appendChild(button);
    });
    methodNav.appendChild(group);
  });

  const project = currentProject();
  const customs = customSections(project);
  const customGroup = document.createElement("section");
  customGroup.className = "nav-group";
  customGroup.innerHTML = `<h3>Ручные главы</h3>`;

  customs.forEach(({ id, number, title, formats }) => {
    const topics = navSubchapters(id);
    const isActive = id === state.activeSectionId;
    const isExpanded = state.navExpanded[id] ?? isActive;

    const branch = document.createElement("div");
    branch.className = isExpanded ? "nav-branch is-open" : "nav-branch";

    const button = document.createElement("button");
    button.type = "button";
    button.className = isActive ? "nav-item nav-item-tree is-active" : "nav-item nav-item-tree";
    button.innerHTML = `
      <span>${escapeHtml(number)}</span>
      <strong>${escapeHtml(title)}</strong>
      <em>${escapeHtml(formats.replaceAll(",", " · "))}</em>
    `;
    button.addEventListener("click", () => {
      const shouldCollapse = isActive && isExpanded;
      state.activeSectionId = id;
      state.navExpanded[id] = shouldCollapse ? false : true;
      state.pendingSubchapter = null;
      renderNav();
      if (!shouldCollapse || !isActive) renderSection();
    });
    branch.appendChild(button);

    if (topics.length) {
      const subtree = document.createElement("div");
      subtree.className = "nav-subtree";
      subtree.innerHTML = topics.map((topic, index) => `
        <button type="button" class="nav-subitem ${isActive ? "is-active" : ""}" data-parent-section="${escapeHtml(id)}" data-topic-index="${index}">
          ${escapeHtml(topic)}
        </button>
      `).join("");
      subtree.querySelectorAll(".nav-subitem").forEach((item) => {
        item.addEventListener("click", () => {
          const subtitle = item.textContent?.trim() || "";
          const wasActive = id === state.activeSectionId;
          state.activeSectionId = id;
          state.navExpanded[id] = true;
          state.pendingSubchapter = { sectionId: id, title: subtitle };
          renderNav();
          if (wasActive) {
            if (!openSubchapterInOutput(subtitle)) renderSection();
          } else {
            renderSection();
          }
        });
      });
      branch.appendChild(subtree);
    }

    customGroup.appendChild(branch);
  });

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "nav-add-button";
  addButton.textContent = "+ Добавить главу";
  addButton.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const sections = ensureCustomSections(active);
    const section = {
      id: makeCustomSectionId(),
      number: String(10 + sections.length),
      title: `Глава ${10 + sections.length}`,
      formats: "ручные данные / текст / графики / изображения",
      summary: "",
      blocks: [],
    };
    sections.push(section);
    active.updatedAt = new Date().toISOString();
    state.activeSectionId = section.id;
    state.navExpanded[section.id] = true;
    saveProjects();
    renderAll();
  });
  customGroup.appendChild(addButton);
  methodNav.appendChild(customGroup);
}

function renderNav() {
  methodNav.innerHTML = "";
  methodology.forEach((chapter) => {
    const group = document.createElement("section");
    group.className = "nav-group";
    group.innerHTML = `<h3>${escapeHtml(chapter.title)}</h3>`;

    chapter.items.forEach(([id, number, title, formats]) => {
      const topics = navSubchapters(id);
      const isActive = id === state.activeSectionId;
      const isExpanded = state.navExpanded[id] ?? isActive;

      const branch = document.createElement("div");
      branch.className = isExpanded ? "nav-branch is-open" : "nav-branch";

      const button = document.createElement("button");
      button.type = "button";
      button.className = isActive ? "nav-item nav-item-tree is-active" : "nav-item nav-item-tree";
      button.innerHTML = `
        <span>${escapeHtml(number)}</span>
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(formats.replaceAll(",", " · "))}</em>
      `;
      button.addEventListener("click", () => {
        const shouldCollapse = isActive && isExpanded;
        state.activeSectionId = id;
        state.navExpanded[id] = shouldCollapse ? false : true;
        state.pendingSubchapter = null;
        renderNav();
        if (!shouldCollapse || !isActive) {
          renderSection();
        }
      });
      branch.appendChild(button);

      if (topics.length) {
        const subtree = document.createElement("div");
        subtree.className = "nav-subtree";
        subtree.innerHTML = topics.map((topic, index) => `
          <button type="button" class="nav-subitem ${isActive ? "is-active" : ""}" data-parent-section="${escapeHtml(id)}" data-topic-index="${index}">
            ${escapeHtml(topic)}
          </button>
        `).join("");
        subtree.querySelectorAll(".nav-subitem").forEach((item) => {
          item.addEventListener("click", () => {
            const title = item.textContent?.trim() || "";
            const wasActive = id === state.activeSectionId;
            state.activeSectionId = id;
            state.navExpanded[id] = true;
            state.pendingSubchapter = { sectionId: id, title };
            renderNav();
            if (wasActive) {
              if (!openSubchapterInOutput(title)) {
                renderSection();
              }
            } else {
              renderSection();
            }
          });
        });
        branch.appendChild(subtree);
      }

      group.appendChild(branch);
    });

    methodNav.appendChild(group);
  });

  const project = currentProject();
  const customs = customSections(project);
  const customGroup = document.createElement("section");
  customGroup.className = "nav-group";
  customGroup.innerHTML = `<h3>Ручные главы</h3>`;

  customs.forEach(({ id, number, title, formats }) => {
    const topics = navSubchapters(id);
    const isActive = id === state.activeSectionId;
    const isExpanded = state.navExpanded[id] ?? isActive;

    const branch = document.createElement("div");
    branch.className = isExpanded ? "nav-branch is-open" : "nav-branch";

    const button = document.createElement("button");
    button.type = "button";
    button.className = isActive ? "nav-item nav-item-tree is-active" : "nav-item nav-item-tree";
    button.innerHTML = `
      <span>${escapeHtml(number)}</span>
      <strong>${escapeHtml(title)}</strong>
      <em>${escapeHtml(formats.replaceAll(",", " · "))}</em>
    `;
    button.addEventListener("click", () => {
      const shouldCollapse = isActive && isExpanded;
      state.activeSectionId = id;
      state.navExpanded[id] = shouldCollapse ? false : true;
      state.pendingSubchapter = null;
      renderNav();
      if (!shouldCollapse || !isActive) renderSection();
    });
    branch.appendChild(button);

    if (topics.length) {
      const subtree = document.createElement("div");
      subtree.className = "nav-subtree";
      subtree.innerHTML = topics.map((topic, index) => `
        <button type="button" class="nav-subitem ${isActive ? "is-active" : ""}" data-parent-section="${escapeHtml(id)}" data-topic-index="${index}">
          ${escapeHtml(topic)}
        </button>
      `).join("");
      subtree.querySelectorAll(".nav-subitem").forEach((item) => {
        item.addEventListener("click", () => {
          const subtitle = item.textContent?.trim() || "";
          const wasActive = id === state.activeSectionId;
          state.activeSectionId = id;
          state.navExpanded[id] = true;
          state.pendingSubchapter = { sectionId: id, title: subtitle };
          renderNav();
          if (wasActive) {
            if (!openSubchapterInOutput(subtitle)) renderSection();
          } else {
            renderSection();
          }
        });
      });
      branch.appendChild(subtree);
    }

    customGroup.appendChild(branch);
  });

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "nav-add-button";
  addButton.textContent = "+ Добавить главу";
  addButton.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const sections = ensureCustomSections(active);
    const section = {
      id: makeCustomSectionId(),
      number: String(10 + sections.length),
      title: `Глава ${10 + sections.length}`,
      formats: "ручные данные / текст / графики / изображения",
      summary: "",
      blocks: [],
    };
    sections.push(section);
    active.updatedAt = new Date().toISOString();
    state.activeSectionId = section.id;
    state.navExpanded[section.id] = true;
    saveProjects();
    renderAll();
  });
  customGroup.appendChild(addButton);
  methodNav.appendChild(customGroup);
}

function saveActiveProject() {
  if (!projectName || !projectLocation) return;
  const name = projectName.value.trim() || "Новый проект";
  const city = state.cities.find((item) => item.slug === state.selectedCitySlug) || resolveCityFromInput() || chooseInitialCity();
  const now = new Date().toISOString();
  if (isProjectsPage) {
    const [lat, lng] = cityCoords(city);
    const project = {
      id: makeId(),
      name,
      location: projectLocation.value.trim(),
      citySlug: city?.slug || null,
      cityName: city?.name || "",
      regionName: city?.regionName || "",
      regionSlug: city?.regionSlug || "",
      lat: String(lat),
      lng: String(lng),
      mapCenterLat: String(lat),
      mapCenterLng: String(lng),
      mapProvider: "2gis",
      locationLocked: false,
      basePolygon: [],
      createdAt: now,
      updatedAt: now,
    };
    state.projects.unshift(project);
    state.activeProjectId = project.id;
    state.selectedCitySlug = project.citySlug;
    saveProjects();
    openProject(project.id);
    return;
  }

  let project = currentProject();

  if (!project) {
    project = { id: makeId(), createdAt: now };
    state.projects.unshift(project);
    state.activeProjectId = project.id;
  }

  Object.assign(project, {
    name,
    location: projectLocation.value.trim(),
    citySlug: city?.slug || null,
    cityName: city?.name || "",
    regionName: city?.regionName || "",
    regionSlug: city?.regionSlug || "",
    lat: project.lat || String(cityCoords(city)[0]),
    lng: project.lng || String(cityCoords(city)[1]),
    mapCenterLat: project.mapCenterLat || project.lat || String(cityCoords(city)[0]),
    mapCenterLng: project.mapCenterLng || project.lng || String(cityCoords(city)[1]),
    mapProvider: mapProvider(project),
    locationLocked: Boolean(project.locationLocked),
    basePolygon: Array.isArray(project.basePolygon) ? project.basePolygon : [],
    updatedAt: now,
  });

  state.selectedCitySlug = project.citySlug;
  saveProjects();
  syncFormFromProject();
  renderAll();
}

function deleteActiveProject() {
  const project = currentProject();
  if (!project) return;
  const confirmed = window.confirm(`Удалить проект "${project.name}"?`);
  if (!confirmed) return;
  state.projects = state.projects.filter((item) => item.id !== project.id);
  state.activeProjectId = state.projects[0]?.id || null;
  if (!state.projects.length) {
    createDefaultProject();
  }
  saveProjects();
  syncFormFromProject();
  renderAll();
}

function createNewProject() {
  const city = chooseInitialCity();
  if (!city) return;
  const [lat, lng] = cityCoords(city);
  const project = {
    id: makeId(),
    name: "Новый проект",
    location: "Точка будущей базы отмечается на карте",
    citySlug: city.slug,
    cityName: city.name,
    regionName: city.regionName,
    regionSlug: city.regionSlug,
    lat: String(lat),
    lng: String(lng),
    mapCenterLat: String(lat),
    mapCenterLng: String(lng),
    mapProvider: "2gis",
    locationLocked: false,
    basePolygon: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.projects.unshift(project);
  state.activeProjectId = project.id;
  state.selectedCitySlug = city.slug;
  saveProjects();
  syncFormFromProject();
  if (isProjectsPage) setProjectDashboardView("create");
  renderAll();
}

function renderHeader() {
  const project = currentProject();
  const city = selectedCity();
  activeProjectTitle.textContent = project?.name || "Новый проект";
  activeProjectMeta.textContent = city
    ? `${city.name}, ${city.regionName}. ${project?.location || "Локация участка уточняется."}`
    : "Выберите город, чтобы собрать главы по методологии ТКП.";
  statSections.textContent = String(getAllSections(project).length);
  statWeather.textContent = city?.sectionCount ? String(city.sectionCount) : "0";
  catalogCount.textContent = `${state.cities.length} городов`;
}

function sourceList(items) {
  return `
    <div class="sources">
      ${items.map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.label)}</a>`).join("")}
    </div>
  `;
}

function table(headers, rows) {
  return `
    <div class="table-scroll">
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function htmlTable(headers, rows) {
  return `
    <div class="table-scroll">
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function bars(items) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="bar-chart">
      ${items.map((item) => `
        <div class="bar-row">
          <span>${escapeHtml(item.label)}</span>
          <div><i style="width:${Math.max(6, (item.value / max) * 100)}%"></i></div>
          <strong>${escapeHtml(item.valueLabel || formatNumber(item.value))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  return number % 1 === 0 ? String(number) : number.toFixed(digits);
}

function loadingBlock(label) {
  return `<div class="loading">Загружаю реальные данные: ${escapeHtml(label)}...</div>`;
}

function emptyData(title, text) {
  return `<article class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`;
}

function accordion(items) {
  return `
    <div class="analysis-stack">
      ${items.map((item, index) => `
        <article class="analysis-section ${index === 0 ? "is-open" : ""}">
          <button type="button">${escapeHtml(item.title)}</button>
          <div>${item.html}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function hydrateAccordions() {
  sectionOutput.querySelectorAll(".analysis-section > button").forEach((button) => {
    button.addEventListener("click", () => button.parentElement.classList.toggle("is-open"));
  });
}

function elementCoord(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return [element.lat, element.lon];
  if (element.center) return [element.center.lat, element.center.lon];
  return null;
}

function osmName(element) {
  const tags = element.tags || {};
  return displayName(tags["name:ru"] || tags.name || tags.brand || tags.operator, "Без названия");
}

const OBJECT_TYPE_RU = {
  restaurant: "ресторан",
  cafe: "кафе",
  fuel: "АЗС",
  gas_station: "АЗС",
  pharmacy: "аптека",
  clinic: "клиника",
  hospital: "больница",
  marketplace: "рынок",
  supermarket: "супермаркет",
  shopping_mall: "торговый центр",
  bank: "банк",
  atm: "банкомат",
  parking: "парковка",
  hotel: "отель",
  lodging: "размещение",
  guest_house: "гостевой дом",
  chalet: "шале",
  camp_site: "кемпинг",
  campground: "кемпинг",
  rv_park: "кемпинг",
  picnic_site: "пикниковая зона",
  resort: "зона отдыха",
  park: "парк",
  swimming_pool: "бассейн",
  water_park: "аквапарк",
  sports_centre: "спортивный центр",
  tourist_attraction: "достопримечательность",
  attraction: "достопримечательность",
  viewpoint: "смотровая точка",
  museum: "музей",
  theme_park: "парк развлечений",
  zoo: "зоопарк",
  art_gallery: "галерея",
  historic: "исторический объект",
  natural_feature: "природный объект",
  water: "водоем",
  wood: "лес",
  peak: "вершина",
  beach: "пляж",
  spring: "родник",
  nature_reserve: "природная территория",
  industrial: "промышленная зона",
  landfill: "полигон",
  wastewater_plant: "очистные сооружения",
  works: "производство",
  waste_disposal: "утилизация отходов",
  recycling: "переработка",
  power: "энергообъект",
  route: "маршрут",
};

function typeLabelRu(value) {
  const key = String(value || "").trim();
  return OBJECT_TYPE_RU[key] || displayName(key.replaceAll("_", " "), "объект");
}

function osmRawKind(element) {
  const tags = element.tags || {};
  return tags.shop || tags.amenity || tags.tourism || tags.leisure || tags.historic || tags.natural || tags.route || "object";
}

function osmKind(element) {
  return typeLabelRu(osmRawKind(element));
}

function osmDescription(element) {
  const tags = element.tags || {};
  if (tags["description:ru"]) return tags["description:ru"];
  if (tags.description) return displayName(tags.description);
  if (tags.operator) return displayName(tags.operator);
  return tags.wikipedia || tags.website || tags.opening_hours || "";
}

function osmRows(elements, baseLat, baseLng, limit = 12) {
  return elements
    .map((element) => {
      const coord = elementCoord(element);
      const distance = coord ? distanceKm(baseLat, baseLng, coord[0], coord[1]) : null;
      return { element, distance };
    })
    .filter((item) => item.distance !== null)
    .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
    .slice(0, limit);
}

function valueOrDash(value, digits = 1) {
  return value === null || value === undefined ? "нет данных" : formatNumber(value, digits);
}

const ECO_METRICS = [
  {
    key: "european_aqi",
    label: "Европейский индекс качества воздуха",
    unitFallback: "AQI",
    normLimit: 40,
    normLabelPrefix: "good/fair до",
    bands: [20, 40, 60, 80, 100],
    scaleMax: 120,
    description: "Индекс Open-Meteo/European AQI: 0-20 good, 20-40 fair, 40-60 moderate. Для комфортного отдыха держим ориентир до 40.",
  },
  {
    key: "us_aqi",
    label: "Американский индекс качества воздуха",
    unitFallback: "AQI",
    normLimit: 50,
    normLabelPrefix: "good до",
    bands: [50, 100, 150, 200, 300],
    goodIndexMax: 0,
    scaleMax: 300,
    description: "Индекс EPA/AirNow: 0-50 good, 51-100 moderate, дальше уровни unhealthy. Именно к нему относится привычная граница до 50.",
  },
  {
    key: "pm2_5",
    label: "PM2.5",
    unitFallback: "µg/m³",
    normLimit: 15,
    bands: [5, 15, 50, 90, 140],
    scaleMax: 160,
    description: "Очень мелкие частицы. Чем ниже значение, тем комфортнее для дыхания гостей.",
  },
  {
    key: "pm10",
    label: "PM10",
    unitFallback: "µg/m³",
    normLimit: 45,
    bands: [15, 45, 120, 195, 270],
    scaleMax: 300,
    description: "Пыль и более крупные частицы. Рост показателя чаще заметен у дорог, строек и открытого грунта.",
  },
  {
    key: "carbon_monoxide",
    label: "CO",
    unitFallback: "µg/m³",
    normLimit: 4000,
    normLabelPrefix: "WHO 24ч до",
    bands: [4000, 10000, 35000, 60000, 100000],
    goodIndexMax: 0,
    scaleMax: 50000,
    description: "Угарный газ. Ориентир WHO: 4 mg/m³ за 24 часа, то есть 4000 µg/m³; текущий часовой срез нужно подтверждать усреднением.",
  },
  {
    key: "nitrogen_dioxide",
    label: "NO₂",
    unitFallback: "µg/m³",
    normLimit: 25,
    bands: [10, 25, 60, 100, 150],
    scaleMax: 180,
    description: "Чаще связан с трафиком и сгоранием топлива. Для спокойной рекреации лучше низкий фон.",
  },
  {
    key: "ozone",
    label: "O₃",
    unitFallback: "µg/m³",
    normLimit: 100,
    bands: [60, 100, 120, 160, 180],
    scaleMax: 210,
    description: "Озон может расти в тёплую солнечную погоду. Для гостей чувствительных групп это важно.",
  },
  {
    key: "sulphur_dioxide",
    label: "SO₂",
    unitFallback: "µg/m³",
    normLimit: 40,
    bands: [20, 40, 125, 190, 275],
    scaleMax: 320,
    description: "Маркер выбросов от некоторых промышленных и энергетических источников. Чем ниже, тем лучше.",
  },
];

function ecoMetricIndex(value, bands) {
  if (!Number.isFinite(Number(value))) return -1;
  const numeric = Number(value);
  for (let index = 0; index < bands.length; index += 1) {
    if (numeric <= bands[index]) return index;
  }
  return bands.length;
}

function ecoMetricTone(index, metric = {}) {
  const goodIndexMax = Number.isFinite(metric.goodIndexMax) ? metric.goodIndexMax : 1;
  if (index <= goodIndexMax) return "good";
  if (index <= goodIndexMax + 1) return "warn";
  if (index <= goodIndexMax + 2) return "bad";
  return "critical";
}

function ecoMetricLabel(index, metric = {}) {
  const goodIndexMax = Number.isFinite(metric.goodIndexMax) ? metric.goodIndexMax : 1;
  if (index <= 0) return "очень хорошо";
  if (index <= goodIndexMax) return "в пределах нормы";
  if (index <= goodIndexMax + 1) return "выше желаемого";
  if (index <= goodIndexMax + 2) return "повышенная нагрузка";
  if (index >= goodIndexMax + 3) return "высокая нагрузка";
  return "нет данных";
}

function ecoMetricSummary(metric, value) {
  if (!Number.isFinite(Number(value))) {
    return {
      tone: "neutral",
      label: "нет данных",
      ratio: 0,
      valueLabel: "нет данных",
      normLabel: `${metric.normLabelPrefix || "норма до"} ${formatNumber(metric.normLimit)} ${metric.unitFallback}`,
      note: "Источник не вернул значение для этой точки.",
    };
  }

  const numeric = Number(value);
  const index = ecoMetricIndex(numeric, metric.bands);
  const tone = ecoMetricTone(index, metric);
  const delta = numeric - metric.normLimit;

  return {
    tone,
    label: ecoMetricLabel(index, metric),
    ratio: Math.max(0, Math.min(100, (numeric / metric.scaleMax) * 100)),
    valueLabel: `${formatNumber(numeric)} ${metric.unitFallback}`,
    normLabel: `${metric.normLabelPrefix || "норма до"} ${formatNumber(metric.normLimit)} ${metric.unitFallback}`,
    note: delta <= 0
      ? `лучше нормы на ${formatNumber(Math.abs(delta))} ${metric.unitFallback}`
      : `хуже нормы на ${formatNumber(delta)} ${metric.unitFallback}`,
  };
}

function ecoStatusBadge(text, tone) {
  return `<span class="eco-badge eco-badge-${tone}">${escapeHtml(text)}</span>`;
}

function ecoMetricPurpose(metric) {
  const purposes = {
    european_aqi: "Показывает общую картину по европейской шкале Open-Meteo: 0-20 good, 20-40 fair, 40-60 moderate. Это не американская шкала AQI.",
    us_aqi: "Показывает качество воздуха по шкале EPA/AirNow. Здесь зелёная категория Good действительно идёт от 0 до 50.",
    pm2_5: "Показывает концентрацию самой мелкой пыли, которая глубже всего попадает в дыхательные пути. Для базы отдыха это один из самых чувствительных показателей комфорта.",
    pm10: "Показывает более крупную пыль. Часто растёт рядом с дорогами, стройкой, сухим открытым грунтом и активным транспортом.",
    carbon_monoxide: "Показывает угарный газ. Для отчёта используется ориентир WHO 24ч, поэтому часовой срез нужно читать как предварительный сигнал.",
    nitrogen_dioxide: "Показывает влияние выхлопов и сгорания топлива. Нужен, чтобы понять, насколько участок зависит от трафика и близких дорог.",
    ozone: "Показывает фотохимическую нагрузку воздуха, которая может усиливаться в жаркую солнечную погоду. Важен для летнего сценария отдыха.",
    sulphur_dioxide: "Показывает возможное влияние отдельных промышленных и энергетических источников. Для базы отдыха нужен как маркер неблагоприятного окружения.",
  };
  return purposes[metric.key] || metric.description;
}

function ecoMetricCards(air, units) {
  return `
    <div class="eco-legend">
      <div class="eco-legend-item"><i class="eco-legend-dot eco-legend-good"></i><span>Зелёный: норма и комфортный уровень</span></div>
      <div class="eco-legend-item"><i class="eco-legend-dot eco-legend-warn"></i><span>Жёлтый: средний уровень, уже близко к нежелательной границе</span></div>
      <div class="eco-legend-item"><i class="eco-legend-dot eco-legend-bad"></i><span>Красный: плохо, нагрузка для базы повышенная</span></div>
    </div>
    <div class="eco-metric-grid">
      ${ECO_METRICS.map((metric) => {
        const unit = units?.[metric.key] || metric.unitFallback;
        const summary = ecoMetricSummary({ ...metric, unitFallback: unit }, air?.[metric.key]);
        const normMarker = Math.max(0, Math.min(100, (metric.normLimit / metric.scaleMax) * 100));
        return `
          <article class="eco-metric-card eco-metric-card-${summary.tone}">
            <div class="eco-metric-head">
              <div class="eco-metric-name">
                <strong>${escapeHtml(metric.label)}</strong>
                <span>${escapeHtml(ecoMetricPurpose(metric))}</span>
              </div>
              ${ecoStatusBadge(summary.label, summary.tone)}
            </div>
            <div class="eco-metric-values">
              <div class="eco-metric-value-block">
                <small>Норма</small>
                <div class="eco-norm">${escapeHtml(summary.normLabel)}</div>
              </div>
              <div class="eco-metric-value-block">
                <small>Сейчас у базы</small>
                <div class="eco-current-chip eco-current-chip-${summary.tone}">${escapeHtml(summary.valueLabel)}</div>
              </div>
            </div>
            <div class="eco-scale-wrap">
              <div class="eco-scale" aria-hidden="true">
                <i class="eco-scale-fill eco-scale-${summary.tone}" style="width:${summary.ratio}%"></i>
                <span class="eco-scale-marker" style="left:${normMarker}%"></span>
              </div>
              <div class="eco-scale-caption">
                <span>Маркер показывает границу нормы</span>
                <span>${escapeHtml(summary.note)}</span>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function googlePlaceKind(place) {
  const preferred = ["park", "campground", "natural_feature"];
  const match = preferred.find((type) => hasPlaceType(place, [type]));
  return match ? typeLabelRu(match) : placeTypesLabel(place);
}

function renderEcoGoogleCards(rows, emptyTitle, emptyText) {
  if (!rows.length) return emptyData(emptyTitle, emptyText);
  return `
    <div class="data-card-grid">
      ${rows.map(({ place, distance }) => `
        <article class="data-card">
          <h3>${escapeHtml(displayName(place.name, "Объект"))}</h3>
          <p><strong>Тип:</strong> ${escapeHtml(googlePlaceKind(place))}</p>
          <p><strong>Расстояние:</strong> ${formatNumber(distance, 2)} км от базы</p>
          ${place.vicinity ? `<p><strong>Адрес:</strong> ${escapeHtml(displayName(place.vicinity))}</p>` : ""}
          ${Number.isFinite(Number(place.rating)) ? `<p><strong>Рейтинг:</strong> ${formatNumber(place.rating, 1)}${place.user_ratings_total ? ` (${place.user_ratings_total} отзывов)` : ""}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function ecoRiskNames(rows) {
  return rows
    .slice(0, 3)
    .map((row) => row.place?.name ? displayName(row.place.name) : osmName(row.element))
    .filter(Boolean);
}

function ecoContextSummary(source, greenRows, naturalRows, riskRows) {
  const landscape = greenRows.length + naturalRows.length >= 4
    ? "зелёное окружение читается хорошо"
    : greenRows.length + naturalRows.length >= 1
      ? "природное окружение есть, но его нужно проверить на месте"
      : "по карте зелёный каркас выражен слабо";
  const load = riskRows.length === 0
    ? "рядом не видно явных источников экологической нагрузки"
    : riskRows.length <= 2
      ? `есть отдельные точки риска: ${ecoRiskNames(riskRows).join(", ")}`
      : `в окружении несколько факторов нагрузки: ${ecoRiskNames(riskRows).join(", ")}`;
  const sourceLabel = source === "google" ? "Карты Google" : "Карта OSM";
  return `${landscape}; ${load}. Пространственный анализ собран по ${sourceLabel}.`;
}

function ecoChecklist(rows) {
  return `<div class="eco-checklist">${rows.map((item) => `<article class="eco-check-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></article>`).join("")}</div>`;
}

function ecoPlaceDistance(row) {
  return row?.distance !== null && row?.distance !== undefined ? `${formatNumber(row.distance, 2)} км от базы` : "расстояние не определено";
}

function ecoPlaceTitle(row) {
  return row.place ? displayName(row.place.name, "Объект") : osmName(row.element);
}

function ecoPlaceType(row) {
  return row.place ? googlePlaceKind(row.place) : osmKind(row.element);
}

function ecoPlaceAddress(row) {
  if (row.place?.vicinity) return displayName(row.place.vicinity);
  const description = row.element ? osmDescription(row.element) : "";
  return description || "";
}

function ecoPlaceNarrative(row, mode) {
  const title = ecoPlaceTitle(row);
  const type = ecoPlaceType(row);
  const distance = ecoPlaceDistance(row);
  const address = ecoPlaceAddress(row);
  if (mode === "nature") {
    return {
      title,
      intro: `${title} — это ${type}, расположен примерно в ${distance}.`,
      detail: address
        ? `По карте объект отмечен как природная или зелёная зона. Дополнительная привязка: ${address}.`
        : "По карте объект отмечен как природная или зелёная зона. Его стоит проверить на месте: реальное качество среды, тень, шум, мусор и визуальное состояние.",
      conclusion: "Для базы отдыха такой объект важен как источник визуального комфорта, прогулочного сценария и ощущения природного окружения.",
    };
  }
  return {
    title,
    intro: `${title} — это ${type}, находится примерно в ${distance}.`,
    detail: address
      ? `Карта показывает этот объект как возможный источник экологической нагрузки. Дополнительная привязка: ${address}.`
      : "Карта показывает этот объект как возможный источник экологической нагрузки. Нужно отдельно проверить фактическое воздействие на шум, запах, пыль и ограничения по участку.",
    conclusion: "Такой объект сам по себе не означает запрет, но его нужно проверить до принятия решения по базе.",
  };
}

function ecoNarrativeCards(rows, mode, emptyTitle, emptyText) {
  if (!rows.length) return emptyData(emptyTitle, emptyText);
  return `
    <div class="eco-narrative-list">
      ${rows.map((row) => {
        const narrative = ecoPlaceNarrative(row, mode);
        return `
          <article class="eco-narrative-card eco-narrative-card-${mode}">
            <h3>${escapeHtml(narrative.title)}</h3>
            <p class="eco-narrative-intro">${escapeHtml(narrative.intro)}</p>
            <p>${escapeHtml(narrative.detail)}</p>
            <p class="eco-narrative-conclusion">${escapeHtml(narrative.conclusion)}</p>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function buildEcoChecklist(air, greenRows, naturalRows, riskRows) {
  const aqiSummary = ecoMetricSummary(ECO_METRICS[0], air?.european_aqi);
  const list = [];

  if (riskRows.length) {
    list.push({
      title: "Проверить санитарные ограничения",
      text: `Рядом есть потенциальные источники нагрузки (${ecoRiskNames(riskRows).join(", ")}). Нужны фактические санитарно-защитные зоны, направление ветра и подтверждение, что участок не попадает под ограничения.`,
    });
  } else {
    list.push({
      title: "Подтвердить отсутствие скрытых источников нагрузки",
      text: "Даже если карта не показала рисковые объекты, стоит проверить местные полигоны, котельные, карьеры, фермы, ЛЭП, сезонное сжигание и жалобы жителей.",
    });
  }

  if (naturalRows.some(({ place }) => hasPlaceType(place, ["natural_feature"])) || naturalRows.some(({ element }) => Boolean(element?.tags?.natural))) {
    list.push({
      title: "Проверить водоохранные и природные режимы",
      text: "Если рядом есть река, озеро, лес или иная природная территория, нужно подтвердить водоохранные зоны, ограничения по строительству и риски подтопления.",
    });
  }

  if (!greenRows.length && !naturalRows.length) {
    list.push({
      title: "Оценить дефицит зелёного каркаса",
      text: "На карте вокруг базы мало выраженных зелёных зон. Для формата отдыха стоит заранее считать бюджет на озеленение, пылезащиту и теневые посадки.",
    });
  } else {
    list.push({
      title: "Подтвердить качество зелёного окружения на месте",
      text: "Нужно выехать на участок и посмотреть, реальные ли это парки, лесополосы и природные зоны, есть ли шум, мусор, заболачивание или деградация ландшафта.",
    });
  }

  if (aqiSummary.tone === "warn" || aqiSummary.tone === "bad" || aqiSummary.tone === "critical") {
    list.push({
      title: "Сделать локальные замеры воздуха",
      text: `Сейчас индекс воздуха оценивается как "${aqiSummary.label}". Для решения по базе желательно сравнить утро, день, вечер, безветрие и пиковые дни трафика, а не опираться на один часовой снимок.`,
    });
  } else {
    list.push({
      title: "Зафиксировать сезонность воздуха",
      text: "Даже при хорошем текущем фоне нужно проверить зимний период, пыльные дни, отопительный сезон и влияние дорог в выходные.",
    });
  }

  list.push({
    title: "Проверить инженерную экологию базы",
    text: "До покупки участка нужно понять, куда пойдут стоки, как будет организован вывоз отходов, не будет ли запахов, шума оборудования и светового загрязнения для гостей.",
  });

  return list;
}

function poiCards(rows, emptyTitle, emptyText) {
  if (!rows.length) return emptyData(emptyTitle, emptyText);
  return `
    <div class="data-card-grid">
      ${rows.map(({ element, distance }) => `
        <article class="data-card">
          <h3>${escapeHtml(osmName(element))}</h3>
          <p><strong>Тип:</strong> ${escapeHtml(osmKind(element))}</p>
          <p><strong>Расстояние:</strong> ${formatNumber(distance, 2)} км от красной точки</p>
          ${osmDescription(element) ? `<p>${escapeHtml(osmDescription(element))}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function hasAnyTag(element, tagName, values) {
  const value = element.tags?.[tagName];
  return value && values.includes(value);
}

function isServicePoi(element) {
  const tags = element.tags || {};
  const kind = osmKind(element);
  return Boolean(tags.shop) || ["restaurant", "cafe", "fuel", "pharmacy", "clinic", "hospital", "marketplace", "bank", "atm", "parking"].includes(kind);
}

function isCompetitorPoi(element) {
  return hasAnyTag(element, "tourism", ["hotel", "guest_house", "chalet", "camp_site", "picnic_site", "resort"]) ||
    hasAnyTag(element, "leisure", ["resort", "park", "swimming_pool", "water_park", "sports_centre"]);
}

function isNaturalPoi(element) {
  return Boolean(element.tags?.natural) || hasAnyTag(element, "leisure", ["park", "nature_reserve", "water_park"]);
}

function isCulturePoi(element) {
  return Boolean(element.tags?.historic) || hasAnyTag(element, "tourism", ["attraction", "viewpoint", "museum", "theme_park", "zoo"]);
}

function isGreenPoi(element) {
  return Boolean(element.tags?.natural) || hasAnyTag(element, "leisure", ["park", "nature_reserve"]) || hasAnyTag(element, "landuse", ["forest", "grass", "meadow"]);
}

function isEcoRiskPoi(element) {
  return hasAnyTag(element, "landuse", ["industrial", "landfill"]) ||
    hasAnyTag(element, "man_made", ["wastewater_plant", "works"]) ||
    hasAnyTag(element, "amenity", ["waste_disposal", "recycling"]) ||
    Boolean(element.tags?.power);
}

function demandProfile(ctx, route) {
  if (ctx.city?.regionType === "special-city") {
    return {
      scale: "крупная городская база спроса",
      audience: "семьи, компании, гости города, корпоративные группы и короткие поездки на 1 день",
      conclusion: "локацию можно рассматривать как продукт выходного дня, если подъезд и сервисы рядом подтверждаются на месте",
    };
  }
  if (route.road <= 35) {
    return {
      scale: "комфортный пригородный рынок",
      audience: "жители города, семейные выезды, малые компании и сезонные мероприятия",
      conclusion: "главный плюс - близость к городу; важно усилить место понятным досугом и трансфером",
    };
  }
  return {
    scale: "удаленная рекреационная локация",
    audience: "запланированные поездки, группы на выходные, гости с личным автомобилем",
    conclusion: "нужен сильный повод поездки: природа, банный комплекс, видовая зона, мероприятие или уникальный сценарий отдыха",
  };
}

async function fetchOverpass(query, cacheKey) {
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
  });
  if (!response.ok) throw new Error(`Overpass ${response.status}`);
  const payload = await response.json();
  state.liveCache.set(cacheKey, payload.elements || []);
  return payload.elements || [];
}

async function fetchAirQuality(lat, lng) {
  const cacheKey = `air:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
    timezone: "auto",
  });
  const response = await fetch(`${AIR_QUALITY_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`Air quality ${response.status}`);
  const payload = await response.json();
  state.liveCache.set(cacheKey, payload);
  return payload;
}

async function fetchEcologyData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `ecology:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 5000, (a, b, r) => `
    nwr(around:${r},${a},${b})["landuse"~"industrial|landfill|forest|grass|meadow"];
    nwr(around:${r},${a},${b})["man_made"~"wastewater_plant|works"];
    nwr(around:${r},${a},${b})["amenity"~"waste_disposal|recycling"];
    nwr(around:${r},${a},${b})["power"];
    nwr(around:${r},${a},${b})["natural"];
    nwr(around:${r},${a},${b})["leisure"~"park|nature_reserve"];
  `);
  const [airResult, elementsResult] = await Promise.allSettled([
    fetchAirQuality(lat, lng),
    fetchOverpass(query, cacheKey),
  ]);
  const air = airResult.status === "fulfilled" ? airResult.value : null;
  const elements = elementsResult.status === "fulfilled" ? elementsResult.value : [];
  const greenOsm = elements.filter(isGreenPoi);
  const riskOsm = elements.filter(isEcoRiskPoi);

  if (!hasGoogleMapsKey()) {
    return {
      air,
      source: "osm",
      green: greenOsm,
      natural: greenOsm.filter((item) => Boolean(item.tags?.natural)),
      risks: riskOsm,
      elements,
    };
  }

  const [greenGoogle, naturalGoogle, riskGoogle] = await Promise.allSettled([
    fetchGooglePlacesByTypes(lat, lng, 6000, ["park", "campground"]),
    fetchGooglePlacesByTypes(lat, lng, 8000, ["natural_feature"]),
    fetchGooglePlacesByQueries(lat, lng, 8000, [
      "industrial area",
      "factory",
      "landfill",
      "power plant",
      "wastewater treatment plant",
      "quarry",
    ]),
  ]);

  const green = greenGoogle.status === "fulfilled" ? greenGoogle.value : [];
  const natural = naturalGoogle.status === "fulfilled" ? naturalGoogle.value : [];
  const risks = riskGoogle.status === "fulfilled" ? riskGoogle.value : [];
  const source = green.length || natural.length || risks.length ? "google" : "osm";

  return {
    air,
    source,
    green: source === "google" ? green : greenOsm,
    natural: source === "google" ? natural : greenOsm.filter((item) => Boolean(item.tags?.natural)),
    risks: source === "google" ? risks : riskOsm,
    elements,
  };
}

function overpassAround(lat, lng, radius, body) {
  return `[out:json][timeout:25];(${body(lat, lng, radius)});out center 40;`;
}

async function fetchTransportData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `transport:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 900, (a, b, r) => `
    node(around:${r},${a},${b})["highway"="bus_stop"];
    node(around:${r},${a},${b})["public_transport"~"platform|stop_position"];
    relation(around:1800,${a},${b})["route"~"bus|trolleybus|tram"];
  `);
  return fetchOverpass(query, cacheKey);
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const googleMapView = hasGoogleMapsKey()
    ? `
      <div class="map-google-frame">
        <div
          class="google-map-canvas"
          data-city-lat="${cityLat}"
          data-city-lng="${cityLng}"
          data-base-lat="${baseLat}"
          data-base-lng="${baseLng}"
          data-center-lat="${centerLat}"
          data-center-lng="${centerLng}"
          data-zoom="${zoom}"
          data-base-polygon="${polygonJson}"
        ></div>
      </div>
    `
    : `
      <div class="map-external-frame map-external-card">
        <div class="map-external-badge">Карты Google</div>
        <h3>Добавьте API-ключ локально</h3>
        <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
      </div>
    `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">Карта OSM</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
      </div>
      ${provider === "google"
        ? googleMapView
        : `
          <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
            <div class="tile-layer"></div>
            <svg class="map-overlay" aria-hidden="true"></svg>
            <div class="map-interaction-layer" aria-label="Карта участка"></div>
            <span class="map-marker map-marker-city"></span>
            <span class="map-marker map-marker-base"></span>
            <div class="map-controls">
              <button type="button" data-map-zoom="in">+</button>
              <button type="button" data-map-zoom="out">-</button>
            </div>
          </div>
        `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "osm"
          ? "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."
          : "В Google Maps тоже можно перемещать карту, ставить точки контура и сохранять площадь базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Google Maps</a>
      </div>
    </article>
  `;
}

async function hydrateGoogleMap() {
  const canvas = sectionOutput.querySelector(".google-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  try {
    const maps = await loadGoogleMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const baseLat = Number(canvas.dataset.baseLat);
    const baseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 12;

    const map = new maps.Map(canvas, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    const cityMarker = new maps.Marker({
      position: { lat: cityLat, lng: cityLng },
      map,
      title: "Центр города",
    });

    const baseMarker = new maps.Marker({
      position: { lat: baseLat, lng: baseLng },
      map,
      title: "База",
    });

    const polygonShape = new maps.Polygon({
      paths: draftPolygon,
      map,
      strokeColor: "#cf4b32",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#d94135",
      fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0,
    });

    let draftMarkers = [];

    function clearDraftMarkers() {
      draftMarkers.forEach((marker) => marker.setMap(null));
      draftMarkers = [];
    }

    function polygonMatchesSaved() {
      return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
        const savedPoint = savedPolygon[index];
        return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
      });
    }

    function syncButtons() {
      panButton?.classList.toggle("is-active", !drawMode);
      drawButton?.classList.toggle("is-active", drawMode);
      if (saveButton) saveButton.disabled = draftPolygon.length < 3;
      map.setOptions({ draggableCursor: drawMode ? "crosshair" : undefined });
    }

    function updateAreaLabel() {
      const draftArea = polygonAreaSqMeters(draftPolygon);
      const savedArea = polygonAreaSqMeters(savedPolygon);
      const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
      if (areaNode) {
        areaNode.textContent = draftArea > 0
          ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
          : savedArea > 0
            ? formatArea(savedArea)
            : "Пока не рассчитана";
      }
      if (hintNode) {
        hintNode.textContent = drawMode
          ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
          : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
      }
    }

    function repaintPolygon() {
      polygonShape.setPaths(draftPolygon);
      polygonShape.setOptions({ fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0 });
      clearDraftMarkers();
      draftMarkers = draftPolygon.map((point) => new maps.Marker({
        position: point,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#cf4b32",
          strokeWeight: 2,
        },
        clickable: false,
      }));
      const previewCenter = polygonCentroid(draftPolygon);
      if (previewCenter) {
        baseMarker.setPosition(previewCenter);
      } else {
        baseMarker.setPosition({ lat: baseLat, lng: baseLng });
      }
      updateAreaLabel();
      syncButtons();
    }

    map.addListener("click", (event) => {
      if (!drawMode) return;
      draftPolygon = [...draftPolygon, { lat: event.latLng.lat(), lng: event.latLng.lng() }];
      repaintPolygon();
    });

    map.addListener("idle", () => {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter();
      active.mapCenterLat = String(center.lat());
      active.mapCenterLng = String(center.lng());
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    });

    sectionOutput.querySelectorAll("[data-map-zoom]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const delta = button.dataset.mapZoom === "in" ? 1 : -1;
        map.setZoom(Math.max(8, Math.min(17, (map.getZoom() || zoom) + delta)));
      });
    });

    panButton?.addEventListener("click", () => {
      drawMode = false;
      syncButtons();
      updateAreaLabel();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      updateAreaLabel();
    });

    saveButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
        return;
      }
      const centroid = polygonCentroid(draftPolygon);
      active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
        baseMarker.setPosition(centroid);
      }
      const center = map.getCenter();
      active.mapCenterLat = String(center.lat());
      active.mapCenterLng = String(center.lng());
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active) return;
      const hasSaved = basePolygon(active).length >= 3;
      if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();
      repaintPolygon();
      if (hasSaved) renderSection();
    });

    repaintPolygon();
    cityMarker.setMap(map);
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Карта не загрузилась</h3>
        <p>Проверьте <code>dashboard/map-config.js</code>, затем обновите страницу. У ключа должны быть разрешены <code>Maps JavaScript API</code> и домены <code>http://127.0.0.1:8000/*</code> и <code>http://localhost:8000/*</code>.</p>
      </div>
    `;
  }
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const googleMapView = hasGoogleMapsKey()
    ? `
      <div class="map-google-frame">
        <div
          class="google-map-canvas"
          data-city-lat="${cityLat}"
          data-city-lng="${cityLng}"
          data-base-lat="${baseLat}"
          data-base-lng="${baseLng}"
          data-center-lat="${centerLat}"
          data-center-lng="${centerLng}"
          data-zoom="${zoom}"
          data-base-polygon="${polygonJson}"
        ></div>
      </div>
    `
    : `
      <div class="map-external-frame map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Добавьте API-ключ локально</h3>
        <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
      </div>
    `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
      </div>
      ${provider === "google"
        ? googleMapView
        : `
          <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
            <div class="tile-layer"></div>
            <svg class="map-overlay" aria-hidden="true"></svg>
            <div class="map-interaction-layer" aria-label="Карта участка"></div>
            <span class="map-marker map-marker-city"></span>
            <span class="map-marker map-marker-base"></span>
            <div class="map-controls">
              <button type="button" data-map-zoom="in">+</button>
              <button type="button" data-map-zoom="out">-</button>
            </div>
          </div>
        `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "osm"
          ? "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."
          : "В Google Maps тоже можно перемещать карту, ставить точки контура, очищать их и сохранять площадь базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Google Maps</a>
      </div>
    </article>
  `;
}

function directionsRouteRequest(service, request) {
  return new Promise((resolve, reject) => {
    service.route(request, (result, status) => {
      const ok = window.google?.maps?.DirectionsStatus?.OK;
      if (status === ok) {
        resolve(result);
        return;
      }
      reject(new Error(`directions-${status || "unknown"}`));
    });
  });
}

async function fetchGoogleTransitStops(lat, lng) {
  const cacheKey = `google-transit-stops:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);

  const maps = await loadGoogleMapsApi();
  const service = new maps.places.PlacesService(document.createElement("div"));
  const baseRequest = { location: new maps.LatLng(lat, lng), radius: 5000 };
  const requests = [
    nearbySearchRequest(service, { ...baseRequest, type: "transit_station" }),
    nearbySearchRequest(service, { ...baseRequest, type: "bus_station" }),
    nearbySearchRequest(service, { ...baseRequest, keyword: "bus stop" }),
    nearbySearchRequest(service, { ...baseRequest, keyword: "остановка" }),
  ];
  const settled = await Promise.allSettled(requests);
  const stops = dedupePlaces(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
  state.liveCache.set(cacheKey, stops);
  return stops;
}

async function fetchTransportData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `transport-osm:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 900, (a, b, r) => `
    node(around:${r},${a},${b})["highway"="bus_stop"];
    node(around:${r},${a},${b})["public_transport"~"platform|stop_position"];
    relation(around:1800,${a},${b})["route"~"bus|trolleybus|tram"];
  `);

  const [osmResult, googleStopsResult] = await Promise.allSettled([
    fetchOverpass(query, cacheKey),
    hasGoogleMapsKey() ? fetchGoogleTransitStops(lat, lng) : Promise.resolve([]),
  ]);

  return {
    osm: osmResult.status === "fulfilled" ? osmResult.value : [],
    googleStops: googleStopsResult.status === "fulfilled" ? googleStopsResult.value : [],
  };
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const removedMapBaseUrl = removedMapOpenUrl(baseLat, baseLng, zoom);

  let mapBody = "";
  if (provider === "google") {
    mapBody = hasGoogleMapsKey()
      ? `<div class="map-google-frame"><div class="google-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">Google Maps</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p></div>`;
  } else if (provider === "removedMap") {
    mapBody = hasRemovedMapMapsKey()
      ? `<div class="map-google-frame"><div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">RemovedMap Maps</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p></div>`;
  } else {
    mapBody = `<div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}"><div class="tile-layer"></div><svg class="map-overlay" aria-hidden="true"></svg><div class="map-interaction-layer" aria-label="Карта участка"></div><span class="map-marker map-marker-city"></span><span class="map-marker map-marker-base"></span><div class="map-controls"><button type="button" data-map-zoom="in">+</button><button type="button" data-map-zoom="out">-</button></div></div>`;
  }

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap Maps</button>
      </div>
      ${mapBody}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Google Maps можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap Maps можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap Maps" : "Google Maps"}</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  if (sectionOutput.querySelector(".removedMap-map-canvas")) {
    hydrateRemovedMapMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const removedMapBaseUrl = removedMapOpenUrl(baseLat, baseLng, zoom);

  let body = "";
  if (provider === "google") {
    body = hasGoogleMapsKey()
      ? `<div class="map-google-frame"><div class="google-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">Google Maps</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p></div>`;
  } else if (provider === "removedMap") {
    body = hasRemovedMapMapsKey()
      ? `<div class="map-google-frame"><div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">RemovedMap Maps</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p></div>`;
  } else {
    body = `<div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}"><div class="tile-layer"></div><svg class="map-overlay" aria-hidden="true"></svg><div class="map-interaction-layer" aria-label="Карта участка"></div><span class="map-marker map-marker-city"></span><span class="map-marker map-marker-base"></span><div class="map-controls"><button type="button" data-map-zoom="in">+</button><button type="button" data-map-zoom="out">-</button></div></div>`;
  }

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap Maps</button>
      </div>
      ${body}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Google Maps можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap Maps можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap Maps" : "Google Maps"}</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  if (sectionOutput.querySelector(".removedMap-map-canvas")) {
    hydrateRemovedMapMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const removedMapBaseUrl = removedMapOpenUrl(baseLat, baseLng, zoom);

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap Maps</button>
      </div>
      ${provider === "google"
        ? hasGoogleMapsKey()
          ? `
            <div class="map-google-frame">
              <div class="google-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div>
            </div>
          `
          : `
            <div class="map-external-frame map-external-card">
              <div class="map-external-badge">Google Maps</div>
              <h3>Добавьте API-ключ локально</h3>
              <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
            </div>
          `
        : provider === "removedMap"
          ? hasRemovedMapMapsKey()
            ? `
              <div class="map-google-frame">
                <div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div>
              </div>
            `
            : `
              <div class="map-external-frame map-external-card">
                <div class="map-external-badge">RemovedMap Maps</div>
                <h3>Добавьте API-ключ локально</h3>
                <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p>
              </div>
            `
          : `
            <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
              <div class="tile-layer"></div>
              <svg class="map-overlay" aria-hidden="true"></svg>
              <div class="map-interaction-layer" aria-label="Карта участка"></div>
              <span class="map-marker map-marker-city"></span>
              <span class="map-marker map-marker-base"></span>
              <div class="map-controls">
                <button type="button" data-map-zoom="in">+</button>
                <button type="button" data-map-zoom="out">-</button>
              </div>
            </div>
          `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Google Maps можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap Maps можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap Maps" : "Google Maps"}</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  if (sectionOutput.querySelector(".removedMap-map-canvas")) {
    hydrateRemovedMapMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const removedMapBaseUrl = removedMapOpenUrl(baseLat, baseLng, zoom);

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap Maps</button>
      </div>
      ${provider === "google"
        ? hasGoogleMapsKey()
          ? `
            <div class="map-google-frame">
              <div class="google-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div>
            </div>
          `
          : `
            <div class="map-external-frame map-external-card">
              <div class="map-external-badge">Google Maps</div>
              <h3>Добавьте API-ключ локально</h3>
              <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
            </div>
          `
        : provider === "removedMap"
          ? hasRemovedMapMapsKey()
            ? `
              <div class="map-google-frame">
                <div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div>
              </div>
            `
            : `
              <div class="map-external-frame map-external-card">
                <div class="map-external-badge">RemovedMap Maps</div>
                <h3>Добавьте API-ключ локально</h3>
                <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p>
              </div>
            `
          : `
            <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
              <div class="tile-layer"></div>
              <svg class="map-overlay" aria-hidden="true"></svg>
              <div class="map-interaction-layer" aria-label="Карта участка"></div>
              <span class="map-marker map-marker-city"></span>
              <span class="map-marker map-marker-base"></span>
              <div class="map-controls">
                <button type="button" data-map-zoom="in">+</button>
                <button type="button" data-map-zoom="out">-</button>
              </div>
            </div>
          `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Google Maps можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap Maps можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap Maps" : "Google Maps"}</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  if (sectionOutput.querySelector(".removedMap-map-canvas")) {
    hydrateRemovedMapMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function removedMapMapsApiKey() {
  return String(window.TKP_MAPS_CONFIG?.removedMapMapsApiKey || "").trim();
}

function hasRemovedMapMapsKey() {
  return Boolean(removedMapMapsApiKey());
}

function loadRemovedMapMapsApi() {
  if (window.removedMaps?.Map) {
    return Promise.resolve(window.removedMaps);
  }
  if (window.__omartaRemovedMapPromise) {
    return window.__omartaRemovedMapPromise;
  }

  const key = removedMapMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("missing-removedMap-maps-key"));
  }

  window.__omartaRemovedMapPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.removedMap.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onerror = () => {
      window.__omartaRemovedMapPromise = null;
      reject(new Error("removedMap-maps-load-failed"));
    };
    script.onload = () => {
      if (!window.removedMaps?.ready) {
        window.__omartaRemovedMapPromise = null;
        reject(new Error("removedMap-maps-ready-missing"));
        return;
      }
      window.removedMaps.ready(() => resolve(window.removedMaps));
    };
    document.head.appendChild(script);
  });

  return window.__omartaRemovedMapPromise;
}

function removedMapOpenUrl(lat, lng, zoom) {
  return `https://removedMap.ru/maps/?ll=${lng}%2C${lat}&z=${zoom}`;
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

async function hydrateRemovedMapMap() {
  const canvas = sectionOutput.querySelector(".removedMap-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => [point.lat, point.lng]);
  let drawMode = false;

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  try {
    const removedMaps = await loadRemovedMapMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const originalBaseLat = Number(canvas.dataset.baseLat);
    const originalBaseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 10;

    let activeBaseLat = originalBaseLat;
    let activeBaseLng = originalBaseLng;
    let drawMarkers = [];

    const map = new removedMaps.Map(canvas, {
      center: [centerLat, centerLng],
      zoom,
      controls: ["zoomControl", "typeSelector", "fullscreenControl"],
    });

    const cityPlacemark = new removedMaps.Placemark([cityLat, cityLng], {
      balloonContent: "Центр региона",
    }, {
      preset: "islands#blueCircleDotIcon",
    });

    const basePlacemark = new removedMaps.Placemark([activeBaseLat, activeBaseLng], {
      balloonContent: "База",
    }, {
      preset: "islands#redCircleDotIcon",
    });

    const polygon = new removedMaps.Polygon(draftPolygon.length >= 3 ? [draftPolygon] : [[]], {}, {
      fillColor: "rgba(217, 65, 53, 0.18)",
      strokeColor: "#cf4b32",
      strokeWidth: 3,
    });

    map.geoObjects.add(cityPlacemark);
    map.geoObjects.add(basePlacemark);
    map.geoObjects.add(polygon);

    function clearDrawMarkers() {
      drawMarkers.forEach((marker) => map.geoObjects.remove(marker));
      drawMarkers = [];
    }

    function polygonPointsObjects() {
      return draftPolygon.map(([lat, lng]) => ({ lat, lng }));
    }

    function syncButtons() {
      panButton?.classList.toggle("is-active", !drawMode);
      drawButton?.classList.toggle("is-active", drawMode);
      if (saveButton) saveButton.disabled = draftPolygon.length < 3;
    }

    function updateAreaLabel() {
      const points = polygonPointsObjects();
      const area = polygonAreaSqMeters(points);
      if (areaNode) {
        areaNode.textContent = area > 0 ? formatArea(area) : "Пока не рассчитана";
      }
      if (hintNode) {
        hintNode.textContent = drawMode
          ? "Режим границ включен: кликайте по карте 2ГИС, чтобы добавить точки контура базы."
          : "2ГИС подключен. Здесь можно перемещать карту и редактировать контур базы.";
      }
    }

    function repaint() {
      polygon.geometry.setCoordinates(draftPolygon.length >= 3 ? [draftPolygon] : [[]]);
      clearDrawMarkers();
      drawMarkers = draftPolygon.map((point) => {
        const marker = new removedMaps.Placemark(point, {}, {
          preset: "islands#whiteCircleDotIcon",
          iconColor: "#cf4b32",
        });
        map.geoObjects.add(marker);
        return marker;
      });
      const centroid = polygonCentroid(polygonPointsObjects());
      if (centroid) {
        activeBaseLat = centroid.lat;
        activeBaseLng = centroid.lng;
        basePlacemark.geometry.setCoordinates([centroid.lat, centroid.lng]);
      } else {
        activeBaseLat = originalBaseLat;
        activeBaseLng = originalBaseLng;
        basePlacemark.geometry.setCoordinates([activeBaseLat, activeBaseLng]);
      }
      syncButtons();
      updateAreaLabel();
    }

    map.events.add("boundschange", () => {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter();
      active.mapCenterLat = String(center[0]);
      active.mapCenterLng = String(center[1]);
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    });

    map.events.add("click", (event) => {
      if (!drawMode) return;
      const coords = event.get("coords");
      draftPolygon = [...draftPolygon, coords];
      repaint();
    });

    panButton?.addEventListener("click", () => {
      drawMode = false;
      syncButtons();
      updateAreaLabel();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      updateAreaLabel();
    });

    saveButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
        return;
      }
      const points = polygonPointsObjects();
      const centroid = polygonCentroid(points);
      active.basePolygon = points;
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
      }
      const center = map.getCenter();
      active.mapCenterLat = String(center[0]);
      active.mapCenterLng = String(center[1]);
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active) return;
      const hasSaved = basePolygon(active).length >= 3;
      if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();
      repaint();
      if (hasSaved) renderSection();
    });

    repaint();
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">RemovedMap Maps</div>
        <h3>Карта не загрузилась</h3>
        <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>, затем обновите страницу через <code>http://localhost:8000/</code>.</p>
      </div>
    `;
  }
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const removedMapBaseUrl = removedMapOpenUrl(baseLat, baseLng, zoom);

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap Maps</button>
      </div>
      ${provider === "google"
        ? hasGoogleMapsKey()
          ? `
            <div class="map-google-frame">
              <div
                class="google-map-canvas"
                data-city-lat="${cityLat}"
                data-city-lng="${cityLng}"
                data-base-lat="${baseLat}"
                data-base-lng="${baseLng}"
                data-center-lat="${centerLat}"
                data-center-lng="${centerLng}"
                data-zoom="${zoom}"
                data-base-polygon="${polygonJson}"
              ></div>
            </div>
          `
          : `
            <div class="map-external-frame map-external-card">
              <div class="map-external-badge">Google Maps</div>
              <h3>Добавьте API-ключ локально</h3>
              <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
            </div>
          `
        : provider === "removedMap"
          ? hasRemovedMapMapsKey()
            ? `
              <div class="map-google-frame">
                <div
                  class="removedMap-map-canvas"
                  data-city-lat="${cityLat}"
                  data-city-lng="${cityLng}"
                  data-base-lat="${baseLat}"
                  data-base-lng="${baseLng}"
                  data-center-lat="${centerLat}"
                  data-center-lng="${centerLng}"
                  data-zoom="${zoom}"
                  data-base-polygon="${polygonJson}"
                ></div>
              </div>
            `
            : `
              <div class="map-external-frame map-external-card">
                <div class="map-external-badge">RemovedMap Maps</div>
                <h3>Добавьте API-ключ локально</h3>
                <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p>
              </div>
            `
          : `
            <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
              <div class="tile-layer"></div>
              <svg class="map-overlay" aria-hidden="true"></svg>
              <div class="map-interaction-layer" aria-label="Карта участка"></div>
              <span class="map-marker map-marker-city"></span>
              <span class="map-marker map-marker-base"></span>
              <div class="map-controls">
                <button type="button" data-map-zoom="in">+</button>
                <button type="button" data-map-zoom="out">-</button>
              </div>
            </div>
          `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Google Maps можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap Maps можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap Maps" : "Google Maps"}</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  if (sectionOutput.querySelector(".removedMap-map-canvas")) {
    hydrateRemovedMapMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function decodeGooglePolyline(encoded) {
  if (!encoded) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

function googleLatLngValue(value) {
  if (!value) return null;
  const lat = Number(value.lat?.() ?? value.lat);
  const lng = Number(value.lng?.() ?? value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function uniqueStopsByCoord(stops) {
  const seen = new Set();
  return stops.filter((stop) => {
    const key = `${Number(stop.lat).toFixed(5)}:${Number(stop.lng).toFixed(5)}:${stop.title || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTransitStopsFromDirections(result) {
  const route = result?.routes?.[0];
  const leg = route?.legs?.[0];
  const steps = leg?.steps || [];
  const stops = [];

  for (const step of steps) {
    const transit = step.transit;
    if (!transit) continue;

    const departure = googleLatLngValue(transit.departure_stop?.location);
    if (departure) {
      stops.push({
        lat: departure.lat,
        lng: departure.lng,
        title: displayName(transit.departure_stop?.name, "Остановка посадки"),
        line: displayName(transit.line?.short_name || transit.line?.name || ""),
      });
    }

    const arrival = googleLatLngValue(transit.arrival_stop?.location);
    if (arrival) {
      stops.push({
        lat: arrival.lat,
        lng: arrival.lng,
        title: displayName(transit.arrival_stop?.name, "Остановка высадки"),
        line: displayName(transit.line?.short_name || transit.line?.name || ""),
      });
    }
  }

  return uniqueStopsByCoord(stops);
}

function routePolylinePoints(result) {
  const encoded = result?.routes?.[0]?.overview_polyline;
  if (!encoded) return [];
  if (typeof encoded === "string") return decodeGooglePolyline(encoded);
  if (typeof encoded.points === "string") return decodeGooglePolyline(encoded.points);
  return [];
}

async function fetchStopsAroundPath(pathPoints, radiusMeters = 8000) {
  if (!pathPoints.length || !hasGoogleMapsKey()) return [];
  const stride = Math.max(1, Math.ceil(pathPoints.length / 8));
  const samples = pathPoints.filter((_, index) => index % stride === 0).slice(0, 8);
  const settled = await Promise.allSettled(
    samples.map((point) => fetchGoogleTransitStops(point.lat, point.lng)),
  );
  return dedupePlaces(
    settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
}

async function hydrateGoogleMap() {
  const canvas = sectionOutput.querySelector(".google-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  try {
    const maps = await loadGoogleMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const originalBaseLat = Number(canvas.dataset.baseLat);
    const originalBaseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 10;

    let activeBaseLat = originalBaseLat;
    let activeBaseLng = originalBaseLng;

    const map = new maps.Map(canvas, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    const transitLayer = new maps.TransitLayer();
    if (state.activeSectionId === "transport") {
      transitLayer.setMap(map);
    }

    const cityMarker = new maps.Marker({
      position: { lat: cityLat, lng: cityLng },
      map,
      title: "Центр региона",
    });

    const baseMarker = new maps.Marker({
      position: { lat: activeBaseLat, lng: activeBaseLng },
      map,
      title: "База",
    });

    const polygonShape = new maps.Polygon({
      paths: draftPolygon,
      map,
      strokeColor: "#cf4b32",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#d94135",
      fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0,
    });

    const transitRenderer = new maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#158f78",
        strokeOpacity: 0.95,
        strokeWeight: 6,
      },
    });

    const drivingRenderer = new maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#2f5bea",
        strokeOpacity: 0.7,
        strokeWeight: 4,
      },
    });

    const directionsService = new maps.DirectionsService();
    let draftMarkers = [];
    let transportMarkers = [];

    function clearDraftMarkers() {
      draftMarkers.forEach((marker) => marker.setMap(null));
      draftMarkers = [];
    }

    function clearTransportMarkers() {
      transportMarkers.forEach((marker) => marker.setMap(null));
      transportMarkers = [];
    }

    function polygonMatchesSaved() {
      return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
        const savedPoint = savedPolygon[index];
        return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
      });
    }

    function persistMapView() {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter();
      active.mapCenterLat = String(center?.lat() ?? centerLat);
      active.mapCenterLng = String(center?.lng() ?? centerLng);
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    }

    function syncButtons() {
      panButton?.classList.toggle("is-active", !drawMode);
      drawButton?.classList.toggle("is-active", drawMode);
      if (saveButton) saveButton.disabled = draftPolygon.length < 3;
      map.setOptions({ draggableCursor: drawMode ? "crosshair" : undefined });
    }

    function updateAreaLabel() {
      const draftArea = polygonAreaSqMeters(draftPolygon);
      const savedArea = polygonAreaSqMeters(savedPolygon);
      const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
      if (areaNode) {
        areaNode.textContent = draftArea > 0
          ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
          : savedArea > 0
            ? formatArea(savedArea)
            : "Пока не рассчитана";
      }
      if (hintNode) {
        hintNode.textContent = state.activeSectionId === "transport"
          ? "На карте показаны линии общественного транспорта и автомобиля от центра региона до базы. Зелёные точки — найденные остановки по пути и рядом с базой."
          : drawMode
            ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
            : "Используйте карту для перемещения и при необходимости переключайтесь в режим разметки границ базы.";
      }
    }

    function repaintPolygon() {
      polygonShape.setPaths(draftPolygon);
      polygonShape.setOptions({ fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0 });
      clearDraftMarkers();
      draftMarkers = draftPolygon.map((point) => new maps.Marker({
        position: point,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#cf4b32",
          strokeWeight: 2,
        },
        clickable: false,
      }));

      const previewCenter = polygonCentroid(draftPolygon);
      if (previewCenter) {
        activeBaseLat = previewCenter.lat;
        activeBaseLng = previewCenter.lng;
      } else {
        activeBaseLat = originalBaseLat;
        activeBaseLng = originalBaseLng;
      }
      baseMarker.setPosition({ lat: activeBaseLat, lng: activeBaseLng });
      updateAreaLabel();
      syncButtons();
    }

    async function renderTransportOverlay() {
      clearTransportMarkers();
      transitRenderer.set("directions", null);
      drivingRenderer.set("directions", null);
      if (state.activeSectionId !== "transport") return;

      const origin = { lat: cityLat, lng: cityLng };
      const destination = { lat: activeBaseLat, lng: activeBaseLng };

      let transitResult = null;
      let drivingResult = null;
      let transitStatus = "не запрошен";
      let drivingStatus = "не запрошен";

      try {
        transitResult = await directionsRouteRequest(directionsService, {
          origin,
          destination,
          travelMode: maps.TravelMode.TRANSIT,
          provideRouteAlternatives: true,
        });
        transitRenderer.setDirections(transitResult);
        transitStatus = "маршрут общественного транспорта найден";
      } catch (error) {
        transitStatus = error?.message || "transit недоступен";
        console.warn("Transit route error:", error);
      }

      try {
        drivingResult = await directionsRouteRequest(directionsService, {
          origin,
          destination,
          travelMode: maps.TravelMode.DRIVING,
        });
        drivingRenderer.setDirections(drivingResult);
        drivingStatus = "автомобильный маршрут найден";
      } catch (error) {
        drivingStatus = error?.message || "маршрут для машины недоступен";
        console.warn("Driving route error:", error);
      }

      if (hintNode) {
        hintNode.textContent = [
          "Транспортный слой Google активен.",
          `Общественный транспорт: ${transitStatus}.`,
          `Автомобиль: ${drivingStatus}.`,
        ].join(" ");
      }

      try {
        const baseStops = await fetchTransportData(projectContext());
        const alongRouteStops = transitResult
          ? await fetchStopsAroundPath(routePolylinePoints(transitResult))
          : [];
        const transitStepStops = transitResult ? collectTransitStopsFromDirections(transitResult) : [];
        const googleRows = placeRows(
          dedupePlaces([...(baseStops.googleStops || []), ...alongRouteStops]),
          activeBaseLat,
          activeBaseLng,
          40,
        );
        const googleMarkers = googleRows.map(({ place }) => {
          const point = googleLatLngValue(place.geometry?.location);
          return point ? {
            lat: point.lat,
            lng: point.lng,
            title: displayName(place.name, "Остановка"),
            iconColor: "#1f8a83",
          } : null;
        }).filter(Boolean);

        const allStops = uniqueStopsByCoord([
          ...transitStepStops.map((stop) => ({
            lat: stop.lat,
            lng: stop.lng,
            title: stop.line ? `${stop.title} (${stop.line})` : stop.title,
            iconColor: "#0f6d5b",
          })),
          ...googleMarkers,
        ]);

        transportMarkers = allStops.map((stop) => new maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: stop.title,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: stop.iconColor || "#1f8a83",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        }));
      } catch (error) {
        console.warn("Stops overlay error:", error);
      }
    }

    map.addListener("click", (event) => {
      if (!drawMode) return;
      draftPolygon = [...draftPolygon, { lat: event.latLng.lat(), lng: event.latLng.lng() }];
      repaintPolygon();
    });

    map.addListener("idle", () => {
      persistMapView();
    });

    panButton?.addEventListener("click", () => {
      drawMode = false;
      syncButtons();
      updateAreaLabel();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      updateAreaLabel();
    });

    saveButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
        return;
      }

      const centroid = polygonCentroid(draftPolygon);
      active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
        activeBaseLat = centroid.lat;
        activeBaseLng = centroid.lng;
        baseMarker.setPosition(centroid);
      }
      persistMapView();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", async () => {
      const active = currentProject();
      if (!active) return;
      const hasSaved = basePolygon(active).length >= 3;
      if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;

      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();

      activeBaseLat = originalBaseLat;
      activeBaseLng = originalBaseLng;
      baseMarker.setPosition({ lat: activeBaseLat, lng: activeBaseLng });
      repaintPolygon();
      await renderTransportOverlay();
      if (hasSaved) renderSection();
    });

    repaintPolygon();
    cityMarker.setMap(map);
    await renderTransportOverlay();
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Карта не загрузилась</h3>
        <p>Проверьте <code>dashboard/map-config.js</code> и убедитесь, что у ключа разрешены <code>Maps JavaScript API</code>, <code>Places API</code> и <code>Directions API (Legacy)</code>.</p>
      </div>
    `;
  }
}

async function fetchTransportData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `transport-osm:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 900, (a, b, r) => `
    node(around:${r},${a},${b})["highway"="bus_stop"];
    node(around:${r},${a},${b})["public_transport"~"platform|stop_position"];
    relation(around:1800,${a},${b})["route"~"bus|trolleybus|tram"];
  `);

  const [osmResult, googleStopsResult] = await Promise.allSettled([
    fetchOverpass(query, cacheKey),
    hasGoogleMapsKey() ? fetchGoogleTransitStops(lat, lng) : Promise.resolve([]),
  ]);

  return {
    osm: osmResult.status === "fulfilled" ? osmResult.value : [],
    googleStops: googleStopsResult.status === "fulfilled" ? googleStopsResult.value : [],
  };
}

async function hydrateGoogleMap() {
  const canvas = sectionOutput.querySelector(".google-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  try {
    const maps = await loadGoogleMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const originalBaseLat = Number(canvas.dataset.baseLat);
    const originalBaseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 12;

    let activeBaseLat = originalBaseLat;
    let activeBaseLng = originalBaseLng;

    const map = new maps.Map(canvas, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    const cityMarker = new maps.Marker({
      position: { lat: cityLat, lng: cityLng },
      map,
      title: "Центр города",
    });

    const baseMarker = new maps.Marker({
      position: { lat: activeBaseLat, lng: activeBaseLng },
      map,
      title: "База",
    });

    const polygonShape = new maps.Polygon({
      paths: draftPolygon,
      map,
      strokeColor: "#cf4b32",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#d94135",
      fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0,
    });

    const directionsService = new maps.DirectionsService();
    const directionsRenderer = new maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#1f8a83",
        strokeOpacity: 0.92,
        strokeWeight: 5,
      },
    });

    let draftMarkers = [];
    let transportMarkers = [];

    function clearDraftMarkers() {
      draftMarkers.forEach((marker) => marker.setMap(null));
      draftMarkers = [];
    }

    function clearTransportMarkers() {
      transportMarkers.forEach((marker) => marker.setMap(null));
      transportMarkers = [];
    }

    function polygonMatchesSaved() {
      return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
        const savedPoint = savedPolygon[index];
        return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
      });
    }

    function persistMapView() {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter();
      active.mapCenterLat = String(center?.lat() ?? centerLat);
      active.mapCenterLng = String(center?.lng() ?? centerLng);
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    }

    function syncButtons() {
      panButton?.classList.toggle("is-active", !drawMode);
      drawButton?.classList.toggle("is-active", drawMode);
      if (saveButton) saveButton.disabled = draftPolygon.length < 3;
      map.setOptions({ draggableCursor: drawMode ? "crosshair" : undefined });
    }

    function updateAreaLabel() {
      const draftArea = polygonAreaSqMeters(draftPolygon);
      const savedArea = polygonAreaSqMeters(savedPolygon);
      const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
      if (areaNode) {
        areaNode.textContent = draftArea > 0
          ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
          : savedArea > 0
            ? formatArea(savedArea)
            : "Пока не рассчитана";
      }
      if (hintNode) {
        hintNode.textContent = state.activeSectionId === "transport"
          ? "На карте показываются маршрут от центра до базы и ближайшие остановки. В режиме границ можно редактировать контур базы."
          : drawMode
            ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
            : "Используйте карту для перемещения и при необходимости переключайтесь в режим разметки границ базы.";
      }
    }

    function repaintPolygon() {
      polygonShape.setPaths(draftPolygon);
      polygonShape.setOptions({ fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0 });
      clearDraftMarkers();
      draftMarkers = draftPolygon.map((point) => new maps.Marker({
        position: point,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#cf4b32",
          strokeWeight: 2,
        },
        clickable: false,
      }));

      const previewCenter = polygonCentroid(draftPolygon);
      if (previewCenter) {
        activeBaseLat = previewCenter.lat;
        activeBaseLng = previewCenter.lng;
      } else {
        activeBaseLat = originalBaseLat;
        activeBaseLng = originalBaseLng;
      }
      baseMarker.setPosition({ lat: activeBaseLat, lng: activeBaseLng });
      updateAreaLabel();
      syncButtons();
    }

    async function renderTransportOverlay() {
      clearTransportMarkers();
      directionsRenderer.set("directions", null);
      if (state.activeSectionId !== "transport") return;

      const origin = { lat: cityLat, lng: cityLng };
      const destination = { lat: activeBaseLat, lng: activeBaseLng };

      try {
        const transitResult = await directionsRouteRequest(directionsService, {
          origin,
          destination,
          travelMode: maps.TravelMode.TRANSIT,
          provideRouteAlternatives: true,
        });
        directionsRenderer.setDirections(transitResult);
      } catch {
        try {
          const drivingResult = await directionsRouteRequest(directionsService, {
            origin,
            destination,
            travelMode: maps.TravelMode.DRIVING,
          });
          directionsRenderer.setDirections(drivingResult);
        } catch {}
      }

      try {
        const transportData = await fetchTransportData(projectContext());
        const googleRows = placeRows(transportData.googleStops || [], activeBaseLat, activeBaseLng, 10);
        const osmStopRows = osmRows((transportData.osm || []).filter((item) => item.type !== "relation"), activeBaseLat, activeBaseLng, 10);
        const stopRows = googleRows.length
          ? googleRows.map(({ place }) => {
              const placeLat = Number(place.geometry?.location?.lat?.() ?? place.geometry?.location?.lat);
              const placeLng = Number(place.geometry?.location?.lng?.() ?? place.geometry?.location?.lng);
              return Number.isFinite(placeLat) && Number.isFinite(placeLng)
                ? { lat: placeLat, lng: placeLng, title: displayName(place.name, "Остановка") }
                : null;
            }).filter(Boolean)
          : osmStopRows.map(({ element }) => {
              const coord = elementCoord(element);
              return coord ? { lat: coord[0], lng: coord[1], title: osmName(element) } : null;
            }).filter(Boolean);

        transportMarkers = stopRows.map((stop) => new maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: stop.title,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#1f8a83",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        }));
      } catch {}
    }

    map.addListener("click", (event) => {
      if (!drawMode) return;
      draftPolygon = [...draftPolygon, { lat: event.latLng.lat(), lng: event.latLng.lng() }];
      repaintPolygon();
    });

    map.addListener("idle", () => {
      persistMapView();
    });

    panButton?.addEventListener("click", () => {
      drawMode = false;
      syncButtons();
      updateAreaLabel();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      updateAreaLabel();
    });

    saveButton?.addEventListener("click", async () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
        return;
      }

      const centroid = polygonCentroid(draftPolygon);
      active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
        activeBaseLat = centroid.lat;
        activeBaseLng = centroid.lng;
        baseMarker.setPosition(centroid);
      }

      persistMapView();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", async () => {
      const active = currentProject();
      if (!active) return;
      const hasSaved = basePolygon(active).length >= 3;
      if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;

      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();

      activeBaseLat = originalBaseLat;
      activeBaseLng = originalBaseLng;
      baseMarker.setPosition({ lat: activeBaseLat, lng: activeBaseLng });
      repaintPolygon();
      await renderTransportOverlay();
      if (hasSaved) renderSection();
    });

    repaintPolygon();
    cityMarker.setMap(map);
    await renderTransportOverlay();
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Карта не загрузилась</h3>
        <p>Проверьте <code>dashboard/map-config.js</code> и убедитесь, что у ключа разрешены <code>Maps JavaScript API</code>, <code>Places API</code> и <code>Routes API</code>.</p>
      </div>
    `;
  }
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

async function fetchInfrastructureData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `infra:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 3000, (a, b, r) => `
    nwr(around:${r},${a},${b})["shop"];
    nwr(around:${r},${a},${b})["amenity"~"restaurant|cafe|fuel|pharmacy|clinic|hospital|marketplace|bank|atm|parking"];
    nwr(around:7000,${a},${b})["tourism"~"hotel|guest_house|chalet|camp_site|picnic_site|resort"];
    nwr(around:7000,${a},${b})["leisure"~"resort|park|swimming_pool|water_park|sports_centre"];
  `);
  return fetchOverpass(query, cacheKey);
}

async function fetchAttractionsData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `attractions:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 15000, (a, b, r) => `
    nwr(around:${r},${a},${b})["tourism"~"attraction|viewpoint|museum|theme_park|zoo|picnic_site"];
    nwr(around:${r},${a},${b})["historic"];
    nwr(around:${r},${a},${b})["natural"~"water|wood|peak|beach|spring"];
    nwr(around:${r},${a},${b})["leisure"~"park|nature_reserve|water_park"];
  `);
  return fetchOverpass(query, cacheKey);
}

function lonLatToWorld(lat, lng, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldToLonLat(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lat, lng];
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  return `
    <article class="map-panel">
      <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-zoom="${zoom}">
        <div class="tile-layer"></div>
        <button class="map-click-layer" type="button" aria-label="Отметить точку базы на карте"></button>
        <span class="map-marker map-marker-city"></span>
        <span class="map-marker map-marker-base"></span>
        <div class="map-controls">
          <button type="button" data-map-zoom="in">+</button>
          <button type="button" data-map-zoom="out">-</button>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>центр города <i class="legend-dot base"></i>база</strong>
        <span>кликните по карте, чтобы переставить красную метку</span>
      </div>
    </article>
  `;
}

function renderTileMap(frame) {
  const tileLayer = frame.querySelector(".tile-layer");
  const cityMarker = frame.querySelector(".map-marker-city");
  const baseMarker = frame.querySelector(".map-marker-base");
  const width = frame.clientWidth || 640;
  const height = frame.clientHeight || 320;
  const zoom = Number(frame.dataset.zoom) || 12;
  const cityLat = Number(frame.dataset.cityLat);
  const cityLng = Number(frame.dataset.cityLng);
  const baseLat = Number(frame.dataset.baseLat);
  const baseLng = Number(frame.dataset.baseLng);
  const center = lonLatToWorld(cityLat, cityLng, zoom);
  const base = lonLatToWorld(baseLat, baseLng, zoom);

  tileLayer.innerHTML = "";
  const startX = Math.floor((center.x - width / 2) / TILE_SIZE);
  const endX = Math.floor((center.x + width / 2) / TILE_SIZE);
  const startY = Math.floor((center.y - height / 2) / TILE_SIZE);
  const endY = Math.floor((center.y + height / 2) / TILE_SIZE);
  const tileMax = 2 ** zoom;

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= tileMax) continue;
      const wrappedX = ((x % tileMax) + tileMax) % tileMax;
      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;
      img.src = `${OSM_TILE_URL}/${zoom}/${wrappedX}/${y}.png`;
      img.style.left = `${x * TILE_SIZE - center.x + width / 2}px`;
      img.style.top = `${y * TILE_SIZE - center.y + height / 2}px`;
      tileLayer.appendChild(img);
    }
  }

  cityMarker.style.left = "50%";
  cityMarker.style.top = "50%";
  baseMarker.style.left = `${base.x - center.x + width / 2}px`;
  baseMarker.style.top = `${base.y - center.y + height / 2}px`;
}

function hydrateMapPicker() {
  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-click-layer");
  if (!frame || !layer) return;
  renderTileMap(frame);
  layer.addEventListener("click", (event) => {
    const project = currentProject();
    if (!project) return;
    const rect = frame.getBoundingClientRect();
    const zoom = Number(frame.dataset.zoom) || 12;
    const cityLat = Number(frame.dataset.cityLat);
    const cityLng = Number(frame.dataset.cityLng);
    const center = lonLatToWorld(cityLat, cityLng, zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, zoom);
    project.lat = String(lat);
    project.lng = String(lng);
    project.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const project = currentProject();
      if (!project) return;
      const direction = button.dataset.mapZoom;
      const currentZoom = Number(project.mapZoom) || Number(frame.dataset.zoom) || 12;
      project.mapZoom = String(Math.max(8, Math.min(16, currentZoom + (direction === "in" ? 1 : -1))));
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  return `
    <article class="map-panel">
      <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
        <div class="tile-layer"></div>
        <svg class="map-overlay" aria-hidden="true"></svg>
        <div class="map-interaction-layer" aria-label="Карта участка"></div>
        <span class="map-marker map-marker-city"></span>
        <span class="map-marker map-marker-base"></span>
        <div class="map-controls">
          <button type="button" data-map-zoom="in">+</button>
          <button type="button" data-map-zoom="out">-</button>
        </div>
      </div>
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>Перетаскивайте карту мышью. В режиме границ ставьте несколько точек, чтобы получить площадь базы.</span>
      </div>
    </article>
  `;
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const googleCenterUrl = googleOpenUrl(centerLat, centerLng, zoom);
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const twoGisCenterUrl = twoGisOpenUrl(centerLat, centerLng, zoom);
  const twoGisBaseUrl = twoGisOpenUrl(baseLat, baseLng, zoom);
  const providerView = provider === "osm"
    ? `
      <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
        <div class="tile-layer"></div>
        <svg class="map-overlay" aria-hidden="true"></svg>
        <div class="map-interaction-layer" aria-label="Карта участка"></div>
        <span class="map-marker map-marker-city"></span>
        <span class="map-marker map-marker-base"></span>
        <div class="map-controls">
          <button type="button" data-map-zoom="in">+</button>
          <button type="button" data-map-zoom="out">-</button>
        </div>
      </div>
    `
    : provider === "google"
      ? `
        <div class="map-external-frame">
          <iframe class="map-external-embed" src="${googleEmbedUrl(baseLat, baseLng, zoom)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Google Maps preview"></iframe>
        </div>
      `
      : `
        <div class="map-external-frame map-external-card">
          <div class="map-external-badge">2GIS</div>
          <h3>Просмотр точки в 2GIS</h3>
          <p>Откройте текущую базу или центр карты в 2GIS. Координаты и выбранный масштаб передаются автоматически.</p>
          <div class="map-external-coords">
            <span>База: ${formatNumber(baseLat, 5)}, ${formatNumber(baseLng, 5)}</span>
            <span>Центр: ${formatNumber(centerLat, 5)}, ${formatNumber(centerLng, 5)}</span>
          </div>
          <div class="map-external-actions">
            <a class="primary-button" href="${twoGisBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в 2GIS</a>
            <a class="ghost-button" href="${twoGisCenterUrl}" target="_blank" rel="noreferrer noopener">Открыть центр в 2GIS</a>
          </div>
        </div>
      `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OSM</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
        <button type="button" class="${provider === "2gis" ? "is-active" : ""}" data-map-provider="2gis">2GIS</button>
      </div>
      ${providerView}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan" ${provider !== "osm" ? "disabled" : ""}>Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw" ${provider !== "osm" ? "disabled" : ""}>Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save ${provider !== "osm" ? "disabled" : ""}>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear ${provider !== "osm" ? "disabled" : ""}>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "osm" ? "Перетаскивайте карту мышью. В режиме границ ставьте несколько точек, чтобы получить площадь базы." : "Просмотр открыт в альтернативной карте. Редактирование контура и площади остаётся доступно в OSM."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Google Maps</a>
        <a href="${twoGisBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в 2GIS</a>
      </div>
    </article>
  `;
}

function renderTileMap(frame, mapState) {
  const tileLayer = frame.querySelector(".tile-layer");
  const overlay = frame.querySelector(".map-overlay");
  const cityMarker = frame.querySelector(".map-marker-city");
  const baseMarker = frame.querySelector(".map-marker-base");
  const width = frame.clientWidth || 640;
  const height = frame.clientHeight || 320;
  const {
    zoom,
    centerLat,
    centerLng,
    cityLat,
    cityLng,
    baseLat,
    baseLng,
    polygon = [],
    polygonSaved = false,
  } = mapState;
  const center = lonLatToWorld(centerLat, centerLng, zoom);
  const city = lonLatToWorld(cityLat, cityLng, zoom);
  const base = lonLatToWorld(baseLat, baseLng, zoom);

  tileLayer.innerHTML = "";
  const startX = Math.floor((center.x - width / 2) / TILE_SIZE);
  const endX = Math.floor((center.x + width / 2) / TILE_SIZE);
  const startY = Math.floor((center.y - height / 2) / TILE_SIZE);
  const endY = Math.floor((center.y + height / 2) / TILE_SIZE);
  const tileMax = 2 ** zoom;

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= tileMax) continue;
      const wrappedX = ((x % tileMax) + tileMax) % tileMax;
      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;
      img.src = `${OSM_TILE_URL}/${zoom}/${wrappedX}/${y}.png`;
      img.style.left = `${x * TILE_SIZE - center.x + width / 2}px`;
      img.style.top = `${y * TILE_SIZE - center.y + height / 2}px`;
      tileLayer.appendChild(img);
    }
  }

  cityMarker.style.left = `${city.x - center.x + width / 2}px`;
  cityMarker.style.top = `${city.y - center.y + height / 2}px`;
  baseMarker.style.left = `${base.x - center.x + width / 2}px`;
  baseMarker.style.top = `${base.y - center.y + height / 2}px`;

  overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  overlay.innerHTML = "";
  if (!polygon.length) return;

  const points = polygon.map((point) => {
    const world = lonLatToWorld(point.lat, point.lng, zoom);
    return `${world.x - center.x + width / 2},${world.y - center.y + height / 2}`;
  }).join(" ");

  if (polygon.length >= 3) {
    const polygonElement = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygonElement.setAttribute("points", points);
    polygonElement.setAttribute("class", polygonSaved ? "map-shape is-saved" : "map-shape is-draft");
    overlay.appendChild(polygonElement);
  } else if (polygon.length >= 2) {
    const polylineElement = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polylineElement.setAttribute("points", points);
    polylineElement.setAttribute("class", "map-path");
    overlay.appendChild(polylineElement);
  }

  polygon.forEach((point) => {
    const world = lonLatToWorld(point.lat, point.lng, zoom);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(world.x - center.x + width / 2));
    circle.setAttribute("cy", String(world.y - center.y + height / 2));
    circle.setAttribute("r", "5");
    circle.setAttribute("class", "map-point");
    overlay.appendChild(circle);
  });
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "Перетаскивайте карту мышью. Для контура базы включите режим отметки границ.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.locationLocked = true;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.locationLocked = true;
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

function geoProfile(city) {
  const name = normalize(city?.name);
  const region = normalize(city?.regionName);
  if (name.includes("алматы") || region.includes("алмат")) {
    return {
      relief: "предгорная территория, близость Заилийского Алатау, выраженный рекреационный потенциал горного ландшафта",
      landscape: "горные виды, сады, зеленые коридоры, пригородные маршруты",
    };
  }
  if (name.includes("астана") || region.includes("акмол")) {
    return {
      relief: "равнинная степная территория с открытым горизонтом и сильной ролью ветрового режима",
      landscape: "степь, лесополосы, пригородные рекреации, водоемы в радиусе поездки",
    };
  }
  if (name.includes("актау") || name.includes("атырау") || region.includes("мангист") || region.includes("атырау")) {
    return {
      relief: "сухая равнинная и прикаспийская зона, высокая роль воды, тени и защиты от ветра",
      landscape: "Каспийское направление, открытые пространства, песчано-каменистые ландшафты",
    };
  }
  if (name.includes("кокшетау") || name.includes("щучинск") || name.includes("боров")) {
    return {
      relief: "озерно-лесная и холмистая рекреационная зона с сильным туристическим потенциалом",
      landscape: "леса, озера, холмы, природные маршруты выходного дня",
    };
  }
  if (name.includes("шымкент") || name.includes("тараз") || name.includes("туркестан")) {
    return {
      relief: "южная предгорно-равнинная зона с длинным теплым сезоном и культурно-туристическим фоном",
      landscape: "сады, предгорья, исторические маршруты, теплый климатический пояс",
    };
  }
  if (name.includes("усть-каменогорск") || name.includes("семей") || region.includes("восточно")) {
    return {
      relief: "восточная речная и горно-степная зона, важны рельеф, вода и природные маршруты",
      landscape: "реки, сопки, горные направления, хвойные и смешанные природные зоны",
    };
  }
  return {
    relief: "региональная равнинная или слабохолмистая территория; точный рельеф нужно подтвердить по карте участка",
    landscape: "пригородная среда, открытые пространства, зеленые зоны и локальные точки притяжения",
  };
}

function swotGrid(city) {
  return `
    <div class="swot-grid">
      <article><h4>S</h4><p>Близость к ${escapeHtml(city?.name || "городу")}, понятный рынок выходного дня и возможность проверить спрос до разработки концепции.</p></article>
      <article><h4>W</h4><p>Пока нет полных данных по участку: нужна точная отметка на карте, подъезд, инженерия, ограничения и фотофиксация территории.</p></article>
      <article><h4>O</h4><p>Если место удобно связано с городом и имеет природное окружение, его можно развивать как рекреационную площадку.</p></article>
      <article><h4>T</h4><p>Главные угрозы: плохой подъезд, слабая инфраструктура вокруг, экологические ограничения и выраженная сезонность.</p></article>
    </div>
  `;
}

function projectContext() {
  const project = currentProject();
  const city = selectedCity();
  return {
    project,
    city,
    name: project?.name || projectName?.value.trim() || "Проект базы отдыха",
    location: project?.location || projectLocation?.value.trim() || "локация уточняется",
    cityName: city?.name || "выбранный город",
    regionName: city?.regionName || "регион Казахстана",
  };
}

function renderLead(section, ctx) {
  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Анализ места будущей базы</p>
        <h2>${escapeHtml(section.number)}. ${escapeHtml(section.title)}</h2>
      </div>
      <span>${escapeHtml(section.formats)}</span>
    </div>
    <p class="lead">${escapeHtml(ctx.name)} рассматривается как будущая база отдыха рядом с городом ${escapeHtml(ctx.cityName)}. В этом разделе показаны только данные, которые помогают оценить место, окружение и пригодность локации.</p>
  `;
}

function genericSection(section, ctx) {
  return `
    ${renderLead(section, ctx)}
    ${accordion([
      {
        title: "Земельные ограничения",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Право на участок</h3><p>Проверить категорию земли, разрешенное использование, собственника, аренду и возможность строительства базы отдыха.</p></article>
          <article class="data-card"><h3>Границы</h3><p>Сверить фактические границы участка с кадастром, подъездом, соседями и сервитутами.</p></article>
          <article class="data-card"><h3>Документы</h3><p>Нужны кадастровые данные, градостроительные ограничения и подтверждение возможности подключения коммуникаций.</p></article>
        </div>`,
      },
      {
        title: "Санитарные и природоохранные зоны",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Санитарные отступы</h3><p>Проверить расстояние до производств, кладбищ, полигонов, очистных сооружений, магистралей и других ограничивающих объектов.</p></article>
          <article class="data-card"><h3>Водоохранные зоны</h3><p>Если рядом есть река, озеро или канал, нужно проверить водоохранные ограничения и режим использования берега.</p></article>
          <article class="data-card"><h3>Экологические риски</h3><p>Сопоставить участок с данными из главы «Экологическая обстановка» и подтвердить риски официальными источниками.</p></article>
        </div>`,
      },
      {
        title: "Инженерия и подъезд",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Дорога</h3><p>Проверить фактический подъезд, покрытие, зимнюю проходимость, разворот, парковку и возможность заезда спецтехники.</p></article>
          <article class="data-card"><h3>Коммуникации</h3><p>Проверить электричество, воду, канализацию, связь, интернет и стоимость подключения.</p></article>
          <article class="data-card"><h3>Следующий шаг</h3><p>После отметки точки на карте нужно сделать выездную фотофиксацию и собрать документы по участку.</p></article>
        </div>`,
      },
    ])}
  `;
}

function renderGeo(section, ctx) {
  const profile = geoProfile(ctx.city);
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid two">
      <article class="text-block">
        <h3>Положение объекта</h3>
        <p>Проект расположен относительно города ${escapeHtml(ctx.cityName)} в регионе ${escapeHtml(ctx.regionName)}. Красная метка на карте показывает выбранное место будущей базы, зеленая метка показывает центр города. Рельеф: ${escapeHtml(profile.relief)}. Местность: ${escapeHtml(profile.landscape)}.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Основные географические данные",
        html: table(["Параметр", "Значение", "Вывод"], [
          ["Город анализа", ctx.cityName, "опорный рынок спроса и транспортная точка"],
          ["Регион", ctx.regionName, "региональная статистика и ограничения проверяются по этой области"],
          ["Точка базы", "отмечается красной меткой на карте", "сохраняется в проекте и используется для анализа окружения"],
        ]),
      },
      {
        title: "Рельеф и характер местности",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Рельеф</h3><p>${escapeHtml(profile.relief)}</p></article>
          <article class="data-card"><h3>Местность</h3><p>${escapeHtml(profile.landscape)}</p></article>
          <article class="data-card"><h3>Что проверить на выезде</h3><p>Фактический уклон участка, подъезд, наличие воды, деревьев, соседних построек, шумовых источников и визуальной приватности.</p></article>
        </div>`,
      },
    ])}
  `;
}

function renderGeo(section, ctx) {
  const profile = geoProfile(ctx.city);
  return `
    ${renderLead(section, ctx)}
    <div class="geo-map-shell">
      <article class="geo-summary-card">
        <div class="geo-summary-head">
          <span class="geo-summary-label">Положение объекта</span>
          <strong>${escapeHtml(ctx.cityName)}, ${escapeHtml(ctx.regionName)}</strong>
        </div>
        <p>Красная метка показывает базу, зелёная метка показывает центр города. Рельеф: ${escapeHtml(profile.relief)}. Местность: ${escapeHtml(profile.landscape)}.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Основные географические данные",
        html: table(["Параметр", "Значение", "Вывод"], [
          ["Город анализа", ctx.cityName, "опорный рынок спроса и транспортная точка"],
          ["Регион", ctx.regionName, "региональная статистика и ограничения проверяются по этой области"],
          ["Точка базы", "отмечается красной меткой на карте", "сохраняется в проекте и используется для анализа окружения"],
        ]),
      },
      {
        title: "Р РµР»СЊРµС„ Рё С…Р°СЂР°РєС‚РµСЂ РјРµСЃС‚РЅРѕСЃС‚Рё",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Р РµР»СЊРµС„</h3><p>${escapeHtml(profile.relief)}</p></article>
          <article class="data-card"><h3>РњРµСЃС‚РЅРѕСЃС‚СЊ</h3><p>${escapeHtml(profile.landscape)}</p></article>
          <article class="data-card"><h3>Р§С‚Рѕ РїСЂРѕРІРµСЂРёС‚СЊ РЅР° РІС‹РµР·РґРµ</h3><p>Р¤Р°РєС‚РёС‡РµСЃРєРёР№ СѓРєР»РѕРЅ СѓС‡Р°СЃС‚РєР°, РїРѕРґСЉРµР·Рґ, РЅР°Р»РёС‡РёРµ РІРѕРґС‹, РґРµСЂРµРІСЊРµРІ, СЃРѕСЃРµРґРЅРёС… РїРѕСЃС‚СЂРѕРµРє, С€СѓРјРѕРІС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ Рё РІРёР·СѓР°Р»СЊРЅРѕР№ РїСЂРёРІР°С‚РЅРѕСЃС‚Рё.</p></article>
        </div>`,
      },
    ])}
  `;
}

function renderGeo(section, ctx) {
  const profile = geoProfile(ctx.city);
  return `
    ${renderLead(section, ctx)}
    <div class="geo-map-shell">
      <article class="geo-summary-card">
        <div class="geo-summary-head">
          <span class="geo-summary-label">Положение объекта</span>
          <strong>${escapeHtml(ctx.cityName)}, ${escapeHtml(ctx.regionName)}</strong>
        </div>
        <p>Красная метка показывает базу, зелёная метка показывает центр города. Рельеф: ${escapeHtml(profile.relief)}. Местность: ${escapeHtml(profile.landscape)}.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Основные географические данные",
        html: table(["Параметр", "Значение", "Вывод"], [
          ["Город анализа", ctx.cityName, "опорный рынок спроса и транспортная точка"],
          ["Регион", ctx.regionName, "региональная статистика и ограничения проверяются по этой области"],
          ["Точка базы", "отмечается красной меткой на карте", "сохраняется в проекте и используется для анализа окружения"],
        ]),
      },
      {
        title: "Рельеф и характер местности",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Рельеф</h3><p>${escapeHtml(profile.relief)}</p></article>
          <article class="data-card"><h3>Местность</h3><p>${escapeHtml(profile.landscape)}</p></article>
          <article class="data-card"><h3>Что проверить на выезде</h3><p>Фактический уклон участка, подъезд, наличие воды, деревьев, соседних построек, шумовых источников и визуальной приватности.</p></article>
        </div>`,
      },
    ])}
  `;
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  return `
    <article class="map-panel">
      <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
        <div class="tile-layer"></div>
        <svg class="map-overlay" aria-hidden="true"></svg>
        <div class="map-interaction-layer" aria-label="Карта участка"></div>
        <span class="map-marker map-marker-city"></span>
        <span class="map-marker map-marker-base"></span>
        <div class="map-controls">
          <button type="button" data-map-zoom="in">+</button>
          <button type="button" data-map-zoom="out">-</button>
        </div>
      </div>
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>После сохранения базы сайт автоматически анализирует окружение вокруг отмеченной точки: инфраструктуру, транспорт, экологию и точки интереса.</span>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт автоматически анализирует окружение вокруг отмеченной точки: инфраструктуру, транспорт, экологию и точки интереса.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

async function fetchWeather(city) {
  if (!city?.detailPath) return null;
  if (state.weatherCache.has(city.slug)) return state.weatherCache.get(city.slug);
  const response = await fetch(`../data/${city.detailPath.replace("./", "")}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  state.weatherCache.set(city.slug, payload);
  return payload;
}

function cleanWeatherPanel(root) {
  root.querySelectorAll("table").forEach((tableNode) => {
    if (tableNode.parentElement?.classList.contains("table-scroll")) return;
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    tableNode.parentNode.insertBefore(wrap, tableNode);
    wrap.appendChild(tableNode);
  });
  root.querySelectorAll(".Figure-chart").forEach((chart) => chart.classList.add("chart-scroll"));
}

function extractTourismScore(detail) {
  const bestTime = (detail?.sections || []).find((item) => item.id === "Sections-BestTime");
  const text = bestTime?.text || "";
  const tourismPart = text.split("Балл по пляжу")[0] || text;
  const beachPart = text.split("Балл по пляжу")[1] || "";
  const bestSentence = text.match(/Исходя из этого балла, лучшее время года[^.]+\./)?.[0] || "";

  const scoreFrom = (value) => {
    const nums = [...value.matchAll(/\b(\d{1,2}[.,]\d)\b/g)]
      .map((match) => Number(match[1].replace(",", ".")))
      .filter((num) => Number.isFinite(num) && num >= 0 && num <= 10);
    return nums.length ? Math.max(...nums) : null;
  };

  return {
    tourism: scoreFrom(tourismPart),
    beach: scoreFrom(beachPart),
    bestSentence,
  };
}

function tourismScoreCard(score) {
  if (!score?.tourism && !score?.beach) return "";
  const tourism = score.tourism ?? 0;
  const beach = score.beach ?? 0;
  return `
    <div class="score-grid">
      <article class="score-card">
        <span>Балл по туризму</span>
        <strong>${tourism.toFixed(1)} / 10</strong>
        <div><i style="width:${tourism * 10}%"></i></div>
      </article>
      <article class="score-card">
        <span>Балл пляж / бассейн</span>
        <strong>${beach.toFixed(1)} / 10</strong>
        <div><i style="width:${beach * 10}%"></i></div>
      </article>
      <article class="score-note">
        <h3>Лучшее время посещения</h3>
        <p>${escapeHtml(score.bestSentence || "Период берется из раздела WeatherSpark «Лучшее время года для посещения».")}</p>
      </article>
    </div>
  `;
}

function routeMetrics(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(baseLat - cityLat);
  const dLng = toRad(baseLng - cityLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(cityLat)) * Math.cos(toRad(baseLat)) * Math.sin(dLng / 2) ** 2;
  const straight = earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const road = Math.max(1, straight * 1.28);
  const carMinutes = Math.max(5, Math.round((road / 65) * 60));
  const busMinutes = Math.max(carMinutes + 15, Math.round(carMinutes * 1.45));
  return {
    straight,
    road,
    carMinutes,
    busMinutes,
    cityLat,
    cityLng,
    baseLat,
    baseLng,
  };
}

async function renderClimate(section, ctx) {
  sectionOutput.innerHTML = `
    ${renderLead(section, ctx)}
    <div class="loading">Загружаю локальные WeatherSpark-графики для города ${escapeHtml(ctx.cityName)}...</div>
  `;

  try {
    const detail = ctx.weatherDetail || await fetchWeather(ctx.city);
    const sections = detail?.sections || [];
    const tourismScore = extractTourismScore(detail);
    sectionOutput.innerHTML = `
      ${renderLead(section, ctx)}
      ${tourismScoreCard(tourismScore)}
      <div class="content-grid two">
        <article class="text-block">
          <h3>Климатический профиль</h3>
          <p>Для города ${escapeHtml(ctx.cityName)} подключены локально сохраненные данные WeatherSpark: температура, облачность, осадки, влажность, ветер и лучшее время для посещения. Эти блоки можно напрямую использовать в климатической части ТКП.</p>
        </article>
        <article class="text-block">
          <h3>Применение для базы отдыха</h3>
          <p>Климат влияет на сезонность открытых зон, прогулочных маршрутов, водных активностей, зимнего отдыха и график будущих мероприятий.</p>
        </article>
      </div>
      ${sourceList([{ label: "WeatherSpark Казахстан", url: "https://ru.weatherspark.com/countries/KZ" }])}
      <div class="weather-stack">
        ${sections.map((item, index) => `
          <article class="weather-section ${index === 0 ? "is-open" : ""}">
            <button type="button">${escapeHtml(item.title)}</button>
            <div>${item.html}</div>
          </article>
        `).join("")}
      </div>
    `;
    cleanWeatherPanel(sectionOutput);
    sectionOutput.querySelectorAll(".weather-section > button").forEach((button) => {
      button.addEventListener("click", () => button.parentElement.classList.toggle("is-open"));
    });
    activatePendingSubchapter();
  } catch {
    sectionOutput.innerHTML = `
      ${renderLead(section, ctx)}
      <div class="empty-state"><h2>Погодный файл не найден</h2><p>Для выбранного города нет локальной WeatherSpark-страницы.</p></div>
    `;
  }
}

function renderTransport(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const transit = ctx.liveData || [];
  const stops = osmRows(transit.filter((item) => item.type !== "relation"), baseLat, baseLng, 8);
  const routes = transit.filter((item) => item.type === "relation").slice(0, 12);
  const roadQuality = route.road <= 15 ? "очень близкая локация, подходит для day-use и коротких вечерних поездок" :
    route.road <= 45 ? "комфортный загородный радиус, подходит для выходных и корпоративных выездов" :
    "дальний радиус, нужен сильный повод поездки и понятный трансфер";
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid two">
      <article class="text-block">
        <h3>Доступность</h3>
        <p>Расчет идет от центра города ${escapeHtml(ctx.cityName)} до точки будущей базы, которую вы отмечаете на карте. Сейчас примерная дорожная дистанция составляет ${route.road.toFixed(1)} км, ориентировочное время на автомобиле ${route.carMinutes} мин.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Расчет доступности от центра города",
        html: table(["Маршрут", "Оценка по отмеченной точке", "Вывод для проекта"], [
          ["Автомобиль", `${route.road.toFixed(1)} км / ${route.carMinutes} мин`, "проверить качество дороги, съезд, освещение, зимнюю проходимость"],
          ["Такси / трансфер", `${route.carMinutes + 8}-${route.carMinutes + 18} мин`, "нужны точка посадки, стоимость трансфера и понятная навигация"],
          ["Автобус", `${route.busMinutes} мин и более`, "если рядом нет остановки, нужен трансфер от ближайшего маршрута"],
          ["Радиус поездки", roadQuality, "влияет на формат: дневной отдых, выходные или организованный трансфер"],
        ]),
      },
      {
        title: "Остановки рядом с точкой",
        html: stops.length ? htmlTable(["Остановка", "Тип", "Расстояние"], stops.map(({ element, distance }) => [
          escapeHtml(osmName(element)),
          escapeHtml(osmKind(element)),
          `${distance.toFixed(2)} км`,
        ])) : emptyData("Остановки рядом не найдены", "В OpenStreetMap рядом с отмеченной точкой нет bus_stop/platform. Нужно проверить EasyWay или городскую схему маршрутов."),
      },
      {
        title: "Маршруты общественного транспорта",
        html: routes.length ? htmlTable(["Маршрут", "Номер / название", "Оператор"], routes.map((element) => [
          escapeHtml(osmKind(element)),
          escapeHtml(element.tags?.ref || osmName(element)),
          escapeHtml(element.tags?.operator || "не указан"),
        ])) : emptyData("Номера автобусов не найдены", "В OpenStreetMap нет route=bus рядом с точкой. Это не значит, что автобусов нет, но нужен отдельный источник маршрутов города."),
      },
    ])}
    ${sourceList([{ label: "EasyWay Казахстан", url: "https://kz.easyway.info/ru" }])}
  `;
}

function renderEcology(section, ctx) {
  const airPayload = ctx.liveData?.air || null;
  const air = airPayload?.current || null;
  const units = airPayload?.current_units || {};
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const ecoItems = ctx.liveData?.elements || [];
  const green = osmRows(ecoItems.filter(isGreenPoi), baseLat, baseLng, 6);
  const risks = osmRows(ecoItems.filter(isEcoRiskPoi), baseLat, baseLng, 6);
  const aqi = Number(air?.european_aqi);
  const airStatus = Number.isFinite(aqi)
    ? aqi <= 20 ? "очень хорошее качество воздуха" : aqi <= 40 ? "хорошее качество воздуха" : aqi <= 60 ? "умеренная нагрузка на воздух" : "повышенная нагрузка на воздух"
    : "качество воздуха не загрузилось";
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid two">
      <article class="text-block">
        <h3>Экологический фон</h3>
        <p>В этой главе показаны только экологические данные по красной точке: качество воздуха, зеленые зоны и потенциальные источники экологической нагрузки рядом. Погодные графики здесь специально убраны, они остаются только в главе «Климат и сезонность».</p>
      </article>
      ${bars([
        { label: "Индекс воздуха", value: Number.isFinite(aqi) ? Math.min(100, aqi) : 0, valueLabel: Number.isFinite(aqi) ? `${formatNumber(aqi)} AQI` : "нет данных" },
        { label: "Зеленые объекты", value: Math.min(100, green.length * 18), valueLabel: `${green.length} рядом` },
        { label: "Источники нагрузки", value: Math.min(100, risks.length * 18), valueLabel: `${risks.length} рядом` },
      ])}
    </div>
    ${accordion([
      {
        title: "Качество воздуха у точки",
        html: air ? `
          <p class="section-note">Текущая оценка: ${escapeHtml(airStatus)}. Таблица оставлена именно здесь, потому что числовые показатели воздуха так читаются лучше.</p>
          ${table(["Показатель воздуха", "Значение у точки базы", "Единица"], [
            ["Европейский индекс качества воздуха", valueOrDash(air.european_aqi), units.european_aqi || "индекс"],
            ["Американский индекс качества воздуха", valueOrDash(air.us_aqi), units.us_aqi || "индекс"],
            ["Мелкие твердые частицы PM2.5", valueOrDash(air.pm2_5), units.pm2_5 || "µg/m³"],
            ["Крупные твердые частицы PM10", valueOrDash(air.pm10), units.pm10 || "µg/m³"],
            ["Угарный газ", valueOrDash(air.carbon_monoxide), units.carbon_monoxide || "µg/m³"],
            ["Диоксид азота", valueOrDash(air.nitrogen_dioxide), units.nitrogen_dioxide || "µg/m³"],
            ["Диоксид серы", valueOrDash(air.sulphur_dioxide), units.sulphur_dioxide || "µg/m³"],
            ["Озон", valueOrDash(air.ozone), units.ozone || "µg/m³"],
          ])}
        ` : emptyData("Показатели воздуха не загрузились", "Open-Meteo Air Quality временно не вернул данные по этой точке."),
      },
      {
        title: "Зеленые зоны и природное окружение",
        html: poiCards(green, "Зеленые объекты рядом не найдены", "В OpenStreetMap в радиусе анализа не найдено парков, лесов, природных объектов или зеленых зон."),
      },
      {
        title: "Потенциальные источники экологической нагрузки",
        html: poiCards(risks, "Явные источники нагрузки рядом не найдены", "В OpenStreetMap рядом с точкой не найдено промышленных зон, полигонов, очистных сооружений или энергообъектов. Это не заменяет выездную проверку и официальные санитарные данные."),
      },
      {
        title: "Что проверить перед выбором участка",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Шум</h3><p>Проверить дороги, железную дорогу, промышленные объекты, ночной шум и соседние площадки.</p></article>
          <article class="data-card"><h3>Вода и почва</h3><p>Проверить водоохранные зоны, подтопление, качество воды, грунты и санитарные отступы.</p></article>
          <article class="data-card"><h3>Санитарные зоны</h3><p>Сверить участок с официальными ограничениями, землей, охранными зонами и разрешенным использованием.</p></article>
        </div>`,
      },
    ])}
    ${sourceList([
      { label: "Open-Meteo Air Quality", url: "https://open-meteo.com/en/docs/air-quality-api" },
      { label: "European Air Quality Index (EEA)", url: "https://airindex.eea.europa.eu/AQI/index.html" },
      { label: "AirNow / EPA AQI Basics", url: "https://www.airnow.gov/aqi/aqi-basics/" },
      { label: "WHO Air Quality Guidelines 2021", url: "https://www.who.int/publications/i/item/9789240034228/" },
      { label: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
      { label: "Бюро национальной статистики", url: "https://stat.gov.kz/ru/" },
    ])}
  `;
}

function renderEcology(section, ctx) {
  const airPayload = ctx.liveData?.air || null;
  const air = airPayload?.current || null;
  const units = airPayload?.current_units || {};
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const source = ctx.liveData?.source || "osm";
  const green = source === "google"
    ? placeRows(ctx.liveData?.green || [], baseLat, baseLng, 6)
    : osmRows(ctx.liveData?.green || [], baseLat, baseLng, 6);
  const natural = source === "google"
    ? placeRows(ctx.liveData?.natural || [], baseLat, baseLng, 6)
    : osmRows(ctx.liveData?.natural || [], baseLat, baseLng, 6);
  const risks = source === "google"
    ? placeRows(ctx.liveData?.risks || [], baseLat, baseLng, 6)
    : osmRows(ctx.liveData?.risks || [], baseLat, baseLng, 6);
  const aqiSummary = ecoMetricSummary(ECO_METRICS[0], air?.european_aqi);
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, Number(ctx.project?.mapZoom) || 12);

  const summaryCards = [
    {
      label: "Индекс воздуха",
      value: aqiSummary.valueLabel,
      tone: aqiSummary.tone,
      text: `${aqiSummary.label}. ${aqiSummary.normLabel}.`,
    },
    {
      label: "Зелёное окружение",
      value: `${green.length + natural.length}`,
      tone: green.length + natural.length >= 4 ? "good" : green.length + natural.length >= 1 ? "warn" : "bad",
      text: green.length + natural.length ? "Есть зелёные и природные точки, найденные по карте." : "Карта не показала сильный зелёный каркас рядом с базой.",
    },
    {
      label: "Источники нагрузки",
      value: `${risks.length}`,
      tone: risks.length === 0 ? "good" : risks.length <= 2 ? "warn" : "bad",
      text: risks.length === 0 ? "Явные рисковые объекты рядом не обнаружены." : "Есть точки, которые нужно проверять как фактор экологической нагрузки.",
    },
  ];

  const metricCards = air
    ? ecoMetricCards(air, units)
    : emptyData("Показатели воздуха не загрузились", "Источник Open-Meteo временно не вернул значения по этой точке.");

  const mergedNaturePlaces = source === "google"
    ? dedupePlaces([...(green.map(({ place }) => place)), ...(natural.map(({ place }) => place))])
    : [];

  const natureCards = source === "google"
    ? renderEcoGoogleCards(
      mergedNaturePlaces.length ? placeRows(mergedNaturePlaces, baseLat, baseLng, 8) : [],
      "Зелёные зоны рядом не найдены",
      "Google Maps не показал рядом парков, кемпингов или природных точек. Если ключ Google не настроен, проверьте карту после его подключения.",
    )
    : poiCards(
      [...green, ...natural].slice(0, 8),
      "Зелёные зоны рядом не найдены",
      "OpenStreetMap не показал рядом выраженные зелёные объекты. Это повод проверить участок визуально на месте.",
    );

  const riskCards = source === "google"
    ? renderEcoGoogleCards(
      risks,
      "Потенциальные источники нагрузки рядом не найдены",
      "Google Maps не показал рядом промышленные или нагрузочные точки, но это не заменяет официальную проверку санитарных зон.",
    )
    : poiCards(
      risks,
      "Потенциальные источники нагрузки рядом не найдены",
      "OpenStreetMap не показал рядом промышленные зоны, полигоны или энергообъекты, но перед решением участок всё равно нужно проверить по официальным ограничениям.",
    );

  const overviewHtml = `
    ${renderLead(section, ctx)}
    <div class="eco-hero">
      <div class="eco-hero-copy">
        <h3>Экологический фон участка</h3>
        <p>Раздел показывает только то, что помогает принять решение по базе отдыха: текущий фон воздуха, зелёное окружение, потенциальные источники экологической нагрузки и конкретный список того, что нужно проверить перед выбором участка.</p>
        <p class="section-note">Погодные графики отсюда убраны. Нормы и цвета в таблице ниже даны так, чтобы сразу было видно: показатель в пределах комфортного уровня, близко к границе или уже хуже желаемого.</p>
      </div>
      <div class="eco-summary-grid">
        ${summaryCards.map((card) => `
          <article class="eco-summary-card eco-summary-${card.tone}">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <p>${escapeHtml(card.text)}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;

  const airHtml = `
    <article class="text-block eco-report-block">
      <h3>Как читать показатели воздуха</h3>
      <p>Норма показана как целевой комфортный уровень для базы отдыха. Цвет текущего значения у базы помогает понять статус сразу: зелёный означает нормальный фон, жёлтый означает средний уровень и приближение к границе, красный означает плохой фон и повышенную нагрузку.</p>
      <p class="eco-source-note">По воздуху используется актуальный часовой срез Open-Meteo Air Quality. Пространственное окружение берётся из ${source === "google" ? "Google Maps" : "OpenStreetMap"}. <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть эту базу в Google Maps</a>.</p>
      <p><strong>Быстрый вывод:</strong> ${escapeHtml(aqiSummary.label)}. Сейчас у базы ${escapeHtml(aqiSummary.valueLabel)}, целевой уровень ${escapeHtml(aqiSummary.normLabel)}.</p>
      ${metricCards}
    </article>
  `;

  const natureHtml = `
    <article class="text-block eco-report-block">
      <h3>Зелёные зоны и природное окружение</h3>
      <p>${escapeHtml(ecoContextSummary(source, green, natural, risks))}</p>
      ${source === "google"
        ? ecoNarrativeCards(
          mergedNaturePlaces.length ? placeRows(mergedNaturePlaces, baseLat, baseLng, 8) : [],
          "nature",
          "Зелёные зоны рядом не найдены",
          "Google Maps не показал рядом парков, кемпингов или природных точек. Если ключ Google не настроен, проверьте карту после его подключения.",
        )
        : ecoNarrativeCards(
          [...green, ...natural].slice(0, 8),
          "nature",
          "Зелёные зоны рядом не найдены",
          "OpenStreetMap не показал рядом выраженные зелёные объекты. Это повод проверить участок визуально на месте.",
        )}
    </article>
  `;

  const risksHtml = `
    <article class="text-block eco-report-block">
      <h3>Потенциальные источники экологической нагрузки</h3>
      <p>Ниже объекты разложены отдельно, чтобы было понятно, какой именно фактор найден рядом с базой и почему его стоит проверить. Это предварительный картографический отчёт, а не окончательное экологическое заключение.</p>
      ${source === "google"
        ? ecoNarrativeCards(
          risks,
          "risk",
          "Потенциальные источники нагрузки рядом не найдены",
          "Google Maps не показал рядом промышленные или нагрузочные точки, но это не заменяет официальную проверку санитарных зон.",
        )
        : ecoNarrativeCards(
          risks,
          "risk",
          "Потенциальные источники нагрузки рядом не найдены",
          "OpenStreetMap не показал рядом промышленные зоны, полигоны или энергообъекты, но перед решением участок всё равно нужно проверить по официальным ограничениям.",
        )}
    </article>
  `;

  const checklistHtml = `
    <article class="text-block eco-report-block">
      <h3>Что проверить перед выбором участка</h3>
      <p>Ниже не общий шаблон, а список проверок, собранный по текущему окружению выбранной базы.</p>
      ${ecoChecklist(buildEcoChecklist(air, green, natural, risks))}
    </article>
  `;

  return `
    ${overviewHtml}
    ${accordion([
      { title: "Показатели воздуха и их значение", html: airHtml },
      { title: "Зелёные зоны и природное окружение", html: natureHtml },
      { title: "Потенциальные источники экологической нагрузки", html: risksHtml },
      { title: "Что проверить перед выбором участка", html: checklistHtml },
    ])}
    ${sourceList([
      { label: "Open-Meteo Air Quality", url: "https://open-meteo.com/en/docs/air-quality-api" },
      { label: "European Air Quality Index (EEA)", url: "https://airindex.eea.europa.eu/AQI/index.html" },
      { label: "AirNow / EPA AQI Basics", url: "https://www.airnow.gov/aqi/aqi-basics/" },
      { label: "WHO Air Quality Guidelines 2021", url: "https://www.who.int/publications/i/item/9789240034228/" },
      { label: source === "google" ? "Google Places API" : "OpenStreetMap", url: source === "google" ? "https://developers.google.com/maps/documentation/places/web-service/nearby-search" : "https://www.openstreetmap.org/" },
      { label: "Бюро национальной статистики", url: "https://stat.gov.kz/ru/" },
    ])}
  `;
}

function renderSurrounding(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || [];
  const services = osmRows(live.filter(isServicePoi), baseLat, baseLng, 12);
  const competitors = osmRows(live.filter(isCompetitorPoi), baseLat, baseLng, 12);
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Окружение и сервисы рядом</h3>
        <p>Здесь показаны объекты, которые реально найдены вокруг красной точки: магазины, кафе, АЗС, аптеки, медпункты, парковки и ближайшие рекреационные конкуренты. Глава не повторяет климат и не подставляет данные Омарты.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Краткий вывод по инфраструктуре",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Городская опора</h3><p>${escapeHtml(ctx.cityName)} находится примерно в ${route.road.toFixed(1)} км расчетной дороги от точки. Это влияет на формат: дневной отдых, выходные или трансфер.</p></article>
          <article class="data-card"><h3>Сервисы</h3><p>Найдено ${services.length} сервисных объектов рядом с точкой: магазины, питание, топливо, медицина, банки или парковки.</p></article>
          <article class="data-card"><h3>Конкурентная среда</h3><p>Найдено ${competitors.length} рекреационных объектов и размещений рядом. Их нужно проверить как конкурентов или партнеров.</p></article>
        </div>`,
      },
      {
        title: "Магазины, кафе, АЗС и полезные сервисы",
        html: poiCards(services, "Сервисы рядом не найдены", "В OpenStreetMap рядом с красной точкой не найдено магазинов, кафе, АЗС, аптек, медпунктов или парковок."),
      },
      {
        title: "Конкуренты и рекреационные объекты рядом",
        html: poiCards(competitors, "Конкуренты рядом не найдены", "В OpenStreetMap рядом не найдено баз отдыха, гостевых домов, кемпингов, парков или бассейнов."),
      },
      {
        title: "Числовая сводка по объектам",
        html: table(["Категория", "Количество"], [
          ["Сервисные объекты", String(services.length)],
          ["Конкуренты / рекреация", String(competitors.length)],
          ["Всего найдено OSM-объектов в выгрузке", String(live.length)],
        ]),
      },
    ])}
    ${sourceList([{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }])}
  `;
}

function renderAttractions(section, ctx) {
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || [];
  const attractions = osmRows(live.filter((item) => isNaturalPoi(item) || isCulturePoi(item)), baseLat, baseLng, 14);
  const natural = osmRows(live.filter(isNaturalPoi), baseLat, baseLng, 8);
  const cultural = osmRows(live.filter(isCulturePoi), baseLat, baseLng, 8);
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Туристические точки и досуг</h3>
        <p>Эта глава показывает, ради чего гость может приехать в район будущей базы: природные места, парки, музеи, видовые точки, исторические объекты и зоны отдыха рядом с красной точкой.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Краткий туристический вывод",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Потенциал досуга</h3><p>Рядом найдено ${attractions.length} туристических и рекреационных точек. Чем больше таких мест, тем проще собрать программу отдыха без строительства всех активностей внутри базы.</p></article>
          <article class="data-card"><h3>Природный сценарий</h3><p>Природные объекты подходят для прогулок, фотозон, пикников, маршрутов и спокойного семейного отдыха.</p></article>
          <article class="data-card"><h3>Культурный сценарий</h3><p>Музеи, исторические места и достопримечательности усиливают экскурсионные и событийные программы.</p></article>
        </div>`,
      },
      {
        title: "Ближайшие туристические точки",
        html: poiCards(attractions, "Туристические точки рядом не найдены", "В OpenStreetMap рядом с красной точкой не найдено туристических объектов в выбранном радиусе."),
      },
      {
        title: "Природные места",
        html: poiCards(natural, "Природные места рядом не найдены", "В OpenStreetMap рядом не найдено природных объектов, парков или зон отдыха."),
      },
      {
        title: "Культурные и исторические объекты",
        html: poiCards(cultural, "Культурные объекты рядом не найдены", "В OpenStreetMap рядом не найдено музеев, исторических объектов, видовых точек или достопримечательностей."),
      },
    ])}
    ${sourceList([{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }])}
  `;
}

function renderSocio(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || [];
  const profile = demandProfile(ctx, route);
  const services = osmRows(live.filter(isServicePoi), baseLat, baseLng, 30);
  const food = services.filter(({ element }) => ["restaurant", "cafe"].includes(osmRawKind(element)));
  const finance = services.filter(({ element }) => ["bank", "atm"].includes(osmRawKind(element)));
  const medical = services.filter(({ element }) => ["pharmacy", "clinic", "hospital"].includes(osmRawKind(element)));
  const competitors = osmRows(live.filter(isCompetitorPoi), baseLat, baseLng, 30);
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Социально-экономический фон</h3>
        <p>Эта глава не копирует инфраструктуру. Здесь показан вывод по потенциальному спросу: какой город является базой гостей, насколько далеко ехать, есть ли вокруг признаки активной сервисной среды и какие официальные показатели нужно добрать.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Потенциальная аудитория",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>База спроса</h3><p>${escapeHtml(ctx.cityName)}: ${escapeHtml(profile.scale)}.</p></article>
          <article class="data-card"><h3>Кто может приезжать</h3><p>${escapeHtml(profile.audience)}.</p></article>
          <article class="data-card"><h3>Вывод для концепции</h3><p>${escapeHtml(profile.conclusion)}.</p></article>
        </div>`,
      },
      {
        title: "Экономическая активность вокруг точки",
        html: table(["Индикатор", "Значение"], [
          ["Расчетное расстояние от города", `${route.road.toFixed(1)} км`],
          ["Сервисные объекты рядом", String(services.length)],
          ["Кафе и рестораны", String(food.length)],
          ["Банки и банкоматы", String(finance.length)],
          ["Аптеки и медицина", String(medical.length)],
          ["Размещение / рекреация рядом", String(competitors.length)],
        ]),
      },
      {
        title: "Что добрать из официальной статистики",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Население</h3><p>Нужны официальные данные по численности города и района, чтобы оценить емкость локального рынка.</p></article>
          <article class="data-card"><h3>Доходы и занятость</h3><p>Нужны средние доходы, занятость и структура аудитории, чтобы выбрать ценовой сегмент базы.</p></article>
          <article class="data-card"><h3>Турпоток</h3><p>Нужны данные по внутреннему туризму, размещению и поездкам выходного дня по региону.</p></article>
        </div>`,
      },
    ])}
    ${sourceList([
      { label: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
      { label: "Бюро национальной статистики", url: "https://stat.gov.kz/ru/" },
    ])}
  `;
}

function customBlockDefaults(type) {
  if (type === "tabs") return { type, title: "Вкладки", tabsText: "Вкладка 1 | Текст первой вкладки\nВкладка 2 | Текст второй вкладки" };
  if (type === "chart") return { type, title: "График", chartText: "Показатель 1 | 40\nПоказатель 2 | 70\nПоказатель 3 | 55" };
  if (type === "image") return { type, title: "Изображение", imageUrl: "", caption: "" };
  return { type: "text", title: "Текстовый блок", content: "" };
}

function parseManualRows(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts[0]);
}

function renderCustomBlockPreview(block) {
  const title = block.title || "Блок";
  if (block.type === "tabs") {
    const rows = parseManualRows(block.tabsText);
    return `
      <article class="manual-preview-block">
        <h3>${escapeHtml(title)}</h3>
        <div class="manual-tabs-preview">
          ${rows.length ? rows.map(([tabTitle, tabText]) => `
            <section>
              <strong>${escapeHtml(tabTitle)}</strong>
              <p>${escapeHtml(tabText || "")}</p>
            </section>
          `).join("") : `<p class="muted">Добавьте вкладки в формате: Название | Текст.</p>`}
        </div>
      </article>
    `;
  }
  if (block.type === "chart") {
    const rows = parseManualRows(block.chartText);
    const items = rows.map(([label, value]) => ({ label, value: Number(value) || 0, valueLabel: value || "0" }));
    return `
      <article class="manual-preview-block">
        <h3>${escapeHtml(title)}</h3>
        ${items.length ? bars(items) : `<p class="muted">Добавьте график в формате: Показатель | Значение.</p>`}
      </article>
    `;
  }
  if (block.type === "image") {
    return `
      <article class="manual-preview-block">
        <h3>${escapeHtml(title)}</h3>
        ${block.imageUrl
          ? `<figure class="manual-image"><img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.caption || title)}"><figcaption>${escapeHtml(block.caption || "")}</figcaption></figure>`
          : `<p class="muted">Добавьте ссылку или локальный путь к изображению.</p>`}
      </article>
    `;
  }
  return `
    <article class="manual-preview-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(block.content || "Добавьте текст для этого блока.")}</p>
    </article>
  `;
}

function renderCustomBlockEditor(block, index) {
  const type = block.type || "text";
  return `
    <article class="manual-block-editor" data-custom-block="${index}">
      <div class="manual-block-head">
        <label>
          <span>Название блока</span>
          <input data-custom-block-field="title" value="${escapeHtml(block.title || "")}">
        </label>
        <label>
          <span>Тип</span>
          <select data-custom-block-field="type">
            <option value="text" ${type === "text" ? "selected" : ""}>Текст</option>
            <option value="tabs" ${type === "tabs" ? "selected" : ""}>Вкладки</option>
            <option value="chart" ${type === "chart" ? "selected" : ""}>График</option>
            <option value="image" ${type === "image" ? "selected" : ""}>Картинка</option>
          </select>
        </label>
        <button type="button" class="danger-button" data-custom-remove-block="${index}">Удалить</button>
      </div>
      ${type === "tabs" ? `
        <label>
          <span>Вкладки: одна строка = Название | Текст</span>
          <textarea rows="5" data-custom-block-field="tabsText">${escapeHtml(block.tabsText || "")}</textarea>
        </label>
      ` : type === "chart" ? `
        <label>
          <span>График: одна строка = Показатель | Значение</span>
          <textarea rows="5" data-custom-block-field="chartText">${escapeHtml(block.chartText || "")}</textarea>
        </label>
      ` : type === "image" ? `
        <label>
          <span>Ссылка или путь к изображению</span>
          <input data-custom-block-field="imageUrl" value="${escapeHtml(block.imageUrl || "")}" placeholder="./assets/example.jpg">
        </label>
        <label>
          <span>Подпись</span>
          <textarea rows="3" data-custom-block-field="caption">${escapeHtml(block.caption || "")}</textarea>
        </label>
      ` : `
        <label>
          <span>Текст</span>
          <textarea rows="6" data-custom-block-field="content">${escapeHtml(block.content || "")}</textarea>
        </label>
      `}
    </article>
  `;
}

function renderCustomSection(section, ctx) {
  const source = section.source || {};
  const blocks = Array.isArray(source.blocks) ? source.blocks : [];
  return `
    ${renderLead(section, ctx)}
    <div class="manual-section">
      <article class="text-block manual-editor">
        <div class="manual-editor-title">
          <h3>Редактор ручной главы</h3>
          <button type="button" class="danger-button" data-custom-delete-section>Удалить главу</button>
        </div>
        <div class="manual-meta-grid">
          <label>
            <span>Номер</span>
            <input data-custom-section-field="number" value="${escapeHtml(source.number || section.number)}">
          </label>
          <label>
            <span>Название главы</span>
            <input data-custom-section-field="title" value="${escapeHtml(source.title || section.title)}">
          </label>
          <label>
            <span>Краткая подпись в меню</span>
            <input data-custom-section-field="formats" value="${escapeHtml(source.formats || section.formats)}">
          </label>
        </div>
        <label>
          <span>Короткое описание главы</span>
          <textarea rows="4" data-custom-section-field="summary">${escapeHtml(source.summary || "")}</textarea>
        </label>
        <div class="manual-actions">
          <button type="button" class="ghost-button" data-custom-add-block="text">+ Текст</button>
          <button type="button" class="ghost-button" data-custom-add-block="tabs">+ Вкладки</button>
          <button type="button" class="ghost-button" data-custom-add-block="chart">+ График</button>
          <button type="button" class="ghost-button" data-custom-add-block="image">+ Картинка</button>
          <button type="button" class="primary-button" data-custom-save>Сохранить главу</button>
        </div>
        <div class="manual-block-list">
          ${blocks.length ? blocks.map(renderCustomBlockEditor).join("") : `<p class="section-note">Добавьте первый блок: текст, вкладки, график или картинку.</p>`}
        </div>
      </article>
      <article class="text-block manual-preview">
        <h3>${escapeHtml(source.title || section.title)}</h3>
        ${source.summary ? `<p>${escapeHtml(source.summary)}</p>` : `<p class="muted">Предпросмотр появится после заполнения главы.</p>`}
        ${blocks.map(renderCustomBlockPreview).join("")}
      </article>
    </div>
  `;
}

function scoreTone(score) {
  if (score >= 75) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

function scoreLabel(score) {
  if (score >= 80) return "сильная пригодность";
  if (score >= 65) return "хороший потенциал";
  if (score >= 50) return "условно подходит";
  return "нужна осторожная проверка";
}

function countRowsBySource(data, googleKey, osmFilter) {
  if (!data) return 0;
  if (["google", "2gis"].includes(data.source) && Array.isArray(data[googleKey])) return data[googleKey].length;
  const osm = Array.isArray(data) ? data : data.osm || data.elements || [];
  return Array.isArray(osm) ? osm.filter(osmFilter).length : 0;
}

function buildFinalAssessment(ctx) {
  const route = routeMetrics(ctx);
  const profile = demandProfile(ctx, route);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const polygon = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(polygon);
  const live = ctx.liveData || {};
  const ecology = live.ecology || {};
  const infra = live.infrastructure || {};
  const tourist = live.attractions || {};

  const air = ecology.air?.current || null;
  const aqiSummary = ecoMetricSummary(ECO_METRICS[0], air?.european_aqi);
  const greenCount = (ecology.green || []).length + (ecology.natural || []).length;
  const riskCount = (ecology.risks || []).length;
  const serviceCount = countRowsBySource(infra, "services", isServicePoi);
  const competitorCount = countRowsBySource(infra, "competitors", isCompetitorPoi);
  const attractionCount = countRowsBySource(tourist, "attractions", (item) => isNaturalPoi(item) || isCulturePoi(item));
  const naturalCount = countRowsBySource(tourist, "natural", isNaturalPoi);
  const culturalCount = countRowsBySource(tourist, "cultural", isCulturePoi);

  const transportScore = route.road <= 35 ? 85 : route.road <= 70 ? 65 : 45;
  const ecologyScore = !air
    ? 55
    : (Number(air.european_aqi) <= 40 ? 78 : Number(air.european_aqi) <= 60 ? 58 : 38) - Math.min(25, riskCount * 8);
  const infraScore = Math.min(90, 40 + serviceCount * 5);
  const attractionScore = Math.min(90, 35 + attractionCount * 4 + naturalCount * 2);
  const climateScore = Number.isFinite(Number(ctx.tourismScore?.tourism)) ? Math.round(Number(ctx.tourismScore.tourism) * 10) : 55;
  const demandScore = ctx.city?.regionType === "special-city" ? 82 : route.road <= 35 ? 76 : route.road <= 70 ? 62 : 50;
  const readinessScore = polygon.length >= 3 ? 72 : 48;
  const overall = Math.max(0, Math.min(100, Math.round((transportScore + ecologyScore + infraScore + attractionScore + climateScore + demandScore + readinessScore) / 7)));

  const strengths = [
    route.road <= 35 ? `база находится близко к ${ctx.cityName}: расчетно около ${route.road.toFixed(1)} км дороги` : "",
    serviceCount >= 6 ? `рядом найдено ${serviceCount} сервисных объектов, это снижает бытовую изоляцию площадки` : "",
    attractionCount >= 5 ? `рядом есть ${attractionCount} туристических и досуговых точек для программы отдыха` : "",
    greenCount >= 3 ? "карта показывает выраженное зеленое или природное окружение" : "",
    Number.isFinite(Number(air?.european_aqi)) && Number(air.european_aqi) <= 40 ? `воздух сейчас в целевом диапазоне: ${aqiSummary.valueLabel}` : "",
    area > 0 ? `контур базы отмечен, расчетная площадь: ${formatArea(area)}` : "",
  ].filter(Boolean);

  const weaknesses = [
    route.road > 70 ? `удаленность высокая: расчетно около ${route.road.toFixed(1)} км дороги от города` : "",
    serviceCount < 3 ? "рядом мало сервисов, концепции придется закрывать питание, трансфер и базовые потребности внутри базы" : "",
    attractionCount < 3 ? "вокруг мало явных точек притяжения, нужен собственный сильный сценарий отдыха" : "",
    polygon.length < 3 ? "границы базы пока не сохранены, поэтому площадь и фактическая посадка концепции не подтверждены" : "",
    !air ? "качество воздуха не загрузилось, экологический вывод нужно подтвердить повторным срезом" : "",
  ].filter(Boolean);

  const opportunities = [
    profile.conclusion,
    competitorCount > 0 ? `найдено ${competitorCount} рекреационных объектов рядом: их можно изучить как конкурентов, ориентиры цен и возможные партнерства` : "если конкурентов рядом мало, можно занять нишу при условии сильной концепции",
    naturalCount > 0 ? `природные точки (${naturalCount}) можно использовать для прогулок, фотозон и маршрутов` : "",
    culturalCount > 0 ? `культурные точки (${culturalCount}) усиливают экскурсионную программу` : "",
  ].filter(Boolean);

  const risks = [
    riskCount > 0 ? `рядом найдено ${riskCount} потенциальных источников экологической нагрузки, нужны санитарные зоны и проверка фактического влияния` : "",
    Number.isFinite(Number(air?.european_aqi)) && Number(air.european_aqi) > 60 ? `текущий European AQI высокий для рекреации: ${aqiSummary.valueLabel}` : "",
    route.road > 70 ? "для удаленной локации нужен понятный трансфер, парковка и сильный повод поездки" : "",
    polygon.length < 3 ? "без сохраненного контура нельзя уверенно оценить площадь, подъезд, соседей и ограничения участка" : "",
    "нужно подтвердить категорию земли, разрешенное использование, водоохранные зоны, инженерные подключения и фактический подъезд",
  ].filter(Boolean);

  return {
    route,
    profile,
    baseLat,
    baseLng,
    area,
    polygonSaved: polygon.length >= 3,
    aqiSummary,
    serviceCount,
    competitorCount,
    attractionCount,
    naturalCount,
    culturalCount,
    greenCount,
    riskCount,
    scores: [
      { label: "Транспортная доступность", value: transportScore, text: `${route.road.toFixed(1)} км, авто около ${route.carMinutes} мин` },
      { label: "Экология", value: Math.max(0, ecologyScore), text: air ? `${aqiSummary.valueLabel}, рисков рядом: ${riskCount}` : "воздух не загрузился" },
      { label: "Инфраструктура рядом", value: infraScore, text: `${serviceCount} сервисов, ${competitorCount} рекреационных объектов` },
      { label: "Климат и сезонность", value: climateScore, text: Number.isFinite(Number(ctx.tourismScore?.tourism)) ? `туристический балл ${Number(ctx.tourismScore.tourism).toFixed(1)}/10` : "климатический балл не загружен" },
      { label: "Туристический потенциал", value: attractionScore, text: `${attractionCount} точек досуга, природа: ${naturalCount}` },
      { label: "Спрос и аудитория", value: demandScore, text: profile.scale },
      { label: "Готовность участка", value: readinessScore, text: polygon.length >= 3 ? `контур сохранен, ${formatArea(area)}` : "контур не сохранен" },
    ],
    overall,
    strengths,
    weaknesses,
    opportunities,
    risks,
  };
}

function listCards(items, emptyText) {
  const rows = items.length ? items : [emptyText];
  return `<div class="data-card-grid">${rows.map((text, index) => `<article class="data-card"><h3>${index + 1}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div>`;
}

function swotReadableGroup(title, mark, items, emptyText) {
  const rows = items.length ? items : [emptyText];
  return `
    <section class="swot-readable-card">
      <div class="swot-readable-head"><span>${escapeHtml(mark)}</span><h3>${escapeHtml(title)}</h3></div>
      <ul>${rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function renderFinalAssessment(section, ctx) {
  const assessment = buildFinalAssessment(ctx);
  const finalVerdict = assessment.overall >= 75
    ? "Локация выглядит перспективной для базы отдыха, если юридические и инженерные проверки подтвердятся."
    : assessment.overall >= 55
      ? "Локация имеет рабочий потенциал, но решение стоит принимать после проверки слабых мест."
      : "Локация требует осторожности: перед концепцией нужно закрыть ключевые риски и подтвердить фактические условия.";

  return `
    ${renderLead(section, ctx)}
    ${accordion([
      {
        title: "Итоговая пригодность",
        html: `
          <div class="content-grid two">
            <article class="text-block">
              <h3>${escapeHtml(scoreLabel(assessment.overall))}</h3>
              <p>${escapeHtml(finalVerdict)}</p>
              <p><strong>Итоговый балл:</strong> ${assessment.overall}/100. Точка базы: ${formatNumber(assessment.baseLat, 5)}, ${formatNumber(assessment.baseLng, 5)}.</p>
            </article>
            ${bars([{ label: "Итоговая оценка", value: assessment.overall, valueLabel: `${assessment.overall}/100` }])}
          </div>
        `,
      },
      {
        title: "Сводная оценка по факторам",
        html: `<div class="data-card-grid">${assessment.scores.map((item) => `
          <article class="data-card data-card-${scoreTone(item.value)}">
            <h3>${escapeHtml(item.label)}</h3>
            <p><strong>${Math.round(item.value)}/100</strong></p>
            <p>${escapeHtml(item.text)}</p>
          </article>
        `).join("")}</div>`,
      },
      {
        title: "SWOT по базе",
        html: `
          <div class="swot-readable">
            ${swotReadableGroup("Сильные стороны", "S", assessment.strengths, "Сильные стороны появятся после сохранения точки, контура и загрузки данных окружения.")}
            ${swotReadableGroup("Слабые стороны", "W", assessment.weaknesses, "Явных слабых мест по текущим данным немного, но нужны выездные проверки.")}
            ${swotReadableGroup("Возможности", "O", assessment.opportunities, "Возможности нужно уточнить после анализа концепции и конкурентов.")}
            ${swotReadableGroup("Угрозы и ограничения", "T", assessment.risks, "Критические угрозы по текущим данным не выделены, но проверки земли, инженерии и санитарных ограничений обязательны.")}
          </div>
        `,
      },
      {
        title: "Риски и проверки",
        html: listCards(assessment.risks, "Критические риски по текущим данным не выделены, но юридическую, инженерную и выездную проверку все равно нужно выполнить."),
      },
      {
        title: "Рекомендация по концепции",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Формат</h3><p>${escapeHtml(assessment.profile.audience)}.</p></article>
          <article class="data-card"><h3>Что усилить</h3><p>${escapeHtml(assessment.attractionCount >= 5 ? "Собрать программу вокруг найденных точек досуга и природного окружения." : "Создать собственный сильный сценарий: банный комплекс, видовая зона, события, семейные активности или гастроформат.")}</p></article>
          <article class="data-card"><h3>Следующий шаг</h3><p>Сохранить точный контур участка, проверить подъезд, инженерные подключения, документы на землю, санитарные и природоохранные ограничения.</p></article>
        </div>`,
      },
    ])}
  `;
}

function renderSectionHtml(section, ctx) {
  if (section.custom) return renderCustomSection(section, ctx);
  if (section.id === "geo") return renderGeo(section, ctx);
  if (section.id === "transport") return renderTransport(section, ctx);
  if (section.id === "ecology") return renderEcology(section, ctx);
  if (section.id === "surrounding") return renderSurrounding(section, ctx);
  if (section.id === "attractions") return renderAttractions(section, ctx);
  if (section.id === "socio") return renderSocio(section, ctx);
  if (section.id === "restrictions") return genericSection(section, ctx);
  if (section.id === "swot-object") return renderFinalAssessment(section, ctx);
  return genericSection(section, ctx);
}

function collectCustomSectionForm(section) {
  const project = currentProject();
  const source = project?.customSections?.find((item) => item.id === section.id);
  if (!source) return null;

  sectionOutput.querySelectorAll("[data-custom-section-field]").forEach((field) => {
    source[field.dataset.customSectionField] = field.value;
  });

  source.blocks = [...sectionOutput.querySelectorAll("[data-custom-block]")].map((blockNode) => {
    const block = {};
    blockNode.querySelectorAll("[data-custom-block-field]").forEach((field) => {
      block[field.dataset.customBlockField] = field.value;
    });
    block.type = block.type || "text";
    return block;
  });
  return source;
}

function hydrateCustomSectionEditor(section) {
  if (!section?.custom) return;
  const project = currentProject();
  const source = project?.customSections?.find((item) => item.id === section.id);
  if (!project || !source) return;

  const saveAndRender = () => {
    collectCustomSectionForm(section);
    project.updatedAt = new Date().toISOString();
    saveProjects();
    renderAll();
  };

  sectionOutput.querySelector("[data-custom-save]")?.addEventListener("click", saveAndRender);

  sectionOutput.querySelectorAll("[data-custom-add-block]").forEach((button) => {
    button.addEventListener("click", () => {
      collectCustomSectionForm(section);
      if (!Array.isArray(source.blocks)) source.blocks = [];
      source.blocks.push(customBlockDefaults(button.dataset.customAddBlock));
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderAll();
    });
  });

  sectionOutput.querySelectorAll("[data-custom-remove-block]").forEach((button) => {
    button.addEventListener("click", () => {
      collectCustomSectionForm(section);
      const index = Number(button.dataset.customRemoveBlock);
      if (Array.isArray(source.blocks) && Number.isInteger(index)) source.blocks.splice(index, 1);
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderAll();
    });
  });

  sectionOutput.querySelectorAll('[data-custom-block-field="type"]').forEach((select) => {
    select.addEventListener("change", () => {
      collectCustomSectionForm(section);
      const index = Number(select.closest("[data-custom-block]")?.dataset.customBlock);
      if (Array.isArray(source.blocks) && Number.isInteger(index)) {
        source.blocks[index] = { ...customBlockDefaults(select.value), title: source.blocks[index]?.title || customBlockDefaults(select.value).title };
      }
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderAll();
    });
  });

  sectionOutput.querySelector("[data-custom-delete-section]")?.addEventListener("click", () => {
    if (!window.confirm("Удалить эту ручную главу?")) return;
    project.customSections = (project.customSections || []).filter((item) => item.id !== section.id);
    state.activeSectionId = allSections[allSections.length - 1]?.id || "geo";
    project.updatedAt = new Date().toISOString();
    saveProjects();
    renderAll();
  });
}

async function renderSection() {
  if (!sectionOutput) return;
  const section = getAllSections().find((item) => item.id === state.activeSectionId) || allSections[0];
  const ctx = projectContext();
  sectionOutput.innerHTML = `${renderLead(section, ctx)}${loadingBlock(section.title)}`;
  if (ctx.city && section.id === "climate") {
    try {
      ctx.weatherDetail = await fetchWeather(ctx.city);
      ctx.tourismScore = extractTourismScore(ctx.weatherDetail);
      renderNav();
    } catch {
      ctx.weatherDetail = null;
      ctx.tourismScore = null;
    }
  }
  try {
    if (section.id === "transport") ctx.liveData = await fetchTransportData(ctx);
    if (section.id === "ecology") ctx.liveData = await fetchEcologyData(ctx);
    if (["surrounding", "socio"].includes(section.id)) ctx.liveData = await fetchInfrastructureData(ctx);
    if (section.id === "attractions") ctx.liveData = await fetchAttractionsData(ctx);
    if (section.id === "swot-object") {
      const [weather, transport, ecology, infrastructure, attractions] = await Promise.allSettled([
        ctx.city ? fetchWeather(ctx.city) : Promise.resolve(null),
        fetchTransportData(ctx),
        fetchEcologyData(ctx),
        fetchInfrastructureData(ctx),
        fetchAttractionsData(ctx),
      ]);
      ctx.weatherDetail = weather.status === "fulfilled" ? weather.value : null;
      ctx.tourismScore = extractTourismScore(ctx.weatherDetail);
      ctx.liveData = {
        transport: transport.status === "fulfilled" ? transport.value : null,
        ecology: ecology.status === "fulfilled" ? ecology.value : null,
        infrastructure: infrastructure.status === "fulfilled" ? infrastructure.value : null,
        attractions: attractions.status === "fulfilled" ? attractions.value : null,
      };
    }
  } catch {
    ctx.liveData = null;
  }
  if (section.id === "climate") {
    await renderClimate(section, ctx);
    return;
  }
  sectionOutput.innerHTML = renderSectionHtml(section, ctx);
  hydrateMapPicker();
  hydrateCustomSectionEditor(section);
  hydrateAccordions();
  activatePendingSubchapter();
}

async function renderAll() {
  const project = currentProject();
  const city = selectedCity();
  if (
    project &&
    city &&
    !project.locationLocked &&
    !(Array.isArray(project.basePolygon) && project.basePolygon.length >= 3)
  ) {
    await ensureCityCoordinates(city, project.id);
  }
  renderHeader();
  if (isProjectsPage) {
    renderProjects();
    renderCityResults();
    renderProjectSearch();
    renderProfile();
    renderAdminDashboard();
    renderUsersAdmin();
    renderTrash();
    return;
  }
  renderNav();
  await renderSection();
}

function hasPlaceType(place, types) {
  return Array.isArray(place?.types) && place.types.some((type) => types.includes(type));
}

function placeTypesLabel(place) {
  return Array.isArray(place?.types) && place.types.length
    ? place.types.slice(0, 3).map(typeLabelRu).join(", ")
    : "объект";
}

function placeDistanceKm(place, baseLat, baseLng) {
  const lat = Number(place?.geometry?.location?.lat?.() ?? place?.geometry?.location?.lat);
  const lng = Number(place?.geometry?.location?.lng?.() ?? place?.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return distanceKm(baseLat, baseLng, lat, lng);
}

function placeRows(places, baseLat, baseLng, limit = 12) {
  return (places || [])
    .map((place) => ({ place, distance: placeDistanceKm(place, baseLat, baseLng) }))
    .filter((item) => item.distance !== null)
    .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
    .slice(0, limit);
}

function placeCards(rows, emptyTitle, emptyText) {
  if (!rows.length) return emptyData(emptyTitle, emptyText);
  return `
    <div class="data-card-grid">
      ${rows.map(({ place, distance }) => `
        <article class="data-card">
          <h3>${escapeHtml(displayName(place.name, "Объект"))}</h3>
          <p><strong>Тип:</strong> ${escapeHtml(placeTypesLabel(place))}</p>
          <p><strong>Расстояние:</strong> ${formatNumber(distance, 2)} км от базы</p>
          ${place.vicinity ? `<p><strong>Адрес:</strong> ${escapeHtml(displayName(place.vicinity))}</p>` : ""}
          ${Number.isFinite(Number(place.rating)) ? `<p><strong>Рейтинг:</strong> ${formatNumber(place.rating, 1)}${place.user_ratings_total ? ` (${place.user_ratings_total} отзывов)` : ""}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function dedupePlaces(places) {
  const seen = new Set();
  return (places || []).filter((place) => {
    const key = place.place_id || `${place.name}:${place.vicinity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nearbySearchRequest(service, request) {
  return new Promise((resolve, reject) => {
    service.nearbySearch(request, (results, status) => {
      const ok = window.google?.maps?.places?.PlacesServiceStatus?.OK;
      const zero = window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;
      if (status === ok) {
        resolve(results || []);
        return;
      }
      if (status === zero) {
        resolve([]);
        return;
      }
      reject(new Error(`places-nearby-${status || "unknown"}`));
    });
  });
}

async function fetchGooglePlacesByTypes(lat, lng, radius, types) {
  const cacheKey = `google-places:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${types.join(",")}`;
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);

  const maps = await loadGoogleMapsApi();
  const service = new maps.places.PlacesService(document.createElement("div"));
  const requests = types.map((type) => nearbySearchRequest(service, {
    location: new maps.LatLng(lat, lng),
    radius,
    type,
  }));
  const settled = await Promise.allSettled(requests);
  const places = dedupePlaces(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
  state.liveCache.set(cacheKey, places);
  return places;
}

function textSearchRequest(service, request) {
  return new Promise((resolve, reject) => {
    service.textSearch(request, (results, status) => {
      const ok = window.google?.maps?.places?.PlacesServiceStatus?.OK;
      const zero = window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;
      if (status === ok) {
        resolve(results || []);
        return;
      }
      if (status === zero) {
        resolve([]);
        return;
      }
      reject(new Error(`places-text-${status || "unknown"}`));
    });
  });
}

async function fetchGooglePlacesByQueries(lat, lng, radius, queries) {
  const cacheKey = `google-places-query:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${queries.join(",")}`;
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);

  const maps = await loadGoogleMapsApi();
  const service = new maps.places.PlacesService(document.createElement("div"));
  const requests = queries.map((query) => textSearchRequest(service, {
    location: new maps.LatLng(lat, lng),
    radius,
    query,
  }));
  const settled = await Promise.allSettled(requests);
  const places = dedupePlaces(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
  state.liveCache.set(cacheKey, places);
  return places;
}

function mapProvider(project) {
  return ["osm", "google", "2gis"].includes(project?.mapProvider) ? project.mapProvider : "2gis";
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const googleMapView = hasGoogleMapsKey()
    ? `
      <div class="map-google-frame">
        <div
          class="google-map-canvas"
          data-city-lat="${cityLat}"
          data-city-lng="${cityLng}"
          data-base-lat="${baseLat}"
          data-base-lng="${baseLng}"
          data-center-lat="${centerLat}"
          data-center-lng="${centerLng}"
          data-zoom="${zoom}"
          data-base-polygon="${polygonJson}"
        ></div>
      </div>
    `
    : `
      <div class="map-external-frame map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Добавьте API-ключ локально</h3>
        <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
      </div>
    `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Google Maps</button>
      </div>
      ${provider === "google"
        ? googleMapView
        : `
          <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
            <div class="tile-layer"></div>
            <svg class="map-overlay" aria-hidden="true"></svg>
            <div class="map-interaction-layer" aria-label="Карта участка"></div>
            <span class="map-marker map-marker-city"></span>
            <span class="map-marker map-marker-base"></span>
            <div class="map-controls">
              <button type="button" data-map-zoom="in">+</button>
              <button type="button" data-map-zoom="out">-</button>
            </div>
          </div>
        `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan" ${provider !== "osm" ? "disabled" : ""}>Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw" ${provider !== "osm" ? "disabled" : ""}>Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save ${provider !== "osm" ? "disabled" : ""}>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear ${provider !== "osm" ? "disabled" : ""}>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "osm" ? "Используйте карту OSM для перемещения и отрисовки контура базы." : "Карты Google здесь работают как слой просмотра. Для редактирования контура переключитесь обратно на карту OSM."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Картах Google</a>
      </div>
    </article>
  `;
}

async function hydrateGoogleMap() {
  const canvas = sectionOutput.querySelector(".google-map-canvas");
  if (!canvas) return;

  try {
    const maps = await loadGoogleMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const baseLat = Number(canvas.dataset.baseLat);
    const baseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 12;
    const polygon = JSON.parse(canvas.dataset.basePolygon || "[]");

    const map = new maps.Map(canvas, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    new maps.Marker({
      position: { lat: cityLat, lng: cityLng },
      map,
      title: "Центр города",
    });

    new maps.Marker({
      position: { lat: baseLat, lng: baseLng },
      map,
      title: "База",
    });

    if (Array.isArray(polygon) && polygon.length >= 3) {
      new maps.Polygon({
        paths: polygon,
        map,
        strokeColor: "#cf4b32",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#d94135",
        fillOpacity: 0.18,
      });
    }
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">Google Maps</div>
        <h3>Карта не загрузилась</h3>
        <p>Проверьте <code>dashboard/map-config.js</code>, затем обновите страницу. У ключа должны быть разрешены <code>Maps JavaScript API</code> и домены <code>http://127.0.0.1:8000/*</code> и <code>http://localhost:8000/*</code>.</p>
      </div>
    `;
  }
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  hydrateGoogleMap();

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}

async function fetchInfrastructureData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const fallback = await (async () => {
    try {
      const cacheKey = `infra:${lat.toFixed(4)}:${lng.toFixed(4)}`;
      const query = overpassAround(lat, lng, 3000, (a, b, r) => `
        nwr(around:${r},${a},${b})["shop"];
        nwr(around:${r},${a},${b})["amenity"~"restaurant|cafe|fuel|pharmacy|clinic|hospital|marketplace|bank|atm|parking"];
        nwr(around:7000,${a},${b})["tourism"~"hotel|guest_house|chalet|camp_site|picnic_site|resort"];
        nwr(around:7000,${a},${b})["leisure"~"resort|park|swimming_pool|water_park|sports_centre"];
      `);
      return await fetchOverpass(query, cacheKey);
    } catch {
      return [];
    }
  })();

  if (!hasGoogleMapsKey()) {
    return { source: "osm", osm: fallback, services: [], competitors: [] };
  }

  try {
    const [services, competitors] = await Promise.all([
      fetchGooglePlacesByTypes(lat, lng, 5000, ["restaurant", "cafe", "gas_station", "pharmacy", "hospital", "supermarket", "shopping_mall", "bank", "atm", "parking"]),
      fetchGooglePlacesByTypes(lat, lng, 8000, ["lodging", "campground", "rv_park", "park", "tourist_attraction"]),
    ]);
    return { source: "google", osm: fallback, services, competitors };
  } catch {
    return { source: "osm", osm: fallback, services: [], competitors: [] };
  }
}

async function fetchAttractionsData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const fallback = await (async () => {
    try {
      const cacheKey = `attractions:${lat.toFixed(4)}:${lng.toFixed(4)}`;
      const query = overpassAround(lat, lng, 15000, (a, b, r) => `
        nwr(around:${r},${a},${b})["tourism"~"attraction|viewpoint|museum|theme_park|zoo|picnic_site"];
        nwr(around:${r},${a},${b})["historic"];
        nwr(around:${r},${a},${b})["natural"~"water|wood|peak|beach|spring"];
        nwr(around:${r},${a},${b})["leisure"~"park|nature_reserve|water_park"];
      `);
      return await fetchOverpass(query, cacheKey);
    } catch {
      return [];
    }
  })();

  if (!hasGoogleMapsKey()) {
    return { source: "osm", osm: fallback, attractions: [], natural: [], cultural: [] };
  }

  try {
    const [attractions, natural, cultural] = await Promise.all([
      fetchGooglePlacesByTypes(lat, lng, 15000, ["tourist_attraction", "museum", "park", "zoo", "amusement_park", "art_gallery"]),
      fetchGooglePlacesByTypes(lat, lng, 15000, ["park", "campground"]),
      fetchGooglePlacesByTypes(lat, lng, 15000, ["museum", "art_gallery", "tourist_attraction"]),
    ]);
    return { source: "google", osm: fallback, attractions, natural, cultural };
  } catch {
    return { source: "osm", osm: fallback, attractions: [], natural: [], cultural: [] };
  }
}

function renderSurrounding(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || {};
  const useGoogle = ["google", "2gis"].includes(live.source) && ((live.services?.length || 0) + (live.competitors?.length || 0) > 0);
  const osmSource = Array.isArray(live) ? live : live.osm || [];
  const services = useGoogle ? placeRows(live.services, baseLat, baseLng, 12) : osmRows(osmSource.filter(isServicePoi), baseLat, baseLng, 12);
  const competitors = useGoogle ? placeRows(live.competitors, baseLat, baseLng, 12) : osmRows(osmSource.filter(isCompetitorPoi), baseLat, baseLng, 12);
  const sourceLabel = live.source === "2gis" ? "объекты 2ГИС" : useGoogle ? "объекты Google" : "объекты OSM";
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Окружение и сервисы рядом</h3>
        <p>Здесь показаны реальные объекты рядом с базой: магазины, кафе, АЗС, аптеки, больницы, парковки и ближайшие рекреационные объекты. Основной источник: ${escapeHtml(sourceLabel)}.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Краткий вывод по инфраструктуре",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Городская опора</h3><p>${escapeHtml(ctx.cityName)} находится примерно в ${route.road.toFixed(1)} км расчетной дороги от базы.</p></article>
          <article class="data-card"><h3>Сервисы</h3><p>Рядом найдено ${services.length} полезных объектов: питание, топливо, медицина, покупки, банки и парковки.</p></article>
          <article class="data-card"><h3>Конкурентная среда</h3><p>Рядом найдено ${competitors.length} рекреационных объектов и мест размещения, которые стоит учесть в ТКП как конкурентов или точки притяжения.</p></article>
        </div>`,
      },
      {
        title: "Магазины, кафе, АЗС и полезные сервисы",
        html: useGoogle
          ? placeCards(services, "Сервисы рядом не найдены", "Поиск Google не вернул магазины, питание, топливо, медицину или парковки в выбранном радиусе.")
          : poiCards(services, "Сервисы рядом не найдены", "Карта OSM не вернула магазины, питание, топливо, медицину или парковки в выбранном радиусе."),
      },
      {
        title: "Конкуренты и рекреационные объекты рядом",
        html: useGoogle
          ? placeCards(competitors, "Конкуренты рядом не найдены", "Поиск Google не вернул отели, кемпинги, парки или туристические точки рядом с базой.")
          : poiCards(competitors, "Конкуренты рядом не найдены", "Карта OSM не вернула базы отдыха, гостиницы, кемпинги или парки рядом с базой."),
      },
      {
        title: "Числовая сводка по объектам",
        html: table(["Категория", "Количество"], [
          ["Сервисные объекты", String(services.length)],
          ["Конкуренты / рекреация", String(competitors.length)],
          ["Источник данных", sourceLabel],
        ]),
      },
    ])}
    ${sourceList(useGoogle
      ? [{ label: live.source === "2gis" ? "2GIS Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }]
      : [{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }])}
  `;
}

function renderAttractions(section, ctx) {
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || {};
  const useGoogle = ["google", "2gis"].includes(live.source) && ((live.attractions?.length || 0) + (live.natural?.length || 0) + (live.cultural?.length || 0) > 0);
  const osmSource = Array.isArray(live) ? live : live.osm || [];
  const attractions = useGoogle ? placeRows(live.attractions, baseLat, baseLng, 14) : osmRows(osmSource.filter((item) => isNaturalPoi(item) || isCulturePoi(item)), baseLat, baseLng, 14);
  const natural = useGoogle ? placeRows(live.natural, baseLat, baseLng, 8) : osmRows(osmSource.filter(isNaturalPoi), baseLat, baseLng, 8);
  const cultural = useGoogle ? placeRows(live.cultural, baseLat, baseLng, 8) : osmRows(osmSource.filter(isCulturePoi), baseLat, baseLng, 8);
  const sourceLabel = live.source === "2gis" ? "объекты 2ГИС" : useGoogle ? "объекты Google" : "объекты OSM";
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Туристические точки и досуг</h3>
        <p>Блок показывает, ради чего гость может приехать в район будущей базы: парки, музеи, достопримечательности и точки досуга рядом. Источник: ${escapeHtml(sourceLabel)}.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Краткий туристический вывод",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Потенциал досуга</h3><p>Рядом найдено ${attractions.length} точек досуга и туристического интереса.</p></article>
          <article class="data-card"><h3>Природный сценарий</h3><p>Природных и прогулочных мест найдено ${natural.length}.</p></article>
          <article class="data-card"><h3>Культурный сценарий</h3><p>Культурных и туристических точек найдено ${cultural.length}.</p></article>
        </div>`,
      },
      {
        title: "Ближайшие туристические точки",
        html: useGoogle
          ? placeCards(attractions, "Туристические точки рядом не найдены", "Поиск Google не вернул достопримечательности и точки досуга в выбранном радиусе.")
          : poiCards(attractions, "Туристические точки рядом не найдены", "Карта OSM не вернула достопримечательности и точки досуга в выбранном радиусе."),
      },
      {
        title: "Природные места",
        html: useGoogle
          ? placeCards(natural, "Природные места рядом не найдены", "Поиск Google не вернул парки или природные точки рядом с базой.")
          : poiCards(natural, "Природные места рядом не найдены", "Карта OSM не вернула парки или природные точки рядом с базой."),
      },
      {
        title: "Культурные и туристические объекты",
        html: useGoogle
          ? placeCards(cultural, "Культурные объекты рядом не найдены", "Поиск Google не вернул музеи или туристические объекты рядом с базой.")
          : poiCards(cultural, "Культурные объекты рядом не найдены", "Карта OSM не вернула музеи или туристические объекты рядом с базой."),
      },
    ])}
    ${sourceList(useGoogle
      ? [{ label: live.source === "2gis" ? "2GIS Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }]
      : [{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }])}
  `;
}

function renderSocio(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || {};
  const useGoogle = ["google", "2gis"].includes(live.source) && ((live.services?.length || 0) + (live.competitors?.length || 0) > 0);
  const osmSource = Array.isArray(live) ? live : live.osm || [];
  const services = useGoogle ? placeRows(live.services, baseLat, baseLng, 30) : osmRows(osmSource.filter(isServicePoi), baseLat, baseLng, 30);
  const food = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["restaurant", "cafe"])) : services.filter(({ element }) => ["restaurant", "cafe"].includes(osmRawKind(element)));
  const finance = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["bank", "atm"])) : services.filter(({ element }) => ["bank", "atm"].includes(osmRawKind(element)));
  const medical = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["pharmacy", "hospital"])) : services.filter(({ element }) => ["pharmacy", "clinic", "hospital"].includes(osmRawKind(element)));
  const competitors = useGoogle ? placeRows(live.competitors || [], baseLat, baseLng, 30) : osmRows(osmSource.filter(isCompetitorPoi), baseLat, baseLng, 30);
  const profile = demandProfile(ctx, route);
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Социально-экономический фон</h3>
        <p>Здесь показан вывод по потенциальному спросу и активности вокруг базы: удаленность от города, насыщенность сервисами, питание, медицина, банки и рекреационные объекты рядом.</p>
      </article>
    </div>
    ${accordion([
      {
        title: "Потенциальная аудитория",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>База спроса</h3><p>${escapeHtml(ctx.cityName)}: ${escapeHtml(profile.scale)}.</p></article>
          <article class="data-card"><h3>Кто может приезжать</h3><p>${escapeHtml(profile.audience)}.</p></article>
          <article class="data-card"><h3>Вывод для концепции</h3><p>${escapeHtml(profile.conclusion)}.</p></article>
        </div>`,
      },
      {
        title: "Экономическая активность вокруг точки",
        html: table(["Индикатор", "Значение"], [
          ["Расчетное расстояние от города", `${route.road.toFixed(1)} км`],
          ["Сервисные объекты рядом", String(services.length)],
          ["Кафе и рестораны", String(food.length)],
          ["Банки и банкоматы", String(finance.length)],
          ["Аптеки и медицина", String(medical.length)],
          ["Размещение / рекреация рядом", String(competitors.length)],
          ["Источник объектов", live.source === "2gis" ? "объекты 2ГИС" : useGoogle ? "объекты Google" : "объекты OSM"],
        ]),
      },
      {
        title: "Что добрать из официальной статистики",
        html: `<div class="data-card-grid">
          <article class="data-card"><h3>Население</h3><p>Добавьте официальные данные по численности города и района, чтобы оценить емкость локального рынка.</p></article>
          <article class="data-card"><h3>Доходы и занятость</h3><p>Нужны средние доходы, занятость и структура аудитории, чтобы выбрать ценовой сегмент базы.</p></article>
          <article class="data-card"><h3>Турпоток</h3><p>Нужны данные по внутреннему туризму, размещению и поездкам выходного дня по региону.</p></article>
        </div>`,
      },
    ])}
    ${sourceList([
      ...(useGoogle ? [{ label: live.source === "2gis" ? "2GIS Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }] : [{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }]),
      { label: "Бюро национальной статистики", url: "https://stat.gov.kz/ru/" },
    ])}
  `;
}

function renderTransport(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const transit = ctx.liveData || [];
  const stops = osmRows(transit.filter((item) => item.type !== "relation"), baseLat, baseLng, 8);
  const routes = transit.filter((item) => item.type === "relation").slice(0, 12);
  const roadQuality = route.road <= 15
    ? "очень близкая локация, подходит для day-use и коротких вечерних поездок"
    : route.road <= 45
      ? "комфортный загородный радиус, подходит для выходных и корпоративных выездов"
      : "дальний радиус, нужен сильный повод поездки и понятный трансфер";

  return `
    ${renderLead(section, ctx)}
    <div class="geo-map-shell">
      <article class="geo-summary-card">
        <div class="geo-summary-head">
          <span class="geo-summary-label">Транспортная доступность</span>
          <strong>${escapeHtml(ctx.cityName)}, ${escapeHtml(ctx.regionName)}</strong>
        </div>
        <p>Точка базы находится примерно в ${route.road.toFixed(1)} км расчетной дороги от центра города. Ориентировочное время на автомобиле ${route.carMinutes} мин, на автобусе или с пересадками от ${route.busMinutes} мин. Карта ниже показывает базу и город как опорную транспортную точку.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Расчет доступности от центра города",
        html: table(["Маршрут", "Оценка по отмеченной точке", "Вывод для проекта"], [
          ["Автомобиль", `${route.road.toFixed(1)} км / ${route.carMinutes} мин`, "проверить качество дороги, съезд, освещение и зимнюю проходимость"],
          ["Такси / трансфер", `${route.carMinutes + 8}-${route.carMinutes + 18} мин`, "нужны точка посадки, стоимость трансфера и понятная навигация"],
          ["Автобус", `${route.busMinutes} мин и более`, "если рядом нет остановки, нужен трансфер от ближайшего маршрута"],
          ["Радиус поездки", roadQuality, "влияет на формат: дневной отдых, выходные или организованный трансфер"],
        ]),
      },
      {
        title: "Остановки рядом с точкой",
        html: stops.length ? htmlTable(["Остановка", "Тип", "Расстояние"], stops.map(({ element, distance }) => [
          escapeHtml(osmName(element)),
          escapeHtml(osmKind(element)),
          `${distance.toFixed(2)} км`,
        ])) : emptyData("Остановки рядом не найдены", "В OpenStreetMap рядом с отмеченной точкой не найдено bus_stop/platform. Нужно дополнительно проверить городскую схему маршрутов."),
      },
      {
        title: "Маршруты общественного транспорта",
        html: routes.length ? htmlTable(["Маршрут", "Номер / название", "Оператор"], routes.map((element) => [
          escapeHtml(osmKind(element)),
          escapeHtml(element.tags?.ref || osmName(element)),
          escapeHtml(element.tags?.operator || "не указан"),
        ])) : emptyData("Маршруты рядом не найдены", "В OpenStreetMap нет route=bus рядом с точкой. Это не значит, что транспорта нет, но нужен отдельный источник по маршрутам города."),
      },
    ])}
    ${sourceList([{ label: "EasyWay Казахстан", url: "https://kz.easyway.info/ru" }])}
  `;
}

async function fetchTransportData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `transport-osm:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 900, (a, b, r) => `
    node(around:${r},${a},${b})["highway"="bus_stop"];
    node(around:${r},${a},${b})["public_transport"~"platform|stop_position"];
    relation(around:1800,${a},${b})["route"~"bus|trolleybus|tram"];
  `);

  const [osmResult, googleStopsResult] = await Promise.allSettled([
    fetchOverpass(query, cacheKey),
    hasGoogleMapsKey()
      ? fetchGooglePlacesByTypes(lat, lng, 5000, ["transit_station", "bus_station", "train_station"])
      : Promise.resolve([]),
  ]);

  return {
    osm: osmResult.status === "fulfilled" ? osmResult.value : [],
    googleStops: googleStopsResult.status === "fulfilled" ? googleStopsResult.value : [],
  };
}

function renderTransport(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const transportData = ctx.liveData || {};
  const osmTransit = transportData.osm || [];
  const googleStops = [...(transportData.twoGisStops || []), ...(transportData.googleStops || [])];
  const stops = osmRows(osmTransit.filter((item) => item.type !== "relation"), baseLat, baseLng, 8);
  const googleStopRows = placeRows(googleStops, baseLat, baseLng, 8);
  const routes = osmTransit.filter((item) => item.type === "relation").slice(0, 12);
  const roadQuality = route.road <= 15
    ? "очень близкая локация, подходит для day-use и коротких вечерних поездок"
    : route.road <= 45
      ? "комфортный загородный радиус, подходит для выходных и корпоративных выездов"
      : "дальний радиус, нужен сильный повод поездки и понятный трансфер";

  return `
    ${renderLead(section, ctx)}
    <div class="geo-map-shell">
      <article class="geo-summary-card">
        <div class="geo-summary-head">
          <span class="geo-summary-label">Транспортная доступность</span>
          <strong>${escapeHtml(ctx.cityName)}, ${escapeHtml(ctx.regionName)}</strong>
        </div>
        <p>Точка базы находится примерно в ${route.road.toFixed(1)} км расчетной дороги от центра города. На Google-карте ниже показывается маршрут от центра до базы, а также ближайшие остановки рядом с участком, если они доступны в источниках карты.</p>
      </article>
      ${mapEmbed(ctx)}
    </div>
    ${accordion([
      {
        title: "Расчет доступности от центра города",
        html: table(["Маршрут", "Оценка по отмеченной точке", "Вывод для проекта"], [
          ["Автомобиль", `${route.road.toFixed(1)} км / ${route.carMinutes} мин`, "проверить качество дороги, съезд, освещение и зимнюю проходимость"],
          ["Такси / трансфер", `${route.carMinutes + 8}-${route.carMinutes + 18} мин`, "нужны точка посадки, стоимость трансфера и понятная навигация"],
          ["Автобус / transit", `${route.busMinutes} мин и более`, "если Google или OSM не показывают путь полностью, нужен отдельный городской источник по маршрутам"],
          ["Радиус поездки", roadQuality, "влияет на формат: дневной отдых, выходные или организованный трансфер"],
        ]),
      },
      {
        title: "Ближайшие остановки рядом с базой",
        html: googleStopRows.length
          ? placeCards(googleStopRows, "Остановки рядом не найдены", "")
          : stops.length
            ? htmlTable(["Остановка", "Тип", "Расстояние"], stops.map(({ element, distance }) => [
              escapeHtml(osmName(element)),
              escapeHtml(osmKind(element)),
              `${distance.toFixed(2)} км`,
            ]))
            : emptyData("Остановки рядом не найдены", "Google Places и OpenStreetMap не вернули остановки рядом с базой в выбранном радиусе."),
      },
      {
        title: "Маршруты общественного транспорта рядом",
        html: routes.length
          ? htmlTable(["Маршрут", "Номер / название", "Оператор"], routes.map((element) => [
              escapeHtml(osmKind(element)),
              escapeHtml(element.tags?.ref || osmName(element)),
              escapeHtml(element.tags?.operator || "не указан"),
            ]))
          : emptyData("Маршруты рядом не найдены", "В OpenStreetMap нет route=bus рядом с точкой. Маршрут до базы на карте всё равно может строиться через Google transit, если регион поддерживается."),
      },
    ])}
    ${sourceList([
      { label: "Google Places", url: "https://developers.google.com/maps/documentation/places/web-service/overview" },
      { label: "EasyWay Казахстан", url: "https://kz.easyway.info/ru" },
      { label: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    ])}
  `;
}

async function hydrateGoogleMap() {
  const canvas = sectionOutput.querySelector(".google-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  try {
    const maps = await loadGoogleMapsApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const baseLat = Number(canvas.dataset.baseLat);
    const baseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 12;

    const map = new maps.Map(canvas, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    const cityMarker = new maps.Marker({
      position: { lat: cityLat, lng: cityLng },
      map,
      title: "Центр города",
    });

    const baseMarker = new maps.Marker({
      position: { lat: baseLat, lng: baseLng },
      map,
      title: "База",
    });

    const polygonShape = new maps.Polygon({
      paths: draftPolygon,
      map,
      strokeColor: "#cf4b32",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#d94135",
      fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0,
    });

    let draftMarkers = [];
    let transportMarkers = [];

    function clearDraftMarkers() {
      draftMarkers.forEach((marker) => marker.setMap(null));
      draftMarkers = [];
    }

    function clearTransportMarkers() {
      transportMarkers.forEach((marker) => marker.setMap(null));
      transportMarkers = [];
    }

    function polygonMatchesSaved() {
      return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
        const savedPoint = savedPolygon[index];
        return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
      });
    }

    function syncButtons() {
      panButton?.classList.toggle("is-active", !drawMode);
      drawButton?.classList.toggle("is-active", drawMode);
      if (saveButton) saveButton.disabled = draftPolygon.length < 3;
      map.setOptions({ draggableCursor: drawMode ? "crosshair" : undefined });
    }

    function updateAreaLabel() {
      const draftArea = polygonAreaSqMeters(draftPolygon);
      const savedArea = polygonAreaSqMeters(savedPolygon);
      const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
      if (areaNode) {
        areaNode.textContent = draftArea > 0
          ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
          : savedArea > 0
            ? formatArea(savedArea)
            : "Пока не рассчитана";
      }
      if (hintNode) {
        hintNode.textContent = state.activeSectionId === "transport"
          ? "На карте показан маршрут от центра до базы. В режиме границ можно дополнительно редактировать контур участка."
          : drawMode
            ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
            : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
      }
    }

    function repaintPolygon() {
      polygonShape.setPaths(draftPolygon);
      polygonShape.setOptions({ fillOpacity: draftPolygon.length >= 3 ? 0.18 : 0 });
      clearDraftMarkers();
      draftMarkers = draftPolygon.map((point) => new maps.Marker({
        position: point,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#cf4b32",
          strokeWeight: 2,
        },
        clickable: false,
      }));
      const previewCenter = polygonCentroid(draftPolygon);
      if (previewCenter) {
        baseMarker.setPosition(previewCenter);
      } else {
        baseMarker.setPosition({ lat: baseLat, lng: baseLng });
      }
      updateAreaLabel();
      syncButtons();
    }

    async function renderTransportOverlay() {
      if (state.activeSectionId !== "transport") return;
      const directionsService = new maps.DirectionsService();
      const directionsRenderer = new maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#1f8a83",
          strokeOpacity: 0.92,
          strokeWeight: 5,
        },
      });

      const transitRequest = {
        origin: { lat: cityLat, lng: cityLng },
        destination: { lat: baseLat, lng: baseLng },
        travelMode: maps.TravelMode.TRANSIT,
        provideRouteAlternatives: true,
      };

      try {
        const result = await directionsService.route(transitRequest);
        directionsRenderer.setDirections(result);
      } catch {
        try {
          const driveResult = await directionsService.route({
            origin: { lat: cityLat, lng: cityLng },
            destination: { lat: baseLat, lng: baseLng },
            travelMode: maps.TravelMode.DRIVING,
          });
          directionsRenderer.setDirections(driveResult);
        } catch {}
      }

      try {
        const transportData = await fetchTransportData(projectContext());
        const stopRows = (transportData.googleStops?.length
          ? placeRows(transportData.googleStops, baseLat, baseLng, 6).map(({ place }) => ({
              lat: Number(place.geometry?.location?.lat?.() ?? place.geometry?.location?.lat),
              lng: Number(place.geometry?.location?.lng?.() ?? place.geometry?.location?.lng),
              title: displayName(place.name, "Остановка"),
            }))
          : osmRows((transportData.osm || []).filter((item) => item.type !== "relation"), baseLat, baseLng, 6).map(({ element }) => {
              const coord = elementCoord(element);
              return coord ? { lat: coord[0], lng: coord[1], title: osmName(element) } : null;
            }).filter(Boolean));

        clearTransportMarkers();
        transportMarkers = stopRows.map((stop) => new maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: stop.title,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#1f8a83",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        }));
      } catch {}
    }

    map.addListener("click", (event) => {
      if (!drawMode) return;
      draftPolygon = [...draftPolygon, { lat: event.latLng.lat(), lng: event.latLng.lng() }];
      repaintPolygon();
    });

    map.addListener("idle", () => {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter();
      active.mapCenterLat = String(center.lat());
      active.mapCenterLng = String(center.lng());
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    });

    panButton?.addEventListener("click", () => {
      drawMode = false;
      syncButtons();
      updateAreaLabel();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      updateAreaLabel();
    });

    saveButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
        return;
      }
      const centroid = polygonCentroid(draftPolygon);
      active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
        baseMarker.setPosition(centroid);
      }
      const center = map.getCenter();
      active.mapCenterLat = String(center.lat());
      active.mapCenterLng = String(center.lng());
      active.mapZoom = String(map.getZoom() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active) return;
      const hasSaved = basePolygon(active).length >= 3;
      if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();
      repaintPolygon();
      if (hasSaved) renderSection();
    });

    repaintPolygon();
    cityMarker.setMap(map);
    await renderTransportOverlay();
  } catch {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="map-external-card">
        <div class="map-external-badge">Карты Google</div>
        <h3>Карта не загрузилась</h3>
        <p>Проверьте <code>dashboard/map-config.js</code>, затем обновите страницу. У ключа должны быть разрешены <code>Maps JavaScript API</code>, <code>Places API</code> и, если хотите отдельные серверные маршруты, <code>Routes API</code>.</p>
      </div>
    `;
  }
}

async function loadCatalog() {
  const response = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  state.catalog = payload.regions || [];
  state.cities = flattenCatalog(payload);
  await loadCityCoordinateIndex();
  loadCityGeoCache();
  loadProjects();
  ensureCurrentUserInUsers();
  const projectId = requestedProjectId();
  if (projectId && state.projects.some((project) => project.id === projectId)) {
    state.activeProjectId = projectId;
  } else if (isProjectPage) {
    state.activeProjectId = null;
  } else if (isProjectsPage) {
    state.activeProjectId = null;
  }
  syncFormFromProject();
  await renderAll();
}

citySearch?.addEventListener("input", () => {
  state.selectedCitySlug = null;
  renderCityResults();
});

projectViewButtons.forEach((button) => {
  button.addEventListener("click", () => setProjectDashboardView(button.dataset.projectView));
});

globalSearch?.addEventListener("input", renderProjectSearch);
globalSearch?.addEventListener("focus", renderProjectSearch);
globalSearch?.closest("form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderProjectSearch();
});

sidebarToggleButtons.forEach((button) => {
  button.addEventListener("click", toggleSidebar);
});

logoutButton?.addEventListener("click", logoutCurrentUser);

profilePhotoInput?.addEventListener("change", () => {
  const file = profilePhotoInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const profile = loadProfile();
    profile.photo = String(reader.result || "");
    saveProfile(profile);
    renderProfile();
  });
  reader.readAsDataURL(file);
});

saveProfileButton?.addEventListener("click", persistProfileComment);
profileComment?.addEventListener("blur", persistProfileComment);
createUserButton?.addEventListener("click", createUserFromAdmin);
clearTrashButton?.addEventListener("click", clearTrash);

saveProjectButton?.addEventListener("click", saveActiveProject);
newProjectButton?.addEventListener("click", createNewProject);
deleteProjectButton?.addEventListener("click", deleteActiveProject);

loadCatalog().catch(() => {
  const target = sectionOutput || projectList;
  if (!target) return;
  target.innerHTML = `
    <section class="empty-state">
      <h2>Каталог не загрузился</h2>
      <p>Откройте проект через локальный сервер: python server.py.</p>
    </section>
  `;
});
function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [centerLat, centerLng] = mapCenterCoords(ctx.project, ctx.city);
  const zoom = Number(ctx.project?.mapZoom) || 12;
  const provider = mapProvider(ctx.project);
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">Карта OSM</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
      </div>
      ${provider === "google"
        ? hasGoogleMapsKey()
          ? `
            <div class="map-google-frame">
              <div
                class="google-map-canvas"
                data-city-lat="${cityLat}"
                data-city-lng="${cityLng}"
                data-base-lat="${baseLat}"
                data-base-lng="${baseLng}"
                data-center-lat="${centerLat}"
                data-center-lng="${centerLng}"
                data-zoom="${zoom}"
                data-base-polygon="${polygonJson}"
              ></div>
            </div>
          `
          : `
            <div class="map-external-frame map-external-card">
              <div class="map-external-badge">Карты Google</div>
              <h3>Добавьте API-ключ локально</h3>
              <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
            </div>
          `
        : `
          <div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
            <div class="tile-layer"></div>
            <svg class="map-overlay" aria-hidden="true"></svg>
            <div class="map-interaction-layer" aria-label="Карта участка"></div>
            <span class="map-marker map-marker-city"></span>
            <span class="map-marker map-marker-base"></span>
            <div class="map-controls">
              <button type="button" data-map-zoom="in">+</button>
              <button type="button" data-map-zoom="out">-</button>
            </div>
          </div>
        `}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Перемещать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Отмечать границы базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить площадь</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Пока не рассчитана"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : "Используйте карту OSM для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Картах Google</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".google-map-canvas")) {
    hydrateGoogleMap();
    return;
  }

  const frame = sectionOutput.querySelector(".map-frame");
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let pointerDown = false;
  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startCenterWorld = null;
  const mapState = {
    zoom: Number(frame.dataset.zoom) || 12,
    cityLat: Number(frame.dataset.cityLat),
    cityLng: Number(frame.dataset.cityLng),
    baseLat: Number(frame.dataset.baseLat),
    baseLng: Number(frame.dataset.baseLng),
    centerLat: Number(frame.dataset.centerLat),
    centerLng: Number(frame.dataset.centerLng),
  };
  const areaNode = frame.parentElement.querySelector("[data-map-area]");
  const hintNode = frame.parentElement.querySelector("[data-map-hint]");
  const panButton = frame.parentElement.querySelector('[data-map-mode="pan"]');
  const drawButton = frame.parentElement.querySelector('[data-map-mode="draw"]');
  const saveButton = frame.parentElement.querySelector("[data-map-save]");
  const clearButton = frame.parentElement.querySelector("[data-map-clear]");

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    const active = currentProject();
    if (!active) return;
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
  }

  function updateAreaLabel() {
    const draftArea = polygonAreaSqMeters(draftPolygon);
    const savedArea = polygonAreaSqMeters(savedPolygon);
    const isSavedView = savedPolygon.length >= 3 && polygonMatchesSaved();
    if (areaNode) {
      areaNode.textContent = draftArea > 0
        ? `${formatArea(draftArea)}${isSavedView ? "" : " · черновик"}`
        : savedArea > 0
          ? formatArea(savedArea)
          : "Пока не рассчитана";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим границ включен: кликайте по карте, чтобы добавить точки контура базы."
        : "После сохранения базы сайт использует эту точку для анализа инфраструктуры, транспорта, экологии и мест интереса рядом.";
    }
  }

  function syncButtons() {
    frame.classList.toggle("is-draw-mode", drawMode);
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  function repaint() {
    const previewCenter = polygonCentroid(draftPolygon);
    renderTileMap(frame, {
      ...mapState,
      baseLat: previewCenter?.lat ?? mapState.baseLat,
      baseLng: previewCenter?.lng ?? mapState.baseLng,
      polygon: draftPolygon,
      polygonSaved: savedPolygon.length >= 3 && polygonMatchesSaved(),
    });
    updateAreaLabel();
    syncButtons();
  }

  function pointFromEvent(event) {
    const rect = frame.getBoundingClientRect();
    const center = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    const worldX = center.x - rect.width / 2 + (event.clientX - rect.left);
    const worldY = center.y - rect.height / 2 + (event.clientY - rect.top);
    const [lat, lng] = worldToLonLat(worldX, worldY, mapState.zoom);
    return { lat: clampLatitude(lat), lng: wrapLongitude(lng) };
  }

  repaint();

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerDown = true;
    dragging = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startCenterWorld = lonLatToWorld(mapState.centerLat, mapState.centerLng, mapState.zoom);
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!pointerDown || activePointerId !== event.pointerId || !startCenterWorld) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragging = true;
      const [lat, lng] = worldToLonLat(startCenterWorld.x - dx, startCenterWorld.y - dy, mapState.zoom);
      mapState.centerLat = clampLatitude(lat);
      mapState.centerLng = wrapLongitude(lng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode) {
      draftPolygon = [...draftPolygon, pointFromEvent(event)];
      repaint();
    } else if (dragging) {
      persistMapView();
    }
    pointerDown = false;
    dragging = false;
    startCenterWorld = null;
    if (activePointerId !== null) {
      try {
        layer.releasePointerCapture(activePointerId);
      } catch {}
    }
    activePointerId = null;
  }

  layer.addEventListener("pointerup", finishPointer);
  layer.addEventListener("pointercancel", finishPointer);

  frame.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      mapState.zoom = Math.max(8, Math.min(17, mapState.zoom + (button.dataset.mapZoom === "in" ? 1 : -1)));
      persistMapView();
      repaint();
    });
  });

  panButton?.addEventListener("click", () => {
    drawMode = false;
    syncButtons();
    updateAreaLabel();
  });

  drawButton?.addEventListener("click", () => {
    drawMode = true;
    syncButtons();
    updateAreaLabel();
  });

  saveButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active || draftPolygon.length < 3) {
      window.alert("Нужно поставить минимум 3 точки, чтобы сохранить площадь базы.");
      return;
    }
    const centroid = polygonCentroid(draftPolygon);
    active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
    if (centroid) {
      active.lat = String(centroid.lat);
      active.lng = String(centroid.lng);
      mapState.baseLat = centroid.lat;
      mapState.baseLng = centroid.lng;
    }
    active.mapCenterLat = String(mapState.centerLat);
    active.mapCenterLng = String(mapState.centerLng);
    active.mapZoom = String(mapState.zoom);
    active.updatedAt = new Date().toISOString();
    saveProjects();
    renderHeader();
    renderSection();
  });

  clearButton?.addEventListener("click", () => {
    const active = currentProject();
    if (!active) return;
    const hasSaved = basePolygon(active).length >= 3;
    if (hasSaved && !window.confirm("Очистить сохраненный контур базы и площадь?")) return;
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
    if (hasSaved) renderSection();
  });
}
