"""Builds the Excel templates for the three browser tools, in the same style as the Build, Buy, or Partner and
Impact Score spreadsheets: a Start Here tab, the working tab(s) with the scoring built in, and a worked Example.

    node src/toolkits/sheets-data.mjs > /tmp/sheets.json
    python3 src/toolkits/make-sheets.py /tmp/sheets.json        writes assets/toolkits/*.xlsx
    python3 src/toolkits/make-sheets.py /tmp/sheets.json --check   also recalculates them with LibreOffice and checks
                                                                   the examples give the website's results

The questions, scoring rules and examples come from the tools' own *-core.js (via sheets-data.mjs), so the
spreadsheets and the website can't drift apart. Run both again after changing a tool, then rebuild the site
(python3 src/build.py), which puts the new files in the "Download everything" ZIP."""
import datetime
import json
import os
import subprocess
import sys
import tempfile

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as col
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
OUT = os.path.join(ROOT, "assets", "toolkits")

NAVY, SLATE, BLUE = "FF1A4584", "FF3E5573", "FF0000FF"
INPUT_FILL, CALC_FILL = "FFEAF7FC", "FFDCE7F7"
THIN = Side(style="thin", color="FFB8C7DC")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="top", wrap_text=True)

TAGLINE = "Product Advisory | Building Market Driven Products | productadvisory.co"
HELP = "Book a free 30 minute call: productadvisory.co/book | info@productadvisory.co | (727) 386-6815"
TERMS = ("Free to use and share for personal and internal business purposes. Please keep the Product Advisory branding. "
         "Not for resale. This tool supports decision making and is not legal, financial, or tax advice. Version 1.0, November 2026.")
COLORS = "Light cyan cells with blue text are yours to fill in. Light blue cells calculate for you. Do not type over them."
COPY = "In Google Sheets choose File, then Import, or open this file in Excel. Your copy is private to you."


def q(text):
    """A text value inside a formula."""
    return '"' + str(text).replace('"', '""') + '"'


# ---------------------------------------------------------------- styles
def title(ws, text, sub):
    ws["A1"] = text
    ws["A1"].font = Font(name="Arial", size=16, bold=True, color=NAVY)
    ws["A2"] = sub
    ws["A2"].font = Font(name="Arial", size=10, color=SLATE)


def head(c, text):
    c.value = text
    c.font = Font(name="Arial", size=10, bold=True, color="FFFFFFFF")
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = CENTER
    c.border = BOX


def label(c, text, wrap=True):
    c.value = text
    c.font = Font(name="Arial", size=10, bold=True, color=NAVY)
    c.alignment = WRAP if wrap else Alignment(vertical="top")


def note(c, text, italic=False):
    c.value = text
    c.font = Font(name="Arial", size=9 if italic else 10, italic=italic, color=SLATE)
    c.alignment = WRAP


def inp(c, value=None, center=False):
    c.value = value
    c.font = Font(name="Arial", size=10, color=BLUE)
    c.fill = PatternFill("solid", fgColor=INPUT_FILL)
    c.border = BOX
    c.alignment = CENTER if center else WRAP


def calc(c, formula, center=True, bold=False, fmt=None):
    c.value = formula
    c.font = Font(name="Arial", size=10, color=NAVY, bold=bold)
    c.fill = PatternFill("solid", fgColor=CALC_FILL)
    c.border = BOX
    c.alignment = CENTER if center else WRAP
    if fmt:
        c.number_format = fmt


def static(c, value, bold=False, center=False):
    c.value = value
    c.font = Font(name="Arial", size=10, bold=bold, color=NAVY if bold else "FF1F2937")
    c.alignment = CENTER if center else WRAP
    c.border = BOX


def widths(ws, ws_widths):
    for k, w in ws_widths.items():
        ws.column_dimensions[k].width = w


