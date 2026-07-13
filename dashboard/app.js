const CATALOG_URL = "../data/kz_weather_catalog.json";
const CITY_COORDS_URL = "../data/kz_city_coords.json";
const STORAGE_KEY = "omarta_tkp_projects_v1";
const STORAGE_BACKUP_KEY = "omarta_tkp_projects_backup_before_structure_v1";
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
const headerStructureNav = document.getElementById("header-structure-nav") || optionalTextNode;
const profileAccountRole = document.getElementById("profile-account-role") || optionalTextNode;
const userFullName = document.getElementById("user-full-name");
const userLogin = document.getElementById("user-login");
const userPassword = document.getElementById("user-password");
const userRole = document.getElementById("user-role");
const createUserButton = document.getElementById("create-user");
const usersList = document.getElementById("users-list");
const logoutButton = document.getElementById("logout-button");
const sidebarToggleButtons = [...document.querySelectorAll("[data-sidebar-toggle]")];
const adminUsersCount = document.getElementById("admin-users-count") || optionalTextNode;
const adminProjectsCount = document.getElementById("admin-projects-count") || optionalTextNode;
const catalogCount = document.getElementById("catalog-count") || optionalTextNode;
const activeProjectTitle = document.getElementById("active-project-title") || optionalTextNode;
const activeProjectMeta = document.getElementById("active-project-meta") || optionalTextNode;
const statSections = document.getElementById("stat-sections") || optionalTextNode;
const statWeather = document.getElementById("stat-weather") || optionalTextNode;

const automaticSectionItems = [
  ["geo", "1.1.1", "Географические характеристики", "авто: карта / рельеф / местность"],
  ["climate", "1.1.2", "Климатические характеристики", "авто: WeatherSpark / сезонность / баллы"],
  ["transport", "1.1.3", "Транспортная доступность", "авто: маршрут / время / подъезд"],
  ["ecology", "1.1.4", "Экологическая обстановка", "авто: воздух / зеленые зоны / риски"],
  ["surrounding", "1.3", "Окружающей инфраструктуры", "авто: сервисы рядом / конкуренты / радиусы"],
  ["attractions", "2.2", "Туристические точки и досуг", "авто: достопримечательности / маршруты"],
  ["socio", "2.3", "Социально-экономический фон", "авто: население / спрос / туризм"],
  ["restrictions", "1.5", "Ограничения участка", "авто: земля / санитарные зоны / риски"],
  ["swot-object", "1.6", "Итоговая оценка места", "авто: SWOT / выводы"],
];

const methodology = [
  {
    id: "tkp-structure",
    title: "Структура ТКП",
    items: [
      ["chapter-object", "1", "Анализ основных характеристик объекта", "участок / карта / ограничения"],
      ["chapter-market", "2", "Анализ локального рынка инфраструктурного объекта и связанных услуг", "рынок / аудитория / конкуренты"],
      ["chapter-options", "3", "Анализ вариантов развития", "сценарии / ранжирование / рекомендации"],
      ["chapter-concept", "4", "Предварительная концепция развития", "концепция / финансы / выводы"],
    ],
  },
];

const PROJECT_STRUCTURE_TEMPLATE = [
  {
    id: "chapter-object",
    number: "1",
    title: "Анализ основных характеристик объекта",
    required: true,
    children: [
      {
        id: "struct-location",
        number: "1.1",
        title: "Местоположение",
        required: true,
        children: [
          { id: "struct-geo", number: "1.1.1", title: "Географические характеристики", required: true, autoId: "geo" },
          { id: "struct-climate", number: "1.1.2", title: "Климатические характеристики", required: true, autoId: "climate" },
          { id: "struct-transport", number: "1.1.3", title: "Транспортная доступность", required: true, autoId: "transport" },
          { id: "struct-ecology", number: "1.1.4", title: "Экологическая обстановка", required: true, autoId: "ecology" },
        ],
      },
      { id: "struct-internal", number: "1.2", title: "Внутренней инфраструктуры", required: false, children: [] },
      { id: "struct-surrounding", number: "1.3", title: "Окружающей инфраструктуры", required: true, autoId: "surrounding" },
      { id: "struct-current-use", number: "1.4", title: "Текущего использования", required: false, children: [] },
      { id: "struct-restrictions", number: "1.5", title: "Возможных ограничений", required: true, autoId: "restrictions" },
      { id: "struct-swot-object", number: "1.6", title: "SWOT-анализ объекта", required: true, autoId: "swot-object" },
    ],
  },
  {
    id: "chapter-market",
    number: "2",
    title: "Анализ локального рынка инфраструктурного объекта и связанных услуг",
    required: true,
    children: [
      { id: "struct-market-overview", number: "2.1", title: "Локальный рынок инфраструктурного объекта", required: false, children: [] },
      { id: "struct-attractions", number: "2.2", title: "Туристические точки и досуг", required: true, autoId: "attractions" },
      { id: "struct-socio", number: "2.3", title: "Социально-экономический фон и спрос", required: true, autoId: "socio" },
      { id: "struct-competitors", number: "2.4", title: "Конкурентная среда и сравнение параметров", required: false, autoId: "surrounding" },
      { id: "struct-target", number: "2.5", title: "Целевые аудитории и потребительские сценарии", required: false, children: [] },
    ],
  },
  {
    id: "chapter-options",
    number: "3",
    title: "Анализ вариантов развития",
    required: false,
    children: [
      { id: "struct-compare", number: "3.1", title: "Сопоставление результатов анализа характеристик объекта и результатов анализа рынка", required: false, children: [] },
      {
        id: "struct-scenarios",
        number: "3.2",
        title: "Уточнение перечня возможных вариантов развития объекта",
        required: false,
        children: [
          { id: "struct-base-scenario", number: "3.2.1", title: "Базовый сценарий", required: false },
          { id: "struct-expanded-scenario", number: "3.2.2", title: "Расширенный сценарий", required: false },
        ],
      },
      { id: "struct-options-swot", number: "3.3", title: "SWOT-анализ перспективных вариантов", required: false, children: [] },
      { id: "struct-ranking", number: "3.4", title: "Интегральная оценка и ранжирование вариантов развития", required: false, children: [] },
      { id: "struct-recommendations", number: "3.5", title: "Выводы и рекомендации", required: false, children: [] },
    ],
  },
  {
    id: "chapter-concept",
    number: "4",
    title: "Предварительная концепция развития",
    required: false,
    children: [
      { id: "struct-concept-positioning", number: "4.1", title: "Согласование одного из наиболее перспективных вариантов развития", required: false, children: [] },
      { id: "struct-functional-program", number: "4.2", title: "Описание параметров и специфики объекта в будущем", required: false, children: [] },
      { id: "struct-financial", number: "4.3", title: "Составление финансовой модели", required: false, children: [] },
      { id: "struct-concept-swot", number: "4.4", title: "SWOT концепции с учетом финансовых показателей", required: false, children: [] },
      { id: "struct-conclusion", number: "4.5", title: "Заключение и выводы", required: false, children: [] },
    ],
  },
];

