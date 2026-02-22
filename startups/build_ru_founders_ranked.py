#!/usr/bin/env python3
"""
Build RU-founders-only list, sorted by probability of getting in.
Sort: Ver (desc), Cyprus=да first, VC before Стартап.
Add column: Почему вероятно зайти.
Reads from MD (full 100 rows).
"""
import csv
import os
import re

MD_IN = os.path.join(os.path.dirname(__file__), "100_Russian_Founders_Global_LinkedIn_Intros.md")
CSV_OUT = os.path.join(os.path.dirname(__file__), "RU_Founders_Only_Ranked_By_Probability.csv")
MD_OUT = os.path.join(os.path.dirname(__file__), "RU_Founders_Only_Ranked_By_Probability.md")

def why_score(ver, cyprus, typ):
    """Short reason for probability."""
    v = int(ver) if str(ver).isdigit() else 0
    c = (cyprus or "").strip().lower() == "да"
    vc = (typ or "").strip().lower() == "vc"
    parts = []
    if v >= 9:
        parts.append("маленькая команда / ранняя стадия")
    if c:
        parts.append("Кипр → релокация")
    if vc:
        parts.append("VC → скаутинг/BD в тему")
    if v >= 8 and not vc:
        parts.append("продукт глобал, фаундер по имени")
    if not parts:
        parts.append("русскоязычный контекст")
    return "; ".join(parts[:3])

def parse_md_table(path):
    """Parse MD table into list of dicts. Columns: #, Company, Type, Cyprus, Founder, LinkedIn, Ver., Intro."""
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip().startswith("|") or "---" in line or "Company" in line:
                continue
            cells = [c.strip() for c in line.split("|")]
            if len(cells) < 9:
                continue
            # cells[0] empty, 1=#, 2=Company, 3=Type, 4=Cyprus, 5=Founder, 6=LinkedIn, 7=Ver, 8=Intro
            linkedin = cells[6]
            url_match = re.search(r'\((https://[^\)]+)\)', linkedin)
            linkedin_url = url_match.group(1) if url_match else ""
            company = cells[2]
            ver = cells[7]
            if not company or company == "Company" or not ver.strip().isdigit():
                continue
            rows.append({
                "Company": company,
                "Type": cells[3],
                "Cyprus": cells[4],
                "Founder": cells[5],
                "LinkedIn_URL": linkedin_url,
                "Ver": ver.strip(),
                "Intro": cells[8],
            })
    return rows

def main():
    rows = parse_md_table(MD_IN)
    for r in rows:
        r["Ver"] = (r.get("Ver") or "0").strip()
        r["Cyprus"] = (r.get("Cyprus") or "").strip()
        r["Type"] = (r.get("Type") or "").strip()
    # Sort: Ver desc, Cyprus да first, VC first
    def key(r):
        v = int(r["Ver"]) if r["Ver"].isdigit() else 0
        c = 0 if r["Cyprus"] == "да" else 1
        t = 0 if "VC" in (r.get("Type") or "") else 1
        return (-v, c, t)
    rows.sort(key=key)
    # Add rank and why
    for i, r in enumerate(rows, 1):
        r["Rank"] = i
        r["Why"] = why_score(r["Ver"], r["Cyprus"], r["Type"])
    # CSV out
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["Rank", "Company", "Type", "Cyprus", "Founder", "Ver", "Why", "LinkedIn_URL", "Intro"]
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})
    # MD out
    with open(MD_OUT, "w", encoding="utf-8") as f:
        f.write("# Только RU-фаундеры: ранжирование по вероятности зайти\n\n")
        f.write("**Критерии отбора:** русскоязычный фаундер, глобальный продукт/фонд, VC или небольшой стартап.\n\n")
        f.write("**Сортировка:** сначала максимальная вероятность (Ver 10), затем Кипр (релокация), затем VC (под твой фокус). Ранг 1 = куда реалистичнее всего зайти в первую очередь.\n\n")
        f.write("| Ранг | Компания | Тип | Кипр | Вер. | Почему вероятно зайти | LinkedIn | Интро\n")
        f.write("|------|----------|-----|------|------|------------------------|----------|------\n")
        for r in rows:
            lnk = f"[Search]({r.get('LinkedIn_URL','')})" if r.get("LinkedIn_URL") else "—"
            intro_short = (r.get("Intro") or "")[:60] + "…" if len(r.get("Intro") or "") > 60 else (r.get("Intro") or "—")
            f.write(f"| {r['Rank']} | {r.get('Company','')} | {r.get('Type','')} | {r.get('Cyprus','')} | {r.get('Ver','')} | {r.get('Why','')} | {lnk} | {intro_short}\n")
        f.write("\n---\n\n**Как пользоваться:** начинай с Ранга 1–20 (Ver 9–10, Кипр и VC в приоритете). Полное интро — в файле `100_Russian_Founders_Global_LinkedIn_Intros.md`.\n")
    print(f"Wrote {CSV_OUT} and {MD_OUT} with {len(rows)} companies (RU founders only, ranked).")

if __name__ == "__main__":
    main()