def start_here(wb, name, what, steps, extra):
    ws = wb.active
    ws.title = "Start Here"
    ws.sheet_view.showGridLines = False
    title(ws, name, TAGLINE)
    widths(ws, {"A": 22, "B": 100})
    rows = [("What this is", what)] + [("Step %d" % (i + 1), s) for i, s in enumerate(steps)] + extra + [
        ("Colors", COLORS), ("Make your own copy", COPY), ("Need help?", HELP), ("Terms", TERMS)]
    for i, (k, v) in enumerate(rows):
        label(ws.cell(4 + i, 1), k, wrap=False)
        note(ws.cell(4 + i, 2), v)
    return ws


def finish(wb, path):
    stamp = datetime.datetime(2026, 11, 16)
    wb.properties.creator = "Product Advisory"
    wb.properties.lastModifiedBy = "Product Advisory"
    wb.properties.created = stamp
    wb.properties.modified = stamp
    wb.save(path)


# ---------------------------------------------------------------- AI Readiness Checklist
def readiness(d, path):
    R = d["readiness"]
    area_name = {a["key"]: a["name"] for a in R["areas"]}
    lv = R["levels"]
    wb = Workbook()
    start_here(wb, "AI Readiness Checklist", (
        "A quick check of how ready your team is to use AI: 24 statements in six areas (strategy, data, people, process, "
        "tools and guardrails). You get a score from 0 to 100, your stage on the AI adoption journey, and what to do next."),
        ["On the Checklist tab, answer each statement for your team as it is today: Yes, Partly, No, or Not sure. "
         "Be honest: a No is more useful than a hopeful Yes.",
         "Each No, Partly and Not sure answer shows what to do about it in the last column.",
         "Open the Results tab for your score, your stage, and your weakest area. Start your next moves there.",
         "Open the Example tab to see a filled-in checklist. Re-run the checklist every quarter."],
        [("Scoring", "Yes is 2 points, Partly 1, No and Not sure 0. Each area is out of 8 points and the total out of 48, "
          "both shown as 0 to 100. Stages: 0 to 24 Start with you, 25 to 49 One use case, 50 to 74 Team traction, "
          "75 to 100 Org capability."),
         ("Online version", "Fill it in on the web, share a link, and save it: productadvisory.co/ai-readiness")])

    def checklist(ws, answers, first):
        widths(ws, {"A": 5, "B": 20, "C": 58, "D": 13, "E": 10, "F": 70})
        for h, t in zip("ABCDEF", ["#", "Area", "Statement", "Answer", "Points (of 2)", "What to do about it"]):
            head(ws[h + str(first - 1)], t)
        dv = DataValidation(type="list", formula1='"Yes,Partly,No,Not sure"', allow_blank=True,
                            error="Choose Yes, Partly, No, or Not sure.", errorTitle="Answer")
        ws.add_data_validation(dv)
        for i, it in enumerate(R["items"]):
            r = first + i
            static(ws.cell(r, 1), i + 1, center=True)
            static(ws.cell(r, 2), area_name[it["area"]], bold=True)
            static(ws.cell(r, 3), it["text"])
            inp(ws.cell(r, 4), answers[i] if answers else None, center=True)
            dv.add(ws.cell(r, 4))
            calc(ws.cell(r, 5), f'=IF(D{r}="Yes",2,IF(D{r}="Partly",1,IF(OR(D{r}="No",D{r}="Not sure"),0,"")))')
            calc(ws.cell(r, 6), f'=IF(OR(D{r}="",D{r}="Yes"),"",{q(it["fix"])})', center=False)
        rng = f"D{first}:D{first + len(R['items']) - 1}"
        for v, fill in [("Yes", "FFD7F0E4"), ("Partly", "FFFCEFD2"), ("No", "FFF8DCD3"), ("Not sure", "FFECEAF7")]:
            ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[q(v)], fill=PatternFill("solid", fgColor=fill)))
        ws.freeze_panes = ws.cell(first, 1)
        return first, first + len(R["items"]) - 1

    def stage(cell):
        return (f'IF({cell}>={lv[3]["min"]},{q(lv[3]["name"])},IF({cell}>={lv[2]["min"]},{q(lv[2]["name"])},'
                f'IF({cell}>={lv[1]["min"]},{q(lv[1]["name"])},{q(lv[0]["name"])})))')

    def stage_field(cell, field):
        return (f'IF({cell}>={lv[3]["min"]},{q(lv[3][field])},IF({cell}>={lv[2]["min"]},{q(lv[2][field])},'
                f'IF({cell}>={lv[1]["min"]},{q(lv[1][field])},{q(lv[0][field])})))')

    ws = wb.create_sheet("Checklist")
    title(ws, "Steps 1 and 2. Answer for your team as it is today",
          "Yes, Partly, No, or Not sure. Each answer that isn't Yes shows what to do about it.")
    label(ws["A3"], "Team")
    ws.merge_cells("B3:C3")
    inp(ws["B3"])
    a, b = checklist(ws, None, 6)

    ws = wb.create_sheet("Results")
    title(ws, "Step 3. Your results", "Calculated from the Checklist tab.")
    widths(ws, {"A": 26, "B": 16, "C": 14, "D": 14, "E": 60})
    for h, t in zip("ABCD", ["Area", "Answered (of 4)", "Points (of 8)", "Score (0-100)"]):
        head(ws[h + "4"], t)
    rngB, rngD, rngE = f"Checklist!$B${a}:$B${b}", f"Checklist!$D${a}:$D${b}", f"Checklist!$E${a}:$E${b}"
    for i, ar in enumerate(R["areas"]):
        r = 5 + i
        static(ws.cell(r, 1), ar["name"], bold=True)
        calc(ws.cell(r, 2), f'=COUNTIFS({rngB},A{r},{rngD},"?*")')
        calc(ws.cell(r, 3), f"=SUMIFS({rngE},{rngB},A{r})")
        calc(ws.cell(r, 4), f'=IF(B{r}=0,"",ROUND(C{r}/8*100,0))')
    t = 5 + len(R["areas"])
    static(ws.cell(t, 1), "Overall", bold=True)
    calc(ws.cell(t, 2), f"=SUM(B5:B{t - 1})", bold=True)
    calc(ws.cell(t, 3), f"=SUM(C5:C{t - 1})", bold=True)
    calc(ws.cell(t, 4), f'=IF(B{t}=0,"",ROUND(C{t}/48*100,0))', bold=True)
    calc(ws.cell(t, 5), f'=IF(AND(B{t}>0,B{t}<24),"Based on "&B{t}&" of 24 statements. Answer the rest for a full picture.","")', center=False)
    rows = [("Where you are", f'=IF(D{t}="","Answer a few statements to see your stage.",{stage("D" + str(t))})'),
            ("What it means", f'=IF(D{t}="","",{stage_field("D" + str(t), "text")})'),
            ("Your next step", f'=IF(D{t}="","",{stage_field("D" + str(t), "step")})'),
            ("Weakest area", f'=IF(B{t}=0,"",INDEX(A5:A{t - 1},MATCH(MIN(D5:D{t - 1}),D5:D{t - 1},0)))'),
            ("Not sure answers to find out", f'=COUNTIF({rngD},"Not sure")'),
            ("Your next moves", "=\"Start with the No and Not sure answers in your weakest area: each one has what to do in the last column of the Checklist tab.\"")]
    for i, (k, f) in enumerate(rows):
        r = t + 2 + i
        label(ws.cell(r, 1), k)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
        calc(ws.cell(r, 2), f, center=False, bold=(i == 0))
        ws.row_dimensions[r].height = 30
    j = t + 2 + len(rows) + 1
    label(ws.cell(j, 1), "The AI adoption journey")
    for h, tt in zip("ABCDE", ["Stage", "Score", "", "", "What it means, and the next step"]):
        if tt:
            head(ws[h + str(j + 1)], tt)
    for i, l in enumerate(lv):
        r = j + 2 + i
        static(ws.cell(r, 1), l["name"], bold=True)
        static(ws.cell(r, 2), f'{l["min"]} to {lv[i + 1]["min"] - 1 if i + 1 < len(lv) else 100}', center=True)
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=5)
        static(ws.cell(r, 3), l["text"] + " " + l["step"])
        ws.row_dimensions[r].height = 42

    ws = wb.create_sheet("Example")
    title(ws, "Worked example (sample answers)", "A software team at the start of its AI journey. All answers are illustrative.")
    label(ws["A3"], "Score")
    a2, b2 = a, b
    calc(ws["B3"], f"=ROUND(SUM(E{a2}:E{b2})/48*100,0)", bold=True)
    label(ws["C3"], "Stage")
    calc(ws["D3"], "=" + stage("B3"), bold=True)
    checklist(ws, R["example"], a2)
    finish(wb, path)