const PRESENTATION_INSIGHTS = {
  "chapter-object": {
    badge: "паспорт участка",
    title: "Главное по объекту",
    lead: "Участок подходит для загородного wellness-формата рядом с выбранным городом: сильные стороны — близость к городу, ровный рельеф и природный каркас; главные условия реализации — инженерная подготовка, дренаж и работа с сезонностью.",
    metrics: [
      ["7,9 га", "площадь рассматриваемой территории"],
      ["1,5 км", "от черты выбранного города"],
      ["15-20 км", "до центра выбранного города на автомобиле"],
      ["~2 га", "заболоченная низинная зона"],
    ],
    points: [
      "Территория вытянута примерно на 800 м, перепад высот по длине до 5 м, что удобно для поэтапного зонирования.",
      "Юго-восточная часть требует инженерного обследования и может быть превращена в водно-рекреационную или природную зону.",
      "Зеленый каркас выбранного региона усиливает экологический образ проекта и создает спрос на отдых за городом.",
    ],
  },
  "struct-location": {
    badge: "местоположение",
    title: "Участок рядом с городом, но с ощущением выезда на природу",
    lead: "Локация работает как короткий загородный побег для жителей выбранного города: дорога занимает около 20-30 минут, а природный контекст позволяет продавать не просто услугу, а смену среды.",
    metrics: [
      ["Целиноградский район", "административная принадлежность"],
      ["Кызылсуатский округ", "локальный контекст участка"],
      ["20-30 мин", "типовая поездка от города"],
    ],
  },
  "struct-geo": {
    badge: "география",
    title: "Ровная вытянутая территория с природным каркасом",
    lead: "Участок расположен в Целиноградском районе Акмолинской области, в границах Кызылсуатского сельского округа. Рельеф спокойный, что снижает сложность планировки, но заболоченная зона требует отдельного инженерного решения.",
    metrics: [
      ["7,9 га", "площадь участка"],
      ["~800 м", "протяженность вытянутой формы"],
      ["до 5 м", "перепад высот по длине"],
      [">2 га", "заболоченная зона на юго-востоке"],
    ],
    table: {
      headers: ["Фактор", "Что это значит", "Решение"],
      rows: [
        ["Ровный рельеф", "удобно размещать очереди, маршруты и зоны отдыха", "делить участок на понятные функциональные кластеры"],
        ["Рядовые посадки деревьев", "есть готовая основа для тени и визуальной структуры", "сохранять деревья как часть ландшафтного сценария"],
        ["Заболоченная низина", "ограничение для капитальной застройки", "перевести в водно-природную зону после обследования"],
      ],
    },
  },
  "struct-climate": {
    badge: "климат",
    title: "Сильное лето и жесткая зима требуют всесезонной модели",
    lead: "Летний спрос поддерживают ясная погода и теплый сезон, но зима, ветер, снег и дождливые выходные делают открытые форматы рискованными без крытых теплых зон.",
    metrics: [
      ["14 мая - 13 сентября", "теплый сезон"],
      ["26 / 14 °C", "средний максимум и минимум июля"],
      ["21 ноября - 14 марта", "холодный сезон"],
      ["30-37%", "риск дождливых выходных в начале лета"],
    ],
    table: {
      headers: ["Период", "Особенность", "Вывод для проекта"],
      rows: [
        ["Середина июня - середина августа", "лучшее время для отдыха на свежем воздухе", "пик продаж open-air, бассейнов и событий"],
        ["Конец июня - начало августа", "лучший период для пляжа/бассейна", "нужны гибкие тарифы и резерв на плохую погоду"],
        ["Ноябрь - март", "холод, снег, ветер", "ядро выручки должны держать бани, SPA и крытые зоны"],
      ],
    },
  },
  "struct-transport": {
    badge: "доступность",
    title: "Доступность сильная для автомобильной аудитории",
    lead: "Проект находится достаточно близко к выбранному городу для коротких поездок на выходные и после работы. Общественный транспорт есть, но его частота ограничена, поэтому автомобильный сценарий остается основным.",
    metrics: [
      ["15-20 км", "до центра выбранного города"],
      ["20-30 мин", "поездка от города"],
      ["30-40 мин", "дорога от аэропорта"],
      ["6 рейсов/день", "пригородный маршрут N318"],
    ],
    points: [
      "Нужны понятная навигация, парковка и удобный въезд.",
      "Для корпоративных и семейных групп стоит предусмотреть трансферные пакеты.",
    ],
  },
  "struct-ecology": {
    badge: "экология",
    title: "Экологический образ — сильное маркетинговое преимущество",
    lead: "Близость зеленого каркаса выбранного региона создает естественную тему оздоровления и отдыха на природе. При этом высокий уровень загрязнения воздуха в городе усиливает спрос на чистые загородные форматы.",
    metrics: [
      ["78 тыс. га", "масштаб Зеленого пояса"],
      ["34 вида", "деревьев и кустарников"],
      ["9,6 млн+", "высаженных деревьев"],
      ["1,8 млн", "высаженных кустарников"],
    ],
    table: {
      headers: ["Эффект", "Факт", "Значение"],
      rows: [
        ["Ветер", "средняя скорость снижалась с 3,6 до 2,8 м/с", "зеленый каркас смягчает микроклимат"],
        ["Рекреация", "пояс используется для прогулок, пикников и наблюдения за природой", "можно развивать экологичные сценарии отдыха"],
        ["Имидж", "зеленые технологии и КСО-мероприятия", "усиление бренда и корпоративного спроса"],
      ],
    },
  },
  "struct-internal": {
    badge: "внутри участка",
    title: "Внутренняя инфраструктура формируется с нуля",
    lead: "Сейчас участок фактически является чистой площадкой: это дает свободу планировки, но требует полного инженерного старта — подъезды, сети, дренаж, освещение, водоотведение и эксплуатационная логистика.",
    metrics: [
      ["0", "капитальных объектов в текущем использовании"],
      ["100%", "инфраструктуры нужно проектировать"],
      ["поэтапно", "лучший способ снизить стартовые риски"],
    ],
    points: [
      "Сначала следует запускать ядро с понятной окупаемостью: бани, термальный блок, picnic/day-use и базовые сервисы.",
      "Зоны с повышенной влажностью лучше использовать как природный сценарий, а не как дорогую строительную проблему.",
    ],
  },
  "struct-surrounding": {
    badge: "окружение",
    title: "Рядом нет сильных достопримечательностей, поэтому проект сам должен стать точкой притяжения",
    lead: "В непосредственной близости от участка нет готового туристического магнита. Это не минус, если проект станет самостоятельной точкой притяжения с четкой программой отдыха.",
    metrics: [
      ["82,5 тыс.", "население района на 01.01.2023"],
      ["309 754 тг", "средняя зарплата в 2023 году"],
      ["+64,1%", "рост инвестиций в основной капитал"],
      ["20,9 млрд тг", "инвестиции в искусство, развлечения и отдых"],
    ],
    points: [
      "Район показывает инвестиционную динамику и интерес к рекреационной инфраструктуре.",
      "Отсутствие близких достопримечательностей означает необходимость сильного собственного продукта и событийной программы.",
    ],
  },
  "struct-current-use": {
    badge: "текущее состояние",
    title: "Территория не перегружена существующими объектами",
    lead: "Текущий формат участка позволяет создать проект без конфликтов с действующей капитальной застройкой. Главная задача — не потерять природный характер и грамотно распределить зоны нагрузки.",
    metrics: [
      ["чистый лист", "для мастер-плана"],
      ["лесополосы", "готовая основа природного каркаса"],
      ["болотная зона", "требует отдельного сценария"],
    ],
  },
  "struct-restrictions": {
    badge: "риски",
    title: "Критичные ограничения: климат, вода, сети и грунты",
    lead: "Участок уязвим прежде всего к климату и инженерии. Эти риски не запрещают проект, но требуют заложить их в CAPEX, очередность и эксплуатационную модель.",
    metrics: [
      ["20 баллов", "морозы и короткий теплый сезон"],
      ["16 баллов", "заболоченность"],
      ["16 баллов", "отсутствие инженерных сетей"],
      ["высокий", "риск удорожания инженерии"],
    ],
    table: {
      headers: ["Ограничение", "Почему важно", "Как закрывать"],
      rows: [
        ["Морозы и ветер", "снижают сезонность открытых зон", "теплые круглогодичные блоки и утепление"],
        ["Заболоченность", "повышает стоимость фундаментов и благоустройства", "дренаж, геология, природная водная зона"],
        ["Нет сетей", "старт требует автономных решений", "поэтапные сети, резерв мощности, локальная очистка"],
        ["Слабые подъезды", "влияют на гостевой опыт", "дорога, парковка, освещение и навигация"],
      ],
    },
  },
  "struct-swot-object": {
    badge: "SWOT",
    title: "Итоговая оценка места положительная при правильной инженерной подготовке",
    lead: "Сильные стороны объекта перевешивают ограничения, если проект не строится как обычная база отдыха, а сразу закладывает всесезонность, экологичный образ и продуманную инженерную стратегию.",
    table: {
      headers: ["S / W / O / T", "Содержание"],
      rows: [
        ["S", "близость к выбранному городу, ровный рельеф, вытянутая форма, зеленый каркас, экологический имидж"],
        ["W", "сезонность, заболоченная зона около 2 га, отсутствие текущей инженерной подготовки"],
        ["O", "wellness, семейный отдых, корпоративные события, эко-повестка"],
        ["T", "климат, CAPEX на инженерию, конкуренция летних баз, эксплуатационные расходы"],
      ],
    },
  },
  "chapter-market": {
    badge: "рынок",
    title: "Рынок подтверждает спрос на всесезонный wellness у выбранного города",
    lead: "Выбранный город рассматривается как туристический и платежеспособный рынок, но большая часть конкурентов закрывает только отдельные потребности: бани, гостевые дома, бассейны или банкетные форматы. Ниша проекта — собрать это в понятный и цельный комплекс.",
    metrics: [
      ["уточняется", "туристический поток выбранного города"],
      ["1,7 млн", "прогноз туристов на 2025"],
      ["76,1%", "внутренний туризм в структуре потока"],
      ["+11%", "рост внутреннего туризма в РК за 2 года"],
    ],
  },
  "struct-market-overview": {
    badge: "2.1",
    title: "Основной спрос создают жители выбранного города и внутренний туризм",
    lead: "Главный рынок для проекта — не дальний турист, а городской житель, которому нужен быстрый и качественный отдых рядом с городом.",
    metrics: [
      ["835 449", "внутренние туристы в 2024"],
      ["261 964", "иностранные гости в 2024"],
      ["лето", "пик туристического потока"],
      ["1-2 дня", "типичный короткий сценарий поездки"],
    ],
    points: [
      "Жители выбранного города хотят перезагрузки на природе без долгой дороги.",
      "Корпоративные клиенты ищут тимбилдинги, праздники и отдых сотрудников.",
      "Семьи требуют безопасность, детские зоны и понятный сервис.",
    ],
  },
  "struct-attractions": {
    badge: "предложение",
    title: "Конкуренты фрагментированы: много отдельных услуг, мало цельных сценариев",
    lead: "На рынке есть бани, сауны, базы, бассейны и отдельные зоны отдыха. Недостаток — слабая связка сервиса, детской инфраструктуры, SPA, событий и всесезонности в одном месте.",
    metrics: [
      ["160+", "бань и саун в локальном рынке"],
      ["10+", "загородных комплексов с бассейнами"],
      ["1", "крупный крытый аквапарк Ailand"],
      ["18%", "примерное покрытие SPA/массажа при высоком ожидании премиум-аудитории"],
    ],
    points: [
      "Бани и сауны дают спрос, но часто не создают полноценный день отдыха.",
      "Летняя конкуренция выше, зимняя ниша слабее заполнена.",
      "Проект должен выигрывать не количеством услуг, а связностью маршрута гостя.",
    ],
  },
  "struct-socio": {
    badge: "спрос",
    title: "Неудовлетворенный спрос концентрируется вокруг семьи, SPA и активностей",
    lead: "На рынке есть разрыв между ожиданиями гостей и стандартным предложением: гостевые дома, бани и BBQ уже не закрывают весь спрос.",
    metrics: [
      ["90%", "высокая потребность в детской инфраструктуре"],
      ["18%", "низкое наличие SPA/массажа на рынке"],
      ["46,8%", "индекс CI для городского гостя"],
      ["26,6%", "индекс SEI для городского гостя"],
    ],
    table: {
      headers: ["Дефицит", "Почему это важно", "Что дать в проекте"],
      rows: [
        ["Детская инфраструктура", "семьи выбирают место по безопасности и занятости детей", "игровые, площадки, мастер-классы, семейные маршруты"],
        ["SPA и массаж", "премиум-аудитория воспринимает это как стандарт", "ритуалы, массаж, тихие зоны, банный двор"],
        ["Активности", "нужны причины возвращаться", "спорт, квесты, сезонные события, open-air кино"],
      ],
    },
  },
  "struct-competitors": {
    badge: "2.4",
    title: "Лучший вариант — сбалансированный мультиформат",
    lead: "Из четырех вариантов сбалансированный мультиформат выглядит наиболее устойчивым по сочетанию CAPEX, выручки, сезонности и архитектурной логики.",
    metrics: [
      ["4 концепта", "сравнены между собой"],
      ["уточняется", "средняя стоимость строительства по выбранному региону"],
      ["20-150 тыс. тг/м²", "низкая стоимость для парковых и легких объектов"],
      ["450-600 тыс. тг/м²", "капитальные коммерческие объекты"],
    ],
    table: {
      headers: ["Концепт", "Суть", "Оценка"],
      rows: [
        ["1", "широкая рекреация, аквапарк и бани", "сильный спрос, но высокий риск CAPEX и сезонности"],
        ["2", "гостиница и медицинско-санаторный блок", "усиливает оздоровление, но усложняет операционную модель"],
        ["3", "holistic-центр и лесные виллы", "нишевый wellness, зависит от бренда и загрузки"],
        ["4", "модульная архитектура, wellness, бани, события, day-use", "самый сбалансированный путь развития"],
      ],
    },
  },
  "struct-target": {
    badge: "аудитории",
    title: "Четыре аудитории, четыре простых сценария покупки",
    lead: "Проект должен говорить с разными гостями разным языком, но внутри одной логики: быстро приехать, восстановиться, провести время вместе и получить сервис без хаоса.",
    table: {
      headers: ["Аудитория", "Что ищет", "Продукт"],
      rows: [
        ["Urban Wellness Seekers, 25-45", "тишина, SPA, эстетика, перезагрузка", "ритуалы, массаж, банный двор, тихие зоны"],
        ["Family Wellness, 30-50", "безопасность, дети, понятная еда", "детские площадки, семейные пакеты, мастер-классы"],
        ["Social Groups & Corporate, 25-55", "события, тимбилдинг, банкет", "event-площадки, беседки, корпоративные пакеты"],
        ["Premium Escape", "приватность, статус, качество", "виллы, приватные бани, персональный сервис"],
      ],
    },
  },
  "chapter-options": {
    badge: "варианты",
    title: "Развитие лучше вести поэтапно",
    lead: "Первый этап должен доказать спрос и качество сервиса, второй — расширить проживание, приватные бани, сады и MICE, превращая объект в destination resort.",
    metrics: [
      ["500 чел.", "зимняя вместимость базового сценария"],
      ["до 1 000 чел.", "летняя вместимость базового сценария"],
      ["10-15% CAGR", "потенциал роста бассейнов/аквапарков региона к 2030"],
    ],
  },
  "struct-compare": {
    badge: "3.1",
    title: "Проект закрывает разрыв между городским SPA и загородной базой",
    lead: "Локальный рынок фрагментирован: есть много бань и сезонных баз, но мало качественных всесезонных комплексов с понятной программой для семьи, wellness и событий.",
    table: {
      headers: ["Параметр", "Рынок", "Проект"],
      rows: [
        ["Крытые водные форматы", "1 крупный объект Ailand", "термальный блок 500 чел. зимой + летний бассейн"],
        ["Бани/сауны", "160+ точек разного качества", "единый стандарт, ритуалы и банный двор"],
        ["Сезонность", "летом пик, зимой спад", "крытые зоны + летние сценарии"],
        ["Аудитории", "часто один сегмент", "семьи, пары, корпоративы, premium escape"],
      ],
    },
  },
  "struct-scenarios": {
    badge: "3.2",
    title: "Два сценария: стартовая платформа и флагманское расширение",
    lead: "Базовый сценарий создает работающий комплекс с быстрым запуском ключевых услуг. Расширенный сценарий добавляет проживание, приватность и событийную глубину.",
    points: [
      "Базовый сценарий: picnic-беседки, индивидуальные бани, банный двор, термальный комплекс.",
      "Расширенный сценарий: виллы, приватные бани, тематические сады, MICE и переход к destination resort.",
    ],
  },
  "struct-base-scenario": {
    badge: "3.2.1",
    title: "Базовый сценарий — классический загородный wellness-комплекс",
    lead: "Первая очередь должна дать понятный продукт на каждый сезон: бани, термальный комплекс, беседки и дневной отдых.",
    metrics: [
      ["500 чел.", "вместимость зимой"],
      ["до 1 000 чел.", "вместимость летом"],
      ["сбалансировано", "крытые и открытые зоны"],
    ],
  },
  "struct-expanded-scenario": {
    badge: "3.2.2",
    title: "Расширенный сценарий — флагманский destination resort",
    lead: "Вторая очередь усиливает средний чек и длительность пребывания за счет вилл, приватных бань и тематических пространств.",
    metrics: [
      ["36 x 60 м²", "виллы в программе расширения"],
      ["overnight", "рост ночевок и среднего чека"],
      ["MICE", "добавление корпоративной функции"],
    ],
  },
  "struct-options-swot": {
    badge: "3.3",
    title: "SWOT вариантов показывает: сила в мультиформате, риск в капиталоемкости",
    lead: "Уникальная комбинация бань, wellness, open-air бассейнов, беседок и MICE делает проект отличимым. Главная слабость — стоимость строительства и необходимость сильного бренда на старте.",
    table: {
      headers: ["Сильные стороны", "Слабые стороны"],
      rows: [
        ["мультиформат wellness + бани + open-air + MICE", "высокая капиталоемкость строительства и второй очереди"],
        ["близость к выбранному городу и круглогодичная доступность", "бренд нужно строить с нуля"],
        ["интеграция SPA и банной культуры", "сервис должен быть стабильно высоким"],
      ],
    },
  },
  "struct-ranking": {
    badge: "3.4",
    title: "Ранжирование поддерживает мультиформатную модель",
    lead: "Наиболее весомые факторы оценки — мультиформатность, близость к выбранному городу, снижение сезонности и способность проекта работать для нескольких аудиторий.",
    metrics: [
      ["0,25 x 5", "мультиформат wellness + бани + MICE"],
      ["0,20 x 5", "близость к выбранному городу"],
      ["приоритет", "первый всесезонный термальный курорт у города"],
    ],
  },
  "struct-recommendations": {
    badge: "3.5",
    title: "Рекомендация: закрепить позицию всесезонного термального курорта у выбранного города",
    lead: "Оптимальный путь — поэтапная реализация: базовый сценарий как стартовая платформа, расширенный сценарий как путь к долгосрочному лидерству.",
    table: {
      headers: ["Направление", "Решение", "Эффект"],
      rows: [
        ["Позиционирование", "всесезонный термальный курорт у выбранного города", "премиальный бренд и узнаваемость"],
        ["Продукт", "1 очередь: бани, бассейны, wellness; 2 очередь: виллы, MICE, сады", "снижение сезонности и рост среднего чека"],
        ["Управление", "качество сервиса, сценарии гостей, интеграция в турстратегию региона", "устойчивое лидерство"],
      ],
    },
  },
  "chapter-concept": {
    badge: "концепция",
    title: "Предварительная концепция — природный wellness-кластер",
    lead: "Проект сводится к понятному образу: природный, модульный, всесезонный комплекс рядом с выбранным городом, где главные деньги создают бани, термальные зоны, события, питание и поэтапное расширение.",
    metrics: [
      ["wellness", "ядро позиционирования"],
      ["модульность", "архитектурная логика развития"],
      ["поэтапность", "снижение инвестиционного риска"],
    ],
  },
  "struct-concept-positioning": {
    badge: "4.1",
    title: "Позиционирование: близко, природно, всесезонно",
    lead: "Проект должен восприниматься как место, куда легко приехать из города и где все уже собрано: восстановление, банная культура, вода, еда, природа и события.",
    points: [
      "Не обычная база отдыха, а управляемый wellness-опыт.",
      "Не только летний объект, а круглогодичный комплекс с теплым ядром.",
      "Не набор построек, а единая архитектурная и сервисная система.",
    ],
  },
  "struct-functional-program": {
    badge: "4.2",
    title: "Функциональная программа строится вокруг маршрута гостя",
    lead: "Гость должен сразу понимать, зачем ехать: погреться, поплавать, отдохнуть семьей, провести событие, поесть и остаться в приватной зоне во второй очереди.",
    table: {
      headers: ["Блок", "Функция", "Роль"],
      rows: [
        ["Термальный комплекс", "теплая круглогодичная зона", "стабилизирует выручку зимой"],
        ["Банный двор", "индивидуальные и групповые ритуалы", "формирует отличимость и средний чек"],
        ["Open-air и бассейны", "летний пик посещаемости", "создает яркий сезонный продукт"],
        ["Беседки и события", "семьи, компании, корпоративы", "дает групповые продажи"],
        ["Виллы / приватные зоны", "расширенный сценарий", "рост premium и overnight-сегмента"],
      ],
    },
  },
  "struct-financial": {
    badge: "4.3",
    title: "Финансовая логика: диверсифицировать выручку и не зависеть от одного сезона",
    lead: "Модель должна складываться из нескольких потоков: входные билеты, бани, SPA, аренда беседок, еда, события и будущие виллы. Это снижает риск погоды и сезонности.",
    metrics: [
      ["уточняется", "средний строительный ориентир по выбранному региону"],
      ["20-150 тыс. тг/м²", "легкие и ландшафтные объекты"],
      ["450-600 тыс. тг/м²", "капитальные коммерческие объекты"],
      ["x2", "потенциал роста среднего чека при расширении продукта"],
    ],
    points: [
      "Критично не перегрузить первую очередь дорогими объектами без доказанного спроса.",
      "Дождливые дни и зимний спад нужно компенсировать крытыми форматами и пакетами.",
      "Вторая очередь должна запускаться после подтверждения загрузки и сервисной модели.",
    ],
  },
  "struct-concept-swot": {
    badge: "4.4",
    title: "SWOT концепции: сильный образ при дисциплине CAPEX и сервиса",
    lead: "Концепция выигрывает за счет близости к выбранному городу, экологичного образа и мультиформата. Основные угрозы — удорожание инженерии, слабый сервис на старте и недозагрузка вне пиков.",
    table: {
      headers: ["Группа", "Факторы"],
      rows: [
        ["Сильные", "природа, близость к городу, wellness-тренд, несколько аудиторий"],
        ["Слабые", "капиталоемкость, инженерная подготовка, новый бренд"],
        ["Возможности", "корпоративные пакеты, семейный отдых, premium wellness, эко-события"],
        ["Угрозы", "погода, конкуренты, рост стоимости строительства, ошибки оператора"],
      ],
    },
  },
  "struct-conclusion": {
    badge: "4.5",
    title: "Итог: проект имеет понятную рыночную нишу и реалистичный путь запуска",
    lead: "Проект стоит развивать как всесезонный wellness-комплекс у выбранного города: сначала сильное ядро с банями, водой, питанием и событиями, затем приватные форматы, виллы и расширенная MICE-программа.",
    points: [
      "Главный продукт должен быть понятен за 10 секунд: отдых, тепло, вода, природа, сервис рядом с городом.",
      "Инженерные риски нужно закрыть до финального бюджета: геология, дренаж, сети и подъезды.",
      "Материалы проекта должны показывать не набор разрозненных данных, а готовую историю развития объекта.",
    ],
  },
};

const allSections = methodology.flatMap((chapter) =>
  chapter.items.map(([id, number, title, formats]) => ({ id, number, title, formats, chapter: chapter.title, structure: true })),
);

const automaticSections = automaticSectionItems.map(([id, number, title, formats]) => ({
  id,
  number,
  title,
  formats,
  chapter: "Автоматически заполняемые главы",
  automatic: true,
}));

function cloneStructureNode(node) {
  return {
    ...node,
    children: Array.isArray(node.children) ? node.children.map(cloneStructureNode) : [],
  };
}

function projectStructureAdditions(project = currentProject()) {
  if (!project) return [];
  if (!Array.isArray(project.structureAdditions)) project.structureAdditions = [];
  return project.structureAdditions;
}

function projectHiddenStructureIds(project = currentProject()) {
  if (!project) return [];
  if (!Array.isArray(project.hiddenStructureIds)) project.hiddenStructureIds = [];
  return project.hiddenStructureIds;
}

function projectStructureOrder(project = currentProject()) {
  if (!project) return {};
  if (!project.structureOrder || typeof project.structureOrder !== "object") project.structureOrder = {};
  return project.structureOrder;
}

function projectStructureContent(project = currentProject()) {
  if (!project) return {};
  if (!project.structureContent || typeof project.structureContent !== "object") project.structureContent = {};
  return project.structureContent;
}

function projectStructureEditedContent(project = currentProject()) {
  if (!project) return {};
  if (!project.structureEditedContent || typeof project.structureEditedContent !== "object") project.structureEditedContent = {};
  return project.structureEditedContent;
}

function removeLegacyStructureInsertControls(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll(".structure-insert-slot, .structure-context-menu, .structure-card-builder, [data-insert-slot], [data-add-content-type], [data-add-selected-content], [data-content-type-select]").forEach((node) => {
    const wrapper = node.closest("div, section, article, p") || node;
    wrapper.remove();
  });
  root.querySelectorAll("div, section, article, p").forEach((node) => {
    const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
    const hasLegacyControls = node.querySelector("button, select");
    if (hasLegacyControls && /Вставить\s+в\s+начало/i.test(text)) node.remove();
  });
}

function sanitizeStructureEditedHtml(html) {
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  removeLegacyStructureInsertControls(template.content);
  return template.innerHTML.trim();
}

function structureEditedHtml(nodeId, project = currentProject()) {
  const value = projectStructureEditedContent(project)[nodeId];
  return typeof value === "string" ? sanitizeStructureEditedHtml(value) : "";
}

function structureContentBlocks(nodeId, project = currentProject()) {
  const content = projectStructureContent(project);
  if (!Array.isArray(content[nodeId])) content[nodeId] = [];
  return content[nodeId];
}

function structureNumberLevel(number = "") {
  return String(number).split(".").filter(Boolean).length;
}

function sortStructureChildren(parentId, children, project = currentProject()) {
  const order = projectStructureOrder(project)[parentId] || [];
  if (!order.length) return children;
  const position = new Map(order.map((id, index) => [id, index]));
  return [...children].sort((a, b) => {
    const aPos = position.has(a.id) ? position.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bPos = position.has(b.id) ? position.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aPos - bPos;
  });
}

function renumberStructureNodes(nodes, parentNumber = "") {
  nodes.forEach((node, index) => {
    node.number = parentNumber ? `${parentNumber}.${index + 1}` : String(index + 1);
    if (Array.isArray(node.children)) renumberStructureNodes(node.children, node.number);
  });
  return nodes;
}

function attachStructureAdditions(nodes, additions) {
  const project = currentProject();
  const hidden = new Set(projectHiddenStructureIds(project));
  const byParent = new Map();
  additions.forEach((item) => {
    const parentId = item.parentId || "chapter-object";
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(item);
  });

  const walk = (node, parentId = null) => {
    node.parentId = parentId;
    const own = byParent.get(node.id) || [];
    const customChildren = own.map((item, index) => ({
      id: item.id,
      number: item.number || `${node.number}.${(node.children?.length || 0) + index + 1}`,
      title: item.title || "Новая подглава",
      required: false,
      custom: true,
      parentId: node.id,
      children: [],
    }));
    node.children = sortStructureChildren(
      node.id,
      [...(node.children || []), ...customChildren].filter((child) => !hidden.has(child.id)),
      project,
    );
    node.children.forEach((child) => walk(child, node.id));
    return node;
  };

  return renumberStructureNodes(
    sortStructureChildren("root", nodes.filter((node) => !hidden.has(node.id)), project).map((node) => walk(node, "root")),
  );
}

function projectStructureTree(project = currentProject()) {
  return attachStructureAdditions(PROJECT_STRUCTURE_TEMPLATE.map(cloneStructureNode), projectStructureAdditions(project));
}

function flattenStructure(nodes, result = []) {
  nodes.forEach((node) => {
    result.push(node);
    if (Array.isArray(node.children)) flattenStructure(node.children, result);
  });
  return result;
}

function structureNodeById(id, project = currentProject()) {
  return flattenStructure(projectStructureTree(project)).find((node) => node.id === id || node.autoId === id) || null;
}

function automaticSectionById(id) {
  return automaticSections.find((section) => section.id === id) || null;
}

function getAllSections() {
  return [...allSections, ...automaticSections];
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

function expandStructurePath(nodeId) {
  const nodes = flattenStructure(projectStructureTree());
  let current = nodes.find((node) => node.id === nodeId);
  while (current) {
    state.structureCollapsed[current.id] = false;
    current = nodes.find((node) => node.id === current.parentId);
  }
}

function activatePendingSubchapter() {
  const pending = state.pendingSubchapter;
  if (!pending || pending.sectionId !== state.activeSectionId) return;
  if (pending.nodeId) {
    expandStructurePath(pending.nodeId);
    const target = sectionOutput.querySelector(`[data-structure-node="${CSS.escape(pending.nodeId)}"]`);
    if (target) {
      sectionOutput.querySelectorAll(".structure-card.is-focused").forEach((card) => card.classList.remove("is-focused"));
      target.classList.add("is-focused");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const offset = document.querySelector(".site-topbar")?.getBoundingClientRect().height || 0;
        window.scrollBy({ top: -(offset + 12), behavior: "smooth" });
      }, 80);
      window.setTimeout(() => target.classList.remove("is-focused"), 1800);
      state.pendingSubchapter = null;
      return;
    }
  }
  if (pending.title) openSubchapterInOutput(pending.title);
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
  activeSectionId: "chapter-object",
  weatherCache: new Map(),
  liveCache: new Map(),
  structureSectionCache: new Map(),
  cityGeoCache: new Map(),
  cityGeoPending: new Map(),
  navExpanded: {},
  structureCollapsed: {},
  pendingSubchapter: null,
};
let activeStructureRenderContext = null;
let activeRichEditCleanup = null;
let activeRichRange = null;

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

