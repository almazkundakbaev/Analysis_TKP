from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "kz_weather_catalog.json"
OUTPUT_PATH = ROOT / "data" / "kz_city_coords.json"
USER_AGENT = "OMARTA/1.0 (catalog geocoder)"
REQUEST_DELAY_SECONDS = 1.1
TIMEOUT_SECONDS = 30
MANUAL_COORDS = {
    "priisk-boko-110495": {
        "lat": 49.06028,
        "lng": 81.64528,
        "query": "Priisk Boko, Kazakhstan",
        "source": "manual:weatherspark",
    },
    "джамбейты-105227": {
        "lat": 50.263822,
        "lng": 52.597523,
        "query": "Zhympity, Kazakhstan",
        "source": "manual:zhympity-alias",
    },
}
QUERY_ALIASES = {
    "джетыгара-106090": ["Житикара, Kazakhstan", "Zhitikara, Kazakhstan"],
    "комсомолец-106169": ["Komsomolets, Kazakhstan", "Комсомолец, Kazakhstan"],
    "dzhalagash-106269": ["Zhalagash, Kazakhstan", "Жалагаш, Kazakhstan"],
    "kyzylorda-airport-148937": ["Korkyt Ata Airport, Kazakhstan", "Kyzylorda Airport, Kazakhstan"],
    "shalq-ya-106527": ["Shalkiya, Kazakhstan", "Шалкия, Kazakhstan"],
    "шиели-106443": ["Shieli, Kazakhstan", "Шиели, Kazakhstan"],
    "яныкурган-106526": ["Zhanakorgan, Kazakhstan", "Яныкурган, Kazakhstan"],
    "майкайн-108451": ["Maikain, Kazakhstan", "Майкаин, Kazakhstan"],
    "astana-international-airport-148965": ["Nursultan Nazarbayev International Airport, Kazakhstan", "Astana Airport, Kazakhstan"],
    "derzhav-nsk-106446": ["Derzhavinsk, Kazakhstan", "Державинск, Kazakhstan"],
    "zhaqsy-106529": ["Zhaksy, Kazakhstan", "Жаксы, Kazakhstan"],
    "aktjubinsk-148907": ["Aktobe, Kazakhstan", "Актобе, Kazakhstan"],
    "lepsy-109684": ["Lepsy, Kazakhstan", "Лепсы, Kazakhstan"],
    "aqtoghay-110053": ["Aktogay, Kazakhstan", "Актогай, Kazakhstan"],
    "priisk-boko-110495": ["Priiskovyi, Kazakhstan", "Боко, Kazakhstan"],
    "t-ghyl-110971": ["Tugyl, Kazakhstan", "Тугыл, Kazakhstan"],
    "aqbaqay-107468": ["Akbakay, Kazakhstan", "Акбакай, Kazakhstan"],
    "khanta-107789": ["Khantau, Kazakhstan", "Хантау, Kazakhstan"],
    "moyynkum-107467": ["Moiynkum, Kazakhstan", "Мойынкум, Kazakhstan"],
    "shyghanaq-107076": ["Shyganak, Kazakhstan", "Шыганак, Kazakhstan"],
    "джамбейты-105227": ["Zhambeyty, Kazakhstan", "Джамбейты, Kazakhstan"],
    "moyynty-107794": ["Moiynty, Kazakhstan", "Мойынты, Kazakhstan"],
    "saryshaghan-107793": ["Saryshagan, Kazakhstan", "Сарышаган, Kazakhstan"],
    "shash-bay-108445": ["Shashubay, Kazakhstan", "Шашубай, Kazakhstan"],
    "verkhniye-kayrakty-107796": ["Verkhnie Kayrakty, Kazakhstan", "Верхние Кайракты, Kazakhstan"],
    "petropavlosk-south-airport-150125": ["Petropavl Airport, Kazakhstan", "Petropavlosk South Airport, Kazakhstan"],
    "бишкуль-106921": ["Bishkul, Kazakhstan", "Бишкуль, Kazakhstan"],
    "bayzhansay-106914": ["Baizhansai, Kazakhstan", "Байжансай, Kazakhstan"],
}


