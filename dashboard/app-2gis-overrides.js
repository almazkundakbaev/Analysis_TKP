function twoGisMapKey() {
  return String(window.TKP_MAPS_CONFIG?.twoGisMapKey || window.TKP_MAPS_CONFIG?.twoGisApiKey || "").trim();
}

function hasTwoGisMapKey() {
  return Boolean(twoGisMapKey());
}

function twoGisSearchEndpoint() {
  return String(window.TKP_MAPS_CONFIG?.twoGisSearchEndpoint || "").trim();
}

function hasTwoGisSearchProxy() {
  return Boolean(twoGisSearchEndpoint());
}

function loadTwoGisMapApi() {
  if (window.mapgl?.Map) {
    return Promise.resolve(window.mapgl);
  }
  if (window.__omartaTwoGisPromise) {
    return window.__omartaTwoGisPromise;
  }

  window.__omartaTwoGisPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://mapgl.2gis.com/api/js/v1";
    script.async = true;
    script.onerror = () => {
      window.__omartaTwoGisPromise = null;
      reject(new Error("2gis-mapgl-load-failed"));
    };
    script.onload = () => {
      if (window.mapgl?.Map) resolve(window.mapgl);
      else {
        window.__omartaTwoGisPromise = null;
        reject(new Error("2gis-mapgl-missing"));
      }
    };
    document.head.appendChild(script);
  });

  return window.__omartaTwoGisPromise;
}

function twoGisOpenUrl(lat, lng, zoom) {
  return `https://2gis.kz/geo/${lng},${lat}?m=${lng},${lat}/${zoom}`;
}

function mapProvider(project) {
  return ["osm", "google"].includes(project?.mapProvider) ? project.mapProvider : "osm";
}

function twoGisItemToPlace(item, fallbackTypes = []) {
  const point = item?.point || item?.geometry?.centroid;
  const lat = Number(point?.lat);
  const lng = Number(point?.lon);
  const rubrics = Array.isArray(item?.rubrics) ? item.rubrics : [];
  const types = [
    item?.type,
    item?.subtype,
    ...fallbackTypes,
    ...rubrics.map((rubric) => rubric?.name || rubric?.alias),
  ].filter(Boolean).map((value) => String(value).toLowerCase());

  return {
    place_id: item?.id,
    name: item?.name || item?.full_name || "Объект 2ГИС",
    vicinity: item?.address_name || item?.full_address_name || item?.address?.name || "",
    rating: item?.reviews?.general_rating ?? item?.rating,
    user_ratings_total: item?.reviews?.general_review_count,
    types,
    geometry: {
      location: { lat, lng },
    },
    __source: "2gis",
    __raw: item,
  };
}