function requestedProjectView() {
  return new URLSearchParams(window.location.search).get("view");
}

function projectUrl(projectId) {
  return `./project.html?id=${encodeURIComponent(projectId)}`;
}

function openProject(projectId) {
  window.location.href = projectUrl(projectId);
}

function structureSectionCacheKey(section, ctx) {
  const project = ctx.project || {};
  const polygonSize = Array.isArray(project.basePolygon) ? project.basePolygon.length : 0;
  return [
    project.id || "project",
    "structure-live-data",
    project.citySlug || ctx.cityName || "",
    project.updatedAt || "",
    project.lat || "",
    project.lng || "",
    polygonSize,
  ].join("|");
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

function authToken() {
  return String(currentAuthUser().token || "").trim();
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = authToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  if (response.status === 401) {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "../login.html";
    throw new Error("unauthorized");
  }
  return response;
}

let projectSyncTimer = null;

function scheduleProjectSync() {
  if (!authToken()) return;
  window.clearTimeout(projectSyncTimer);
  projectSyncTimer = window.setTimeout(async () => {
    try {
      await apiFetch("../api/projects/bulk", {
        method: "POST",
        body: JSON.stringify({ projects: state.projects }),
      });
    } catch (error) {
      console.warn("Project sync failed:", error);
    }
  }, 350);
}

async function loadServerProjects() {
  if (!authToken()) return false;
  try {
    const response = await apiFetch("../api/projects");
    if (!response.ok) return false;
    const payload = await response.json();
    if (!Array.isArray(payload.projects)) return false;
    if (!payload.projects.length && state.projects.length) {
      scheduleProjectSync();
      return false;
    }
    state.projects = payload.projects.map((project) => ({
      ...project,
      mapProvider: ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm",
      locationLocked: Boolean(project.locationLocked || (Array.isArray(project.basePolygon) && project.basePolygon.length >= 3)),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    return true;
  } catch (error) {
    console.warn("Project load failed:", error);
    return false;
  }
}

async function syncUsersFromServer() {
  if (!authToken() || currentAuthUser().role !== "admin") return false;
  try {
    const response = await apiFetch("../api/users");
    if (!response.ok) return false;
    const payload = await response.json();
    if (!Array.isArray(payload.users)) return false;
    saveUsers(payload.users);
    renderUsersAdmin();
    renderAdminDashboard();
    return true;
  } catch (error) {
    console.warn("User sync failed:", error);
    return false;
  }
}

async function deleteServerProject(projectId) {
  if (!authToken() || !projectId) return;
  try {
    await apiFetch(`../api/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Project delete sync failed:", error);
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

function renderAdminDashboard() {
  adminUsersCount.textContent = String(loadUsers().length);
  adminProjectsCount.textContent = String(state.projects.length);
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
    button.addEventListener("click", async () => {
      const users = loadUsers();
      const user = users.find((item) => item.id === button.dataset.toggleUser);
      if (!user) return;
      const active = user.active === false;
      if (authToken()) {
        const response = await apiFetch(`../api/users/${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ active }),
        });
        if (response.ok) {
          await syncUsersFromServer();
          return;
        }
      }
      user.active = active;
      saveUsers(users);
      renderUsersAdmin();
      renderAdminDashboard();
    });
  });

  usersList.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const auth = currentAuthUser();
      let users = loadUsers();
      const user = users.find((item) => item.id === button.dataset.deleteUser);
      if (user?.login === auth.username) {
        window.alert("Нельзя удалить текущего пользователя.");
        return;
      }
      if (authToken()) {
        const response = await apiFetch(`../api/users/${encodeURIComponent(button.dataset.deleteUser)}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await syncUsersFromServer();
          return;
        }
      }
      users = users.filter((item) => item.id !== button.dataset.deleteUser);
      saveUsers(users);
      renderUsersAdmin();
      renderAdminDashboard();
    });
  });
}

async function createUserFromAdmin() {
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
  if (authToken()) {
    const response = await apiFetch("../api/users", {
      method: "POST",
      body: JSON.stringify({
        fullName: userFullName?.value.trim() || login,
        login,
        password,
        role: userRole.value === "admin" ? "admin" : "user",
      }),
    });
    if (response.ok) {
      if (userFullName) userFullName.value = "";
      userLogin.value = "";
      userPassword.value = "";
      userRole.value = "user";
      await syncUsersFromServer();
      return;
    }
    window.alert("Не удалось создать пользователя на сервере.");
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

function deleteProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  if (!window.confirm(`Удалить проект «${project.name || "Проект"}»?`)) return;
  state.projects = state.projects.filter((item) => item.id !== projectId);
  if (state.activeProjectId === projectId) {
    state.activeProjectId = state.projects[0]?.id || null;
  }
  saveProjects();
  deleteServerProject(projectId);
  renderProjects();
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
  const projectPoint = projectCoords(project, city);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const driftKm = distanceKm(lat, lng, projectPoint[0], projectPoint[1]);
    if (Number.isFinite(driftKm) && driftKm <= 150) return [lat, lng];
  }
  return projectPoint;
}

function mapProvider(project) {
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
  scheduleProjectSync();
}

function loadProjects() {
  try {
    const rawProjects = localStorage.getItem(STORAGE_KEY) || "[]";
    if (!localStorage.getItem(STORAGE_BACKUP_KEY)) {
      localStorage.setItem(STORAGE_BACKUP_KEY, rawProjects);
    }
    state.projects = JSON.parse(rawProjects).map((project) => ({
      ...project,
      mapProvider: ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm",
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
    mapProvider: "osm",
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
  projectList.innerHTML = `
    <div class="project-list-header" aria-hidden="true">
      <span>Проект</span>
      <span>Город</span>
      <span>Регион</span>
      <span>Создан</span>
      <span>Обновлен</span>
    </div>
  `;
  state.projects.forEach((project) => {
    const city = project.cityName || "Город не выбран";
    const region = project.regionName || "Регион не выбран";
    const created = formatDate(project.createdAt);
    const updated = formatDate(project.updatedAt);
    const location = project.location || "Описание не заполнено";
    const row = document.createElement("article");
    row.className = "project-card-row";
    row.innerHTML = `
      <button type="button" class="${project.id === state.activeProjectId ? "project-card is-active" : "project-card"}" data-open-project="${escapeHtml(project.id)}">
        <span class="project-card-main">
          <strong>${escapeHtml(project.name || "Проект")}</strong>
          <span>${escapeHtml(city)}</span>
          <span>${escapeHtml(region)}</span>
          <span>${created}</span>
          <span>${updated}</span>
        </span>
        <span class="project-card-location">${escapeHtml(location)}</span>
        <strong>${escapeHtml(project.name)}</strong>
        <span>${escapeHtml(project.cityName || "Город не выбран")} · ${formatDate(project.updatedAt)}</span>
      </button>
      <button type="button" class="project-delete-button" data-delete-project="${escapeHtml(project.id)}">Удалить</button>
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
    row.querySelector("[data-delete-project]").addEventListener("click", () => deleteProject(project.id));
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

async function logoutCurrentUser() {
  if (authToken()) {
    try {
      await apiFetch("../api/auth/logout", { method: "POST" });
    } catch {}
  }
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "../login.html";
}

function renderNav() {
  if (!methodNav) return;
  methodNav.innerHTML = "";
  const tree = projectStructureTree();
  const pendingNodeId = state.pendingSubchapter?.nodeId || "";
  let draggedNavId = null;

  methodology.forEach((chapter) => {
    const group = document.createElement("section");
    group.className = "nav-group";
    group.innerHTML = `<h3>${escapeHtml(chapter.title)}</h3>`;

    const navItems = tree.map((node) => {
      const section = allSections.find((item) => item.id === node.id);
      return [node.id, node.number, node.title, section?.formats || ""];
    });

    navItems.forEach(([id, number, title, formats]) => {
      const node = tree.find((item) => item.id === id);
      const topics = Array.isArray(node?.children) ? node.children : [];
      const isActive = id === state.activeSectionId;
      const isExpanded = state.navExpanded[id] ?? isActive;

      const branch = document.createElement("div");
      branch.className = isExpanded ? "nav-branch is-open" : "nav-branch";
      branch.dataset.structureNode = id;
      branch.dataset.parentStructure = "root";
      branch.dataset.structureLevel = "1";

      const row = document.createElement("div");
      row.className = isActive ? "nav-item-row is-active" : "nav-item-row";
      row.dataset.structureNode = id;
      row.dataset.parentStructure = "root";
      row.dataset.structureLevel = "1";
      row.innerHTML = `
        <button type="button" class="nav-drag-handle" draggable="true" data-drag-structure="${escapeHtml(id)}" aria-label="Переместить главу">⋮⋮</button>
        <button type="button" class="nav-item ${isActive ? "is-active" : ""}" data-open-structure-section="${escapeHtml(id)}">
          <span>${escapeHtml(node?.number || number)}</span>
          <strong>${escapeHtml(node?.title || title)}</strong>
          <em>${escapeHtml(formats.replaceAll(",", " · "))}</em>
        </button>
        ${topics.length ? `<button type="button" class="nav-collapse-button" data-toggle-nav-branch="${escapeHtml(id)}" aria-label="${isExpanded ? "Свернуть подглавы" : "Развернуть подглавы"}" aria-expanded="${String(isExpanded)}"></button>` : ""}
      `;
      row.querySelector("[data-open-structure-section]")?.addEventListener("click", () => {
        const wasActive = state.activeSectionId === id;
        state.activeSectionId = id;
        state.navExpanded[id] = true;
        state.pendingSubchapter = null;
        renderNav();
        if (!wasActive) renderSection();
      });
      row.querySelector("[data-toggle-nav-branch]")?.addEventListener("click", () => {
        state.navExpanded[id] = !isExpanded;
        renderNav();
      });
      branch.appendChild(row);

      if (topics.length) {
        const subtree = document.createElement("div");
        subtree.className = "nav-subtree";
        subtree.innerHTML = topics.map((topic) => `
          <div class="nav-subitem-row ${pendingNodeId === topic.id ? "is-active" : ""}" data-structure-node="${escapeHtml(topic.id)}" data-parent-structure="${escapeHtml(topic.parentId || id)}" data-structure-level="${structureNumberLevel(topic.number)}">
            <button type="button" class="nav-drag-handle nav-drag-handle-small" draggable="true" data-drag-structure="${escapeHtml(topic.id)}" aria-label="Переместить подглаву">⋮⋮</button>
            <button type="button" class="nav-subitem ${pendingNodeId === topic.id ? "is-active" : ""}" data-structure-section="${escapeHtml(id)}" data-structure-node-target="${escapeHtml(topic.id)}">
              <span>${escapeHtml(topic.number)}</span>
              <strong>${escapeHtml(topic.title)}</strong>
            </button>
          </div>
        `).join("");
        subtree.querySelectorAll("[data-structure-node-target]").forEach((item) => {
          item.addEventListener("click", () => {
            state.activeSectionId = item.dataset.structureSection;
            state.navExpanded[id] = true;
            state.pendingSubchapter = { sectionId: id, nodeId: item.dataset.structureNodeTarget };
            expandStructurePath(item.dataset.structureNodeTarget);
            renderNav();
            renderSection();
          });
        });
        branch.appendChild(subtree);
      }

      group.appendChild(branch);
    });

    methodNav.appendChild(group);
  });

  methodNav.querySelectorAll("[data-drag-structure]").forEach((handle) => {
    handle.addEventListener("dragstart", (event) => {
      draggedNavId = handle.dataset.dragStructure;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedNavId);
      handle.closest("[data-structure-node]")?.classList.add("is-dragging");
    });
  });

  methodNav.ondragend = () => {
    draggedNavId = null;
    methodNav.querySelectorAll(".is-dragging, .is-drop-before, .is-drop-after").forEach((item) => {
      item.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    });
  };

  methodNav.ondragover = (event) => {
    const target = event.target.closest(".nav-item-row[data-structure-node], .nav-subitem-row[data-structure-node]");
    if (!target) return;
    const draggedId = draggedNavId || event.dataTransfer.getData("text/plain");
    const dragged = methodNav.querySelector(`[data-structure-node="${CSS.escape(draggedId)}"]`);
    methodNav.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
      if (item !== target) item.classList.remove("is-drop-before", "is-drop-after");
    });
    if (!canMoveStructureCard(dragged, target)) return;
    event.preventDefault();
    const placeAfter = structurePlaceAfter(event, target);
    target.classList.toggle("is-drop-before", !placeAfter);
    target.classList.toggle("is-drop-after", placeAfter);
  };

  methodNav.ondrop = (event) => {
    const target = event.target.closest(".nav-item-row[data-structure-node], .nav-subitem-row[data-structure-node]");
    if (!target) return;
    const draggedId = draggedNavId || event.dataTransfer.getData("text/plain");
    const dragged = methodNav.querySelector(`[data-structure-node="${CSS.escape(draggedId)}"]`);
    if (!canMoveStructureCard(dragged, target)) return;
    event.preventDefault();
    moveStructureNode(draggedId, target.dataset.structureNode, structurePlaceAfter(event, target));
  };
}
function saveActiveProject() {
  if (!projectName || !projectLocation) return;
  const name = projectName.value.trim() || "Новый проект";
  const city = state.cities.find((item) => item.slug === state.selectedCitySlug) || resolveCityFromInput();
  if (!city) {
    window.alert("Выберите город из списка, чтобы анализ был привязан к правильному региону.");
    citySearch?.focus();
    renderCityResults();
    return;
  }
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
      mapProvider: "osm",
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
  deleteServerProject(project.id);
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
    mapProvider: "osm",
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
  statSections.textContent = String(flattenStructure(projectStructureTree(project)).length);
  statWeather.textContent = city?.sectionCount ? String(city.sectionCount) : "0";
  catalogCount.textContent = `${state.cities.length} городов`;
}

