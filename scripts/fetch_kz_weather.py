from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from time import sleep
from typing import Any
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, NavigableString, Tag


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DETAIL_DIR = DATA_DIR / "kz-weather-details"
INDEX_PATH = DATA_DIR / "kz_weather_catalog.json"
COUNTRY_URL = "https://ru.weatherspark.com/countries/KZ"
BASE_URL = "https://ru.weatherspark.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
MAX_BYTES = 3_000_000
TIMEOUT_SECONDS = 30
WORKERS = 10

CITY_SECTION_CONFIG = [
    ("Sections-Summary", "Климат и средняя погода"),
    ("Sections-Temperature", "Температура"),
    ("Sections-Clouds", "Облачность"),
    ("Sections-Precipitation", "Осадки"),
    ("Sections-Sun", "Солнце"),
    ("Sections-LunarDay", "Луна"),
    ("Sections-Humidity", "Влажность"),
    ("Sections-Wind", "Ветер"),
    ("Sections-BestTime", "Лучшее время для посещения"),
    ("Sections-GrowingSeason", "Вегетационный период"),
    ("Sections-SolarEnergy", "Солнечная энергия"),
]

MANUAL_REGION_LINKS = [
    {"name": "Город Алматы", "path": "/y/108859/%D0%9E%D0%B1%D1%8B%D1%87%D0%BD%D0%B0%D1%8F-%D0%BF%D0%BE%D0%B3%D0%BE%D0%B4%D0%B0-%D0%B2-%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B-%D0%9A%D0%B0%D0%B7%D0%B0%D1%85%D1%81%D1%82%D0%B0%D0%BD-%D0%B2%D0%B5%D1%81%D1%8C-%D0%B3%D0%BE%D0%B4"},
    {"name": "Город Астана", "path": "/y/107257/%D0%9E%D0%B1%D1%8B%D1%87%D0%BD%D0%B0%D1%8F-%D0%BF%D0%BE%D0%B3%D0%BE%D0%B4%D0%B0-%D0%B2-%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0-%D0%9A%D0%B0%D0%B7%D0%B0%D1%85%D1%81%D1%82%D0%B0%D0%BD-%D0%B2%D0%B5%D1%81%D1%8C-%D0%B3%D0%BE%D0%B4"},
]

REGION_ORDER = [
    "Kostanayskaya Oblast’",
    "Kyzylordinskaya Oblast’",
    "Mangistauskaya Oblast’",
    "Pavlodarskaya Oblast’",
    "Акмолинская область",
    "Актюбинская область",
    "Алматинская Область",
    "Атырауская область",
    "Байконыр",
    "Восточно-Казахстанская область",
    "Город Алматы",
    "Город Астана",
    "Жамбылская область",
    "Западно-Казахстанская область",
    "Карагандинская область",
    "Северо-Казахстанская область",
    "Южно-Казахстанская область",
]

REMOVE_SELECTORS = [
    "script",
    "style",
    "noscript",
    "iframe",
    "canvas",
    "form",
    "input",
    "button",
    ".Figure-crosslinks",
    ".Sidebar-inline_nav_container",
    ".Sidebar-nav_container",
    ".hidden-print",
    ".download-content",
    ".Advertisement-container",
    ".SocialShare",
    ".Figure-share",
    ".Figure-links",
    ".GoogleMap",
    ".map",
    ".Map",
    ".NearbyStationsMap",
    ".NearbyPlacesMap",
    ".legend-toggle",
    ".SvgIcon",
    ".glyphicon",
]

UNWANTED_LINK_TEXTS = {
    "сравнить",
    "ссылка",
    "скачать",
    "data",
    "svg",
    "png",
    "большой png",
}


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9а-яё]+", "-", value.lower()).strip("-")
    return slug or "location"


def make_absolute(value: str | None) -> str | None:
    if not value:
        return value
    return urljoin(BASE_URL, value)


