#!/usr/bin/env python3
"""
Builds the ALS knowledge base (src/data/guideline/als-2025.json) from the
ERC Guidelines 2025 Adult Advanced Life Support PDF.

Usage:
    python3 -I scripts/build_guideline_als.py [path/to/ALS.pdf]

Default PDF path: source/ERC-2025-ALS.pdf (gitignored). Requires `pypdfium2` and
`pdfplumber` (pip3 install pypdfium2 pdfplumber).

Unlike the BLS script (hand-picked start/end markers), the ALS guideline is cut
automatically along its own section headings: the heading fonts are read with
pdfplumber, the running text comes from the pdfium text layer. Each (sub)section
becomes one passage; long sections are split into parts at sentence boundaries.
Figures without a text layer (key messages, ALS algorithm, in-hospital algorithm,
peri-arrest algorithms) are transcribed by hand in FIGURES (checked against the
rendered pages).
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = ROOT / "source" / "ERC-2025-ALS.pdf"
OUT = ROOT / "src" / "data" / "guideline" / "als-2025.json"

SOURCE = {
    "title": "European Resuscitation Council Guidelines 2025 Adult Advanced Life Support",
    "short": "ERC Guidelines 2025 – Adult ALS",
    "journal": "Resuscitation 215 (2025) 110769",
    "doi": "10.1016/j.resuscitation.2025.110769",
    "authors": "Soar J, Böttiger BW, Carli P, et al.",
}

LAST_PAGE = 41  # "Disclosures" – references follow
FIGURE_PAGES = {3, 4, 5, 14}  # Table 1 (pp. 3–4, own passage), Fig. 2 (p. 5), Fig. 3 (p. 14)
MAX_PART = 3200  # characters per passage part

# font signature → heading level (read from the PDF)
HEADING_FONTS = {
    ("AdvPSHEL-BO", 8.5): 2,  # bold-oblique: section
    ("AdvPSHEL-O", 8.5): 3,  # oblique: subsection
}
SECTION_LABELS = {"Concise guidelines for clinical practice": "concise", "Evidence informing the guidelines": "evidence"}

FIGURES = [
    {
        "id": "als-fig1-key-messages", "section": "Figures", "title": "Fig. 1 – Advanced life support – Key messages",
        "kind": "figure", "page": 2,
        "text": "Adult advanced life support key messages: Start advanced life support early - every second counts! Ensure effective ventilation and high-quality chest compressions. Defibrillate early for shockable rhythms: use correct antero-lateral defibrillator pad placement; switch to antero-posterior pads if 3 shocks are ineffective. Give IV adrenaline early for non-shockable cardiac arrests. Identify and treat reversible causes without delay.",
    },
    {
        "id": "als-fig2-algorithm", "section": "Figures", "title": "Fig. 2 – Advanced Life Support algorithm",
        "kind": "figure", "page": 5,
        "text": "Unresponsive with absent or abnormal breathing → Start CPR 30:2. Attach defibrillator / monitor. Call EMS / resuscitation team → ASSESS RHYTHM. Shockable (VF / pulseless VT) → 1 Shock, Drugs* → Immediately resume chest compressions for 2 minutes. Non-shockable (PEA, Asystole) → Give adrenaline every 3-5 minutes → Immediately resume chest compressions for 2 minutes. Then assess rhythm again. ROSC. Throughout: Give high-quality chest compressions & ventilation. Identify & treat reversible causes. During CPR: Ensure optimal defibrillator pad placement. Give oxygen. Continuous compressions if tracheal tube or supraglottic airway. Use waveform capnography. Minimise interruptions to chest compressions. Early IV access (IO if IV not possible). *Drugs: Give 1st adrenaline after 3 shocks, then every 3-5 minutes. Give amiodarone after 3 shocks. Consider: Changing pads to antero-posterior after 3 shocks. Mechanical chest compressions to facilitate transfer / treatment. Ultrasound to identify reversible causes. Extracorporeal CPR and, or Coronary angiography/percutaneous coronary intervention. Immediately after ROSC: Use ABCDE approach. Aim for SpO2 of 94-98% and normal PaCO2. Aim SBP > 100 mmHg. 12 Lead ECG. Identify and treat cause. Temperature control. Reversible causes: Hypoxia. Hypovolaemia. Hyper-hypokalaemia / metabolic. Hypothermia, hyperthermia. Toxins. Tamponade (cardiac). Tension pneumothorax. Thrombosis (coronary / pulmonary).",
    },
    {
        "id": "als-fig3-inhospital", "section": "Figures", "title": "Fig. 3 – In-hospital resuscitation algorithm",
        "kind": "figure", "page": 14,
        "text": "Collapsed / sick patient → Call for help and assess patient → Signs of life? Check for responsiveness and normal breathing. Experienced ALS providers may simultaneously check carotid pulse and (if already in place) ECG / continuous arterial BP / ETCO2. NO or any doubt → CARDIAC ARREST → CALL, COMPRESS, COLLECT*: Call for help. Start chest compressions. Call resuscitation team. Collect resuscitation equipment → HIGH-QUALITY CPR*: Give high-quality CPR with oxygen and airway adjuncts*. Switch compressor at every rhythm assessment → DEFIBRILLATION*: As soon as available, apply pads / turn on AED and follow prompts. Attempt defibrillation if indicated** → ADVANCED LIFE SUPPORT: When sufficient skilled personnel are present → HANDOVER to resuscitation team using SBAR format. YES → MEDICAL EMERGENCY → CALL AND COLLECT*: Call resuscitation / medical emergency team if needed. Collect resuscitation equipment → ASSESS*: ABCDE assessment - recognise and treat. Give high-flow oxygen (titrate to SpO2 when able). Attach monitoring. Obtain IV access. Consider call for resuscitation / medical emergency team (if not already called) → HANDOVER to resuscitation team using SBAR format. *Undertake actions concurrently if sufficient staff available. **Use a manual defibrillator if trained and device available. Maintain personal safety.",
    },
    {
        "id": "als-fig8-tachy", "section": "Figures", "title": "Fig. 8 – Peri-arrest Tachyarrhythmia Algorithm",
        "kind": "figure", "page": 37,
        "text": "Assess with ABCDE approach: Monitor SpO2, ECG, BP. Give oxygen if SpO2 < 94% and obtain IV access. Record 12-lead ECG. Identify and treat reversible causes. Life-threatening features? Shock. Syncope with severe or ongoing hypotension. Myocardial ischaemia. Severe heart failure with pulmonary oedema or shock. Or immediately after ROSC. YES → UNSTABLE: Synchronised shock: Up to 3 attempts. Sedation / anaesthesia if conscious. If unsuccessful: Amiodarone 300 mg IV over 10-20 min, or Procainamide 10-15 mg kg-1 (max 1g) over 20 min. Repeat synchronised shock. NO → STABLE: Evaluate QRS. Broad (≥ 0.12 s) Irregular – possible actions include: Atrial fibrillation with pre-excitation: Procainamide or cardioversion. Polymorphic VT with QT prolongation: Give Mg2+ 8 mmol IV over 10 min. Consider Isoprenaline or temporary pacing to increase HR. Avoid Amiodarone. Broad Regular: Known VT, vagal manoeuvres and adenosine fail, uncertain mechanism of arrhythmia or known or suspected heart disease: If high sedation / anaesthesia risk, give Procainamide 10-15 mg kg-1 over 20 min. If Procainamide unavailable or contraindicated (e.g. severe HF, acute MI or end-stage renal disease), give Amiodarone 300 mg IV over 10-60 min, then 900 mg over 24 h. Narrow (< 0.12 s) Regular: Vagal manoeuvres. If ineffective: Adenosine (if no preexcitation) 6 mg rapid IV bolus, if unsuccessful give 12 mg, if unsuccessful give 18 mg. If ineffective: Verapamil or Beta-blocker. If ineffective: synchronised shock. Narrow Irregular – Probable atrial fibrillation: EF > 40%: Control rate with a Beta-blocker, Verapamil, Diltiazem, or Digoxin. EF < 40%: Consider Beta-blocker or Digoxin. Anticoagulate if duration of the arrhythmia > 24 h. Synchronised shock: Sedation / anaesthesia if conscious. This part of the algorithm does not address every possible scenario. Seek expert help. This algorithm is for peri-arrest tachyarrhythmia of abnormal origin. It is not for sinus tachycardia where the underlying cause should be treated - do not try to normalise the heart rate in sinus tachycardia with antiarrhythmic medication or synchronised cardioversion. Seek expert help if the tachyarrhythmia and, or life-threatening features persist.",
    },
    {
        "id": "als-fig9-brady", "section": "Figures", "title": "Fig. 9 – Bradycardia Algorithm",
        "kind": "figure", "page": 38,
        "text": "ASSESS with ABCDE approach. Monitor SpO2, ECG, BP. Give oxygen if SpO2 < 94% and obtain IV access. Record 12 lead ECG. Identify and treat reversible causes (e.g. myocardial infarction or electrolyte abnormalities). Life-threatening features? 1. Shock 2. Syncope 3. Myocardial ischaemia 4. Severe heart failure. Or immediately after ROSC. YES → Atropine 500 mcg IV → Satisfactory response? NO → Consider interim measures: Atropine 500 mcg IV, repeat to maximum of 3 mg. Isoprenaline 5 mcg min-1 IV. Adrenaline 2-10 mcg min-1 IV. Alternative drugs* and / or Transcutaneous pacing → Seek expert help. Arrange transvenous pacing. Satisfactory response YES, or no life-threatening features → Risk of asystole? Recent asystole. Mobitz II atrio-ventricular block. Complete heart block with broad QRS. Ventricular pause > 3s. YES → interim measures; NO → Observe. *Alternatives include: Aminophylline. Dopamine. Glucagon (if bradycardia is caused by beta-blocker or calcium channel blocker). Glycopyrrolate (may be used instead of Atropine).",
    },
]


def clean_page(t: str) -> str:
    t = t.replace("\r", "\n")
    t = re.sub("([A-Za-z]+)￾\\s*([A-Za-z]+)", lambda m: m.group(1) + m.group(2), t)  # line-break hyphenation
    t = re.sub("￾\\s*", "", t)
    t = re.sub(r"R E S U S C I T A T I O N 2 1 5 \( 2 0 2 5 \) 1 1 0 7 6 9", " ", t)
    t = re.sub(r"(?m)^\s*\d{0,2}\s*RESUSCITATION 215 \(2025\) 110769\s*\d{0,2}\s*$", " ", t)
    t = re.sub(r"RESUSCITATION 215 \(2025\) 110769", " ", t)
    # superscript minus lost in extraction
    t = re.sub(r"\bmin\s1\b", "min⁻¹", t)
    t = re.sub(r"\bkg\s1\b", "kg⁻¹", t)
    t = re.sub(r"(\d)\s?lg\b", r"\1 µg", t)  # µ is extracted as "l"
    return re.sub(r"\s+", " ", t).strip() + " "


def strip_citations(s: str) -> str:
    # reference numbers glued to the preceding word/punctuation ("arrest.11 ", "studies143–148 ")
    pattern = re.compile(r"(?<=[A-Za-z\)\]’”%])([.,;:]?)(\d{1,3}[a-z]?(?:\s?[,–-]\s?\d{1,3}[a-z]?)*)(?=[\s.,;:)]|$)")
    s = re.sub(r"\b(ETCO|SpO|PaCO|CO|H|Mg)(2)", r"\1§\2", s)  # protect chemical subscripts
    s = pattern.sub(lambda m: m.group(1), s)
    s = re.sub(r"\b((?:19|20)\d\d)\.\d{1,3}[a-z]?(?=\s)", r"\1.", s)
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    s = pattern.sub(lambda m: m.group(1), s)
    s = s.replace("§", "")
    s = re.sub(r"\s{2,}", " ", s).replace("( ", "(").replace(" )", ")")
    return s.strip()


def headings(pdf_path: Path) -> list[tuple[int, int, str]]:
    """(page, level, text) for section and subsection headings – level 1 = part label."""
    out = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for i, pg in enumerate(pdf.pages[:LAST_PAGE]):
            if i + 1 in FIGURE_PAGES:
                continue
            words = pg.extract_words(extra_attrs=["fontname", "size"], keep_blank_chars=True, x_tolerance=1.5)
            cur, buf = None, []

            def flush():
                if cur and buf:
                    txt = re.sub(r"\s+", " ", " ".join(buf)).strip()
                    out.append((i + 1, cur, txt))

            for w in words:
                font = w["fontname"].split("+")[-1]
                lvl = HEADING_FONTS.get((font, round(w["size"], 1)))
                if lvl is None and font == "AdvPSHV-BL" and round(w["size"], 1) == 9.5 and not w["text"].strip().isdigit():
                    lvl = 1
                if lvl != cur:
                    flush()
                    cur, buf = lvl, []
                if lvl:
                    buf.append(w["text"])
            flush()
    return out


def slug(s: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:48]


def split_parts(body: str) -> list[str]:
    if len(body) <= MAX_PART:
        return [body]
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z‘“(])", body)
    parts, cur = [], ""
    for snt in sentences:
        if cur and len(cur) + len(snt) > MAX_PART:
            parts.append(cur.strip())
            cur = ""
        cur += snt + " "
    if cur.strip():
        parts.append(cur.strip())
    return parts


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.exists():
        sys.exit(f"PDF not found: {pdf_path}")
    pdf = pdfium.PdfDocument(str(pdf_path))
    raw = [pdf[i].get_textpage().get_text_range() for i in range(LAST_PAGE)]

    # running text with page offsets (figure/table pages left out)
    text, starts = "", []
    for i, t in enumerate(raw):
        starts.append(len(text))
        if i + 1 in FIGURE_PAGES:
            continue
        text += clean_page(t)
    starts.append(len(text))
    cut = text.find("Disclosures ")
    if cut > 0:
        text = text[:cut]

    def page_at(off: int) -> int:
        p = 1
        for i, s in enumerate(starts[:-1]):
            if s <= off:
                p = i + 1
        return p

    def find_on_page(h: str, page: int, after: int) -> int:
        words = [re.escape(w) for w in re.split(r"[\s-]+", h.rstrip(".").strip()) if w]
        rx = re.compile(r"[\s-]*".join(words))
        for m in rx.finditer(text, after):
            if page_at(m.start()) == page:
                return m.start()
        return -1

    found = []  # (offset, end, level, title)
    errors = []
    for page, lvl, h in headings(pdf_path):
        if lvl == 1 and h not in SECTION_LABELS:
            continue
        if lvl == 3 and h.endswith("."):
            continue  # run-in paragraph heading – stays inside the text
        if h.startswith("Ventilation Ventilation"):
            h = "Ventilation"
        if h.startswith("Other drugs"):
            h = "Other drugs"
        off = find_on_page(h, page, 0)
        if off < 0:
            errors.append(f"heading not found on p.{page}: {h!r}")
            continue
        m = re.match(r"[\s\S]*?" + r"[\s-]*".join(re.escape(w) for w in re.split(r"[\s-]+", h.strip()) if w), text[off:])
        found.append((off, off + (m.end() if m else len(h)), lvl, h))
    found.sort()

    out = []
    part_label = "concise"
    h2 = ""
    used = set()
    for k, (off, end, lvl, h) in enumerate(found):
        if lvl == 1:
            part_label = SECTION_LABELS[h]
            continue
        if lvl == 2:
            h2 = h
        nxt = found[k + 1][0] if k + 1 < len(found) else len(text)
        body = strip_citations(text[end:nxt])
        if len(body) < 40:
            continue
        title = h if lvl == 2 else f"{h2} – {h}"
        base = ("als-rec-" if part_label == "concise" else "als-ev-") + slug(title)
        pid = base
        n = 2
        while pid in used:
            pid = f"{base}-{n}"
            n += 1
        used.add(pid)
        section = "Concise guidelines" if part_label == "concise" else "Evidence informing the guidelines"
        kind = "recommendation" if part_label == "concise" else "evidence"
        parts = split_parts(body)
        for j, ptxt in enumerate(parts):
            out.append({
                "id": pid if j == 0 else f"{pid}-p{j + 1}",
                "section": section,
                "title": title if len(parts) == 1 else f"{title} ({j + 1}/{len(parts)})",
                "kind": kind,
                "page": page_at(off),
                "text": ptxt,
            })

    # Table 1 has a text layer (two columns interleaved) – keep it as one reference passage
    t1 = strip_citations(clean_page(raw[2]) + clean_page(raw[3]))
    t1 = t1[t1.find("Table 1"):] if "Table 1" in t1 else t1
    for j, ptxt in enumerate(split_parts(t1)):
        out.append({"id": "als-table1-whats-new" + ("" if j == 0 else f"-p{j + 1}"), "section": "Figures",
                    "title": "Table 1 – What’s new in the ERC Guidelines 2025 adult ALS" + (f" ({j + 1})" if j else ""),
                    "kind": "figure", "page": 3, "text": ptxt})
    out.extend(dict(f) for f in FIGURES)

    if errors:
        print("\n".join(errors), file=sys.stderr)
    order = {"recommendation": 0, "figure": 1, "evidence": 2}
    out.sort(key=lambda p: (order[p["kind"]], p["page"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": SOURCE, "passages": out}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(out)} passages, {sum(len(p['text']) for p in out)} chars → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
