#!/usr/bin/env python3
"""
Fetch companies matching criteria from sources that allow it:
- YC: public API (yc-oss), hiring companies, team_size 1-50
- Antler: parse portfolio HTML (initial load)
- TechIsland: parse members page HTML

Criteria: early-stage / small team (1-50), global relevance.
Output: CSV + MD with company, source, location, team_size, URL, LinkedIn search.
"""
import json
import urllib.request
import re
import csv
import time
import ssl
from html.parser import HTMLParser

# Avoid SSL errors on some systems (e.g. macOS)
SSL_CTX = ssl.create_default_context()
try:
    SSL_CTX.check_hostname = False
    SSL_CTX.verify_mode = ssl.CERT_NONE
except Exception:
    SSL_CTX = None

YC_HIRING_API = "https://yc-oss.github.io/api/companies/hiring.json"
ANTLER_URL = "https://www.antler.co/portfolio"
TECHISLAND_URL = "https://thetechisland.org/our-members"
OUT_CSV = "startups/Parsed_Companies_From_Sources.csv"
OUT_MD = "startups/Parsed_Companies_From_Sources.md"
MAX_TEAM_SIZE = 50
MIN_TEAM_SIZE = 1


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; job-search-bot)"})
    kwargs = {"timeout": 30}
    if SSL_CTX:
        kwargs["context"] = SSL_CTX
    with urllib.request.urlopen(req, **kwargs) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def fetch_html(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})
    kwargs = {"timeout": 25}
    if SSL_CTX:
        kwargs["context"] = SSL_CTX
    with urllib.request.urlopen(req, **kwargs) as resp:
        return resp.read().decode("utf-8", errors="replace")


def get_yc_companies():
    """YC hiring, team 1-50. Uses API or local yc_hiring.json if API fails."""
    data = None
    try:
        data = fetch_json(YC_HIRING_API)
    except Exception as e:
        import os
        local_json = os.path.join(os.path.dirname(__file__), "yc_hiring.json")
        if os.path.isfile(local_json):
            with open(local_json, encoding="utf-8") as f:
                data = json.load(f)
        else:
            raise SystemExit(f"YC API failed and no {local_json}: {e}")
    out = []
    for c in data:
        team_size = c.get("team_size")
        if team_size is None:
            continue
        if not (MIN_TEAM_SIZE <= team_size <= MAX_TEAM_SIZE):
            continue
        name = c.get("name", "")
        slug = c.get("slug", "")
        url = c.get("url", f"https://www.ycombinator.com/companies/{slug}")
        loc = (c.get("all_locations") or "")[:80]
        linkedin = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote(name)}%20founder"
        out.append({
            "source": "YC",
            "company": name,
            "location": loc,
            "team_size": team_size,
            "url": url,
            "linkedin_search": linkedin,
        })
    return out


def parse_antler_html(html):
    """Extract company names and countries from Antler portfolio HTML."""
    # Pattern: ### Name or ## Name then description then country (e.g. "UK", "Germany")
    companies = []
    # Match blocks like "### Lovable" or "## Peec.ai" followed later by country name
    name_pattern = re.compile(r'###\s*([A-Za-z0-9\.\- ]+?)(?:\s*$|\n)', re.MULTILINE)
    # Also "## Name" style
    name_pattern2 = re.compile(r'##\s*([A-Za-z0-9\.\- ]+?)(?:\s*$|\n)', re.MULTILINE)
    country_pattern = re.compile(r'\n\n(Australia|Brazil|Canada|Denmark|Finland|France|Germany|India|Indonesia|Japan|Kenya|Korea|Malaysia|Netherlands|Nigeria|Norway|Saudi Arabia|Singapore|Sweden|UK|United Arab Emirates|US|Vietnam)\s*\n', re.IGNORECASE)
    seen = set()
    for m in name_pattern.finditer(html):
        name = m.group(1).strip()
        if len(name) < 2 or name in seen or name in ("Back", "Next", "Featured", "BROWSE OUR", "Load more"):
            continue
        seen.add(name)
        companies.append({"name": name, "location": ""})
    for m in name_pattern2.finditer(html):
        name = m.group(1).strip()
        if len(name) < 2 or name in seen or "—" in name or "Tag" == name:
            continue
        seen.add(name)
        companies.append({"name": name, "location": ""})
    # Try to attach country: find positions of company names and next country after
    for i, co in enumerate(companies):
        pos = html.find(co["name"])
        if pos == -1:
            continue
        chunk = html[pos:pos+800]
        mc = country_pattern.search(chunk)
        if mc:
            co["location"] = mc.group(1)
    return companies