def fetch_html(url: str) -> str:
    attempts = [
        {"User-Agent": USER_AGENT, "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8"},
        {"User-Agent": USER_AGENT},
        {},
    ]

    for attempt_index in range(5):
        try:
            headers = attempts[min(attempt_index, len(attempts) - 1)]
            request = Request(url, headers=headers)
            with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                chunks: list[bytes] = []
                total = 0
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    chunks.append(chunk)
                    total += len(chunk)
                    if total > MAX_BYTES:
                        raise ValueError(f"Page is too large: {url}")
                html = b"".join(chunks).decode("utf-8", errors="ignore")
                if len(html) > 1000:
                    return html
        except Exception:
            pass
        sleep(0.4)

    raise ValueError(f"Empty response received: {url}")


def strip_tag_with_content(html: str, tag_name: str) -> str:
    pattern = re.compile(rf"<{tag_name}\b[^>]*>.*?</{tag_name}>", re.IGNORECASE | re.DOTALL)
    return pattern.sub("", html)


def clean_fragment_html(fragment_html: str) -> str:
    html = fragment_html

    for tag_name in ("script", "style", "noscript", "iframe", "canvas", "form", "picture", "img", "input", "button"):
        html = strip_tag_with_content(html, tag_name)
        html = re.sub(rf"<{tag_name}\b[^>]*/>", "", html, flags=re.IGNORECASE | re.DOTALL)

    html = re.sub(r'<span\b[^>]*class="[^"]*glyphicon[^"]*"[^>]*>.*?</span>', "", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r'<span\b[^>]*class="[^"]*svg-icon[^"]*"[^>]*>.*?</span>', "", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r'<a\b[^>]*>\s*(.*?)\s*</a>', r" \1 ", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"\s+xlink:href=\"[^\"]*\"", "", html, flags=re.IGNORECASE)
    html = re.sub(r"\s+href=\"[^\"]*\"", "", html, flags=re.IGNORECASE)

    return html


def clean_node_tree(soup: BeautifulSoup) -> BeautifulSoup:
    for selector in REMOVE_SELECTORS:
        for node in soup.select(selector):
            node.decompose()

    for image in soup.find_all(["img", "picture"]):
        image.decompose()

    for link in soup.find_all("a"):
        text = normalize_space(link.get_text(" ", strip=True)).lower()
        if text in UNWANTED_LINK_TEXTS:
            link.decompose()
            continue
        link.unwrap()

    for svg_link in soup.select("svg a"):
        svg_link.unwrap()

    for tag in soup.find_all(True):
        if tag.has_attr("style"):
            style = tag.get("style", "")
            style = re.sub(r"(?i)\b(min-height|max-height|height)\s*:[^;]+;?", "", style)
            style = re.sub(r"(?i)\bwidth\s*:\s*170px;?", "", style)
            style = normalize_space(style.replace(";;", ";"))
            if style:
                tag["style"] = style
            else:
                del tag["style"]

        for attr in list(tag.attrs):
            if attr not in {
                "id",
                "colspan",
                "rowspan",
                "class",
                "style",
                "viewbox",
                "viewBox",
                "xmlns",
                "xmlns:xlink",
                "version",
                "d",
                "fill",
                "fill-opacity",
                "stroke",
                "stroke-width",
                "stroke-opacity",
                "stroke-linejoin",
                "stroke-linecap",
                "opacity",
                "transform",
                "x",
                "y",
                "cx",
                "cy",
                "r",
                "points",
                "width",
                "height",
                "text-anchor",
                "font-size",
                "font-family",
                "font-weight",
                "font-style",
                "text-decoration",
                "pointer-events",
                "clip-path",
            }:
                del tag.attrs[attr]

    for svg in soup.find_all("svg"):
        svg["style"] = "width: 100%; height: auto; display: block; overflow: visible;"
        if svg.has_attr("width"):
            del svg["width"]
        if svg.has_attr("height"):
            del svg["height"]

    return soup


def cleanup_fragment(fragment_html: str) -> tuple[str, str]:
    soup = BeautifulSoup(clean_fragment_html(fragment_html), "html.parser")
    soup = clean_node_tree(soup)
    html = str(soup).strip()
    text = normalize_space(soup.get_text(" ", strip=True))
    return html, text