function sourceList(items) {
  return "";
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
      ${items.map((item) => `
        <article class="analysis-section is-open">
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
          <p><strong>Тип</strong>${escapeHtml(googlePlaceKind(place))}</p>
          <p><strong>Расстояние</strong>${formatNumber(distance, 2)} км от базы</p>
          ${place.vicinity ? `<p><strong>Адрес</strong>${escapeHtml(displayName(place.vicinity))}</p>` : ""}
          ${Number.isFinite(Number(place.rating)) ? `<p><strong>Рейтинг</strong>${formatNumber(place.rating, 1)}${place.user_ratings_total ? ` (${place.user_ratings_total} отзывов)` : ""}</p>` : ""}
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
    <div class="place-list">
      ${rows.map(({ element, distance }) => `
        <article class="place-list-row">
          <div class="place-list-main">
            <h3>${escapeHtml(osmName(element))}</h3>
            <p>${escapeHtml(osmKind(element))}</p>
            ${osmDescription(element) ? `<small>${escapeHtml(osmDescription(element))}</small>` : ""}
          </div>
          <strong>${formatNumber(distance, 2)} км</strong>
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
  const kind = osmRawKind(element);
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
  if (window.TKP_MAPS_CONFIG?.enableOverpass === false) return [];
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
          : "В Картах Google тоже можно перемещать карту, ставить точки контура и сохранять площадь базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Картах Google</a>
      </div>
    </article>
  `;
}

function fallbackMapFrameMarkup(cityLat, cityLng, baseLat, baseLng, centerLat, centerLng, zoom) {
  return `<div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}"><div class="tile-layer"></div><svg class="map-overlay" aria-hidden="true"></svg><div class="map-interaction-layer" aria-label="Карта участка"></div><span class="map-marker map-marker-city"></span><span class="map-marker map-marker-base"></span><div class="map-controls"><button type="button" data-map-zoom="in">+</button><button type="button" data-map-zoom="out">-</button></div></div>`;
}

function mapProviderFallbackNotice(requestedProvider) {
  const label = requestedProvider === "2gis" ? "2ГИС" : requestedProvider === "google" ? "Карты Google" : "";
  if (!label) return "";
  return `
    <div class="map-provider-note">
      <strong>${label} сейчас недоступна.</strong>
      <span>Показываю резервную OSM-карту, чтобы маршрут, центр города и точка базы не пропадали. Для ${label} проверьте ключ в <code>dashboard/map-config.js</code> и открывайте сайт через локальный сервер.</span>
    </div>
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
        <div class="map-external-badge">Карты Google</div>
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
        <div class="map-external-badge">Карты Google</div>
        <h3>Добавьте API-ключ локально</h3>
        <p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p>
      </div>
    `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
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
          : "В Картах Google тоже можно перемещать карту, ставить точки контура, очищать их и сохранять площадь базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Картах Google</a>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">Карты Google</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p></div>`;
  } else if (provider === "removedMap") {
    mapBody = hasRemovedMapMapsKey()
      ? `<div class="map-google-frame"><div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">RemovedMap</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p></div>`;
  } else {
    mapBody = `<div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}"><div class="tile-layer"></div><svg class="map-overlay" aria-hidden="true"></svg><div class="map-interaction-layer" aria-label="Карта участка"></div><span class="map-marker map-marker-city"></span><span class="map-marker map-marker-base"></span><div class="map-controls"><button type="button" data-map-zoom="in">+</button><button type="button" data-map-zoom="out">-</button></div></div>`;
  }

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap</button>
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
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap" : "Карты Google"}</a>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">Карты Google</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>googleMapsApiKey</code>. Затем обновите страницу.</p></div>`;
  } else if (provider === "removedMap") {
    body = hasRemovedMapMapsKey()
      ? `<div class="map-google-frame"><div class="removedMap-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`
      : `<div class="map-external-frame map-external-card"><div class="map-external-badge">RemovedMap</div><h3>Добавьте API-ключ локально</h3><p>Откройте <code>dashboard/map-config.js</code> и вставьте ключ в поле <code>removedMapMapsApiKey</code>. Затем обновите страницу через <code>http://localhost:8000/</code>.</p></div>`;
  } else {
    body = `<div class="map-frame" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}"><div class="tile-layer"></div><svg class="map-overlay" aria-hidden="true"></svg><div class="map-interaction-layer" aria-label="Карта участка"></div><span class="map-marker map-marker-city"></span><span class="map-marker map-marker-base"></span><div class="map-controls"><button type="button" data-map-zoom="in">+</button><button type="button" data-map-zoom="out">-</button></div></div>`;
  }

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap</button>
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
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap" : "Карты Google"}</a>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap</button>
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
              <div class="map-external-badge">Карты Google</div>
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
                <div class="map-external-badge">RemovedMap</div>
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
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap" : "Карты Google"}</a>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap</button>
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
              <div class="map-external-badge">Карты Google</div>
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
                <div class="map-external-badge">RemovedMap</div>
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
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap" : "Карты Google"}</a>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
        <div class="map-external-badge">RemovedMap</div>
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
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
        <button type="button" class="${provider === "removedMap" ? "is-active" : ""}" data-map-provider="removedMap">RemovedMap</button>
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
                <div class="map-external-badge">RemovedMap</div>
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
        <span data-map-hint>${provider === "google" ? "В Картах Google можно строить маршрут, видеть остановки и редактировать контур базы." : provider === "removedMap" ? "В RemovedMap можно редактировать контур базы. Маршруты и поиск рядом добавим следующим шагом." : "Используйте OpenStreetMap для перемещения карты и отрисовки контура базы."}</span>
      </div>
      <div class="map-external-links">
        <a href="${provider === "removedMap" ? removedMapBaseUrl : googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в ${provider === "removedMap" ? "RemovedMap" : "Карты Google"}</a>
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
        <div class="map-external-badge">Карты Google</div>
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
        <div class="map-external-badge">Карты Google</div>
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

  frame.classList.remove("is-tile-fallback");
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
      img.onerror = () => {
        img.remove();
        frame.classList.add("is-tile-fallback");
      };
      img.onload = () => {
        frame.classList.remove("is-tile-fallback");
      };
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
          <iframe class="map-external-embed" src="${googleEmbedUrl(baseLat, baseLng, zoom)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Предпросмотр Карт Google"></iframe>
        </div>
      `
      : `
        <div class="map-external-frame map-external-card">
          <div class="map-external-badge">2ГИС</div>
          <h3>Просмотр точки в 2ГИС</h3>
          <p>Откройте текущую базу или центр карты в 2ГИС. Координаты и выбранный масштаб передаются автоматически.</p>
          <div class="map-external-coords">
            <span>База: ${formatNumber(baseLat, 5)}, ${formatNumber(baseLng, 5)}</span>
            <span>Центр: ${formatNumber(centerLat, 5)}, ${formatNumber(centerLng, 5)}</span>
          </div>
          <div class="map-external-actions">
            <a class="primary-button" href="${twoGisBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в 2ГИС</a>
            <a class="ghost-button" href="${twoGisCenterUrl}" target="_blank" rel="noreferrer noopener">Открыть центр в 2ГИС</a>
          </div>
        </div>
      `;

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OSM</button>
        <button type="button" class="${provider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
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
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в Картах Google</a>
        <a href="${twoGisBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть базу в 2ГИС</a>
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

  frame.classList.remove("is-tile-fallback");
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
      img.onerror = () => {
        img.remove();
        frame.classList.add("is-tile-fallback");
      };
      img.onload = () => {
        frame.classList.remove("is-tile-fallback");
      };
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
  frame.querySelectorAll("[data-poi-lat][data-poi-lng]").forEach((marker) => {
    const poiLat = Number(marker.dataset.poiLat);
    const poiLng = Number(marker.dataset.poiLng);
    if (!Number.isFinite(poiLat) || !Number.isFinite(poiLng)) return;
    const poi = lonLatToWorld(poiLat, poiLng, zoom);
    marker.style.left = `${poi.x - center.x + width / 2}px`;
    marker.style.top = `${poi.y - center.y + height / 2}px`;
  });

  overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  overlay.innerHTML = "";
  if (state.activeSectionId === "transport") {
    const routePoints = [
      `${city.x - center.x + width / 2},${city.y - center.y + height / 2}`,
      `${base.x - center.x + width / 2},${base.y - center.y + height / 2}`,
    ].join(" ");
    const routeLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    routeLine.setAttribute("points", routePoints);
    routeLine.setAttribute("class", "map-route-line");
    overlay.appendChild(routeLine);
  }
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
  if (ctx?.inlineStructure) return "";
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
  if (!score?.tourism) return "";
  const tourism = score.tourism ?? 0;
  return `
    <div class="score-grid">
      <article class="score-card">
        <span>Балл по туризму</span>
        <strong>${tourism.toFixed(1)} / 10</strong>
        <div><i style="width:${tourism * 10}%"></i></div>
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
        ${sections.map((item) => `
          <article class="weather-section is-open">
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

  return renderEcologyRegionReport(section, ctx, {
    air,
    units,
    source,
    green,
    natural,
    risks,
    baseLat,
    baseLng,
    googleBaseUrl,
  });

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
      "Карты Google не показали рядом парков, кемпингов или природных точек. Если ключ Google не настроен, проверьте карту после его подключения.",
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
      "Карты Google не показали рядом промышленные или нагрузочные точки, но это не заменяет официальную проверку санитарных зон.",
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
      <p class="eco-source-note">По воздуху используется актуальный часовой срез Open-Meteo Air Quality. Пространственное окружение берётся из ${source === "google" ? "Карты Google" : "OpenStreetMap"}. <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть эту базу в Картах Google</a>.</p>
      <p><strong>Быстрый вывод</strong>${escapeHtml(aqiSummary.label)}. Сейчас у базы ${escapeHtml(aqiSummary.valueLabel)}, целевой уровень ${escapeHtml(aqiSummary.normLabel)}.</p>
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
          "Карты Google не показали рядом парков, кемпингов или природных точек. Если ключ Google не настроен, проверьте карту после его подключения.",
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
          "Карты Google не показали рядом промышленные или нагрузочные точки, но это не заменяет официальную проверку санитарных зон.",
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

function structureStatus(node) {
  return "";
}

function structureContentLabel(type) {
  if (type === "table") return "Таблица";
  if (type === "card") return "Карточка сайта";
  if (type === "image") return "Фотография";
  if (type === "video") return "Видео";
  return "Текстовый блок";
}

function defaultStructureContentTitle(type) {
  if (type === "table") return "Новая таблица";
  if (type === "card") return "Новая карточка";
  if (type === "image") return "Изображение";
  if (type === "video") return "Видео";
  return "Текстовый блок";
}

function structureContentTitle(block) {
  return String(block.title || defaultStructureContentTitle(block.type)).trim();
}

function renderStructureBlockTitleField(block, nodeId) {
  return `
    <label class="structure-block-title-field">
      Оглавление элемента
      <input type="text" value="${escapeHtml(structureContentTitle(block))}" data-structure-block-title="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}" placeholder="Например: Финансовые показатели">
    </label>
  `;
}

function renderStructureContentBlock(block, nodeId, editable = false) {
  if (!editable) {
    const title = structureContentTitle(block);
    const isDefaultTitle = title === defaultStructureContentTitle(block.type);
    if (block.type === "text") {
      const body = String(block.text || "").trim();
      if (!body && isDefaultTitle) return "";
      return `
        <article class="text-block structure-content-view">
          ${!isDefaultTitle ? `<h3>${escapeHtml(title)}</h3>` : ""}
          ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        </article>
      `;
    }
    if (block.type === "table") {
      const rows = Math.max(1, Number(block.rows) || 2);
      const cols = Math.max(1, Number(block.cols) || 2);
      const cells = Array.isArray(block.cells) ? block.cells : [];
      return `
        <article class="text-block structure-content-view">
          ${!isDefaultTitle ? `<h3>${escapeHtml(title)}</h3>` : ""}
          <div class="table-scroll">
            <table>
              <tbody>
                ${Array.from({ length: rows }).map((_, rowIndex) => `
                  <tr>
                    ${Array.from({ length: cols }).map((__, colIndex) => `<td>${escapeHtml(cells[rowIndex]?.[colIndex] || "")}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </article>
      `;
    }
    if (block.type === "card") {
      const tone = ["default", "accent", "success", "warning"].includes(block.tone) ? block.tone : "default";
      const body = String(block.text || "").trim();
      return `
        <article class="data-card structure-content-view structure-card-preview-${tone}">
          <h3>${escapeHtml(title)}</h3>
          ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        </article>
      `;
    }
    if (block.type === "image" || block.type === "video") {
      const isVideo = block.type === "video";
      if (!block.src && isDefaultTitle) return "";
      return `
        <article class="text-block structure-content-view">
          ${!isDefaultTitle ? `<h3>${escapeHtml(title)}</h3>` : ""}
          ${block.src
            ? (isVideo ? `<video src="${escapeHtml(block.src)}" controls></video>` : `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(title)}">`)
            : ""}
        </article>
      `;
    }
    return "";
  }
  if (block.type === "text") {
    return `
      <article class="structure-content-block">
        <div class="structure-content-head">
          <strong>${escapeHtml(structureContentTitle(block))}</strong>
          <button type="button" class="structure-content-remove" data-remove-structure-content="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}">Удалить</button>
        </div>
        ${renderStructureBlockTitleField(block, nodeId)}
        <textarea data-structure-content-field="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}" placeholder="Введите текст">${escapeHtml(block.text || "")}</textarea>
      </article>
    `;
  }
  if (block.type === "table") {
    const rows = Math.max(1, Number(block.rows) || 2);
    const cols = Math.max(1, Number(block.cols) || 2);
    const cells = Array.isArray(block.cells) ? block.cells : [];
    return `
      <article class="structure-content-block">
        <div class="structure-content-head">
          <strong>${escapeHtml(structureContentTitle(block))} · ${rows}x${cols}</strong>
          <button type="button" class="structure-content-remove" data-remove-structure-content="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}">Удалить</button>
        </div>
        ${renderStructureBlockTitleField(block, nodeId)}
        <div class="table-scroll">
          <table class="structure-edit-table">
            <tbody>
              ${Array.from({ length: rows }).map((_, rowIndex) => `
                <tr>
                  ${Array.from({ length: cols }).map((__, colIndex) => `
                    <td contenteditable="true" data-structure-cell="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}" data-row="${rowIndex}" data-col="${colIndex}">${escapeHtml(cells[rowIndex]?.[colIndex] || "")}</td>
                  `).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }
  if (block.type === "card") {
    const tone = ["default", "accent", "success", "warning"].includes(block.tone) ? block.tone : "default";
    return `
      <article class="structure-content-block structure-site-card-editor" data-structure-content-card="${escapeHtml(block.id)}">
        <div class="structure-content-head">
          <strong>${escapeHtml(structureContentTitle(block))}</strong>
          <button type="button" class="structure-content-remove" data-remove-structure-content="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}">Удалить</button>
        </div>
        ${renderStructureBlockTitleField(block, nodeId)}
        <div class="structure-card-form">
          <label>Акцент
            <select data-structure-card-tone="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}">
              <option value="default" ${tone === "default" ? "selected" : ""}>Спокойный</option>
              <option value="accent" ${tone === "accent" ? "selected" : ""}>Акцентный</option>
              <option value="success" ${tone === "success" ? "selected" : ""}>Позитивный</option>
              <option value="warning" ${tone === "warning" ? "selected" : ""}>Внимание</option>
            </select>
          </label>
          <label class="structure-card-text">Текст<textarea data-structure-card-text="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}" placeholder="Описание карточки">${escapeHtml(block.text || "")}</textarea></label>
        </div>
        <article class="data-card structure-card-preview structure-card-preview-${tone}">
          <h3>${escapeHtml(structureContentTitle(block))}</h3>
          ${block.text ? `<p>${escapeHtml(block.text)}</p>` : ""}
        </article>
      </article>
    `;
  }
  if (block.type === "image" || block.type === "video") {
    const isVideo = block.type === "video";
    return `
      <article class="structure-content-block">
        <div class="structure-content-head">
          <strong>${escapeHtml(structureContentTitle(block))}</strong>
          <button type="button" class="structure-content-remove" data-remove-structure-content="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}">Удалить</button>
        </div>
        ${renderStructureBlockTitleField(block, nodeId)}
        ${block.src ? (isVideo
          ? `<video src="${escapeHtml(block.src)}" controls></video>`
          : `<img src="${escapeHtml(block.src)}" alt="">`)
          : `<label class="structure-file-picker">Загрузить ${isVideo ? "видео" : "фото"}<input type="file" accept="${isVideo ? "video/*" : "image/*"}" data-structure-file="${escapeHtml(block.id)}" data-content-node="${escapeHtml(nodeId)}"></label>`}
      </article>
    `;
  }
  return "";
}

function renderStructureBuilderTools(nodeId, anchor = "end", label = "Добавить элемент", options = {}) {
  const anchorAttr = ` data-insert-anchor="${escapeHtml(String(anchor))}"`;
  const afterAttr = options.afterBlockId ? ` data-insert-after="${escapeHtml(String(options.afterBlockId))}"` : "";
  const startAttr = options.atAnchorStart ? ` data-insert-at-start="true"` : "";
  return `
    <div class="structure-insert-slot" data-insert-slot aria-label="${escapeHtml(label)}">
      <button type="button" class="structure-insert-plus" data-toggle-insert-slot aria-label="Вставить элемент">+</button>
      <div class="structure-insert-menu">
        <label>Тип элемента
          <select data-content-type-select data-content-node="${escapeHtml(nodeId)}"${anchorAttr}${afterAttr}${startAttr}>
            <option value="card">Карточка</option>
            <option value="text">Текст</option>
            <option value="table">Таблица</option>
            <option value="image">Фото</option>
            <option value="video">Видео</option>
          </select>
        </label>
        <button type="button" data-add-selected-content data-content-node="${escapeHtml(nodeId)}"${anchorAttr}${afterAttr}${startAttr}>Вставить</button>
      </div>
    </div>
  `;
}

function structureBlockAnchor(block) {
  return String(block.anchor || "end");
}

function structureContentBlocksForAnchor(node, anchor) {
  return structureContentBlocks(node.id).filter((block) => structureBlockAnchor(block) === anchor);
}

function splitTopLevelHtml(html = "") {
  const source = String(html || "").trim();
  if (!source) return [];
  const parts = [];
  let start = 0;
  let depth = 0;
  const tagPattern = /<\/?([a-z][\w:-]*)(?:\s[^>]*)?>/gi;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  let match;
  while ((match = tagPattern.exec(source))) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const isClosing = full.startsWith("</");
    const isSelfClosing = full.endsWith("/>") || voidTags.has(tag);
    if (!isClosing && depth === 0) start = match.index;
    if (!isClosing && !isSelfClosing) depth += 1;
    if (isClosing) depth = Math.max(0, depth - 1);
    if ((isClosing || isSelfClosing) && depth === 0) {
      parts.push(source.slice(start, tagPattern.lastIndex));
      start = tagPattern.lastIndex;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) parts.push(tail);
  return parts.length ? parts : [source];
}

function renderStructureAutoSegments(node, ctx) {
  if (!node.autoId) return [];
  const section = automaticSectionById(node.autoId);
  if (!section) return [];
  const live = ctx.structureLiveData || {};
  const hasLiveData = Boolean(live.weather || live.transport || live.ecology || live.infrastructure || live.attractions);
  if (!hasLiveData) return [];
  const autoCtx = structureAutoContext(node.autoId, ctx);
  autoCtx.inlineStructure = true;
  const html = node.autoId === "climate"
    ? renderClimateInline(section, autoCtx)
    : renderSectionHtml(section, autoCtx);
  return splitTopLevelHtml(html).map((segment, index) => ({
    id: `auto-${index}`,
    html: `<section class="structure-auto-content">${segment}</section>`,
  }));
}

function renderStructureComposer(node, ctx, editedHtml = "") {
  const segments = [];
  if (editedHtml) {
    segments.push({ id: "edited", html: renderStructureEditedContent(node) });
  }
  const insight = renderPresentationInsight(node, ctx);
  if (insight) segments.push({ id: "insight", html: insight });
  segments.push(...renderStructureAutoSegments(node, ctx));

  const parts = [];
  const appendContent = (html, anchor, options = {}) => {
    if (!html) return;
    parts.push(html);
    parts.push(renderStructureBuilderTools(node.id, anchor, "вставить здесь", options));
  };
  const appendBlock = (block, anchor) => {
    appendContent(renderStructureContentBlock(block, node.id), anchor, { afterBlockId: block.id });
  };

  structureContentBlocksForAnchor(node, "start").forEach((block) => {
    appendBlock(block, "start");
  });
  segments.forEach((segment) => {
    appendContent(segment.html, segment.id, { atAnchorStart: true });
    structureContentBlocksForAnchor(node, segment.id).forEach((block) => {
      appendBlock(block, segment.id);
    });
  });
  structureContentBlocksForAnchor(node, "end").forEach((block) => {
    appendBlock(block, "end");
  });

  if (!parts.length) parts.push(renderStructureBuilderTools(node.id, "end", "вставить здесь"));
  const html = parts.join("");

  return `
    <section class="structure-content-area">
      <div class="structure-content-list">${html}</div>
    </section>
  `;
}

function renderStructureContent(node, editable = false) {
  const blocks = structureContentBlocks(node.id);
  if (!editable) return renderStructureComposer(node, activeStructureRenderContext || projectContext(), structureEditedHtml(node.id));
  return `
    <section class="structure-content-area ${blocks.length ? "" : "structure-content-area-empty"}">
      <div class="structure-content-list">
        ${blocks.map((block) => renderStructureContentBlock(block, node.id, true)).join("")}
      </div>
    </section>
  `;
}

function renderStructureEditedContent(node) {
  const html = structureEditedHtml(node.id);
  if (!html) return "";
  return `
    <section class="structure-edited-content">
      <div class="structure-edited-body">${html}</div>
    </section>
  `;
}

function renderStructureMoveMap(nodes) {
  if (!nodes.length) return "";
  const renderChip = (node, colorIndex) => `
    <button
      type="button"
      class="structure-map-chip structure-color-${colorIndex}"
      draggable="true"
      data-drag-structure="${escapeHtml(node.id)}"
      data-structure-chip="${escapeHtml(node.id)}"
      data-parent-structure="${escapeHtml(node.parentId || "")}"
      data-structure-level="${structureNumberLevel(node.number)}"
      title="${escapeHtml(node.title)}"
    >
      <span class="structure-chip-number">${escapeHtml(node.number)}</span>
      <span class="structure-chip-title">${escapeHtml(node.title)}</span>
    </button>
  `;
  const renderGroup = (node, rootIndex = 0) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const colorIndex = (rootIndex % 6) + 1;
    return `
      <div class="structure-map-group structure-color-${colorIndex}" data-map-level="${structureNumberLevel(node.number)}">
        ${renderChip(node, colorIndex)}
        ${children.length ? `<div class="structure-map-children">${children.map((child) => renderGroup(child, rootIndex)).join("")}</div>` : ""}
      </div>
    `;
  };
  return `
    <aside class="structure-move-map" aria-label="Навигация по подглавам">
      <strong class="structure-map-title">Главы</strong>
      ${nodes.map((node, index) => renderGroup(node, index)).join("")}
    </aside>
  `;
}

function updateHeaderStructureNav(section) {
  if (!headerStructureNav || !("innerHTML" in headerStructureNav)) return;
  headerStructureNav.innerHTML = "";
  headerStructureNav.hidden = true;
  headerStructureNav.onclick = null;
  headerStructureNav.ondragstart = (event) => event.preventDefault();
}

function structureAutoContext(autoId, ctx) {
  const live = ctx.structureLiveData || {};
  const next = { ...ctx };
  if (autoId === "climate") {
    next.weatherDetail = ctx.weatherDetail || live.weather || null;
    next.tourismScore = extractTourismScore(next.weatherDetail);
  } else if (autoId === "transport") {
    next.liveData = live.transport || null;
  } else if (autoId === "ecology") {
    next.liveData = live.ecology || null;
  } else if (autoId === "surrounding" || autoId === "socio") {
    next.liveData = live.infrastructure || null;
  } else if (autoId === "attractions") {
    next.liveData = live.attractions || null;
  } else if (autoId === "swot-object") {
    next.weatherDetail = ctx.weatherDetail || live.weather || null;
    next.tourismScore = extractTourismScore(next.weatherDetail);
    next.liveData = {
      transport: live.transport || null,
      ecology: live.ecology || null,
      infrastructure: live.infrastructure || null,
      attractions: live.attractions || null,
    };
  }
  return next;
}

function renderClimateInline(section, ctx) {
  const detail = ctx.weatherDetail;
  const sections = detail?.sections || [];
  if (!sections.length) {
    return emptyData("Климатические данные не найдены", "Для выбранного города нет локальной WeatherSpark-страницы.");
  }
  const tourismScore = extractTourismScore(detail);
  return `
    ${tourismScoreCard(tourismScore)}
    <div class="content-grid two">
      <article class="text-block">
        <h3>Климатический профиль</h3>
        <p>Для города ${escapeHtml(ctx.cityName)} подключены локально сохраненные данные WeatherSpark: температура, облачность, осадки, влажность, ветер и лучшее время для посещения.</p>
      </article>
      <article class="text-block">
        <h3>Применение для базы отдыха</h3>
        <p>Климат влияет на сезонность открытых зон, прогулочных маршрутов, водных активностей, зимнего отдыха и график будущих мероприятий.</p>
      </article>
    </div>
    ${sourceList([{ label: "WeatherSpark Казахстан", url: "https://ru.weatherspark.com/countries/KZ" }])}
    <div class="weather-stack">
      ${sections.map((item) => `
        <article class="weather-section is-open">
          <button type="button">${escapeHtml(item.title)}</button>
          <div>${item.html}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderEcologyNarrativeInsight(node) {
  return `
    <section class="presentation-insight eco-analysis">
      <div class="insight-label">Подробный анализ</div>
      <div class="eco-analysis-head">
        <div>
          <h4>${escapeHtml(node.title)}</h4>
          <p>Экология здесь показана как понятная картина: что уже есть в регионе, какие проблемы влияют на участок и как это можно превратить в преимущество для загородного отдыха.</p>
        </div>
        <div class="eco-analysis-badge">простая структура без лишней воды</div>
      </div>

      <div class="eco-stage-grid">
        <article>
          <span>Старт</span>
          <strong>Зеленый пояс запущен в 1996 году</strong>
          <p>Цель: улучшить микроклимат степной столицы, снизить пыльные бури и метели, сформировать более комфортную среду вокруг города.</p>
        </article>
        <article>
          <span>Этап 1</span>
          <strong>1998-2004</strong>
          <p>Высажено более 9,6 млн деревьев и около 1,8 млн кустарников. Основной упор был на лиственные породы.</p>
        </article>
        <article>
          <span>Этап 2</span>
          <strong>с 2009 года</strong>
          <p>Развитие защитных полос в единый лесной массив. С 2012 года высажено 4,9 млн сеянцев на площади 4 265,6 га.</p>
        </article>
      </div>

      <div class="eco-split">
        <article>
          <h5>Текущее состояние территории</h5>
          <ul>
            <li>Общая площадь зеленого пояса около 78 000 га.</li>
            <li>В черте города около 14 827 га, из них 11 502,2 га занимают зеленые насаждения.</li>
            <li>С 2010 года площадь почти не увеличивалась, поэтому важнее становится качество ухода и восстановление почв.</li>
            <li>Главная проблема: часть почв засолена и требует мелиорации.</li>
          </ul>
        </article>
        <article>
          <h5>Что это дает выбранному региону</h5>
          <ul>
            <li>Средняя скорость ветра снизилась с 3,6 до 2,8 м/с.</li>
            <li>Количество дней со штилем выросло с 18 до 25 в год.</li>
            <li>Лес удерживает снег, укрепляет почву и снижает риск пыльных бурь.</li>
            <li>Зона становится понятным местом для прогулок, семейного отдыха и экологичных маршрутов.</li>
          </ul>
        </article>
      </div>

      <div class="eco-split">
        <article class="eco-warning">
          <h5>Современные вызовы</h5>
          <p>Несмотря на озеленение, загрязнение воздуха в столичной агломерации остается высоким. Основные источники нагрузки: ТЭЦ, рост частного транспорта, активная застройка и пыль от строительных процессов.</p>
        </article>
        <article class="eco-success">
          <h5>Окно возможностей</h5>
          <p>Чем выше нагрузка в городе, тем понятнее спрос на чистую загородную зону рядом с природой. Для проекта это сильная основа: тишина, воздух, зеленая среда и экологичная инфраструктура становятся не украшением, а главным аргументом.</p>
        </article>
      </div>

      ${table(["Категория", "Значение", "Доля", "Понятный вывод"], [
        ["Всего затрат на охрану окружающей среды", "127 840 тыс. тг", "~0,1% региона", "Очень низкий уровень природоохранных вложений"],
        ["Охрана воздуха и климата", "20 102 тыс. тг", "15,7%", "Есть контроль выбросов, но масштаб ограничен"],
        ["Снижение парниковых газов", "420 тыс. тг", "<0,5%", "Климатические инициативы почти не развиты"],
        ["Очистка сточных вод", "76 788 тыс. тг", "60%", "Главный экологический приоритет региона"],
        ["Обращение с отходами", "24 756 тыс. тг", "19,4%", "Есть работа с отходами, но системность нужно усиливать"],
      ])}

      <div class="eco-opportunity-grid">
        <article>
          <strong>Экологичность как преимущество</strong>
          <p>Использовать солнечные панели, биологическую очистку сточных вод, повторное использование воды и природный ландшафт вместо лишней застройки.</p>
        </article>
        <article>
          <strong>Позиционирование</strong>
          <p>Показывать объект как спокойную природную зону рядом с городом, куда легко приехать семьей, классом, компанией или на короткий отдых.</p>
        </article>
        <article>
          <strong>Что проверить перед запуском</strong>
          <p>Почвы, воду, санитарные зоны, шум, соседние источники нагрузки и официальный статус земли. Это снижает риск ошибок на старте.</p>
        </article>
      </div>
    </section>
  `;
}

function ecologyAirLevel(aqi) {
  const value = Number(aqi);
  if (!Number.isFinite(value)) {
    return {
      tone: "warn",
      title: "Нет свежего индекса воздуха",
      level: "нужно проверить",
      text: "Сервис качества воздуха не вернул значение по выбранной точке. Для решения по участку нужно смотреть ближайшие посты мониторинга и повторить замер в разные сезоны.",
      action: "Не делать сильное экологическое позиционирование без подтверждения замерами.",
    };
  }
  if (value <= 20) {
    return {
      tone: "good",
      title: "Воздух сейчас очень хороший",
      level: "комфортный",
      text: "Территория подходит для прогулок, детских зон, спокойного отдыха и открытых террас. Экологический фон можно использовать как сильную часть концепции.",
      action: "Сохранять природный сценарий: больше деревьев, меньше лишнего асфальта, тихие прогулочные маршруты.",
    };
  }
  if (value <= 40) {
    return {
      tone: "good",
      title: "Воздух сейчас хороший",
      level: "нормальный",
      text: "Фон подходит для рекреации. Ограничения по отдыху на улице не выглядят критичными, но рядом с дорогами и парковками лучше делать зеленые буферы.",
      action: "Размещать активные зоны дальше от подъезда и усиливать озеленение по периметру.",
    };
  }
  if (value <= 60) {
    return {
      tone: "warn",
      title: "Воздух умеренный, ближе к верхней границе комфорта",
      level: "средняя нагрузка",
      text: "Для обычного отдыха это допустимо, но для wellness, детских активностей и спорта на улице важно снизить пыль, выхлопы и влияние ветра на участке.",
      action: "Нужны зеленые полосы, пылезащита, грамотная парковка и повторная проверка воздуха в высокий сезон.",
    };
  }
  if (value <= 80) {
    return {
      tone: "bad",
      title: "Воздух выше желаемого уровня",
      level: "повышенная нагрузка",
      text: "Открытые активности, детские зоны и спортивные сценарии нужно проектировать осторожно. Экологический образ проекта нельзя строить только на словах.",
      action: "Проверить источники загрязнения, убрать активные зоны от дорог, добавить плотное озеленение и предусмотреть закрытые комфортные пространства.",
    };
  }
  return {
    tone: "bad",
    title: "Воздух неблагоприятный",
    level: "высокая нагрузка",
    text: "Для рекреационного проекта это серьезный риск: гости могут хуже воспринимать отдых на улице, а экологическое позиционирование будет слабым без инженерных мер.",
    action: "Нужна отдельная экологическая проверка участка, сезонные замеры и пересмотр размещения открытых зон.",
  };
}

function ecologyMetricRow(label, simpleName, value, unit, meaning, effect, limit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const status = Number.isFinite(limit) && numeric > limit ? "выше ориентира" : "в нормальном диапазоне";
  return `
    <tr>
      <td>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(simpleName)}</span>
      </td>
      <td><strong>${escapeHtml(formatNumber(numeric))} ${escapeHtml(unit || "")}</strong></td>
      <td>${escapeHtml(status)}</td>
      <td>
        <p>${escapeHtml(meaning)}</p>
        <small>${escapeHtml(effect)}</small>
      </td>
    </tr>
  `;
}

function renderEcologyRegionReport(section, ctx, data) {
  const air = data.air || null;
  const aqi = Number(air?.european_aqi);
  const level = ecologyAirLevel(aqi);
  const greenCount = data.green.length + data.natural.length;
  const riskCount = data.risks.length;
  const route = routeMetrics(ctx);
  const sourceLabel = data.source === "google" ? "Карты Google" : data.source === "2gis" ? "2ГИС" : "карта";
  const pm25 = Number(air?.pm2_5);
  const pm10 = Number(air?.pm10);
  const no2 = Number(air?.nitrogen_dioxide);
  const metricRows = [
    ecologyMetricRow(
      "PM2.5",
      "очень мелкая пыль",
      pm25,
      "µg/m³",
      "Это микроскопическая пыль, которую не видно глазами. Она легко попадает глубоко в легкие.",
      "Если значение высокое, гостям хуже гулять, заниматься спортом и долго находиться на улице.",
      25,
    ),
    ecologyMetricRow(
      "PM10",
      "обычная крупная пыль",
      pm10,
      "µg/m³",
      "Это более крупные частицы пыли: земля, песок, пыль от дорог, строек и сухих площадок.",
      "Если PM10 высокий, на участке нужны газоны, деревья, твердые дорожки без пыли и защита от ветра.",
      50,
    ),
    ecologyMetricRow(
      "NO₂",
      "выхлопы транспорта",
      no2,
      "µg/m³",
      "Это газ, который часто появляется рядом с дорогами, парковками и активным транспортом.",
      "Если значение растет, детские зоны, террасы и маршруты лучше уводить дальше от подъезда и парковки.",
      40,
    ),
  ].filter(Boolean).join("");

  const greenText = greenCount
    ? `По подключенной карте рядом найдено ${greenCount} зеленых или природных объектов. Это усиливает прогулочный и семейный сценарий, но качество зелени нужно проверить на месте.`
    : `Подключенная ${sourceLabel} не подтвердила выраженный зеленый каркас рядом с точкой. Это не значит, что зелени нет, но для концепции нельзя опираться на нее без выезда, фотофиксации и проверки спутниковой карты.`;
  const riskText = riskCount
    ? `Рядом найдено ${riskCount} потенциальных источников нагрузки. Их нужно проверить по санитарным зонам, шуму, запахам и направлению ветра.`
    : "Явные промышленные или нагрузочные объекты по подключенной карте рядом не выделены. Это хороший предварительный сигнал, но санитарные зоны и соседние землепользования все равно нужно подтвердить официально.";

  return `
    <section class="eco-region-report">
      <div class="eco-region-head eco-region-${level.tone}">
        <div>
          <span>Экологический вывод по выбранной точке</span>
          <h3>${escapeHtml(level.title)}</h3>
          <p>${escapeHtml(level.text)}</p>
        </div>
        <div class="eco-aqi-score">
          <strong>${Number.isFinite(aqi) ? `${formatNumber(aqi)} AQI` : "нет AQI"}</strong>
          <span>AQI — общий индекс чистоты воздуха: чем меньше число, тем легче и комфортнее дышать.</span>
        </div>
      </div>

      <div class="eco-region-grid">
        <article>
          <span>Воздух</span>
          <h4>${escapeHtml(level.level)}</h4>
          <p>${escapeHtml(level.action)}</p>
        </article>
        <article>
          <span>Зеленое окружение</span>
          <h4>${greenCount ? `${greenCount} объектов рядом` : "нужно подтвердить"}</h4>
          <p>${escapeHtml(greenText)}</p>
        </article>
        <article>
          <span>Источники нагрузки</span>
          <h4>${riskCount ? `${riskCount} объектов` : "явных нет"}</h4>
          <p>${escapeHtml(riskText)}</p>
        </article>
      </div>

      <article class="eco-region-explain">
        <h4>Что это значит для проекта</h4>
        <p>Для участка в районе города ${escapeHtml(ctx.cityName)} важны не все химические показатели подряд, а практический вывод: можно ли комфортно гулять, размещать детские и спортивные зоны, открытые террасы, банный двор и спокойные маршруты. При текущей оценке главное решение — защитить территорию от пыли, транспорта и ветра, а экологичность подтверждать реальными зелеными решениями на участке.</p>
      </article>

      ${metricRows ? `
        <div class="table-scroll eco-region-table">
          <table>
            <thead>
              <tr>
                <th>Показатель</th>
                <th>Сейчас у точки</th>
                <th>Оценка</th>
                <th>Почему важно</th>
              </tr>
            </thead>
            <tbody>${metricRows}</tbody>
          </table>
        </div>
      ` : `
        <article class="empty-state">
          <h2>Основные показатели воздуха не загрузились</h2>
          <p>Для экологического вывода нужны AQI, PM2.5, PM10 и NO₂. Сейчас можно использовать карту окружения и повторить загрузку позже.</p>
        </article>
      `}

      <div class="eco-region-actions">
        <article>
          <strong>Что сделать на участке</strong>
          <p>Посадить плотные зеленые полосы со стороны дороги и ветров, отделить парковку от зон отдыха, уменьшить пыльные покрытия, предусмотреть тихие пешеходные маршруты.</p>
        </article>
        <article>
          <strong>Что проверить перед решением</strong>
          <p>Санитарные зоны, соседние производства, направление ветра, шум, запахи, качество воды и почвы, а также реальные зеленые насаждения вокруг точки.</p>
        </article>
      </div>
    </section>
  `;
}

function projectAreaLabel(project) {
  const area = polygonAreaSqMeters(basePolygon(project));
  return area > 0 ? formatArea(area) : "уточняется после контура";
}

function dynamicPresentationInsight(node, ctx = projectContext()) {
  const cityName = ctx.cityName || ctx.project?.cityName || "выбранный город";
  const regionName = ctx.regionName || ctx.project?.regionName || ctx.city?.regionName || "выбранный регион";
  const route = routeMetrics(ctx);
  const profile = geoProfile(ctx.city);
  const demand = demandProfile(ctx, route);
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const distance = Number.isFinite(route.road) ? `${route.road.toFixed(1)} км` : "расчет после отметки базы";
  const carTime = Number.isFinite(route.carMinutes) ? `${route.carMinutes} мин` : "расчет после отметки базы";
  const tourism = ctx.tourismScore || extractTourismScore(ctx.weatherDetail);
  const tourismMetric = tourism?.tourism ? `${tourism.tourism.toFixed(1)} / 10` : "данные WeatherSpark";

  const commonPoints = [
    `Анализ относится к городу ${cityName} и региону ${regionName}, а не к примеру из презентации.`,
    "Точные выводы по участку усиливаются после отметки базы или сохранения контура на карте.",
  ];

  const insights = {
    "chapter-object": {
      badge: "паспорт участка",
      title: `Главное по объекту в регионе ${regionName}`,
      lead: `Проект рассматривается рядом с городом ${cityName}. Оценка строится от выбранного региона, координат участка, расстояния до города, климатических данных и окружения на карте.`,
      metrics: [
        [projectAreaLabel(ctx.project), "площадь сохраненного контура"],
        [distance, `расчетная дорога до ${cityName}`],
        [`${lat.toFixed(4)}, ${lng.toFixed(4)}`, "точка проекта"],
        [regionName, "регион анализа"],
      ],
      points: commonPoints,
    },
    "struct-location": {
      badge: "местоположение",
      title: `Локация оценивается относительно ${cityName}`,
      lead: `Для проекта важны не данные презентационного примера, а связь выбранной точки с ${cityName}: время поездки, удобство подъезда, близость к спросу и локальному окружению.`,
      metrics: [
        [cityName, "город спроса"],
        [regionName, "административный регион"],
        [distance, "расчетная дорога"],
        [carTime, "ориентир на автомобиле"],
      ],
    },
    "struct-geo": {
      badge: "география",
      title: `Географический профиль: ${cityName}`,
      lead: `Для региона ${regionName} принят профиль: ${profile.relief}. Это предварительная оценка, которую нужно сверить с фактическим контуром участка.`,
      metrics: [
        [projectAreaLabel(ctx.project), "площадь участка"],
        [profile.landscape, "ландшафтный контекст"],
        [`${lat.toFixed(4)}, ${lng.toFixed(4)}`, "координаты"],
        [regionName, "регион"],
      ],
    },
    "struct-climate": {
      badge: "климат",
      title: `Климатический блок для ${cityName}`,
      lead: `Климатические выводы берутся для выбранного города ${cityName}. Если локальные WeatherSpark-данные загружены, показатели туризма и пляжного сезона показываются ниже.`,
      metrics: [
        [tourismMetric, "балл по туризму"],
        [cityName, "город WeatherSpark"],
        [regionName, "регион"],
      ],
      points: [
        tourism?.bestSentence || "Откройте автоанализ климата, чтобы подтянуть лучший сезон из WeatherSpark.",
        "Сезонность нужно переводить в продуктовые решения: крытые зоны, тень, навесы, вода, банный блок и сценарии непогоды.",
      ],
    },
    "struct-transport": {
      badge: "доступность",
      title: `Транспортная доступность от ${cityName}`,
      lead: `Доступность считается от выбранного города ${cityName} до точки проекта. После сохранения контура или точки базы расчет обновляется по координатам проекта.`,
      metrics: [
        [distance, `дорога от ${cityName}`],
        [carTime, "ориентир на автомобиле"],
        [`${route.busMinutes} мин`, "ориентир с запасом на трансфер"],
        [regionName, "регион"],
      ],
      points: [
        "Для коротких поездок критичны понятная навигация, парковка и безопасный подъезд.",
        "Если расстояние растет, проекту нужен более сильный повод поездки: банный комплекс, природа, событие или размещение на выходные.",
      ],
    },
    "struct-swot-object": {
      badge: "SWOT",
      title: `SWOT объекта для ${cityName}`,
      lead: "SWOT собирается по выбранному городу и региону: спрос, доступность, климат, окружение и готовность участка не наследуются от презентационного примера.",
      table: {
        headers: ["S / W / O / T", "Содержание"],
        rows: [
          ["S", `близость к ${cityName}, понятный региональный спрос, возможность проверить формат по фактической точке`],
          ["W", "нужны подтвержденные данные по подъезду, инженерии, ограничениям участка и фотофиксации"],
          ["O", `${demand.audience}; развитие рекреации с учетом локального ландшафта: ${profile.landscape}`],
          ["T", "сезонность, стоимость инженерии, слабый подъезд, конкуренция локальных форматов отдыха"],
        ],
      },
    },
    "chapter-market": {
      badge: "рынок",
      title: `Рынок спроса вокруг ${cityName}`,
      lead: `${cityName} рассматривается как основная база спроса для проекта. Вывод строится по типу города, расстоянию до базы и региональному сценарию отдыха.`,
      metrics: [
        [demand.scale, "масштаб спроса"],
        [demand.audience, "ядро аудитории"],
        [distance, "барьер поездки"],
        [regionName, "регион рынка"],
      ],
      points: [demand.conclusion],
    },
    "struct-market-overview": {
      badge: "2.1",
      title: `Основной спрос формируют жители ${cityName}`,
      lead: `Главный рынок проекта — жители выбранного города и ближайшего региона, которым нужен понятный отдых рядом с городом или поездка выходного дня.`,
      metrics: [
        [cityName, "город спроса"],
        [demand.scale, "оценка рынка"],
        [carTime, "время поездки"],
        [regionName, "регион"],
      ],
      points: [
        demand.conclusion,
        "Цифры по туристическому потоку не подставляются из презентационного примера; их нужно добавлять только из источника по выбранному региону.",
      ],
    },
    "struct-attractions": {
      badge: "предложение",
      title: `Конкурентное окружение нужно считать по ${cityName}`,
      lead: `Бани, базы отдыха, бассейны, рестораны и развлечения должны анализироваться вокруг выбранной точки и города ${cityName}. Данные из презентации по другому городу здесь не используются.`,
      metrics: [
        [cityName, "город поиска конкурентов"],
        [regionName, "регион рынка"],
        [distance, "радиусный контекст поездки"],
        ["по карте", "количество объектов рядом"],
      ],
      points: [
        "Откройте автоанализ достопримечательностей и инфраструктуры, чтобы подтянуть реальные объекты рядом с точкой.",
        "Сравнение должно идти по локальным форматам выбранного региона: бани, базы, бассейны, семейный отдых, события.",
      ],
    },
    "struct-competitors": {
      badge: "2.4",
      title: `Сравнение вариантов для региона ${regionName}`,
      lead: `Оценка концептов должна опираться на спрос вокруг ${cityName}, доступность участка и региональные строительные условия. Чужие строительные ориентиры из презентации не подставляются как факт.`,
      metrics: [
        ["региональный расчет", "стоимость строительства"],
        [demand.scale, "потенциал спроса"],
        [distance, "транспортный барьер"],
        ["поэтапно", "снижение инвестиционного риска"],
      ],
    },
    "struct-options-swot": {
      badge: "3.3",
      title: `SWOT вариантов для ${cityName}`,
      lead: `Сила концепции зависит от того, насколько выбранный регион поддерживает поездки выходного дня, wellness, семейные сценарии и события.`,
      table: {
        headers: ["Сильные стороны", "Слабые стороны"],
        rows: [
          [`связь с ${cityName}, ${demand.scale}, локальный природный контекст`, "стоимость строительства и инженерии нужно уточнить по участку"],
          ["мультиформат wellness + бани + open-air + события", "бренд и сервис придется создавать с нуля"],
          [`региональный ландшафт: ${profile.landscape}`, "сезонность и подъезд могут ограничивать загрузку"],
        ],
      },
    },
    "struct-ranking": {
      badge: "3.4",
      title: `Ранжирование факторов для ${cityName}`,
      lead: `Вес факторов считается по выбранной локации: близость к ${cityName}, климат, подъезд, конкуренция, инженерная готовность и сила продукта.`,
      metrics: [
        ["высокий вес", `доступность от ${cityName}`],
        ["высокий вес", "всесезонность и крытые зоны"],
        ["средний вес", "ландшафт и точки притяжения"],
        ["после обследования", "инженерные ограничения"],
      ],
    },
    "struct-recommendations": {
      badge: "3.5",
      title: `Рекомендации для проекта у ${cityName}`,
      lead: `Развивать проект стоит поэтапно: сначала подтвердить спрос выбранного города, затем расширять продукт под региональные аудитории и сезонность.`,
      table: {
        headers: ["Направление", "Решение", "Эффект"],
        rows: [
          ["Позиционирование", `wellness и отдых выходного дня для ${cityName}`, "понятный локальный спрос"],
          ["Продукт", "1 очередь: бани, вода, питание, day-use; 2 очередь: проживание и события", "снижение сезонности"],
          ["Проверка", "подъезд, инженерия, конкуренты и климат по выбранной точке", "корректный бюджет и меньше рисков"],
        ],
      },
    },
    "chapter-concept": {
      badge: "концепция",
      title: `Предварительная концепция для ${regionName}`,
      lead: `Концепция строится не вокруг презентационного примера, а вокруг выбранного города ${cityName}: региональный спрос, расстояние до базы, климат и локальный ландшафт.`,
      metrics: [
        [demand.scale, "рыночная база"],
        [profile.landscape, "природный контекст"],
        [distance, "доступность"],
        ["поэтапность", "снижение инвестиционного риска"],
      ],
    },
    "struct-financial": {
      badge: "4.3",
      title: `Финансовая логика для региона ${regionName}`,
      lead: "Финансовая модель должна использовать строительные цены, зарплаты, сезонность и спрос выбранного региона. Ориентиры из презентационного примера здесь заменены на региональные допущения до загрузки источников.",
      metrics: [
        ["уточняется", "стоимость строительства по региону"],
        [demand.scale, "основа спроса"],
        [carTime, "транспортный барьер"],
        ["несколько потоков", "выручка: вход, бани, еда, события, проживание"],
      ],
      points: [
        "Перед бюджетом нужны локальные коммерческие предложения по строительству и инженерии.",
        "Модель должна учитывать сезонность выбранного города и фактическую доступность участка.",
      ],
    },
    "struct-concept-swot": {
      badge: "4.4",
      title: `SWOT концепции для ${cityName}`,
      lead: `Концепция выигрывает, если отвечает реальному спросу ${cityName}, а не повторяет пример другого города.`,
      table: {
        headers: ["Группа", "Факторы"],
        rows: [
          ["Сильные", `доступность от ${cityName}, локальный спрос, wellness-тренд, несколько аудиторий`],
          ["Слабые", "капиталоемкость, инженерная подготовка, новый бренд"],
          ["Возможности", `${demand.audience}, эко-события, семейные и корпоративные пакеты`],
          ["Угрозы", "погода, конкуренты выбранного региона, рост стоимости строительства, ошибки оператора"],
        ],
      },
    },
    "struct-conclusion": {
      badge: "4.5",
      title: `Итог по выбранному региону: ${cityName}`,
      lead: `Проект нужно развивать как региональный рекреационный продукт рядом с ${cityName}: сначала сильное ядро и проверка спроса, затем расширение под проживание, события и premium-сценарии.`,
      points: [
        `Главный продукт должен быть понятен жителям ${cityName}: отдых, тепло, вода, природа, сервис и удобная дорога.`,
        "Инженерные риски нужно закрыть до финального бюджета: геология, дренаж, сети и подъезды.",
        `Все дальнейшие цифры должны добавляться из источников по региону ${regionName}.`,
      ],
    },
  };

  return insights[node.id] || null;
}

function genericPresentationInsight(node, ctx = projectContext()) {
  const original = PRESENTATION_INSIGHTS[node.id];
  if (!original) return null;
  const cityName = ctx.cityName || ctx.project?.cityName || "выбранный город";
  const regionName = ctx.regionName || ctx.project?.regionName || ctx.city?.regionName || "выбранный регион";
  const route = routeMetrics(ctx);
  return {
    badge: original.badge || "анализ",
    title: node.title,
    lead: `Раздел нужно заполнять по выбранной локации: ${cityName}, ${regionName}. Данные из презентационного примера не используются как фактическая основа для этого проекта.`,
    metrics: [
      [cityName, "город анализа"],
      [regionName, "регион"],
      [`${route.road.toFixed(1)} км`, "расчетная дорога до города"],
      ["уточняется", "локальные числовые показатели"],
    ],
    points: [
      "Для финальной версии добавьте источники именно по выбранному региону.",
      "Автоанализ карты, климата, транспорта и окружения использует координаты текущего проекта.",
    ],
  };
}

function renderPresentationInsight(node, ctx = projectContext()) {
  if (node.id === "struct-ecology") return "";
  const insight = dynamicPresentationInsight(node, ctx) || genericPresentationInsight(node, ctx);
  if (!insight) return "";
  const metrics = Array.isArray(insight.metrics) ? insight.metrics : [];
  const points = Array.isArray(insight.points) ? insight.points : [];
  const tableData = insight.table;
  return `
    <section class="presentation-insight">
      <div class="insight-label">Краткий анализ</div>
      <div class="presentation-insight-body">
        ${insight.badge ? `<div class="insight-topic">${escapeHtml(insight.badge)}</div>` : ""}
        <h4>${escapeHtml(insight.title || node.title)}</h4>
        ${insight.lead ? `
          <div class="plain-answer">
            <span>Суть</span>
            <p>${escapeHtml(insight.lead)}</p>
          </div>
        ` : ""}
        ${metrics.length ? `
          <div class="insight-subtitle">Главные показатели</div>
          <div class="presentation-kpis">
            ${metrics.map(([value, label]) => `
              <article>
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
              </article>
            `).join("")}
          </div>
        ` : ""}
        ${points.length ? `
          <div class="insight-subtitle">Понятный вывод</div>
          <ul class="presentation-points">
            ${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        ` : ""}
        ${tableData ? `<div class="insight-subtitle">Детали</div>${table(tableData.headers || [], tableData.rows || [])}` : ""}
      </div>
    </section>
  `;
}

function renderRegionalInsight(node, ctx) {
  const project = ctx.project || {};
  const cityName = ctx.cityName || project.cityName || "выбранный город";
  const regionName = project.regionName || ctx.city?.regionName || "выбранный регион";
  const [lat, lng] = projectCoords(project, ctx.city);
  const route = routeMetrics(ctx);
  const level = structureNumberLevel(node.number);
  const focusByLevel = level <= 1
    ? "вся глава считается по выбранной точке и региону проекта"
    : "данные ниже относятся к той же выбранной точке проекта";
  const metrics = [
    [cityName, "город анализа"],
    [regionName, "регион"],
    [`${lat.toFixed(4)}, ${lng.toFixed(4)}`, "точка проекта"],
  ];
  if (Number.isFinite(route.road)) metrics.push([`${route.road.toFixed(1)} км`, "расчетная дорога до города"]);
  return `
    <section class="regional-insight">
      <div class="insight-label">Регион анализа</div>
      <div class="regional-insight-body">
        <div>
          <h4>${escapeHtml(cityName)} / ${escapeHtml(regionName)}</h4>
          <p>${escapeHtml(focusByLevel)}. Карта, климат, транспорт, окружение и инфраструктура привязаны к координатам проекта.</p>
        </div>
        <div class="regional-kpis">
          ${metrics.map(([value, label]) => `
            <article>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(value)}</span>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderStructureNodeCard(node, depth = 0, ctx = activeStructureRenderContext || projectContext()) {
  const children = Array.isArray(node.children) ? node.children : [];
  const canDelete = node.custom || !node.required;
  const isCollapsed = Boolean(state.structureCollapsed[node.id]);
  const editedHtml = structureEditedHtml(node.id);
  return `
    <article class="structure-card structure-level-${Math.min(structureNumberLevel(node.number), 4)} ${isCollapsed ? "is-collapsed" : ""}" data-structure-node="${escapeHtml(node.id)}" data-parent-structure="${escapeHtml(node.parentId || "")}" data-structure-level="${structureNumberLevel(node.number)}" style="--depth:${depth}">
      <div class="structure-card-head">
        <button type="button" class="structure-drag-handle" draggable="true" data-drag-structure="${escapeHtml(node.id)}" aria-label="Переместить подглаву">⋮⋮</button>
        <span class="structure-number">${escapeHtml(node.number)}</span>
        <div>
          <h3>${escapeHtml(node.title)}</h3>
          ${structureStatus(node) ? `<p>${escapeHtml(structureStatus(node))}</p>` : ""}
        </div>
      </div>
      <div class="structure-card-actions">
        ${node.autoId ? `<button type="button" class="structure-action-button structure-open-auto" data-open-auto-section="${escapeHtml(node.autoId)}">Открыть автоанализ</button>` : ""}
        <button type="button" class="structure-action-button structure-edit-button" data-edit-structure-node="${escapeHtml(node.id)}">Редактор текста</button>
        <button type="button" class="structure-icon-button structure-collapse-button" data-toggle-structure-collapse="${escapeHtml(node.id)}" aria-label="${isCollapsed ? "Развернуть подглаву" : "Свернуть подглаву"}" aria-expanded="${String(!isCollapsed)}"></button>
        <button type="button" class="structure-action-button" data-add-structure-child="${escapeHtml(node.id)}">+ Подглава</button>
        ${canDelete ? `<button type="button" class="structure-action-button structure-delete-button" data-remove-structure="${escapeHtml(node.id)}">Удалить</button>` : ""}
      </div>
      <div class="structure-card-body">
        ${renderStructureContent(node)}
        ${children.length ? `<div class="structure-children">${children.map((child) => renderStructureNodeCard(child, depth + 1, ctx)).join("")}</div>` : ""}
      </div>
    </article>
  `;
}

function renderStructureBuilder(section, ctx) {
  activeStructureRenderContext = ctx;
  const node = structureNodeById(section.id);
  const children = Array.isArray(node?.children) ? node.children : [];
  return `
    <section class="structure-builder">
      <div class="structure-builder-head">
        <div>
          <h2>${escapeHtml(node?.number || section.number)}. ${escapeHtml(node?.title || section.title)}</h2>
        </div>
        <button type="button" class="structure-action-button structure-add-top" data-add-structure-child="${escapeHtml(section.id)}">+ Добавить подглаву</button>
      </div>
      ${node ? `<div class="structure-chapter-summary">
        ${renderRegionalInsight(node, ctx)}
        ${renderPresentationInsight(node, ctx)}
      </div>` : ""}
      <div class="structure-grid">
        ${children.length ? children.map((child) => renderStructureNodeCard(child, 0, ctx)).join("") : `<article class="empty-state"><h2>Подглав пока нет</h2><p>Добавьте первую подглаву для этого раздела.</p></article>`}
      </div>
    </section>
  `;
}

function nextStructureNumber(parentNode) {
  const children = Array.isArray(parentNode?.children) ? parentNode.children : [];
  return `${parentNode?.number || "1"}.${children.length + 1}`;
}

function requestStructureTitle(number) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <form class="structure-title-dialog">
        <h3>Название подглавы ${escapeHtml(number)}</h3>
        <label>Название<input type="text" name="title" placeholder="Введите название подглавы" required></label>
        <div class="confirm-actions">
          <button type="button" class="ghost-button" data-title-cancel>Нет</button>
          <button type="submit">Да</button>
        </div>
      </form>
    `;
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-title-cancel]")) close(null);
    });
    overlay.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      close(String(formData.get("title") || "").trim());
    });
    document.body.appendChild(overlay);
    overlay.querySelector("input")?.focus();
  });
}

async function addStructureChild(parentId) {
  const project = currentProject();
  if (!project) return;
  const tree = projectStructureTree(project);
  const parentNode = flattenStructure(tree).find((node) => node.id === parentId);
  if (!parentNode) return;
  const additions = projectStructureAdditions(project);
  const number = nextStructureNumber(parentNode);
  const title = await requestStructureTitle(number);
  if (!title) return;
  additions.push({
    id: `structure-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    parentId,
    number,
    title,
  });
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
}

function makeStructureContentId() {
  return `content-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addStructureContent(nodeId, type, settings = {}) {
  const project = currentProject();
  if (!project) return;
  const blocks = structureContentBlocks(nodeId, project);
  const title = String(settings.title || defaultStructureContentTitle(type)).trim();
  const block = { id: makeStructureContentId(), type, title };
  block.anchor = String(settings.anchor || "end");
  if (type === "text") block.text = "";
  if (type === "card") {
    block.title = title || "Новая карточка";
    block.text = "";
    block.tone = "default";
  }
  if (type === "table") {
    block.rows = Math.max(1, Math.min(20, Number(settings.rows) || 2));
    block.cols = Math.max(1, Math.min(12, Number(settings.cols) || 2));
    block.cells = Array.from({ length: block.rows }, () => Array.from({ length: block.cols }, () => ""));
  }
  if (type === "image" || type === "video") block.src = "";
  let targetIndex = -1;
  if (settings.insertAfter) {
    const afterIndex = blocks.findIndex((item) => item.id === settings.insertAfter);
    if (afterIndex >= 0) targetIndex = afterIndex + 1;
  } else if (settings.insertAtStart) {
    const firstAnchorIndex = blocks.findIndex((item) => structureBlockAnchor(item) === block.anchor);
    targetIndex = firstAnchorIndex >= 0 ? firstAnchorIndex : blocks.length;
  }
  if (targetIndex >= 0) {
    blocks.splice(Math.max(0, Math.min(blocks.length, targetIndex)), 0, block);
  } else {
    blocks.push(block);
  }
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
}

function updateStructureContentBlock(nodeId, blockId, updater) {
  const project = currentProject();
  if (!project) return;
  const block = structureContentBlocks(nodeId, project).find((item) => item.id === blockId);
  if (!block) return;
  updater(block);
  project.updatedAt = new Date().toISOString();
  saveProjects();
}

function removeStructureContent(nodeId, blockId) {
  const project = currentProject();
  if (!project) return;
  const content = projectStructureContent(project);
  content[nodeId] = structureContentBlocks(nodeId, project).filter((block) => block.id !== blockId);
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
}

async function handleAddStructureContentButton(button) {
  if (!button) return;
  const select = button.closest("[data-insert-slot]")?.querySelector("[data-content-type-select]");
  const type = button.dataset.addContentType || select?.value;
  const targetNodeId = button.dataset.contentNode;
  if (!type || !targetNodeId) return;
  const settings = await requestContentBlockSettings(type);
  if (!settings) return;
  settings.anchor = button.dataset.insertAnchor || select?.dataset.insertAnchor || "end";
  settings.insertAfter = button.dataset.insertAfter || select?.dataset.insertAfter || "";
  settings.insertAtStart = button.dataset.insertAtStart === "true" || select?.dataset.insertAtStart === "true";
  addStructureContent(targetNodeId, type, settings);
}

function requestContentBlockSettings(type) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    const isTable = type === "table";
    const title = defaultStructureContentTitle(type);
    overlay.innerHTML = `
      <form class="table-size-dialog">
        <h3>Добавить: ${escapeHtml(structureContentLabel(type))}</h3>
        <label>Оглавление элемента<input type="text" name="title" value="" placeholder="${escapeHtml(title)}" required></label>
        ${isTable ? `
          <div class="table-size-grid">
            <label>Строки<input type="number" min="1" max="20" value="3" name="rows"></label>
            <label>Столбцы<input type="number" min="1" max="12" value="3" name="cols"></label>
          </div>
        ` : ""}
        <div class="confirm-actions">
          <button type="button" class="ghost-button" data-table-cancel>Отмена</button>
          <button type="submit">Добавить</button>
        </div>
      </form>
    `;
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-table-cancel]")) close(null);
    });
    overlay.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      close({
        title: String(formData.get("title") || title).trim(),
        rows: formData.get("rows"),
        cols: formData.get("cols"),
      });
    });
    document.body.appendChild(overlay);
    overlay.querySelector("input")?.focus();
  });
}