def get_antler_companies():
    """Antler portfolio from HTML."""
    try:
        html = fetch_html(ANTLER_URL)
    except Exception as e:
        return [{"source": "Antler", "company": f"(fetch error: {e})", "location": "", "team_size": "", "url": ANTLER_URL, "linkedin_search": ""}]
    parsed = parse_antler_html(html)
    out = []
    for c in parsed:
        name = c["name"]
        loc = c.get("location", "")
        linkedin = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote(name)}%20Antler%20founder"
        out.append({
            "source": "Antler",
            "company": name,
            "location": loc,
            "team_size": "",  # not in HTML
            "url": ANTLER_URL,
            "linkedin_search": linkedin,
        })
    return out


def parse_techisland_html(html):
    """Extract company names from TechIsland members page."""
    # [visit website](https://...) then next block often has company name; or look for "visit website" and previous heading
    names = []
    # Pattern: link text like "visit website" and before that often company name in heading
    # Simpler: find all links to external sites that look like company sites
    for m in re.finditer(r'\[visit website\]\((https://[^\)]+)\)', html, re.I):
        url = m.group(1)
        # Get preceding text for name (often 1-2 lines before)
        start = max(0, m.start() - 300)
        chunk = html[start:m.start()]
        # Last line that looks like a name (Title Case or CamelCase)
        lines = [l.strip() for l in chunk.split("\n") if l.strip()]
        for line in reversed(lines):
            if 2 <= len(line) <= 80 and not line.startswith("http") and "visit" not in line.lower():
                names.append({"name": line[:80], "url": url})
                break
    # Alternative: look for ### Name or **Name** patterns before "visit website"
    if not names:
        for m in re.finditer(r'(?:^|\n)\*?\*?([A-Za-z0-9][A-Za-z0-9\.\-\s&]{2,60})\*?\*?\s*\n', html):
            name = m.group(1).strip()
            if "visit" in name.lower() or "website" in name.lower():
                continue
            names.append({"name": name, "url": ""})
    return names[:200]  # limit


def get_techisland_companies():
    """TechIsland members from HTML."""
    try:
        html = fetch_html(TECHISLAND_URL)
    except Exception as e:
        return [{"source": "TechIsland", "company": f"(fetch error: {e})", "location": "Cyprus", "team_size": "", "url": TECHISLAND_URL, "linkedin_search": ""}]
    parsed = parse_techisland_html(html)
    seen = set()
    out = []
    for c in parsed:
        name = c.get("name", "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        linkedin = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote(name)}%20Cyprus%20founder"
        out.append({
            "source": "TechIsland",
            "company": name,
            "location": "Cyprus",
            "team_size": "",
            "url": c.get("url") or TECHISLAND_URL,
            "linkedin_search": linkedin,
        })
    return out


def main():
    all_rows = []
    print("Fetching YC (hiring, team 1-50)...")
    yc = get_yc_companies()
    yc.sort(key=lambda x: x.get("team_size") or 0)
    all_rows.extend(yc)
    print(f"  YC: {len(yc)} companies")
    time.sleep(1)
    print("Fetching Antler portfolio...")
    antler = get_antler_companies()
    all_rows.extend(antler)
    print(f"  Antler: {len(antler)} companies")
    time.sleep(1)
    print("Fetching TechIsland members...")
    tech = get_techisland_companies()
    all_rows.extend(tech)
    print(f"  TechIsland: {len(tech)} companies")

    # CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["source", "company", "location", "team_size", "url", "linkedin_search"])
        w.writeheader()
        w.writerows(all_rows)
    print(f"Wrote {OUT_CSV}")

    # MD
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("# Компании из источников (YC, Antler, TechIsland)\n\n")
        f.write("Критерии: YC — hiring, team 1–50; Antler — портфель; TechIsland — Кипр.\n\n")
        f.write("| Source | Company | Location | Team size | URL | LinkedIn\n")
        f.write("|--------|---------|----------|-----------|-----|----------\n")
        for r in all_rows:
            ts = r.get("team_size") if r.get("team_size") != "" else "—"
            lnk = f"[Search]({r['linkedin_search']})" if r.get("linkedin_search") else "—"
            f.write(f"| {r['source']} | {r['company']} | {r['location'][:40]} | {ts} | [Link]({r['url']}) | {lnk}\n")
    print(f"Wrote {OUT_MD}")
    print(f"Total: {len(all_rows)} companies")


if __name__ == "__main__":
    main()