# ---------------------------------------------------------------- AI Use Case Prioritization
def usecases(d, path):
    U = d["usecases"]
    F = {f["key"]: f for f in U["factors"]}
    Q = U["quadrants"]
    B = U["blockers"]
    wb = Workbook()
    start_here(wb, "AI Use Case Prioritization", (
        "A fast way to decide which AI ideas to try first. Score each idea on five questions; the sheet ranks them, "
        "puts each in a quadrant (Quick win, Strategic bet, Easy experiment, Not now), names the next step, and picks "
        "your first pilot."),
        ["On the Use cases tab, list your AI ideas, one per row and as specific as you can: \"summarize support tickets "
         "for the weekly review\" beats \"AI for support\".",
         "Score each idea from 1 to 5 on the five questions. Risk if wrong is the only one where lower is better.",
         "Read the results to the right of each idea, and the first pilot at the top. Sort by Rank to see the order.",
         "Open the Example tab to see six scored ideas."],
        [("Scoring", "Value and feasibility run from 0 to 100. Feasibility is the average of data readiness, cost and effort, "
          "and team readiness. Priority is the average of value and feasibility, less 10 points for a risk of 4 and 20 for a "
          "risk of 5. High means 50 or more."),
         ("First pilot", "The best-ranked quick win without high risk (or, if every quick win is high risk, the best one)."),
         ("Online version", "Score your ideas on the web, see the map, and share a link: productadvisory.co/ai-use-cases")])

    def sheet(ws, rows, first):
        last = first + max(len(rows), U["max"]) - 1
        widths(ws, {"A": 42, "B": 11, "C": 11, "D": 11, "E": 11, "F": 12, "G": 11, "H": 12, "I": 11, "J": 7,
                    "K": 16, "L": 60, "M": 52, "N": 6})
        ws.merge_cells(start_row=first - 3, start_column=2, end_row=first - 3, end_column=6)
        ws.cell(first - 3, 2).value = "Score 1 to 5"
        ws.cell(first - 3, 2).font = Font(name="Arial", size=10, bold=True, color=NAVY)
        ws.cell(first - 3, 2).alignment = Alignment(horizontal="center")
        ws.merge_cells(start_row=first - 3, start_column=7, end_row=first - 3, end_column=13)
        ws.cell(first - 3, 7).value = "Results (calculated)"
        ws.cell(first - 3, 7).font = Font(name="Arial", size=10, bold=True, color=NAVY)
        ws.cell(first - 3, 7).alignment = Alignment(horizontal="center")
        heads = ["AI use case"] + [F[k]["name"] + (" (lower is better)" if F[k].get("cost") else "") for k in ["value", "data", "ease", "adoption", "risk"]] + \
                ["Value (0-100)", "Feasibility (0-100)", "Priority (0-100)", "Rank", "Where it lands", "Next step", "Guardrails", ""]
        for i, h in enumerate(heads[:13]):
            head(ws.cell(first - 2, i + 1), h)
        note(ws.cell(first - 1, 1), "One idea per row.", italic=True)
        for i, k in enumerate(["value", "data", "ease", "adoption", "risk"]):
            note(ws.cell(first - 1, i + 2), f'1 = {F[k]["lo"]}. 5 = {F[k]["hi"]}.', italic=True)
        ws.row_dimensions[first - 1].height = 52
        dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True,
                            error="Score from 1 to 5.", errorTitle="Score")
        ws.add_data_validation(dv)
        step = lambda k: q(Q[k]["step"])
        for i in range(last - first + 1):
            r = first + i
            row = rows[i] if i < len(rows) else None
            inp(ws.cell(r, 1), row[0] if row else None)
            for j in range(5):
                inp(ws.cell(r, 2 + j), row[1 + j] if row else None, center=True)
                dv.add(ws.cell(r, 2 + j))
            ok = f'OR($A{r}="",COUNT(B{r}:F{r})<5)'
            value, feas = f"(B{r}-1)/4*100", f"((C{r}-1)+(D{r}-1)+(E{r}-1))/12*100"
            calc(ws.cell(r, 7), f'=IF({ok},"",ROUND({value},1))')
            calc(ws.cell(r, 8), f'=IF({ok},"",ROUND({feas},1))')
            calc(ws.cell(r, 9), f'=IF({ok},"",ROUND(MAX(0,({value}+{feas})/2-IF(F{r}>=5,20,IF(F{r}>=4,10,0))),1))')
            calc(ws.cell(r, 10), f'=IF(ISNUMBER(I{r}),RANK(I{r},$I${first}:$I${last}),"")')
            calc(ws.cell(r, 11), f'=IF({ok},"",IF(AND({value}>=50,{feas}>=50),{q(Q["quick-win"]["name"])},IF({value}>=50,{q(Q["bet"]["name"])},'
                                f'IF({feas}>=50,{q(Q["easy"]["name"])},{q(Q["not-now"]["name"])}))))', bold=True)
            calc(ws.cell(r, 12), f'=IF(K{r}="","",IF(K{r}={q(Q["bet"]["name"])},IF(C{r}=MIN(C{r}:E{r}),{q(B["data"])},IF(D{r}=MIN(C{r}:E{r}),{q(B["ease"])},{q(B["adoption"])})),'
                                f'IF(K{r}={q(Q["quick-win"]["name"])},{step("quick-win")},IF(K{r}={q(Q["easy"]["name"])},{step("easy")},{step("not-now")}))))', center=False)
            calc(ws.cell(r, 13), f'=IF({ok},"",IF(F{r}>=4,{q(U["guardrails"])},""))', center=False)
            # helper for the first pilot: quick wins, low risk first, then priority, then value, then the earlier row
            c = ws.cell(r, 14)
            c.value = f'=IF(K{r}={q(Q["quick-win"]["name"])},IF(F{r}<4,2,1)*10000000+I{r}*10000+G{r}-ROW()/100000,"")'
            c.font = Font(name="Arial", size=8, color="FFBFBFBF")
        ws.column_dimensions["N"].hidden = True
        rng = f"K{first}:K{last}"
        for name, fill in [(Q["quick-win"]["name"], "FFD7F0E4"), (Q["bet"]["name"], "FFE3E4F8"), (Q["easy"]["name"], "FFFCEFD2"), (Q["not-now"]["name"], "FFEDEDED")]:
            ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[q(name)], fill=PatternFill("solid", fgColor=fill)))
        label(ws.cell(3, 1), "First pilot to run")
        ws.merge_cells(start_row=3, start_column=2, end_row=3, end_column=12)
        calc(ws.cell(3, 2), f'=IF(COUNT(N{first}:N{last})=0,"No quick wins yet. Look at your strategic bets: fix what blocks the best one.",'
                            f'INDEX(A{first}:A{last},MATCH(MAX(N{first}:N{last}),N{first}:N{last},0)))', center=False, bold=True)
        ws.freeze_panes = ws.cell(first, 2)

    ws = wb.create_sheet("Use cases")
    title(ws, "Steps 1 and 2. List your AI ideas and score them", "Score 1 to 5. Risk if wrong is the only question where lower is better.")
    sheet(ws, [], 8)
    ws = wb.create_sheet("Example")
    title(ws, "Worked example (sample ideas)", "Six AI ideas from a software company. All scores are illustrative.")
    sheet(ws, U["example"], 8)
    finish(wb, path)