function requestTableSize() {
  return requestContentBlockSettings("table");
}

function structureAdditionById(project, id) {
  return projectStructureAdditions(project).find((item) => item.id === id) || null;
}

function confirmDialog({ title, text, confirmText = "Да", cancelText = "Нет" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <section class="confirm-dialog" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
        <div class="confirm-actions">
          <button type="button" class="ghost-button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
          <button type="button" class="danger-button" data-confirm-ok>${escapeHtml(confirmText)}</button>
        </div>
      </section>
    `;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close(false);
    };
    const close = (answer) => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(answer);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-confirm-cancel]")) close(false);
      if (event.target.closest("[data-confirm-ok]")) close(true);
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
    overlay.querySelector("[data-confirm-cancel]")?.focus();
  });
}

async function removeStructureNode(nodeId) {
  const project = currentProject();
  if (!project) return;
  const tree = projectStructureTree(project);
  const node = flattenStructure(tree).find((item) => item.id === nodeId);
  if (!node || node.required) return;
  const confirmed = await confirmDialog({
    title: "Удалить подглаву?",
    text: `Подглава «${node.title}» будет удалена из структуры проекта.`,
    confirmText: "Да",
    cancelText: "Нет",
  });
  if (!confirmed) return;

  if (node.custom) {
    const removeIds = new Set([node.id]);
    let changed = true;
    while (changed) {
      changed = false;
      projectStructureAdditions(project).forEach((item) => {
        if (removeIds.has(item.parentId) && !removeIds.has(item.id)) {
          removeIds.add(item.id);
          changed = true;
        }
      });
    }
    project.structureAdditions = projectStructureAdditions(project).filter((item) => !removeIds.has(item.id));
  } else {
    const hidden = projectHiddenStructureIds(project);
    if (!hidden.includes(node.id)) hidden.push(node.id);
  }

  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
}

function saveStructureSiblingOrder(project, parentId, ids) {
  const order = projectStructureOrder(project);
  order[parentId || "root"] = ids;
}

function canMoveStructureCard(draggedCard, targetCard) {
  if (!draggedCard || !targetCard || draggedCard === targetCard) return false;
  return draggedCard.dataset.structureLevel === targetCard.dataset.structureLevel
    && draggedCard.dataset.parentStructure === targetCard.dataset.parentStructure;
}

function structureTargetId(element) {
  return element?.dataset.structureNode || element?.dataset.structureChip || "";
}

function structureDropTarget(event) {
  return event.target.closest("[data-structure-node], [data-structure-chip]");
}

function structureDragElement(builder, draggedId) {
  return [...builder.querySelectorAll("[data-structure-node], [data-structure-chip]")]
    .find((node) => structureTargetId(node) === draggedId);
}

function structurePlaceAfter(event, target) {
  const rect = target.getBoundingClientRect();
  if (target.matches("[data-structure-chip]")) return event.clientX > rect.left + rect.width / 2;
  return event.clientY > rect.top + rect.height / 2;
}

function moveStructureNode(draggedId, targetId, placeAfter = false) {
  const project = currentProject();
  if (!project || !draggedId || !targetId || draggedId === targetId) return;
  const tree = projectStructureTree(project);
  const nodes = flattenStructure(tree);
  const dragged = nodes.find((node) => node.id === draggedId);
  const target = nodes.find((node) => node.id === targetId);
  if (!dragged || !target || dragged.id === target.id) return;

  const targetParentId = target.parentId || "root";
  const draggedParentId = dragged.parentId || "root";
  if (structureNumberLevel(dragged.number) !== structureNumberLevel(target.number)) return;
  if (draggedParentId !== targetParentId) return;

  const addition = dragged.custom ? structureAdditionById(project, dragged.id) : null;

  const freshTree = projectStructureTree(project);
  const siblings = flattenStructure(freshTree).filter((node) => (node.parentId || "root") === targetParentId);
  const ids = siblings.map((node) => node.id).filter((id) => id !== dragged.id);
  const targetIndex = ids.indexOf(target.id);
  ids.splice(Math.max(0, targetIndex + (placeAfter ? 1 : 0)), 0, dragged.id);
  saveStructureSiblingOrder(project, targetParentId, ids);

  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
}

function sanitizeRichHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  removeLegacyStructureInsertControls(template.content);
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "").trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
      if (name === "contenteditable" || name === "draggable" || name.startsWith("data-")) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML.trim();
}

function stopRichEditOutsideListener() {
  if (typeof activeRichEditCleanup === "function") {
    activeRichEditCleanup();
  }
  activeRichEditCleanup = null;
  activeRichRange = null;
}

function saveRichSelection(editor) {
  if (!editor) return;
  const selection = window.getSelection?.();
  if (!selection || !selection.rangeCount) return;
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  if (!anchor || !focus || !editor.contains(anchor) || !editor.contains(focus)) return;
  activeRichRange = selection.getRangeAt(0).cloneRange();
}

function restoreRichSelection(editor) {
  if (!editor) return;
  editor.focus();
  if (!activeRichRange) return;
  const selection = window.getSelection?.();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(activeRichRange);
}

function applyRichCommand(control, command, value = null) {
  const panel = control.closest(".structure-rich-editor-panel");
  const editor = panel?.querySelector(".structure-rich-editor");
  restoreRichSelection(editor);
  document.execCommand("styleWithCSS", false, true);
  document.execCommand(command, false, value);
  saveRichSelection(editor);
  updateRichToolbarState(panel);
  editor?.focus();
}

function requestRichLinkUrl() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <form class="link-url-dialog">
        <h3>Адрес ссылки</h3>
        <label>Куда ведёт ссылка<input type="url" name="url" placeholder="https://example.com" required></label>
        <div class="confirm-actions">
          <button type="button" class="ghost-button" data-link-cancel>Отмена</button>
          <button type="submit">Применить</button>
        </div>
      </form>
    `;
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-link-cancel]")) close(null);
    });
    overlay.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      close(String(formData.get("url") || "").trim());
    });
    document.body.appendChild(overlay);
    overlay.querySelector("input")?.focus();
  });
}