def mojibake_score(value: str) -> int:
    return sum(value.count(token) for token in ("Р", "С", "вЂ", "Г"))


def repair_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    candidates = [text]
    for encoding in ("cp1251", "latin1"):
        try:
            repaired = text.encode(encoding, "ignore").decode("utf-8", "ignore").strip()
        except Exception:
            continue
        if repaired:
            candidates.append(repaired)
    return min(candidates, key=mojibake_score)


def fetch_json(url: str) -> Any:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "ru,en;q=0.8",
        },
    )
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.load(response)


def geocode_queries(city: dict[str, Any]) -> list[str]:
    slug = str(city.get("slug") or "").strip()
    name = repair_text(city.get("name"))
    region_name = repair_text(city.get("regionName"))
    defaults = [
        f"{name}, {region_name}, Kazakhstan",
        f"{name}, Kazakhstan",
    ]
    aliases = QUERY_ALIASES.get(slug, [])
    return aliases + defaults


def geocode_city(city: dict[str, Any]) -> dict[str, Any] | None:
    slug = str(city.get("slug") or "").strip()
    manual = MANUAL_COORDS.get(slug)
    if manual:
        return dict(manual)
    for query in geocode_queries(city):
        params = urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "limit": 1,
                "countrycodes": "kz",
                "accept-language": "ru",
            }
        )
        try:
            payload = fetch_json(f"https://nominatim.openstreetmap.org/search?{params}")
        except Exception:
            payload = None
        items = payload if isinstance(payload, list) else []
        match = items[0] if items else None
        lat = float(match["lat"]) if match and match.get("lat") else None
        lng = float(match["lon"]) if match and match.get("lon") else None
        if lat is not None and lng is not None:
            return {
                "lat": lat,
                "lng": lng,
                "query": query,
                "source": "nominatim",
            }
    return None


def load_catalog() -> list[dict[str, Any]]:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    cities: list[dict[str, Any]] = []
    for region in payload.get("regions", []):
        for city in region.get("cities", []):
            cities.append(
                {
                    "slug": city.get("slug"),
                    "name": repair_text(city.get("name")),
                    "regionName": repair_text(region.get("name")),
                    "regionSlug": region.get("slug"),
                    "id": city.get("id"),
                }
            )
    return cities


def main() -> None:
    cities = load_catalog()
    existing: dict[str, Any] = {}
    if OUTPUT_PATH.exists():
      try:
        existing_payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        existing = dict(existing_payload.get("cities", {}))
      except Exception:
        existing = {}

    results: dict[str, Any] = dict(existing)
    resolved = 0
    skipped = 0
    missing: list[dict[str, Any]] = []

    for city in cities:
        slug = str(city.get("slug") or "")
        if not slug:
            continue
        if slug in results and results[slug].get("lat") is not None and results[slug].get("lng") is not None:
            skipped += 1
            continue
        match = geocode_city(city)
        if match:
            results[slug] = {
                **match,
                "name": city.get("name"),
                "regionName": city.get("regionName"),
                "regionSlug": city.get("regionSlug"),
                "id": city.get("id"),
            }
            resolved += 1
        else:
            missing.append(
                {
                    "slug": slug,
                    "name": city.get("name"),
                    "regionName": city.get("regionName"),
                    "id": city.get("id"),
                }
            )
        time.sleep(REQUEST_DELAY_SECONDS)

    payload = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceCatalog": str(CATALOG_PATH.name),
        "cityCount": len(cities),
        "resolvedCount": sum(
            1
            for value in results.values()
            if value.get("lat") is not None and value.get("lng") is not None
        ),
        "cities": results,
        "missing": missing,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "resolved_now": resolved,
                "skipped_existing": skipped,
                "total_cities": len(cities),
                "missing_now": len(missing),
                "output": str(OUTPUT_PATH),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