def clone_siblings_until(anchor: Tag, stop_ids: set[str], stop_summary_at_figure: bool) -> str:
    fragments: list[str] = []
    node = anchor.next_sibling

    while node is not None:
        next_node = node.next_sibling
        if isinstance(node, Tag):
            node_id = node.get("id", "")
            if node.name == "a" and node_id in stop_ids:
                break
            if stop_summary_at_figure and node.name == "a" and node_id.startswith("Figures-Temperature"):
                break
            if node.name in {"h2", "h3"}:
                heading_text = normalize_space(node.get_text(" ", strip=True)).lower()
                if "топография" in heading_text or "источники данных" in heading_text or "отказ от ответственности" in heading_text:
                    break
            classes = node.get("class", [])
            if node_id == "Sidebar" or "Sidebar" in classes:
                node = next_node
                continue
            fragments.append(str(node))
        elif isinstance(node, NavigableString):
            text = normalize_space(str(node))
            if text:
                fragments.append(text)
        node = next_node

    return "".join(fragments)


def extract_city_sections(html: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    sections: list[dict[str, str]] = []
    stop_ids = {section_id for section_id, _ in CITY_SECTION_CONFIG}

    for section_id, fallback_title in CITY_SECTION_CONFIG:
        anchor = soup.find(id=section_id)
        if not isinstance(anchor, Tag):
            continue

        title = fallback_title
        heading = anchor.find_next(["h2", "h3"])
        if isinstance(heading, Tag):
            candidate = normalize_space(heading.get_text(" ", strip=True))
            if candidate:
                title = candidate

        fragment = clone_siblings_until(
            anchor,
            stop_ids=stop_ids,
            stop_summary_at_figure=section_id == "Sections-Summary",
        )
        cleaned_html, text = cleanup_fragment(fragment)
        if not cleaned_html or not text:
            continue
        sections.append({"id": section_id, "title": title, "html": cleaned_html, "text": text})

    return sections


def extract_city_name(html: str, fallback_name: str) -> str:
    match = re.search(r'"nameTr":"([^"]+)"', html)
    if match:
        return match.group(1).replace("\\/", "/")

    soup = BeautifulSoup(html, "html.parser")
    heading = soup.find("h4")
    if isinstance(heading, Tag):
        value = normalize_space(heading.get_text(" ", strip=True))
        if value:
            return value

    title = soup.title.get_text(" ", strip=True) if soup.title else fallback_name
    title = normalize_space(title)
    match = re.search(r"в\s+(.+?)\s+\(Казахстан\)", title)
    if match:
        return match.group(1)
    return fallback_name


def gather_region_links(country_html: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(country_html, "html.parser")
    links: list[dict[str, str]] = []
    seen_paths: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        text = normalize_space(anchor.get_text(" ", strip=True))
        if not text:
            continue
        if re.fullmatch(r"/countries/KZ/\d+", href):
            if href not in seen_paths:
                links.append({"name": text, "path": href})
                seen_paths.add(href)
        elif text in {"Город Алматы", "Город Астана"}:
            path = href.replace(BASE_URL, "")
            if path not in seen_paths:
                links.append({"name": text, "path": path})
                seen_paths.add(path)

    for item in MANUAL_REGION_LINKS:
        if item["path"] not in seen_paths:
            links.append(item)
            seen_paths.add(item["path"])

    order_map = {name: index for index, name in enumerate(REGION_ORDER)}
    links.sort(key=lambda item: order_map.get(item["name"], 999))
    return links


def extract_region_city_links(region_name: str, region_url: str, html: str) -> list[dict[str, str]]:
    if "/y/" in region_url:
        city_id = re.search(r"/y/(\d+)", region_url)
        identifier = city_id.group(1) if city_id else slugify(region_name)
        return [{"id": identifier, "url": region_url, "label": region_name, "kind": "city"}]

    soup = BeautifulSoup(html, "html.parser")
    links: dict[str, dict[str, str]] = {}

    for heading in soup.find_all(["h3", "h4"]):
        heading_title = normalize_space(heading.get_text(" ", strip=True)).lower()
        if "населен" not in heading_title and "аэропорт" not in heading_title:
            continue

        node = heading.next_sibling
        while node is not None:
            next_node = node.next_sibling
            if isinstance(node, Tag) and node.name in {"h3", "h4"}:
                break
            if isinstance(node, Tag):
                for anchor in node.find_all("a", href=True):
                    href = make_absolute(anchor["href"])
                    if not href or "/y/" not in href:
                        continue
                    city_id_match = re.search(r"/y/(\d+)", href)
                    if not city_id_match:
                        continue
                    city_id = city_id_match.group(1)
                    label = normalize_space(anchor.get_text(" ", strip=True)) or f"Город {city_id}"
                    kind = "airport" if "аэропорт" in heading_title else "city"
                    links[city_id] = {"id": city_id, "url": href, "label": label, "kind": kind}
            node = next_node

    return sorted(links.values(), key=lambda item: normalize_space(item["label"]).lower())


def fetch_city_detail(task: dict[str, str]) -> dict[str, Any]:
    html = fetch_html(task["url"])
    sections = extract_city_sections(html)
    name = extract_city_name(html, task["label"])
    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.title
    page_title = normalize_space(title_tag.get_text(" ", strip=True) if isinstance(title_tag, Tag) else name)
    slug = f"{slugify(name)}-{task['id']}"

    detail = {
        "id": task["id"],
        "slug": slug,
        "name": name,
        "kind": task["kind"],
        "regionName": task["regionName"],
        "regionSlug": task["regionSlug"],
        "url": task["url"],
        "pageTitle": page_title,
        "sectionCount": len(sections),
        "sections": sections,
    }
    return detail


def write_city_detail(detail: dict[str, Any]) -> dict[str, Any]:
    DETAIL_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{detail['slug']}.json"
    path = DETAIL_DIR / file_name
    path.write_text(json.dumps(detail, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "id": detail["id"],
        "slug": detail["slug"],
        "name": detail["name"],
        "kind": detail["kind"],
        "url": detail["url"],
        "pageTitle": detail["pageTitle"],
        "sectionCount": detail["sectionCount"],
        "detailPath": f"./kz-weather-details/{file_name}",
    }


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DETAIL_DIR.mkdir(parents=True, exist_ok=True)
    for old_file in DETAIL_DIR.glob("*.json"):
        old_file.unlink()

    country_html = fetch_html(COUNTRY_URL)
    region_links = gather_region_links(country_html)

    regions: list[dict[str, Any]] = []
    city_tasks: list[dict[str, str]] = []

    for region_link in region_links:
        region_name = region_link["name"]
        region_url = make_absolute(region_link["path"])
        if not region_url:
            continue

        region_slug = slugify(region_name)
        html = fetch_html(region_url)
        cities = extract_region_city_links(region_name, region_url, html)

        if "/y/" in region_url:
            display_type = "special-city"
        else:
            display_type = "region"

        regions.append(
            {
                "name": region_name,
                "slug": region_slug,
                "type": display_type,
                "url": region_url,
                "cityCount": len(cities),
                "cities": [],
            }
        )

        for city in cities:
            city["regionName"] = region_name
            city["regionSlug"] = region_slug
            city_tasks.append(city)

    unique_tasks = {task["id"]: task for task in city_tasks}
    cities_by_region: dict[str, list[dict[str, Any]]] = {region["slug"]: [] for region in regions}

    failed_tasks: list[dict[str, str]] = []

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(fetch_city_detail, task): task for task in unique_tasks.values()}
        for future in as_completed(futures):
            task = futures[future]
            try:
                detail = future.result()
            except Exception:
                failed_tasks.append(task)
                continue
            entry = write_city_detail(detail)
            cities_by_region[detail["regionSlug"]].append(entry)

    for task in failed_tasks:
        try:
            detail = fetch_city_detail(task)
        except Exception:
            continue
        entry = write_city_detail(detail)
        cities_by_region[detail["regionSlug"]].append(entry)

    total_city_count = 0
    for region in regions:
        region_cities = sorted(cities_by_region.get(region["slug"], []), key=lambda item: normalize_space(item["name"]).lower())
        region["cities"] = region_cities
        region["cityCount"] = len(region_cities)
        total_city_count += len(region_cities)

    payload = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceUrl": COUNTRY_URL,
        "regionCount": len(regions),
        "cityCount": total_city_count,
        "regions": regions,
    }

    INDEX_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(regions)} regions and {total_city_count} city reports")


if __name__ == "__main__":
    main()