function updateRichToolbarState(panel) {
  if (!panel) return;
  panel.querySelectorAll("[data-rich-command]").forEach((button) => {
    const command = button.dataset.richCommand;
    const canShowActive = ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList", "justifyLeft", "justifyCenter", "justifyRight"].includes(command);
    let active = false;
    if (canShowActive) {
      try {
        active = document.queryCommandState(command);
      } catch {
        active = false;
      }
    }
    button.classList.toggle("is-active", active);
    if (canShowActive) button.setAttribute("aria-pressed", String(active));
  });
}

function beginStructureEdit(nodeId) {
  stopRichEditOutsideListener();
  const card = sectionOutput.querySelector(`[data-structure-node="${CSS.escape(nodeId)}"]`);
  const body = card?.querySelector(":scope > .structure-card-body");
  if (!card || !body || body.querySelector(".structure-rich-editor")) return;
  const currentHtml = structureEditedHtml(nodeId);
  const richEditorHtml = currentHtml ? `
      <div class="structure-rich-toolbar">
        <div class="rich-toolbar-main">
          <div class="rich-toolbar-group rich-toolbar-selects">
            <label>Стиль
              <select data-rich-format>
                <option value="P">Абзац</option>
                <option value="H2">Заголовок 2</option>
                <option value="H3">Заголовок 3</option>
                <option value="BLOCKQUOTE">Цитата</option>
              </select>
            </label>
            <label>Размер
              <select data-rich-size>
                <option value="2">Малый</option>
                <option value="3" selected>Средний</option>
                <option value="4">Крупный</option>
                <option value="5">Очень крупный</option>
              </select>
            </label>
          </div>
          <div class="rich-toolbar-group" aria-label="Начертание">
            <span>Текст</span>
            <button type="button" data-rich-command="bold" title="Жирный текст"><strong>Ж</strong></button>
            <button type="button" data-rich-command="italic" title="Курсив"><em>К</em></button>
            <button type="button" data-rich-command="underline" title="Подчеркнуть"><u>Ч</u></button>
            <button type="button" data-rich-command="removeFormat" title="Очистить форматирование">Очистить</button>
          </div>
          <div class="rich-toolbar-group" aria-label="Списки">
            <span>Списки</span>
            <button type="button" data-rich-command="insertUnorderedList" title="Маркированный список">• Список</button>
            <button type="button" data-rich-command="insertOrderedList" title="Нумерованный список">1. Список</button>
          </div>
          <div class="rich-toolbar-group" aria-label="Выравнивание">
            <span>Выравнивание</span>
            <button type="button" data-rich-command="justifyLeft" title="По левому краю">Лево</button>
            <button type="button" data-rich-command="justifyCenter" title="По центру">Центр</button>
            <button type="button" data-rich-command="justifyRight" title="По правому краю">Право</button>
          </div>
          <div class="rich-toolbar-group rich-toolbar-colors">
            <span>Цвета</span>
            <label>Текст<input type="color" data-rich-color value="#1f2b29" title="Цвет текста"></label>
            <label>Фон<input type="color" data-rich-highlight value="#fff3c4" title="Цвет выделения"></label>
          </div>
          <div class="rich-toolbar-group" aria-label="Действия">
            <span>Действия</span>
            <button type="button" data-rich-link title="Добавить ссылку">Ссылка</button>
            <button type="button" data-rich-command="undo" title="Отменить">Назад</button>
            <button type="button" data-rich-command="redo" title="Повторить">Вперёд</button>
          </div>
        </div>
        <div class="rich-toolbar-actions">
          <button type="button" data-rich-save="${escapeHtml(nodeId)}">Сохранить</button>
          <button type="button" data-rich-cancel>Отмена</button>
        </div>
      </div>
      <div class="structure-rich-editor" contenteditable="true" spellcheck="true">${currentHtml}</div>
  ` : `
      <div class="structure-edit-actions">
        <button type="button" data-rich-cancel>Закрыть редактор</button>
      </div>
  `;
  body.dataset.originalHtml = body.innerHTML;
  body.innerHTML = `
    <section class="structure-rich-editor-panel">
      ${richEditorHtml}
      ${renderStructureContent({ id: nodeId }, true)}
    </section>
  `;
  const editor = body.querySelector(".structure-rich-editor");
  editor?.focus();
  const trackSelection = () => saveRichSelection(editor);
  editor?.addEventListener("keyup", trackSelection);
  editor?.addEventListener("mouseup", trackSelection);
  editor?.addEventListener("input", trackSelection);
  editor?.addEventListener("focus", trackSelection);
  window.setTimeout(() => {
    const outsideHandler = (event) => {
      if (!card.isConnected) {
        stopRichEditOutsideListener();
        return;
      }
      if (card.contains(event.target)) return;
      const activeEditor = card.querySelector(".structure-rich-editor");
      if (activeEditor) {
        saveStructureRichEdit(nodeId, activeEditor);
      } else {
        stopRichEditOutsideListener();
        renderSection();
      }
    };
    const selectionHandler = () => {
      const activeEditor = card.querySelector(".structure-rich-editor");
      if (activeEditor) {
        saveRichSelection(activeEditor);
        updateRichToolbarState(card.querySelector(".structure-rich-editor-panel"));
      }
    };
    document.addEventListener("pointerdown", outsideHandler, true);
    document.addEventListener("selectionchange", selectionHandler);
    activeRichEditCleanup = () => {
      document.removeEventListener("pointerdown", outsideHandler, true);
      document.removeEventListener("selectionchange", selectionHandler);
      editor?.removeEventListener("keyup", trackSelection);
      editor?.removeEventListener("mouseup", trackSelection);
      editor?.removeEventListener("input", trackSelection);
      editor?.removeEventListener("focus", trackSelection);
    };
  }, 0);
}