async function fetchTwoGisItems(lat, lng, radius, options = {}) {
  if (!hasTwoGisSearchProxy()) return [];

  const params = new URLSearchParams({
    point: `${lng},${lat}`,
    radius: String(Math.max(0, Math.min(40000, Number(radius) || 250))),
    page_size: String(Math.max(1, Math.min(50, Number(options.pageSize) || 50))),
    locale: "ru_KZ",
    sort: "distance",
    fields: [
      "items.point",
      "items.address_name",
      "items.full_address_name",
      "items.rubrics",
      "items.reviews",
      "items.schedule",
      "items.links",
      "items.routes",
      "items.directions",
      "items.description",
      "items.type",
      "items.subtype",
    ].join(","),
  });
  if (options.type) params.set("type", options.type);
  if (options.q) params.set("q", options.q);

  const pageCount = Math.max(1, Math.min(5, Number(options.pages) || 3));
  const cacheKey = `2gis:${params.toString()}:pages=${pageCount}`;
  if (state.liveCache.has(cacheKey)) return state.liveCache.get(cacheKey);

  const endpoint = twoGisSearchEndpoint();
  const separator = endpoint.includes("?") ? "&" : "?";
  const collected = [];
  for (let page = 1; page <= pageCount; page += 1) {
    params.set("page", String(page));
    const response = await fetch(`${endpoint}${separator}${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `2gis-http-${response.status}`);
    }
    const payload = await response.json();
    const items = Array.isArray(payload?.result?.items) ? payload.result.items : [];
    collected.push(...items);
    if (items.length < Number(params.get("page_size"))) break;
  }
  const places = dedupePlaces(collected.map((item) => twoGisItemToPlace(item, options.fallbackTypes || [])));
  state.liveCache.set(cacheKey, places);
  return places;
}

async function fetchTwoGisByQueries(lat, lng, radius, queries, fallbackTypes = []) {
  const settled = await Promise.allSettled(
    queries.map((query) => fetchTwoGisItems(lat, lng, radius, { q: query, type: "branch,attraction,parking,adm_div.place", fallbackTypes })),
  );
  return dedupePlaces(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
}

async function fetchTwoGisTransport(lat, lng) {
  const [stations, routes] = await Promise.all([
    fetchTwoGisItems(lat, lng, 5000, { type: "station,station_platform,station_entrance", fallbackTypes: ["transit_station"] }),
    fetchTwoGisItems(lat, lng, 8000, { type: "route", fallbackTypes: ["route"] }).catch(() => []),
  ]);
  return { stations, routes };
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

  try {
    const [services, competitors] = await Promise.all([
      fetchTwoGisByQueries(lat, lng, 7000, ["кафе", "ресторан", "магазин", "супермаркет", "аптека", "больница", "клиника", "АЗС", "банк", "банкомат", "парковка", "здание", "жилой комплекс", "торговый центр", "остановка", "автовокзал", "рынок"], ["restaurant", "cafe", "store", "pharmacy", "hospital", "gas_station", "bank", "atm", "parking", "building", "shopping_mall", "transit_station"]),
      fetchTwoGisByQueries(lat, lng, 12000, ["база отдыха", "отель", "гостиница", "кемпинг", "парк", "курорт", "развлечения", "баня", "сауна", "спа", "бассейн", "спорткомплекс", "пляж", "зона отдыха"], ["lodging", "campground", "park", "tourist_attraction", "spa", "sports_centre"]),
    ]);
    if (services.length || competitors.length) {
      return { source: "2gis", osm: fallback, services, competitors };
    }
  } catch (error) {
    console.warn("2GIS infrastructure search failed:", error);
  }

  if (!hasGoogleMapsKey()) return { source: "osm", osm: fallback, services: [], competitors: [] };
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

  try {
    const [attractions, natural, cultural] = await Promise.all([
      fetchTwoGisByQueries(lat, lng, 25000, ["достопримечательность", "туризм", "развлечения", "смотровая площадка", "парк", "экскурсия", "аквапарк", "зоопарк", "аттракционы", "конный клуб"], ["tourist_attraction", "park", "amusement_park"]),
      fetchTwoGisByQueries(lat, lng, 25000, ["парк", "озеро", "пляж", "родник", "природа", "зона отдыха", "лес", "гора", "водоем", "набережная"], ["park", "natural_feature"]),
      fetchTwoGisByQueries(lat, lng, 25000, ["музей", "галерея", "историческое место", "памятник", "театр", "мечеть", "церковь", "архитектура", "культура"], ["museum", "art_gallery", "tourist_attraction", "historic"]),
    ]);
    if (attractions.length || natural.length || cultural.length) {
      return { source: "2gis", osm: fallback, attractions, natural, cultural };
    }
  } catch (error) {
    console.warn("2GIS attractions search failed:", error);
  }

  if (!hasGoogleMapsKey()) return { source: "osm", osm: fallback, attractions: [], natural: [], cultural: [] };
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
  const [airResult, elementsResult, greenResult, naturalResult, riskResult] = await Promise.allSettled([
    fetchAirQuality(lat, lng),
    fetchOverpass(query, cacheKey),
    fetchTwoGisByQueries(lat, lng, 12000, ["парк", "сквер", "лес", "зеленая зона", "зона отдыха", "набережная"], ["park", "natural_feature"]),
    fetchTwoGisByQueries(lat, lng, 15000, ["озеро", "река", "пляж", "родник", "гора", "природа", "водоем"], ["natural_feature"]),
    fetchTwoGisByQueries(lat, lng, 12000, ["промзона", "завод", "полигон", "свалка", "очистные сооружения", "карьер", "ТЭЦ", "электростанция"], ["industrial", "landfill", "factory", "power_plant"]),
  ]);

  const air = airResult.status === "fulfilled" ? airResult.value : null;
  const elements = elementsResult.status === "fulfilled" ? elementsResult.value : [];
  const greenOsm = elements.filter(isGreenPoi);
  const riskOsm = elements.filter(isEcoRiskPoi);
  const green = greenResult.status === "fulfilled" ? greenResult.value : [];
  const natural = naturalResult.status === "fulfilled" ? naturalResult.value : [];
  const risks = riskResult.status === "fulfilled" ? riskResult.value : [];

  if (green.length || natural.length || risks.length) {
    return {
      air,
      source: "google",
      provider: "2gis",
      green,
      natural,
      risks,
      elements,
    };
  }

  return {
    air,
    source: "osm",
    provider: "osm",
    green: greenOsm,
    natural: greenOsm.filter((item) => Boolean(item.tags?.natural)),
    risks: riskOsm,
    elements,
  };
}

async function fetchTransportData(ctx) {
  const [lat, lng] = projectCoords(ctx.project, ctx.city);
  const cacheKey = `transport-osm:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const query = overpassAround(lat, lng, 900, (a, b, r) => `
    node(around:${r},${a},${b})["highway"="bus_stop"];
    node(around:${r},${a},${b})["public_transport"~"platform|stop_position"];
    relation(around:1800,${a},${b})["route"~"bus|trolleybus|tram"];
  `);

  const [osmResult, twoGisResult, googleStopsResult] = await Promise.allSettled([
    fetchOverpass(query, cacheKey),
    fetchTwoGisTransport(lat, lng),
    hasGoogleMapsKey()
      ? fetchGooglePlacesByTypes(lat, lng, 5000, ["transit_station", "bus_station", "train_station"])
      : Promise.resolve([]),
  ]);

  const twoGis = twoGisResult.status === "fulfilled" ? twoGisResult.value : { stations: [], routes: [] };
  return {
    source: twoGis.stations.length || twoGis.routes.length ? "2gis" : "osm",
    osm: osmResult.status === "fulfilled" ? osmResult.value : [],
    googleStops: googleStopsResult.status === "fulfilled" ? googleStopsResult.value : [],
    twoGisStops: twoGis.stations,
    twoGisRoutes: twoGis.routes,
  };
}

async function hydrateTwoGisMap() {
  const canvas = sectionOutput.querySelector(".twogis-map-canvas");
  if (!canvas) return;

  const project = currentProject();
  const savedPolygon = basePolygon(project);
  let draftPolygon = savedPolygon.map((point) => ({ ...point }));
  let drawMode = false;
  let polygonShape = null;
  let draftMarkers = [];
  let transportMarkers = [];

  const areaNode = sectionOutput.querySelector("[data-map-area]");
  const hintNode = sectionOutput.querySelector("[data-map-hint]");
  const panButton = sectionOutput.querySelector('[data-map-mode="pan"]');
  const drawButton = sectionOutput.querySelector('[data-map-mode="draw"]');
  const saveButton = sectionOutput.querySelector("[data-map-save]");
  const clearButton = sectionOutput.querySelector("[data-map-clear]");

  function setHint(text) {
    if (hintNode) hintNode.textContent = text;
  }

  function syncButtons() {
    panButton?.classList.toggle("is-active", !drawMode);
    drawButton?.classList.toggle("is-active", drawMode);
    if (saveButton) saveButton.disabled = draftPolygon.length < 3;
  }

  try {
    const mapgl = await loadTwoGisMapApi();
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const originalBaseLat = Number(canvas.dataset.baseLat);
    const originalBaseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 10;

    const map = new mapgl.Map(canvas, {
      key: twoGisMapKey(),
      center: [centerLng, centerLat],
      zoom,
    });
    canvas.__omartaTwoGisMap = map;

    const cityMarker = new mapgl.Marker(map, { coordinates: [cityLng, cityLat] });
    const baseMarker = new mapgl.Marker(map, { coordinates: [originalBaseLng, originalBaseLat] });

    function destroyMarkers(markers) {
      markers.forEach((marker) => marker?.destroy?.());
      markers.length = 0;
    }

    function polygonCoordinates() {
      return draftPolygon.map((point) => [point.lng, point.lat]);
    }

    function repaintPolygon() {
      if (polygonShape?.destroy) polygonShape.destroy();
      destroyMarkers(draftMarkers);
      if (draftPolygon.length >= 3 && mapgl.Polygon) {
        polygonShape = new mapgl.Polygon(map, {
          coordinates: [polygonCoordinates()],
          color: "rgba(217, 65, 53, 0.18)",
          strokeColor: "#cf4b32",
          strokeWidth: 3,
        });
      }
      draftMarkers = draftPolygon.map((point) => new mapgl.Marker(map, { coordinates: [point.lng, point.lat] }));
      const centroid = polygonCentroid(draftPolygon);
      const activeLat = centroid?.lat ?? originalBaseLat;
      const activeLng = centroid?.lng ?? originalBaseLng;
      baseMarker.setCoordinates?.([activeLng, activeLat]);
      if (areaNode) {
        const area = polygonAreaSqMeters(draftPolygon);
        areaNode.textContent = area > 0 ? formatArea(area) : "Еще не рассчитано";
      }
      syncButtons();
    }

    async function renderTransportOverlay() {
      destroyMarkers(transportMarkers);
      if (state.activeSectionId !== "transport") return;
      const centroid = polygonCentroid(draftPolygon);
      const activeLat = centroid?.lat ?? originalBaseLat;
      const activeLng = centroid?.lng ?? originalBaseLng;
      const transportData = await fetchTransportData(projectContext()).catch(() => null);
      const rows = placeRows([...(transportData?.twoGisStops || []), ...(transportData?.googleStops || [])], activeLat, activeLng, 30);
      transportMarkers = rows.map(({ place }) => {
        const lat = Number(place?.geometry?.location?.lat);
        const lng = Number(place?.geometry?.location?.lng);
        return Number.isFinite(lat) && Number.isFinite(lng)
          ? new mapgl.Marker(map, { coordinates: [lng, lat] })
          : null;
      }).filter(Boolean);
      setHint(`Карта 2ГИС активна. Найдено остановок транспорта: ${transportMarkers.length}.`);
    }

    map.on("click", (event) => {
      if (!drawMode) return;
      const coords = event?.lngLat || event?.targetData?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;
      draftPolygon = [...draftPolygon, { lat: Number(coords[1]), lng: Number(coords[0]) }];
      repaintPolygon();
    });

    map.on("moveend", () => {
      const active = currentProject();
      if (!active) return;
      const center = map.getCenter?.() || [centerLng, centerLat];
      active.mapCenterLat = String(center[1]);
      active.mapCenterLng = String(center[0]);
      active.mapZoom = String(map.getZoom?.() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
    });

    panButton?.addEventListener("click", async () => {
      drawMode = false;
      syncButtons();
      setHint("Карта 2ГИС активна. Перемещайте карту или включите режим контура, чтобы отметить территорию базы.");
      await renderTransportOverlay();
    });

    drawButton?.addEventListener("click", () => {
      drawMode = true;
      syncButtons();
      setHint("Режим контура активен: нажимайте на карту 2ГИС, чтобы добавлять точки территории.");
    });

    saveButton?.addEventListener("click", () => {
      const active = currentProject();
      if (!active || draftPolygon.length < 3) {
        window.alert("Добавьте минимум 3 точки, чтобы сохранить территорию базы.");
        return;
      }
      const centroid = polygonCentroid(draftPolygon);
      active.basePolygon = draftPolygon.map((point) => ({ lat: point.lat, lng: point.lng }));
      if (centroid) {
        active.lat = String(centroid.lat);
        active.lng = String(centroid.lng);
      }
      const center = map.getCenter?.() || [centerLng, centerLat];
      active.mapCenterLat = String(center[1]);
      active.mapCenterLng = String(center[0]);
      active.mapZoom = String(map.getZoom?.() || zoom);
      active.updatedAt = new Date().toISOString();
      saveProjects();
      renderHeader();
      renderSection();
    });

    clearButton?.addEventListener("click", async () => {
      const active = currentProject();
      if (!active) return;
      draftPolygon = [];
      active.basePolygon = [];
      active.updatedAt = new Date().toISOString();
      saveProjects();
      repaintPolygon();
      await renderTransportOverlay();
    });

    repaintPolygon();
    await renderTransportOverlay();
  } catch (error) {
    console.warn("2GIS map failed:", error);
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    const cityLat = Number(canvas.dataset.cityLat);
    const cityLng = Number(canvas.dataset.cityLng);
    const baseLat = Number(canvas.dataset.baseLat);
    const baseLng = Number(canvas.dataset.baseLng);
    const centerLat = Number(canvas.dataset.centerLat);
    const centerLng = Number(canvas.dataset.centerLng);
    const zoom = Number(canvas.dataset.zoom) || 10;
    wrapper.insertAdjacentHTML("beforebegin", mapProviderFallbackNotice("2gis"));
    wrapper.outerHTML = fallbackMapFrameMarkup(cityLat, cityLng, baseLat, baseLng, centerLat, centerLng, zoom);
    hydrateMapPicker();
  }
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

function transportMapNotice(requestedProvider) {
  if (state.activeSectionId !== "transport" || requestedProvider === "osm") return "";
  const label = requestedProvider === "2gis" ? "2ГИС" : requestedProvider === "google" ? "Карты Google" : "выбранная карта";
  return `
    <div class="map-provider-note">
      <strong>Транспортная доступность показана на рабочей схеме.</strong>
      <span>${label} может не отрисоваться из-за ключа, домена или внешнего API, поэтому маршрут город-база и точки базы показываются на резервной карте без пустого экрана.</span>
    </div>
  `;
}

function mapEmbed(ctx) {
  const [cityLat, cityLng] = cityCoords(ctx.city);
  const [baseLat, baseLng] = projectCoords(ctx.project, ctx.city);
  const [savedCenterLat, savedCenterLng] = mapCenterCoords(ctx.project, ctx.city);
  const centerLat = state.activeSectionId === "transport" ? (cityLat + baseLat) / 2 : savedCenterLat;
  const centerLng = state.activeSectionId === "transport" ? (cityLng + baseLng) / 2 : savedCenterLng;
  const savedZoom = Number(ctx.project?.mapZoom) || 12;
  const transportDelta = Math.max(Math.abs(cityLat - baseLat), Math.abs(cityLng - baseLng));
  const transportZoom = transportDelta > 0.7 ? 8 : transportDelta > 0.35 ? 9 : transportDelta > 0.18 ? 10 : 11;
  const zoom = state.activeSectionId === "transport" ? Math.min(savedZoom, transportZoom) : savedZoom;
  const requestedProvider = mapProvider(ctx.project);
  const forceTransportFallback = state.activeSectionId === "transport";
  const provider = forceTransportFallback
    ? "osm"
    : requestedProvider === "google" && hasGoogleMapsKey()
      ? "google"
      : "osm";
  const points = basePolygon(ctx.project);
  const area = polygonAreaSqMeters(points);
  const polygonJson = escapeHtml(JSON.stringify(points));
  const googleBaseUrl = googleOpenUrl(baseLat, baseLng, zoom);
  const twoGisBaseUrl = twoGisOpenUrl(baseLat, baseLng, zoom);
  const fallbackNotice = forceTransportFallback
    ? transportMapNotice(requestedProvider)
    : provider !== requestedProvider ? mapProviderFallbackNotice(requestedProvider) : "";

  let mapBody = "";
  if (provider === "google") {
    mapBody = `<div class="map-google-frame"><div class="google-map-canvas" data-city-lat="${cityLat}" data-city-lng="${cityLng}" data-base-lat="${baseLat}" data-base-lng="${baseLng}" data-center-lat="${centerLat}" data-center-lng="${centerLng}" data-zoom="${zoom}" data-base-polygon="${polygonJson}"></div></div>`;
  } else {
    mapBody = fallbackMapFrameMarkup(cityLat, cityLng, baseLat, baseLng, centerLat, centerLng, zoom);
  }

  return `
    <article class="map-panel">
      <div class="map-provider-switch" role="tablist" aria-label="Источник карты">
        <button type="button" class="${requestedProvider === "osm" ? "is-active" : ""}" data-map-provider="osm">OSM</button>
        <button type="button" class="${requestedProvider === "google" ? "is-active" : ""}" data-map-provider="google">Карты Google</button>
      </div>
      ${fallbackNotice}
      ${mapBody}
      <div class="map-toolbar">
        <div class="map-mode-buttons">
          <button type="button" class="ghost-button" data-map-mode="pan">Двигать карту</button>
          <button type="button" class="ghost-button" data-map-mode="draw">Контур базы</button>
          <button type="button" class="primary-button" data-map-save>Сохранить</button>
          <button type="button" class="danger-button" data-map-clear>Очистить</button>
        </div>
        <div class="map-area-card">
          <strong>Площадь базы</strong>
          <span data-map-area>${area > 0 ? formatArea(area) : "Еще не рассчитано"}</span>
        </div>
      </div>
      <div class="map-caption">
        <strong><i class="legend-dot city"></i>Центр города <i class="legend-dot base"></i>База</strong>
        <span data-map-hint>${provider === "google" ? "Карта Google активна. Если она не загрузится из-за ключа или домена, переключитесь на OSM." : "Перемещайте карту, рисуйте контур и сохраняйте точку базы для анализа."}</span>
      </div>
      <div class="map-external-links">
        <a href="${twoGisBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть в 2ГИС</a>
        <a href="${googleBaseUrl}" target="_blank" rel="noreferrer noopener">Открыть в Картах Google</a>
      </div>
    </article>
  `;
}

function hydrateMapPicker() {
  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      if (typeof persistVisibleMapView === "function") persistVisibleMapView();
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  if (sectionOutput.querySelector(".twogis-map-canvas")) {
    hydrateTwoGisMap();
    return;
  }
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
        ? `${formatArea(draftArea)}${isSavedView ? "" : " черновик"}`
        : savedArea > 0 ? formatArea(savedArea) : "Еще не рассчитано";
    }
    if (hintNode) {
      hintNode.textContent = drawMode
        ? "Режим контура активен: нажимайте на карту, чтобы добавлять точки территории."
        : "После сохранения территории эта точка используется для анализа инфраструктуры, транспорта, экологии и достопримечательностей.";
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
      frame.dataset.centerLat = String(mapState.centerLat);
      frame.dataset.centerLng = String(mapState.centerLng);
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
      frame.dataset.zoom = String(mapState.zoom);
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
      window.alert("Add at least 3 points to save the base area.");
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
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
  });
}

function hydrateMapPicker() {
  if (!sectionOutput) return;

  sectionOutput.querySelectorAll("[data-map-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = currentProject();
      if (!project) return;
      if (typeof persistVisibleMapView === "function") persistVisibleMapView();
      project.mapProvider = button.dataset.mapProvider;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      renderSection();
    });
  });

  sectionOutput.querySelectorAll(".twogis-map-canvas").forEach((canvas, index) => {
    if (index === 0 && !canvas.dataset.mapHydrated) {
      canvas.dataset.mapHydrated = "true";
      hydrateTwoGisMap();
    }
  });

  sectionOutput.querySelectorAll(".google-map-canvas").forEach((canvas, index) => {
    if (index === 0 && !canvas.dataset.mapHydrated) {
      canvas.dataset.mapHydrated = "true";
      hydrateGoogleMap();
    }
  });

  sectionOutput.querySelectorAll(".map-frame").forEach((frame) => {
    hydrateOsmFrame(frame);
  });
}