# ---------------------------------------------------------------- Feature Prioritization Scorecard
def scorecard(d, path):
    S = d["scorecard"]
    tpl = S["templates"]["balanced"]["criteria"]
    nC, nF = S["maxCriteria"], S["maxFeatures"]
    wb = Workbook()
    start_here(wb, "Feature Prioritization Scorecard", (
        "Rank features with criteria you choose and weight, or with RICE (Reach, Impact, Confidence, Effort), and compare "
        "the two rankings, so your roadmap reflects your goals and not the loudest voice."),
        ["On the Weighted scoring tab, set your criteria (up to 8), weight each from 0 to 5, and say whether lower is "
         "better (a cost such as effort or risk). The six Balanced criteria are filled in to start.",
         "List your features (up to 30) and score each from 1 to 5 on every criterion. The score (0 to 100) and rank "
         "calculate as you go.",
         "Optional: on the RICE tab, add reach, impact, confidence and effort for the same features, and compare the "
         "RICE rank with the weighted rank. Where they disagree is worth a conversation.",
         "Open the Example tab to see five scored features."],
        [("Scoring", "A feature's score is its weighted average turned into 0 to 100: 100 means a 5 on every criterion "
          "(a 1 on the lower-is-better ones). RICE = reach x impact x confidence / effort."),
         ("Other criteria sets", "Customer-led: customer pain solved, number of customers affected, customer requests, "
          "confidence, effort. Growth: revenue impact, new customers, retention, time to value, effort, risk. "
          "ICE: impact, confidence, ease (all higher is better, weight 5)."),
         ("Online version", "Score your features on the web, compare RICE side by side, and share a link: productadvisory.co/scorecard")])

    impacts = ", ".join(f"{v:g} = {n}" for v, n in S["impacts"])
    confs = ", ".join(f"{v} = {n}" for v, n in S["confidences"])

    def weighted(ws, top, criteria, features):
        """Criteria in rows top..top+2, the feature table header at top+4, features from top+5. Returns (first, last)."""
        last_c = col(1 + nC)
        widths(ws, {"A": 34, **{col(2 + i): 13 for i in range(nC)}, col(2 + nC): 13, col(3 + nC): 8})
        label(ws.cell(top, 1), "Criterion")
        label(ws.cell(top + 1, 1), "Weight (0 to 5)")
        label(ws.cell(top + 2, 1), "Lower is better? (Yes for a cost such as effort or risk)")
        ws.row_dimensions[top + 2].height = 28
        dvw = DataValidation(type="whole", operator="between", formula1="0", formula2="5", allow_blank=True, error="Weight from 0 to 5.")
        dvy = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
        dvs = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True, error="Score from 1 to 5.")
        for dv in (dvw, dvy, dvs):
            ws.add_data_validation(dv)
        for i in range(nC):
            c = criteria[i] if i < len(criteria) else None
            inp(ws.cell(top, 2 + i), c["name"] if c else None, center=True)
            inp(ws.cell(top + 1, 2 + i), c["weight"] if c else None, center=True)
            inp(ws.cell(top + 2, 2 + i), ("Yes" if c["cost"] else "No") if c else None, center=True)
            dvw.add(ws.cell(top + 1, 2 + i))
            dvy.add(ws.cell(top + 2, 2 + i))
        h = top + 4
        head(ws.cell(h, 1), "Feature")
        for i in range(nC):
            calc(ws.cell(h, 2 + i), f'=IF({col(2 + i)}${top}="","",{col(2 + i)}${top})', bold=True)
        head(ws.cell(h, 2 + nC), "Score (0-100)")
        head(ws.cell(h, 3 + nC), "Rank")
        first, last = h + 1, h + nF
        names, weights, costs = f"$B${top}:${last_c}${top}", f"$B${top + 1}:${last_c}${top + 1}", f"$B${top + 2}:${last_c}${top + 2}"
        for i in range(nF):
            r = first + i
            f = features[i] if i < len(features) else None
            inp(ws.cell(r, 1), f["name"] if f else None)
            for j in range(nC):
                inp(ws.cell(r, 2 + j), (f["scores"][j] if f and j < len(f["scores"]) else None), center=True)
                dvs.add(ws.cell(r, 2 + j))
            sc = f"B{r}:{last_c}{r}"
            calc(ws.cell(r, 2 + nC), f'=IF($A{r}="","",IF(COUNT({sc})<COUNTA({names}),"Score every criterion",IF(SUM({weights})=0,"Add weights",'
                                    f'ROUND(SUMPRODUCT({weights},({sc}-1)+({costs}="Yes")*(6-2*{sc}))/(4*SUM({weights}))*100,1))))', bold=True)
            calc(ws.cell(r, 3 + nC), f'=IF(ISNUMBER({col(2 + nC)}{r}),RANK({col(2 + nC)}{r},${col(2 + nC)}${first}:${col(2 + nC)}${last}),"")')
        return first, last

    def rice(ws, top, src, src_first, src_last, data):
        """The RICE table: header at top, features from top+1, names taken from the weighted table."""
        widths(ws, {"A": 34, "B": 13, "C": 12, "D": 14, "E": 13, "F": 13, "G": 10, "H": 12})
        for i, t in enumerate(["Feature", "Reach (people per quarter)", "Impact", "Confidence (%)", "Effort (person-months)",
                               "RICE score", "RICE rank", "Weighted rank"]):
            head(ws.cell(top, 1 + i), t)
        dvi = DataValidation(type="list", formula1='"3,2,1,0.5,0.25"', allow_blank=True, error="Impact: 3, 2, 1, 0.5 or 0.25.")
        dvc = DataValidation(type="decimal", operator="between", formula1="0", formula2="100", allow_blank=True)
        dvr = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True)
        for dv in (dvi, dvc, dvr):
            ws.add_data_validation(dv)
        first = top + 1
        last = first + (src_last - src_first)
        rank_col = col(3 + nC)
        for i in range(src_last - src_first + 1):
            r, s = first + i, src_first + i
            calc(ws.cell(r, 1), f'=IF({src}A{s}="","",{src}A{s})', center=False, bold=True)
            x = data[i] if data and i < len(data) else None
            for j, k in enumerate(["reach", "impact", "confidence", "effort"]):
                inp(ws.cell(r, 2 + j), x["rice"][k] if x else None, center=True)
            dvr.add(ws.cell(r, 2)); dvi.add(ws.cell(r, 3)); dvc.add(ws.cell(r, 4)); dvr.add(ws.cell(r, 5))
            v = f"B{r}*C{r}*D{r}/100/E{r}"
            calc(ws.cell(r, 6), f'=IF(OR(A{r}="",COUNT(B{r}:E{r})<4),"",IF(E{r}<=0,"",IF({v}>=100,ROUND({v},0),ROUND({v},1))))', bold=True)
            calc(ws.cell(r, 7), f'=IF(ISNUMBER(F{r}),RANK(F{r},$F${first}:$F${last}),"")')
            calc(ws.cell(r, 8), f'=IF(A{r}="","",{src}{rank_col}{s})')
        ws.conditional_formatting.add(f"G{first}:G{last}", FormulaRule(formula=[f'AND(ISNUMBER(G{first}),ISNUMBER(H{first}),G{first}<>H{first})'],
                                                                       fill=PatternFill("solid", fgColor="FFFCEFD2")))
        return first, last

    crit = [{"name": c[0], "weight": c[1], "cost": c[2]} for c in tpl]
    ws = wb.create_sheet("Weighted scoring")
    title(ws, "Steps 1 and 2. Set your criteria, then score each feature", "Weights from 0 to 5. Scores from 1 to 5, where 5 is best (or, for a lower-is-better criterion, 5 is the most cost or risk).")
    wf, wl = weighted(ws, 4, crit, [])
    ws.freeze_panes = ws.cell(wf, 2)

    ws = wb.create_sheet("RICE")
    title(ws, "Step 3 (optional). Rank the same features with RICE", f"Impact: {impacts}. Confidence: {confs}. Feature names come from the Weighted scoring tab. Highlighted ranks differ from the weighted rank.")
    rf, rl = rice(ws, 4, "'Weighted scoring'!", wf, wl, None)
    ws.freeze_panes = ws.cell(rf, 2)

    ex = S["example"]
    ws = wb.create_sheet("Example")
    title(ws, "Worked example (sample features)", "The Balanced criteria and five features from a software product. All scores are illustrative.")
    ef, el = weighted(ws, 4, ex["criteria"], ex["features"])
    label(ws.cell(el + 2, 1), "The same features ranked with RICE")
    rice(ws, el + 3, "", ef, el, ex["features"])
    finish(wb, path)