function saveStructureRichEdit(nodeId, editor) {
  const project = currentProject();
  if (!project || !editor) return;
  stopRichEditOutsideListener();
  const edits = projectStructureEditedContent(project);
  const html = sanitizeRichHtml(editor.innerHTML);
  if (html) {
    edits[nodeId] = html;
  } else {
    delete edits[nodeId];
  }
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderSection();
}

function resetStructureRichEdit(nodeId) {
  const project = currentProject();
  if (!project) return;
  stopRichEditOutsideListener();
  const edits = projectStructureEditedContent(project);
  delete edits[nodeId];
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderSection();
}

function hydrateStructureBuilder(section) {
  if (!section?.structure) return;
  const builder = sectionOutput.querySelector(".structure-builder");
  if (!builder) return;
  let draggedStructureId = null;

  builder.addEventListener("mousedown", (event) => {
    if (event.target.closest("[data-rich-command], [data-rich-link]")) {
      event.preventDefault();
    }
  });

  builder.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-insert-slot]")) {
      builder.querySelectorAll(".structure-insert-slot.is-open").forEach((item) => item.classList.remove("is-open"));
    }
    const richCommand = event.target.closest("[data-rich-command]");
    if (richCommand) {
      event.preventDefault();
      applyRichCommand(richCommand, richCommand.dataset.richCommand, richCommand.dataset.richValue || null);
      return;
    }
    const richLink = event.target.closest("[data-rich-link]");
    if (richLink) {
      event.preventDefault();
      const panel = richLink.closest(".structure-rich-editor-panel");
      const editor = panel?.querySelector(".structure-rich-editor");
      restoreRichSelection(editor);
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed) {
        window.alert("Сначала выделите текст, который нужно сделать ссылкой.");
        editor?.focus();
        return;
      }
      const url = await requestRichLinkUrl();
      if (url) {
        restoreRichSelection(editor);
        document.execCommand("createLink", false, url.trim());
        saveRichSelection(editor);
        updateRichToolbarState(panel);
        editor?.focus();
      }
      return;
    }
    const richSave = event.target.closest("[data-rich-save]");
    if (richSave) {
      const editor = richSave.closest(".structure-rich-editor-panel")?.querySelector(".structure-rich-editor");
      saveStructureRichEdit(richSave.dataset.richSave, editor);
      return;
    }
    const richReset = event.target.closest("[data-rich-reset]");
    if (richReset) {
      resetStructureRichEdit(richReset.dataset.richReset);
      return;
    }
    const richCancel = event.target.closest("[data-rich-cancel]");
    if (richCancel) {
      stopRichEditOutsideListener();
      renderSection();
      return;
    }
    const insertToggle = event.target.closest("[data-toggle-insert-slot]");
    if (insertToggle) {
      const slot = insertToggle.closest("[data-insert-slot]");
      builder.querySelectorAll(".structure-insert-slot.is-open").forEach((item) => {
        if (item !== slot) item.classList.remove("is-open");
      });
      slot?.classList.toggle("is-open");
      return;
    }
    const addSelectedContentButton = event.target.closest("[data-add-selected-content]");
    if (addSelectedContentButton) {
      await handleAddStructureContentButton(addSelectedContentButton);
      addSelectedContentButton.closest("[data-insert-slot]")?.classList.remove("is-open");
      return;
    }
    const editButton = event.target.closest("[data-edit-structure-node]");
    if (editButton) {
      beginStructureEdit(editButton.dataset.editStructureNode);
      return;
    }
    const mapChip = event.target.closest("[data-structure-chip]");
    if (mapChip) {
      const target = builder.querySelector(`[data-structure-node="${mapChip.dataset.structureChip}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("is-focused");
      setTimeout(() => target?.classList.remove("is-focused"), 1200);
      return;
    }
    const autoButton = event.target.closest("[data-open-auto-section]");
    if (autoButton) {
      state.activeSectionId = autoButton.dataset.openAutoSection;
      state.pendingSubchapter = null;
      renderNav();
      renderSection();
      return;
    }
    const addButton = event.target.closest("[data-add-structure-child]");
    if (addButton) {
      addStructureChild(addButton.dataset.addStructureChild);
      return;
    }
    const collapseButton = event.target.closest("[data-toggle-structure-collapse]");
    if (collapseButton) {
      const nodeId = collapseButton.dataset.toggleStructureCollapse;
      state.structureCollapsed[nodeId] = !state.structureCollapsed[nodeId];
      const card = collapseButton.closest(".structure-card");
      card?.classList.toggle("is-collapsed", state.structureCollapsed[nodeId]);
      collapseButton.setAttribute("aria-expanded", String(!state.structureCollapsed[nodeId]));
      collapseButton.setAttribute("aria-label", state.structureCollapsed[nodeId] ? "Развернуть подглаву" : "Свернуть подглаву");
      return;
    }
    const removeButton = event.target.closest("[data-remove-structure]");
    if (removeButton) removeStructureNode(removeButton.dataset.removeStructure);
    const removeContentButton = event.target.closest("[data-remove-structure-content]");
    if (removeContentButton) {
      removeStructureContent(removeContentButton.dataset.contentNode, removeContentButton.dataset.removeStructureContent);
    }
  });

  builder.addEventListener("input", (event) => {
    const blockTitle = event.target.closest("[data-structure-block-title]");
    if (blockTitle) {
      updateStructureContentBlock(blockTitle.dataset.contentNode, blockTitle.dataset.structureBlockTitle, (block) => {
        block.title = blockTitle.value;
      });
      const contentBlock = blockTitle.closest(".structure-content-block");
      const head = contentBlock?.querySelector(".structure-content-head strong");
      if (head) {
        const blockId = blockTitle.dataset.structureBlockTitle;
        const nodeId = blockTitle.dataset.contentNode;
        const block = structureContentBlocks(nodeId).find((item) => item.id === blockId);
        if (block?.type === "table") {
          const rows = Math.max(1, Number(block.rows) || 2);
          const cols = Math.max(1, Number(block.cols) || 2);
          head.textContent = `${blockTitle.value || defaultStructureContentTitle(block.type)} · ${rows}x${cols}`;
        } else {
          head.textContent = blockTitle.value || defaultStructureContentTitle(block?.type || "text");
        }
        const previewTitle = contentBlock?.querySelector(".structure-card-preview h3");
        if (previewTitle) previewTitle.textContent = blockTitle.value || defaultStructureContentTitle(block?.type || "card");
      }
      return;
    }
    const richColor = event.target.closest("[data-rich-color]");
    if (richColor) {
      applyRichCommand(richColor, "foreColor", richColor.value);
      return;
    }
    const richHighlight = event.target.closest("[data-rich-highlight]");
    if (richHighlight) {
      applyRichCommand(richHighlight, "hiliteColor", richHighlight.value);
      return;
    }
    const cardText = event.target.closest("[data-structure-card-text]");
    if (cardText) {
      updateStructureContentBlock(cardText.dataset.contentNode, cardText.dataset.structureCardText, (block) => {
        block.text = cardText.value;
      });
      const previewCard = cardText.closest(".structure-site-card-editor")?.querySelector(".structure-card-preview");
      let preview = previewCard?.querySelector("p");
      if (previewCard && cardText.value && !preview) {
        preview = document.createElement("p");
        previewCard.appendChild(preview);
      }
      if (preview) preview.textContent = cardText.value || "";
      return;
    }
    const textField = event.target.closest("[data-structure-content-field]");
    if (textField) {
      updateStructureContentBlock(textField.dataset.contentNode, textField.dataset.structureContentField, (block) => {
        block.text = textField.value;
      });
      return;
    }
    const cell = event.target.closest("[data-structure-cell]");
    if (cell) {
      updateStructureContentBlock(cell.dataset.contentNode, cell.dataset.structureCell, (block) => {
        const row = Number(cell.dataset.row) || 0;
        const col = Number(cell.dataset.col) || 0;
        if (!Array.isArray(block.cells)) block.cells = [];
        if (!Array.isArray(block.cells[row])) block.cells[row] = [];
        block.cells[row][col] = cell.textContent || "";
      });
    }
  });

  builder.addEventListener("change", (event) => {
    const richFormat = event.target.closest("[data-rich-format]");
    if (richFormat) {
      applyRichCommand(richFormat, "formatBlock", richFormat.value);
      return;
    }
    const richSize = event.target.closest("[data-rich-size]");
    if (richSize) {
      applyRichCommand(richSize, "fontSize", richSize.value);
      return;
    }
    const cardTone = event.target.closest("[data-structure-card-tone]");
    if (cardTone) {
      updateStructureContentBlock(cardTone.dataset.contentNode, cardTone.dataset.structureCardTone, (block) => {
        block.tone = cardTone.value;
      });
      renderSection();
      return;
    }
    const fileInput = event.target.closest("[data-structure-file]");
    const file = fileInput?.files?.[0];
    if (!fileInput || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      updateStructureContentBlock(fileInput.dataset.contentNode, fileInput.dataset.structureFile, (block) => {
        block.src = reader.result;
      });
      renderAll();
    });
    reader.readAsDataURL(file);
  });

  builder.addEventListener("dragstart", (event) => {
    const handle = event.target.closest("[data-drag-structure]");
    if (!handle) return;
    draggedStructureId = handle.dataset.dragStructure;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedStructureId);
    handle.closest(".structure-card, .structure-map-chip")?.classList.add("is-dragging");
  });

  builder.addEventListener("dragend", () => {
    draggedStructureId = null;
    builder.querySelectorAll(".is-dragging, .is-drop-before, .is-drop-after").forEach((node) => {
      node.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    });
  });

  builder.addEventListener("dragover", (event) => {
    const card = structureDropTarget(event);
    if (!card) return;
    const draggedId = draggedStructureId || event.dataTransfer.getData("text/plain");
    const draggedCard = structureDragElement(builder, draggedId);
    builder.querySelectorAll(".is-drop-before, .is-drop-after").forEach((node) => {
      if (node !== card) node.classList.remove("is-drop-before", "is-drop-after");
    });
    if (!canMoveStructureCard(draggedCard, card)) return;
    event.preventDefault();
    const placeAfter = structurePlaceAfter(event, card);
    card.classList.toggle("is-drop-before", !placeAfter);
    card.classList.toggle("is-drop-after", placeAfter);
  });

  builder.addEventListener("dragleave", (event) => {
    const card = structureDropTarget(event);
    if (card) card.classList.remove("is-drop-before", "is-drop-after");
  });

  builder.addEventListener("drop", (event) => {
    const card = structureDropTarget(event);
    if (!card) return;
    const draggedId = draggedStructureId || event.dataTransfer.getData("text/plain");
    const draggedCard = structureDragElement(builder, draggedId);
    if (!canMoveStructureCard(draggedCard, card)) return;
    event.preventDefault();
    const placeAfter = structurePlaceAfter(event, card);
    moveStructureNode(draggedId, structureTargetId(card), placeAfter);
  });
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
              <p><strong>Итоговый балл</strong>${assessment.overall}/100. Точка базы: ${formatNumber(assessment.baseLat, 5)}, ${formatNumber(assessment.baseLng, 5)}.</p>
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
            <p>${Math.round(item.value)}/100</p>
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
  if (section.structure) return renderStructureBuilder(section, ctx);
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

async function renderSection() {
  if (!sectionOutput) return;
  const section = getAllSections().find((item) => item.id === state.activeSectionId) || automaticSectionById(state.activeSectionId) || allSections[0];
  updateHeaderStructureNav(section);
  const ctx = projectContext();
  const structureCacheKey = section.structure ? structureSectionCacheKey(section, ctx) : "";
  const cachedStructureData = structureCacheKey ? state.structureSectionCache.get(structureCacheKey) : null;
  if (cachedStructureData) {
    ctx.weatherDetail = cachedStructureData.weather || null;
    ctx.tourismScore = extractTourismScore(ctx.weatherDetail);
    ctx.structureLiveData = cachedStructureData;
  }
  if (section.structure && cachedStructureData) {
    sectionOutput.innerHTML = renderSectionHtml(section, ctx);
    cleanWeatherPanel(sectionOutput);
    hydrateMapPicker();
    hydrateStructureBuilder(section);
    hydrateAccordions();
    activatePendingSubchapter();
    return;
  }
  if (section.structure) {
    sectionOutput.innerHTML = renderSectionHtml(section, ctx);
    cleanWeatherPanel(sectionOutput);
    hydrateMapPicker();
    hydrateStructureBuilder(section);
    hydrateAccordions();
    activatePendingSubchapter();
    Promise.allSettled([
      ctx.city ? fetchWeather(ctx.city) : Promise.resolve(null),
      fetchTransportData(ctx),
      fetchEcologyData(ctx),
      fetchInfrastructureData(ctx),
      fetchAttractionsData(ctx),
    ]).then(([weather, transport, ecology, infrastructure, attractions]) => {
      const liveData = {
        weather: weather.status === "fulfilled" ? weather.value : null,
        transport: transport.status === "fulfilled" ? transport.value : null,
        ecology: ecology.status === "fulfilled" ? ecology.value : null,
        infrastructure: infrastructure.status === "fulfilled" ? infrastructure.value : null,
        attractions: attractions.status === "fulfilled" ? attractions.value : null,
      };
      if (structureCacheKey) state.structureSectionCache.set(structureCacheKey, liveData);
      if (state.activeSectionId !== section.id) return;
      const freshCtx = projectContext();
      freshCtx.weatherDetail = liveData.weather || null;
      freshCtx.tourismScore = extractTourismScore(freshCtx.weatherDetail);
      freshCtx.structureLiveData = liveData;
      sectionOutput.innerHTML = renderSectionHtml(section, freshCtx);
      cleanWeatherPanel(sectionOutput);
      hydrateMapPicker();
      hydrateStructureBuilder(section);
      hydrateAccordions();
      activatePendingSubchapter();
    });
    return;
  }
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
  cleanWeatherPanel(sectionOutput);
  hydrateMapPicker();
  hydrateStructureBuilder(section);
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
    <div class="place-list">
      ${rows.map(({ place, distance }) => `
        <article class="place-list-row">
          <div class="place-list-main">
            <h3>${escapeHtml(displayName(place.name, "Объект"))}</h3>
            <p>${escapeHtml(placeTypesLabel(place))}</p>
            ${place.vicinity ? `<small>${escapeHtml(displayName(place.vicinity))}</small>` : ""}
          </div>
          <div class="place-list-meta">
            <strong>${formatNumber(distance, 2)} км</strong>
            ${Number.isFinite(Number(place.rating)) ? `<span>${formatNumber(place.rating, 1)}${place.user_ratings_total ? ` / ${place.user_ratings_total}` : ""}</span>` : ""}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function placeMapCoord(place) {
  const lat = Number(place?.geometry?.location?.lat?.() ?? place?.geometry?.location?.lat);
  const lng = Number(place?.geometry?.location?.lng?.() ?? place?.geometry?.location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function infrastructureMapPoint(row, kind, index) {
  if (row.place) {
    const coord = placeMapCoord(row.place);
    if (!coord) return null;
    const type = placeTypesLabel(row.place);
    const address = row.place.vicinity ? displayName(row.place.vicinity) : "";
    return {
      lat: coord[0],
      lng: coord[1],
      kind,
      number: index + 1,
      name: displayName(row.place.name, "Объект"),
      type,
      distance: Number.isFinite(row.distance) ? `${formatNumber(row.distance, 2)} км от базы` : "",
      description: address || type,
    };
  }
  if (row.element) {
    const coord = elementCoord(row.element);
    if (!coord) return null;
    const type = osmKind(row.element);
    const description = osmDescription(row.element);
    return {
      lat: coord[0],
      lng: coord[1],
      kind,
      number: index + 1,
      name: osmName(row.element),
      type,
      distance: Number.isFinite(row.distance) ? `${formatNumber(row.distance, 2)} км от базы` : "",
      description: description || type,
    };
  }
  return null;
}

function renderSurroundingInfrastructureMap(services, competitors, baseLat, baseLng) {
  const serviceRows = services.slice(0, 120);
  const competitorRows = competitors.slice(0, 120);
  const points = [
    ...serviceRows.map((row, index) => infrastructureMapPoint(row, "service", index)),
    ...competitorRows.map((row, index) => infrastructureMapPoint(row, "competitor", serviceRows.length + index)),
  ].filter(Boolean);

  const lats = [baseLat, ...points.map((point) => point.lat)];
  const lngs = [baseLng, ...points.map((point) => point.lng)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const maxSpan = Math.max(latSpan, lngSpan);
  const zoom = maxSpan > 0.45 ? 10 : maxSpan > 0.22 ? 11 : maxSpan > 0.11 ? 12 : 13;

  return `
    <section class="poi-map-panel">
      <div class="poi-map-head">
        <div>
          <h3>Карта окружающей инфраструктуры</h3>
          <p>Точки рядом с базой показаны по координатам: сервисы, места отдыха и конкурентная среда.</p>
        </div>
        <span>${points.length ? `${points.length} точек` : "точки не найдены"}</span>
      </div>
      <div class="poi-map-layout">
        <article class="map-panel poi-map-large">
          <div class="map-frame infrastructure-map-frame" data-city-lat="${baseLat}" data-city-lng="${baseLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}">
            <div class="tile-layer"></div>
            <svg class="map-overlay" aria-hidden="true"></svg>
            <div class="map-interaction-layer" aria-label="Карта окружающей инфраструктуры"></div>
            <span class="map-marker map-marker-city"></span>
            <span class="map-marker map-marker-base"></span>
            <div class="map-controls">
              <button type="button" data-map-zoom="in">+</button>
              <button type="button" data-map-zoom="out">-</button>
            </div>
            <span class="map-poi-home" data-poi-lat="${baseLat}" data-poi-lng="${baseLng}">База</span>
            ${points.map((point) => `
              <span class="map-poi-marker map-poi-${point.kind}" data-poi-lat="${point.lat}" data-poi-lng="${point.lng}" title="${escapeHtml(`${point.number}. ${point.name} - ${point.distance || point.type}`)}">
                <i>${point.number}</i>
                <b>${escapeHtml(point.name)}</b>
                <small>${escapeHtml(point.distance || point.type)}</small>
              </span>
            `).join("")}
          </div>
          <div class="map-caption">
            <strong><i class="legend-dot base"></i>База</strong>
            <span>На карте показаны ближайшие сервисы, места отдыха и конкурентные объекты вокруг базы.</span>
          </div>
        </article>
        <div class="poi-map-list">
          ${points.length ? points.map((point) => `
            <article>
              <span>${point.number}</span>
              <div>
                <strong>${escapeHtml(point.name)}</strong>
                <p>${escapeHtml(point.type)}</p>
                ${point.distance ? `<p>${escapeHtml(point.distance)}</p>` : ""}
                ${point.description ? `<small>${escapeHtml(point.description)}</small>` : ""}
              </div>
            </article>
          `).join("") : `
            <article>
              <span>0</span>
              <div>
                <strong>Точки пока не найдены</strong>
                <p>Карта базы отображается, а точки появятся после получения данных 2ГИС, Google или OSM.</p>
              </div>
            </article>
          `}
        </div>
      </div>
    </section>
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
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
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
        <button type="button" class="${provider === "osm" ? "is-active" : ""}" data-map-provider="osm">OpenStreetMap</button>
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
        <div class="map-external-badge">Карты Google</div>
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
  const services = useGoogle ? placeRows(live.services, baseLat, baseLng, 80) : osmRows(osmSource.filter(isServicePoi), baseLat, baseLng, 80);
  const competitors = useGoogle ? placeRows(live.competitors, baseLat, baseLng, 80) : osmRows(osmSource.filter(isCompetitorPoi), baseLat, baseLng, 80);
  const sourceLabel = live.source === "2gis" ? "объекты 2ГИС" : useGoogle ? "объекты Google" : "объекты OSM";
  return `
    ${renderLead(section, ctx)}
    <div class="content-grid">
      <article class="text-block">
        <h3>Окружение и сервисы рядом</h3>
        <p>Здесь показаны реальные объекты рядом с базой: магазины, кафе, АЗС, аптеки, больницы, парковки и ближайшие рекреационные объекты. Основной источник: ${escapeHtml(sourceLabel)}.</p>
      </article>
    </div>
    ${renderSurroundingInfrastructureMap(services, competitors, baseLat, baseLng)}
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
      ? [{ label: live.source === "2gis" ? "2ГИС Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }]
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
      ? [{ label: live.source === "2gis" ? "2ГИС Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }]
      : [{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }])}
  `;
}

function renderSocio(section, ctx) {
  const route = routeMetrics(ctx);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const live = ctx.liveData || {};
  const useGoogle = ["google", "2gis"].includes(live.source) && ((live.services?.length || 0) + (live.competitors?.length || 0) > 0);
  const osmSource = Array.isArray(live) ? live : live.osm || [];
  const services = useGoogle ? placeRows(live.services, baseLat, baseLng, 80) : osmRows(osmSource.filter(isServicePoi), baseLat, baseLng, 80);
  const food = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["restaurant", "cafe"])) : services.filter(({ element }) => ["restaurant", "cafe"].includes(osmRawKind(element)));
  const finance = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["bank", "atm"])) : services.filter(({ element }) => ["bank", "atm"].includes(osmRawKind(element)));
  const medical = useGoogle ? services.filter(({ place }) => hasPlaceType(place, ["pharmacy", "hospital"])) : services.filter(({ element }) => ["pharmacy", "clinic", "hospital"].includes(osmRawKind(element)));
  const competitors = useGoogle ? placeRows(live.competitors || [], baseLat, baseLng, 80) : osmRows(osmSource.filter(isCompetitorPoi), baseLat, baseLng, 80);
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
      ...(useGoogle ? [{ label: live.source === "2gis" ? "2ГИС Places API" : "Google Places", url: live.source === "2gis" ? "https://docs.2gis.com/en/api/search/places/overview" : "https://developers.google.com/maps/documentation/places/web-service/overview" }] : [{ label: "OpenStreetMap", url: "https://www.openstreetmap.org/" }]),
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
        const result = await directionsRouteRequest(directionsService, transitRequest);
        directionsRenderer.setDirections(result);
      } catch {
        try {
          const driveResult = await directionsRouteRequest(directionsService, {
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
  } catch (error) {
    console.warn("Google map failed:", error);
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const baseLat = Number(canvas.dataset.baseLat);
    const baseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 12;
    wrapper.insertAdjacentHTML("beforebegin", mapProviderFallbackNotice("google"));
    wrapper.outerHTML = fallbackMapFrameMarkup(cityLat, cityLng, baseLat, baseLng, centerLat, centerLng, zoom);
    hydrateMapPicker();
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
  await loadServerProjects();
  await syncUsersFromServer();
  const projectId = requestedProjectId();
  if (projectId && state.projects.some((project) => project.id === projectId)) {
    state.activeProjectId = projectId;
  } else if (isProjectPage) {
    if (!state.projects.length) createDefaultProject();
    state.activeProjectId = state.projects[0]?.id || null;
  } else if (isProjectsPage) {
    state.activeProjectId = null;
  }
  syncFormFromProject();
  await renderAll();
  if (isProjectsPage) setProjectDashboardView(requestedProjectView() || "projects");
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