function hydrateOsmFrame(frame) {
  const layer = frame?.querySelector(".map-interaction-layer");
  if (!frame || !layer || frame.dataset.mapHydrated === "true") return;
  frame.dataset.mapHydrated = "true";

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
  const panel = frame.closest(".map-panel") || frame.parentElement;
  const areaNode = panel?.querySelector("[data-map-area]");
  const hintNode = panel?.querySelector("[data-map-hint]");
  const panButton = panel?.querySelector('[data-map-mode="pan"]');
  const drawButton = panel?.querySelector('[data-map-mode="draw"]');
  const saveButton = panel?.querySelector("[data-map-save]");
  const clearButton = panel?.querySelector("[data-map-clear]");
  const canEditArea = Boolean(saveButton || clearButton || drawButton);

  function polygonMatchesSaved() {
    return draftPolygon.length === savedPolygon.length && draftPolygon.every((point, index) => {
      const savedPoint = savedPolygon[index];
      return savedPoint && point.lat === savedPoint.lat && point.lng === savedPoint.lng;
    });
  }

  function persistMapView() {
    if (frame.classList.contains("infrastructure-map-frame")) return;
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
        ? `${formatArea(draftArea)}${isSavedView ? "" : " черновик"}`
        : savedArea > 0 ? formatArea(savedArea) : "Еще не рассчитано";
    }
    if (hintNode && canEditArea) {
      hintNode.textContent = drawMode
        ? "Режим контура активен: нажимайте на карту, чтобы добавлять точки территории."
        : "После сохранения территории эта точка используется для анализа инфраструктуры, транспорта, экологии и достопримечательностей.";
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
      polygon: canEditArea ? draftPolygon : [],
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
      frame.dataset.centerLat = String(mapState.centerLat);
      frame.dataset.centerLng = String(mapState.centerLng);
      repaint();
    }
  });

  function finishPointer(event) {
    if (!pointerDown || activePointerId !== event.pointerId) return;
    if (!dragging && drawMode && canEditArea) {
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
      frame.dataset.zoom = String(mapState.zoom);
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
      window.alert("Добавьте минимум 3 точки, чтобы сохранить территорию базы.");
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
    draftPolygon = [];
    active.basePolygon = [];
    active.updatedAt = new Date().toISOString();
    saveProjects();
    repaint();
  });
}

