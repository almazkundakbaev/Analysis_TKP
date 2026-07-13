from __future__ import annotations

import json
import base64
import hashlib
import os
import re
import secrets
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.parse import parse_qs, urlencode
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Tag

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # PostgreSQL is optional for local static previews.
    psycopg = None
    dict_row = None


ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("OMARTA_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("OMARTA_PORT") or "8000")
MAX_DOWNLOAD_BYTES = 5_000_000
MAX_BLOCKS = 250
REQUEST_TIMEOUT_SECONDS = 20
SESSION_TTL_SECONDS = int(os.environ.get("OMARTA_SESSION_TTL_SECONDS", str(60 * 60 * 24 * 14)))
PASSWORD_ITERATIONS = 210_000
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36 OMARTA/1.0"
)
TWOGIS_CATALOG_API_URL = "https://catalog.api.2gis.com/3.0/items"
TWOGIS_ALLOWED_PARAMS = {
    "q",
    "type",
    "subtype",
    "fields",
    "point",
    "lon",
    "lat",
    "radius",
    "page",
    "page_size",
    "locale",
    "sort",
    "location",
}

HEADING_TAGS = {"h1", "h2", "h3"}
TEXT_TAGS = {"p", "li", "blockquote", "pre"}
IGNORED_TAGS = {"script", "style", "noscript", "template", "iframe", "canvas"}
ALLOWED_ATTRS = {
    "a": {"href", "title", "target", "rel"},
    "img": {"src", "alt", "title", "loading"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}


def database_enabled() -> bool:
    return bool(DATABASE_URL and psycopg)


def db_connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured.")
    if not psycopg:
        raise RuntimeError("Install psycopg[binary] to enable PostgreSQL.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def ensure_database_schema() -> None:
    if not database_enabled():
        return
    schema_path = ROOT / "database" / "schema.sql"
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_path.read_text(encoding="utf-8"))
            cur.execute("SELECT id FROM users WHERE login = %s LIMIT 1", (os.environ.get("OMARTA_ADMIN_LOGIN", "123"),))
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO users (full_name, login, password_hash, role, active)
                    VALUES (%s, %s, %s, 'admin', true)
                    """,
                    (
                        os.environ.get("OMARTA_ADMIN_NAME", "Тестовый админ"),
                        os.environ.get("OMARTA_ADMIN_LOGIN", "123"),
                        password_hash(os.environ.get("OMARTA_ADMIN_PASSWORD", "123")),
                    ),
                )


def user_public(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "fullName": row.get("full_name") or row.get("login") or "",
        "login": row.get("login") or "",
        "role": row.get("role") or "user",
        "active": bool(row.get("active", True)),
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
    }


def project_public(row: dict[str, Any]) -> dict[str, Any]:
    payload = row.get("payload") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, dict):
        payload = {}
    payload.setdefault("id", str(row["id"]))
    payload.setdefault("name", row.get("name") or "Проект")
    payload.setdefault("location", row.get("description") or "")
    payload.setdefault("citySlug", row.get("city_slug") or "")
    payload.setdefault("cityName", row.get("city_name") or "")
    payload.setdefault("regionName", row.get("region_name") or "")
    payload.setdefault("createdAt", row.get("created_at").isoformat() if row.get("created_at") else None)
    payload.setdefault("updatedAt", row.get("updated_at").isoformat() if row.get("updated_at") else None)
    return payload


def bearer_token(headers) -> str:
    header = headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug[:40] or "section"


def stable_uuid(value: str, namespace: str) -> str:
    cleaned = normalize_space(value)
    if cleaned:
        try:
            return str(uuid.UUID(cleaned))
        except ValueError:
            return str(uuid.uuid5(uuid.NAMESPACE_URL, f"omarta:{namespace}:{cleaned}"))
    return str(uuid.uuid4())


def fetch_page(url: str) -> tuple[str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https URLs are supported.")

    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        },
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("Content-Type", "")
            if "html" not in content_type and "xml" not in content_type:
                raise ValueError(f"Unsupported content type: {content_type or 'unknown'}")

            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise ValueError("The page is too large to import.")
                chunks.append(chunk)

            body = b"".join(chunks)
            final_url = response.geturl()
            encoding = response.headers.get_content_charset()
            if encoding:
                html = body.decode(encoding, errors="replace")
            else:
                html = body.decode("utf-8", errors="replace")
            return final_url, html
    except HTTPError as error:
        raise ValueError(f"Target site returned HTTP {error.code}.") from error
    except URLError as error:
        raise ValueError("Could not reach the target site.") from error


def two_gis_catalog_key() -> str:
    env_key = normalize_space(os.environ.get("OMARTA_2GIS_CATALOG_KEY") or os.environ.get("OMARTA_2GIS_API_KEY") or "")
    if env_key:
        return env_key

    config_path = ROOT / "dashboard" / "map-config.js"
    try:
        config_text = config_path.read_text(encoding="utf-8")
    except OSError:
        return ""
    match = re.search(r'twoGis(?:MapKey|ApiKey)\s*:\s*"([^"]+)"', config_text)
    return normalize_space(match.group(1) if match else "")


def fetch_two_gis_items(query_string: str) -> dict[str, Any]:
    key = two_gis_catalog_key()
    if not key:
        raise PermissionError("2GIS catalog key is not configured. Set OMARTA_2GIS_CATALOG_KEY or OMARTA_2GIS_API_KEY before starting the server.")

    incoming = parse_qs(query_string, keep_blank_values=False)
    params: dict[str, str] = {
        "key": key,
        "locale": "ru_KZ",
        "page_size": "50",
        "sort": "distance",
    }
    for name, values in incoming.items():
        if name in TWOGIS_ALLOWED_PARAMS and values:
            params[name] = normalize_space(values[-1])

    request = Request(
        f"{TWOGIS_CATALOG_API_URL}?{urlencode(params)}",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            body = response.read(MAX_DOWNLOAD_BYTES)
            return json.loads(body.decode("utf-8"))
    except HTTPError as error:
        try:
            payload = json.loads(error.read().decode("utf-8", errors="replace"))
        except Exception:
            payload = {"error": f"2GIS returned HTTP {error.code}."}
        raise ValueError(json.dumps(payload, ensure_ascii=False)) from error
    except URLError as error:
        raise ValueError("Could not reach 2GIS catalog API.") from error


def choose_content_root(soup: BeautifulSoup) -> Tag:
    selectors = [
        "main",
        "article",
        "[role='main']",
        "#content",
        "#main",
        ".content",
        ".main",
        ".post",
    ]

    for selector in selectors:
        node = soup.select_one(selector)
        if isinstance(node, Tag):
            return node

    if isinstance(soup.body, Tag):
        return soup.body

    return soup


def should_skip_text(tag: Tag) -> bool:
    return tag.find_parent(["table", "nav", "footer", "header", "aside"]) is not None


def absolutize_and_sanitize_html(fragment: str, base_url: str) -> str:
    soup = BeautifulSoup(fragment, "html.parser")

    for node in soup.find_all(IGNORED_TAGS):
        node.decompose()

    for tag in soup.find_all(True):
        for attr_name in ("href", "src"):
            if tag.has_attr(attr_name):
                tag[attr_name] = urljoin(base_url, str(tag[attr_name]))

        if tag.name == "a" and tag.has_attr("href"):
            tag["target"] = "_blank"
            tag["rel"] = "noreferrer noopener"

        if tag.name == "img":
            tag["loading"] = "lazy"

        allowed = ALLOWED_ATTRS.get(tag.name, set())
        tag.attrs = {key: value for key, value in tag.attrs.items() if key in allowed}

    return str(soup)


def build_block(
    *,
    block_type: str,
    section_id: str,
    section_title: str,
    label: str,
    html: str,
    preview: str,
    index: int,
) -> dict[str, Any]:
    return {
        "id": f"{section_id}-{block_type}-{index}",
        "sectionId": section_id,
        "sectionTitle": section_title,
        "type": block_type,
        "label": label,
        "html": html,
        "preview": preview[:160],
    }


def extract_blocks(final_url: str, html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    for node in soup.find_all(IGNORED_TAGS):
        node.decompose()

    title = normalize_space(soup.title.get_text(" ", strip=True) if soup.title else "") or urlparse(final_url).netloc
    root = choose_content_root(soup)

    sections: list[dict[str, str]] = []
    blocks: list[dict[str, Any]] = []
    section_index = 0
    current_section_id = "overview"
    current_section_title = "Overview"
    seen_previews: set[tuple[str, str]] = set()

    def ensure_section(title_value: str) -> None:
        nonlocal current_section_id, current_section_title, section_index

        normalized_title = normalize_space(title_value) or "Overview"
        if sections and sections[-1]["title"] == normalized_title:
            current_section_id = sections[-1]["id"]
            current_section_title = sections[-1]["title"]
            return

        section_index += 1
        current_section_title = normalized_title
        current_section_id = f"{slugify(normalized_title)}-{section_index}"
        sections.append({"id": current_section_id, "title": current_section_title})

    ensure_section(title)

    for tag in root.find_all(["h1", "h2", "h3", "p", "li", "blockquote", "pre", "table", "img", "a"]):
        if len(blocks) >= MAX_BLOCKS:
            break

        if not isinstance(tag, Tag):
            continue

        tag_name = tag.name.lower()
        text = normalize_space(tag.get_text(" ", strip=True))

        if tag_name in HEADING_TAGS:
            if tag.find_parent(HEADING_TAGS):
                continue
            if not text:
                continue
            ensure_section(text)
            blocks.append(
                build_block(
                    block_type="heading",
                    section_id=current_section_id,
                    section_title=current_section_title,
                    label=text[:80],
                    html=f"<h3>{text}</h3>",
                    preview=text,
                    index=len(blocks) + 1,
                )
            )
            continue

        if tag_name in TEXT_TAGS:
            if should_skip_text(tag):
                continue
            if tag.find_parent(TEXT_TAGS):
                continue
            if len(text) < 40:
                continue

            preview_key = ("text", text[:160])
            if preview_key in seen_previews:
                continue
            seen_previews.add(preview_key)

            blocks.append(
                build_block(
                    block_type="text",
                    section_id=current_section_id,
                    section_title=current_section_title,
                    label=f"{current_section_title}: text",
                    html=absolutize_and_sanitize_html(str(tag), final_url),
                    preview=text,
                    index=len(blocks) + 1,
                )
            )
            continue

        if tag_name == "table":
            if tag.find_parent("table"):
                continue
            blocks.append(
                build_block(
                    block_type="table",
                    section_id=current_section_id,
                    section_title=current_section_title,
                    label=f"{current_section_title}: table",
                    html=absolutize_and_sanitize_html(str(tag), final_url),
                    preview=normalize_space(text) or "Table",
                    index=len(blocks) + 1,
                )
            )
            continue

        if tag_name == "img":
            if tag.find_parent("picture"):
                source = tag.get("src") or ""
            else:
                source = tag.get("src") or ""
            if not source:
                continue
            alt_text = normalize_space(tag.get("alt", ""))
            html_fragment = absolutize_and_sanitize_html(str(tag), final_url)
            blocks.append(
                build_block(
                    block_type="image",
                    section_id=current_section_id,
                    section_title=current_section_title,
                    label=alt_text[:80] or f"{current_section_title}: image",
                    html=html_fragment,
                    preview=alt_text or "Image",
                    index=len(blocks) + 1,
                )
            )
            continue

        if tag_name == "a":
            href = normalize_space(tag.get("href", ""))
            if not href or should_skip_text(tag):
                continue
            if tag.find_parent(["p", "li", "blockquote", "pre", "table"]):
                continue
            if len(text) < 3:
                continue

            absolute_href = urljoin(final_url, href)
            preview_key = ("link", absolute_href)
            if preview_key in seen_previews:
                continue
            seen_previews.add(preview_key)

            fragment = f'<a href="{absolute_href}" target="_blank" rel="noreferrer noopener">{text}</a>'
            blocks.append(
                build_block(
                    block_type="link",
                    section_id=current_section_id,
                    section_title=current_section_title,
                    label=text[:80],
                    html=fragment,
                    preview=f"{text} - {absolute_href}",
                    index=len(blocks) + 1,
                )
            )

    if not blocks:
        raise ValueError("No readable content blocks were found on this page.")

    return {
        "source": {
            "url": final_url,
            "title": title,
        },
        "sections": sections,
        "blocks": blocks,
    }


class OmartaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True, "status": "online", "database": database_enabled()})
            return
        if parsed.path == "/api/auth/me":
            user = self.require_user()
            if not user:
                return
            self.send_json(HTTPStatus.OK, {"user": user_public(user)})
            return
        if parsed.path == "/api/projects":
            user = self.require_user()
            if not user:
                return
            self.handle_projects_get(user)
            return
        if parsed.path == "/api/users":
            user = self.require_user(role="admin")
            if not user:
                return
            self.handle_users_get()
            return
        if parsed.path == "/api/2gis/search":
            try:
                self.send_json(HTTPStatus.OK, fetch_two_gis_items(parsed.query))
            except PermissionError as error:
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            except ValueError as error:
                self.send_json(HTTPStatus.BAD_GATEWAY, {"error": str(error)})
            except Exception:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Unexpected 2GIS proxy error."})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/login":
            self.handle_login()
            return
        if parsed.path == "/api/auth/logout":
            self.handle_logout()
            return
        if parsed.path == "/api/projects/bulk":
            user = self.require_user()
            if not user:
                return
            self.handle_projects_bulk(user)
            return
        if parsed.path == "/api/users":
            user = self.require_user(role="admin")
            if not user:
                return
            self.handle_user_create()
            return
        if parsed.path != "/api/import":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        try:
            payload = self.read_json_body()
            url = normalize_space(payload.get("url", ""))
            if not url:
                raise ValueError("URL is required.")

            final_url, html = fetch_page(url)
            response_payload = extract_blocks(final_url, html)
            self.send_json(HTTPStatus.OK, response_payload)
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except json.JSONDecodeError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Request body must be valid JSON."})
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Unexpected server error."})

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        match = re.fullmatch(r"/api/users/([0-9a-fA-F-]+)", parsed.path)
        if match:
            user = self.require_user(role="admin")
            if not user:
                return
            self.handle_user_update(match.group(1))
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        project_match = re.fullmatch(r"/api/projects/([^/]+)", parsed.path)
        if project_match:
            user = self.require_user()
            if not user:
                return
            self.handle_project_delete(user, project_match.group(1))
            return
        user_match = re.fullmatch(r"/api/users/([0-9a-fA-F-]+)", parsed.path)
        if user_match:
            user = self.require_user(role="admin")
            if not user:
                return
            self.handle_user_delete(user, user_match.group(1))
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}
        payload = json.loads(raw_body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        return payload

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def require_database(self) -> bool:
        if database_enabled():
            return True
        self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "PostgreSQL is not configured. Set DATABASE_URL and install requirements."})
        return False

    def require_user(self, role: str | None = None) -> dict[str, Any] | None:
        if not self.require_database():
            return None
        token = bearer_token(self.headers)
        if not token:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Missing session token."})
            return None
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT users.*
                    FROM sessions
                    JOIN users ON users.id = sessions.user_id
                    WHERE sessions.token = %s
                      AND sessions.expires_at > now()
                      AND users.active = true
                    """,
                    (token,),
                )
                user = cur.fetchone()
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Invalid or expired session."})
            return None
        if role and user.get("role") != role:
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "Admin role is required."})
            return None
        return user

    def handle_login(self) -> None:
        if not self.require_database():
            return
        try:
            payload = self.read_json_body()
            login = normalize_space(payload.get("login", ""))
            password = str(payload.get("password", ""))
            if not login or not password:
                raise ValueError("Login and password are required.")
            with db_connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM users WHERE lower(login) = lower(%s) LIMIT 1", (login,))
                    user = cur.fetchone()
                    if not user or not user.get("active") or not verify_password(password, user.get("password_hash", "")):
                        self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Invalid login or password."})
                        return
                    token = secrets.token_urlsafe(32)
                    cur.execute(
                        """
                        INSERT INTO sessions (user_id, token, expires_at)
                        VALUES (%s, %s, now() + (%s || ' seconds')::interval)
                        """,
                        (user["id"], token, SESSION_TTL_SECONDS),
                    )
            self.send_json(HTTPStatus.OK, {"token": token, "user": user_public(user)})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Could not sign in."})

    def handle_logout(self) -> None:
        if not self.require_database():
            return
        token = bearer_token(self.headers)
        if token:
            with db_connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM sessions WHERE token = %s", (token,))
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_projects_get(self, user: dict[str, Any]) -> None:
        with db_connect() as conn:
            with conn.cursor() as cur:
                if user.get("role") == "admin":
                    cur.execute("SELECT * FROM projects ORDER BY updated_at DESC")
                else:
                    cur.execute("SELECT * FROM projects WHERE owner_id = %s ORDER BY updated_at DESC", (user["id"],))
                rows = cur.fetchall()
        self.send_json(HTTPStatus.OK, {"projects": [project_public(row) for row in rows]})

    def handle_projects_bulk(self, user: dict[str, Any]) -> None:
        try:
            payload = self.read_json_body()
            projects = payload.get("projects", [])
            if not isinstance(projects, list):
                raise ValueError("projects must be a list.")
            saved: list[dict[str, Any]] = []
            with db_connect() as conn:
                with conn.cursor() as cur:
                    for project in projects:
                        if not isinstance(project, dict):
                            continue
                        project_id = stable_uuid(str(project.get("id", "")), "project")
                        project["id"] = project_id
                        name = normalize_space(project.get("name", "")) or "Проект"
                        cur.execute(
                            """
                            INSERT INTO projects (
                                id, owner_id, name, description, city_slug, city_name,
                                region_slug, region_name, latitude, longitude, payload, updated_at
                            )
                            VALUES (
                                %s::uuid, %s, %s, %s, %s, %s, %s, %s,
                                NULLIF(%s, '')::double precision,
                                NULLIF(%s, '')::double precision,
                                %s::jsonb, now()
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                name = EXCLUDED.name,
                                description = EXCLUDED.description,
                                city_slug = EXCLUDED.city_slug,
                                city_name = EXCLUDED.city_name,
                                region_slug = EXCLUDED.region_slug,
                                region_name = EXCLUDED.region_name,
                                latitude = EXCLUDED.latitude,
                                longitude = EXCLUDED.longitude,
                                payload = EXCLUDED.payload,
                                updated_at = now()
                            RETURNING *
                            """,
                            (
                                project_id,
                                user["id"],
                                name,
                                project.get("location") or "",
                                project.get("citySlug") or "",
                                project.get("cityName") or "",
                                project.get("regionSlug") or "",
                                project.get("regionName") or "",
                                str(project.get("lat") or ""),
                                str(project.get("lng") or ""),
                                json.dumps(project, ensure_ascii=False),
                            ),
                        )
                        saved.append(project_public(cur.fetchone()))
            self.send_json(HTTPStatus.OK, {"projects": saved})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Could not save projects."})

    def handle_project_delete(self, user: dict[str, Any], project_id: str) -> None:
        project_uuid = stable_uuid(project_id, "project")
        with db_connect() as conn:
            with conn.cursor() as cur:
                if user.get("role") == "admin":
                    cur.execute("DELETE FROM projects WHERE id = %s::uuid", (project_uuid,))
                else:
                    cur.execute("DELETE FROM projects WHERE id = %s::uuid AND owner_id = %s", (project_uuid, user["id"]))
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_users_get(self) -> None:
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users ORDER BY created_at DESC")
                users = cur.fetchall()
        self.send_json(HTTPStatus.OK, {"users": [user_public(user) for user in users]})

    def handle_user_create(self) -> None:
        try:
            payload = self.read_json_body()
            login = normalize_space(payload.get("login", ""))
            password = str(payload.get("password", ""))
            role = "admin" if payload.get("role") == "admin" else "user"
            if not login or not password:
                raise ValueError("Login and password are required.")
            with db_connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO users (full_name, login, password_hash, role, active)
                        VALUES (%s, %s, %s, %s, true)
                        RETURNING *
                        """,
                        (normalize_space(payload.get("fullName", "")) or login, login, password_hash(password), role),
                    )
                    user = cur.fetchone()
            self.send_json(HTTPStatus.CREATED, {"user": user_public(user)})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except Exception:
            self.send_json(HTTPStatus.CONFLICT, {"error": "Could not create user. Login may already exist."})

    def handle_user_update(self, user_id: str) -> None:
        try:
            payload = self.read_json_body()
            fields: list[str] = []
            values: list[Any] = []
            if "fullName" in payload:
                fields.append("full_name = %s")
                values.append(normalize_space(payload.get("fullName", "")))
            if "role" in payload:
                fields.append("role = %s")
                values.append("admin" if payload.get("role") == "admin" else "user")
            if "active" in payload:
                fields.append("active = %s")
                values.append(bool(payload.get("active")))
            if "password" in payload and payload.get("password"):
                fields.append("password_hash = %s")
                values.append(password_hash(str(payload.get("password"))))
            if not fields:
                raise ValueError("No fields to update.")
            values.append(user_id)
            with db_connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE users SET {', '.join(fields)}, updated_at = now() WHERE id = %s::uuid RETURNING *",
                        tuple(values),
                    )
                    user = cur.fetchone()
            if not user:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "User not found."})
                return
            self.send_json(HTTPStatus.OK, {"user": user_public(user)})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Could not update user."})

    def handle_user_delete(self, current_user: dict[str, Any], user_id: str) -> None:
        if str(current_user.get("id")) == user_id:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Current user cannot be deleted."})
            return
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE id = %s::uuid", (user_id,))
        self.send_json(HTTPStatus.OK, {"ok": True})


def main() -> None:
    ensure_database_schema()
    server = ThreadingHTTPServer((HOST, PORT), OmartaHandler)
    print(f"OMARTA server is running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