# ---------------------------------------------------------------- check: recalculate with LibreOffice, compare with the website
def check(d, paths):
    tmp = tempfile.mkdtemp()
    subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx", "--outdir", tmp] + list(paths.values()),
                   check=True, capture_output=True)
    get = lambda name: load_workbook(os.path.join(tmp, os.path.basename(paths[name])), data_only=True)
    bad = []

    wb = get("ready")
    ex, exp = wb["Example"], d["readiness"]["expected"]
    if ex["B3"].value != exp["score"] or ex["D3"].value != exp["level"]:
        bad.append(f"readiness example: {ex['B3'].value} {ex['D3'].value} vs {exp['score']} {exp['level']}")
    res = wb["Results"]
    if res["D11"].value not in (None, ""):
        bad.append("readiness: a blank checklist should have no score, got " + repr(res["D11"].value))

    wb = get("cases")
    ex = wb["Example"]
    for i, e in enumerate(d["usecases"]["expected"]["rows"]):
        r = 8 + i
        got = (ex.cell(r, 7).value, ex.cell(r, 8).value, ex.cell(r, 9).value, ex.cell(r, 10).value, ex.cell(r, 11).value, ex.cell(r, 12).value, ex.cell(r, 13).value or "")
        want = (e["value"], e["feasibility"], e["priority"], e["rank"], e["quadrant"], e["step"], e["guardrails"])
        if [str(x) for x in got] != [str(x) if not isinstance(x, float) or x != int(x) else str(int(x)) for x in want] and \
                any((isinstance(a, (int, float)) and abs(a - b) > 1e-9) or (not isinstance(a, (int, float)) and a != b) for a, b in zip(got, want)):
            bad.append(f"use case {e['name']}: {got} vs {want}")
    if ex["B3"].value != d["usecases"]["expected"]["pilot"]:
        bad.append(f"first pilot: {ex['B3'].value} vs {d['usecases']['expected']['pilot']}")

    wb = get("score")
    ex = wb["Example"]
    nC = d["scorecard"]["maxCriteria"]
    for i, e in enumerate(d["scorecard"]["expected"]["weighted"]):
        r = 9 + i
        if (ex.cell(r, 2 + nC).value, ex.cell(r, 3 + nC).value) != (e["score"], e["rank"]):
            bad.append(f"weighted {e['name']}: {ex.cell(r, 2 + nC).value} #{ex.cell(r, 3 + nC).value} vs {e['score']} #{e['rank']}")
    top = 9 + d["scorecard"]["maxFeatures"] - 1 + 3 + 1
    for i, e in enumerate(d["scorecard"]["expected"]["rice"]):
        r = top + i
        if (ex.cell(r, 6).value, ex.cell(r, 7).value) != (e["score"], e["rank"]):
            bad.append(f"rice {e['name']}: {ex.cell(r, 6).value} #{ex.cell(r, 7).value} vs {e['score']} #{e['rank']}")
    blank = wb["Weighted scoring"]
    if blank.cell(9, 2 + nC).value not in (None, ""):
        bad.append("scorecard: an empty row should have no score")
    return bad


if __name__ == "__main__":
    data = json.load(open(sys.argv[1]))
    paths = {"ready": os.path.join(OUT, "ai-readiness-checklist.xlsx"),
             "cases": os.path.join(OUT, "ai-use-case-prioritization.xlsx"),
             "score": os.path.join(OUT, "feature-prioritization-scorecard.xlsx")}
    readiness(data, paths["ready"])
    usecases(data, paths["cases"])
    scorecard(data, paths["score"])
    print("wrote", ", ".join(os.path.basename(p) for p in paths.values()))
    if "--check" in sys.argv:
        problems = check(data, paths)
        print("\n".join(problems) if problems else "the examples give the website's results")
        sys.exit(1 if problems else 0)
