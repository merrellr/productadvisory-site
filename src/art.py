"""Page-head illustrations: navy line art, one cyan accent, drawn in on load (CSS classes in site.css .net)."""
import math
from parts import ICON


def _line(x1, y1, x2, y2, d, cls="draw"):
    ln = int(math.hypot(x2 - x1, y2 - y1)) + 2
    return f'<line class="{cls}" style="--len:{ln};--d:{d:.2f}s" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'


def path_art():
    """Home: scattered guesses settle into one path, Discover > Design > Build > Launch, with the dot travelling it."""
    noise = [(30, 70), (90, 40), (70, 120), (150, 60), (200, 30), (120, 250), (220, 260), (300, 250), (330, 150), (250, 110), (380, 210)]
    links = [(0, 1), (1, 3), (2, 0), (3, 4), (2, 5), (5, 6), (6, 7), (7, 10), (8, 9), (9, 4), (3, 9)]
    out = ['<g class="noise">']
    for n, (a, b) in enumerate(links):
        (x1, y1), (x2, y2) = noise[a], noise[b]
        out.append(_line(x1, y1, x2, y2, 0.05 * n))
    for n, (x, y) in enumerate(noise):
        out.append(f'<circle class="node pop" style="--d:{0.2 + 0.04 * n:.2f}s" cx="{x}" cy="{y}" r="4.5"/>')
    out.append("</g>")
    d = "M40 232 C 90 232, 110 168, 150 168 S 220 196, 262 190 S 340 96, 372 78"
    out.append(f'<path id="pa-route" class="route draw" style="--len:420;--d:.7s" d="{d}"/>')
    stops = [(40, 232, "Discover", "start", 0, 26), (150, 168, "Design", "middle", 0, 30), (262, 190, "Build", "middle", 0, 30), (372, 78, "Launch", "end", 0, -18)]
    for i, (x, y, label, anchor, dx, dy) in enumerate(stops):
        if i == len(stops) - 1:
            out.append(f'<circle class="ring" cx="{x}" cy="{y}" r="11"/><circle class="hot pop" style="--d:2.1s" cx="{x}" cy="{y}" r="11"/>')
        else:
            out.append(f'<circle class="node stop pop" style="--d:{1.0 + 0.3 * i:.2f}s" cx="{x}" cy="{y}" r="8"/>')
        out.append(f'<text class="lbl pop" style="--d:{1.1 + 0.3 * i:.2f}s" x="{x + dx}" y="{y + dy}" text-anchor="{anchor}">{label}</text>')
    out.append(f'<circle class="traveler" r="5" style="offset-path:path(\'{d}\')"/>')
    return f'<svg class="net art-path" viewBox="0 0 410 290" role="img" aria-label="From scattered guesses to one clear path: Discover, Design, Build, Launch">{"".join(out)}</svg>'


def orbit():
    """Services: the seven services circle the client's product."""
    names = [("strategy", "Strategy"), ("lifecycle", "Lifecycle"), ("ai", "AI"), ("research", "Research"), ("agile", "Agile"), ("coaching", "Coaching"), ("assess", "Assessments")]
    cx, cy, R = 200, 150, 112
    out = [f'<circle class="orbit-ring draw" style="--len:710;--d:.1s" cx="{cx}" cy="{cy}" r="{R}"/>']
    out.append(f'<circle class="ring" cx="{cx}" cy="{cy}" r="30"/><circle class="core pop" style="--d:.4s" cx="{cx}" cy="{cy}" r="30"/>')
    out.append(f'<text class="lbl core-lbl pop" style="--d:.6s" x="{cx}" y="{cy - 3}" text-anchor="middle">Your</text><text class="lbl core-lbl pop" style="--d:.6s" x="{cx}" y="{cy + 13}" text-anchor="middle">product</text>')
    out.append('<g class="spin">')
    for i, (key, label) in enumerate(names):
        a = -math.pi / 2 + 2 * math.pi * i / len(names)
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        out.append(f'<g class="sat pop" style="--d:{0.7 + 0.1 * i:.2f}s"><g class="counter" style="transform-origin:{x:.1f}px {y:.1f}px">'
                   f'<circle class="node sat-dot" cx="{x:.1f}" cy="{y:.1f}" r="21"/>'
                   f'<g transform="translate({x - 13:.1f} {y - 13:.1f}) scale(.54)" class="glyph">{ICON[key]}</g>'
                   f'<text class="lbl small" x="{x:.1f}" y="{y + 35:.1f}" text-anchor="middle">{label}</text></g></g>')
    out.append("</g>")
    return f'<svg class="net art-orbit" viewBox="0 0 400 300" role="img" aria-label="Seven services around your product: strategy, lifecycle, AI, research, agile, coaching and assessments">{"".join(out)}</svg>'


def toolkit_open():
    """Toolkits: the briefcase opens; the three real tools rise out, with two slots for what's coming."""
    out = []
    # lid, hinged open behind the case
    out.append('<path class="lid draw" style="--len:560;--d:.2s" d="M50 150 L70 70 a10 10 0 0 1 9.7-7.6 H320.3 a10 10 0 0 1 9.7 7.6 L350 150"/>')
    # the three tools rising out of the case: two templates and the interactive scorecard (a ranked list)
    docs = [(56, ("Build, Buy", "or Partner")), (132, ("Impact", "Score")), (208, ("Feature", "Scorecard"))]
    for i, (x, (t1, t2)) in enumerate(docs):
        inner = (f'<path d="M{x + 8} 92h56M{x + 8} 102h44"/>'
                 f'<rect class="doc-box" x="{x + 8}" y="112" width="25" height="18" rx="3"/><rect class="doc-box" x="{x + 39}" y="112" width="25" height="18" rx="3"/>'
                 if i < 2 else
                 "".join(f'<rect class="doc-band" x="{x + 8}" y="{90 + 13 * k}" width="{w}" height="6" rx="3"/>' for k, w in enumerate((52, 40, 30, 18))))
        out.append(f'<g class="doc rise" style="--d:{0.9 + 0.25 * i:.2f}s"><rect x="{x}" y="34" width="72" height="116" rx="6"/>'
                   f'<rect class="doc-band" x="{x + 8}" y="42" width="24" height="5" rx="2"/>'
                   f'<text class="lbl doc-t" x="{x + 8}" y="64">{t1}</text><text class="lbl doc-t" x="{x + 8}" y="77">{t2}</text>{inner}</g>')
    # coming-soon slots
    for i, x in enumerate((288, 312)):
        out.append(f'<rect class="slot pop" style="--d:{1.7 + 0.12 * i:.2f}s" x="{x}" y="104" width="22" height="34" rx="4"/>')
    out.append('<text class="lbl small pop" style="--d:2s" x="311" y="98" text-anchor="middle">+2 coming</text>')
    # the case in front
    out.append('<rect class="case draw" style="--len:760;--d:0s" x="40" y="150" width="320" height="122" rx="20"/>')
    out.append('<path class="draw" style="--len:330;--d:.3s" d="M40 196 H360"/>')
    out.append('<rect class="hot pop" style="--d:.8s" x="182" y="182" width="36" height="28" rx="6"/>')
    out.append('<path class="tick draw" style="--len:60;--d:2.1s" d="m84 230 12 12 22-22"/><path class="tick draw" style="--len:60;--d:2.3s" d="m282 230 12 12 22-22"/>')
    return f'<svg class="net art-toolkit" viewBox="0 0 400 290" role="img" aria-label="An open toolkit with the Build, Buy, or Partner matrix, the Organizational Impact Score and the Feature Prioritization Scorecard, and two more tools coming">{"".join(out)}</svg>'


def signal():
    """About: many jittery opinions converge into one insight, then a steady climb through Evidence, Decision, Launch."""
    ix, iy = 160, 206
    out = ['<defs><linearGradient id="pa-sig-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sig-stop-a"/><stop offset="1" class="sig-stop-b"/></linearGradient></defs>']
    out.append('<path class="axis draw" style="--len:400;--d:0s" d="M20 262 H400"/>')
    out.append(f'<path class="divider pop" style="--d:.9s" d="M{ix} 34 V262"/>')
    # scattered opinions
    for n, (x, y) in enumerate([(34, 60), (62, 112), (48, 178), (96, 70), (120, 132), (84, 236), (128, 88), (30, 228), (110, 196)]):
        out.append(f'<circle class="speck pop" style="--d:{0.1 + 0.05 * n:.2f}s" cx="{x}" cy="{y}" r="3"/>')
    # three noisy lines that calm down as they reach the insight
    for k, (y0, seed) in enumerate([(64, 1), (150, 2), (236, 3)]):
        pts = []
        for i in range(15):
            x = 20 + 10 * i
            t = i / 14
            ease = t * t * (3 - 2 * t)
            amp = 20 * (1 - t) ** 1.3
            sign = 1 if (i * (seed + 2) + seed) % 3 else -1
            pts.append(f"{x},{y0 + (iy - y0) * ease + sign * amp * (0.6 + 0.4 * ((i + seed) % 2)):.1f}")
        out.append(f'<polyline class="jitter j{k} draw" style="--len:420;--d:{0.2 + 0.15 * k:.2f}s" points="{" ".join(pts)}"/>')
    steady = f"M{ix} {iy} C 196 204, 210 186, 232 176 S 276 146, 300 124 S 346 80, 370 66"
    out.append(f'<path class="area pop" style="--d:1.6s" d="{steady} L370 262 L{ix} 262 Z"/>')
    out.append(f'<path class="route draw" style="--len:320;--d:1.1s" d="{steady}"/>')
    pts = [(ix, iy, "Insight", ix, 238), (232, 176, "Evidence", 262, 204), (300, 124, "Decision", 330, 152), (370, 66, "Launch", 356, 32)]
    for i, (x, y, label, px, py) in enumerate(pts):
        last = i == len(pts) - 1
        if last:
            out.append(f'<circle class="ring" cx="{x}" cy="{y}" r="10"/><circle class="hot pop" style="--d:2.3s" cx="{x}" cy="{y}" r="10"/>')
        else:
            out.append(f'<circle class="node stop pop" style="--d:{1.2 + 0.3 * i:.2f}s" cx="{x}" cy="{y}" r="7"/>')
        w = len(label) * 7.6 + 22
        out.append(f'<g class="pill{" hot-pill" if last else ""} pop" style="--d:{1.4 + 0.3 * i:.2f}s"><rect x="{px - w / 2:.1f}" y="{py - 12}" width="{w:.1f}" height="24" rx="12"/>'
                   f'<text class="lbl" x="{px}" y="{py + 4.5}" text-anchor="middle">{label}</text></g>')
    out.append('<text class="cap pop" style="--d:.6s" x="90" y="282" text-anchor="middle">NOISE</text>')
    out.append('<text class="cap pop" style="--d:1.8s" x="268" y="282" text-anchor="middle">SIGNAL</text>')
    return f'<svg class="net art-signal" viewBox="0 0 410 290" role="img" aria-label="Many noisy opinions converge into one insight, then a steady climb through evidence and decision to launch">{"".join(out)}</svg>'


def conversation():
    """Contact: the envelope opens, a note rises out, and it flies off as a paper plane while a reply is being typed."""
    out = []
    # reply bubble, someone typing
    out.append('<g transform="translate(-20 -8)"><g class="pop" style="--d:1.9s"><path class="bubble" d="M22 30 h92 a16 16 0 0 1 16 16 v14 a16 16 0 0 1 -16 16 h-62 l-14 12 v-12 h-16 a16 16 0 0 1 -16 -16 v-14 a16 16 0 0 1 16 -16 z"/>'
               + "".join(f'<circle class="typing" style="--t:{0.18 * i:.2f}s" cx="{52 + 16 * i}" cy="53" r="4.5"/>' for i in range(3)) + '</g></g>')
    # flap, open behind the note
    out.append('<path class="draw" style="--len:260;--d:.3s" d="M60 140 L160 70 L260 140"/>')
    # the note rising out
    out.append('<g class="rise" style="--d:.8s"><rect x="86" y="54" width="148" height="124" rx="6"/>'
               '<rect class="doc-band" x="100" y="68" width="30" height="5" rx="2"/>'
               '<text class="lbl" x="100" y="96">Let\'s talk.</text>'
               '<path class="doc-line" d="M100 114h118M100 126h96M100 138h108"/></g>')
    # the pocket in front
    out.append('<path class="pocket" d="M60 140 V248 a12 12 0 0 0 12 12 H248 a12 12 0 0 0 12 -12 V140 Z"/>')
    out.append('<rect class="draw" style="--len:700;--d:0s" x="60" y="140" width="200" height="120" rx="12"/>')
    out.append('<path class="draw" style="--len:260;--d:.4s" d="M60 146 L160 212 L260 146"/>')
    # trail and plane
    out.append('<path class="trail pop" style="--d:1.4s" d="M238 80 C 280 80, 296 62, 330 60"/>')
    out.append('<g class="plane pop" style="--d:1.5s"><circle class="ring" cx="356" cy="56" r="14"/>'
               '<path class="hot-fill" d="M332 62 L384 38 L366 86 L354 68 Z"/><path class="fold" d="M354 68 L384 38"/></g>')
    return f'<svg class="net art-contact" viewBox="0 0 400 290" role="img" aria-label="A note rises from an open envelope and flies off as a paper plane, while a reply is being typed">{"".join(out)}</svg>'


def insight_lens():
    """Insights: a Product+ issue with three articles, one per subject in its colour, beside a scattered chart; the
    magnifying glass shows the clear rising line in it, passing through the three subject colours (the same colours
    as the filters below)."""
    cx, cy, r = 240, 184, 52
    cats = ("strategy", "agents", "enablement")
    out = [f'<defs><clipPath id="pa-lens-clip"><circle cx="{cx}" cy="{cy}" r="{r - 2}"/></clipPath></defs><g transform="translate(14 0)">']
    # the newsletter page, with the Product+ mark
    out.append('<g class="rise" style="--d:.1s"><rect class="page" x="30" y="24" width="300" height="236" rx="12"/>'
               '<text class="lbl masthead" x="50" y="64">Product</text><path class="plus" d="M127 50v14M120 57h14"/>'
               '<path class="doc-line strong" d="M50 88h200M50 102h136"/></g>')
    # three articles down the left, one per subject
    for i, cid in enumerate(cats):
        y, d = 132 + 42 * i, 0.55 + 0.15 * i
        out.append(f'<g class="pop" style="--d:{d:.2f}s"><circle class="cat-dot" style="--c:var(--cat-{cid})" cx="54" cy="{y}" r="4.5"/>'
                   f'<rect class="cat-tag" style="--c:var(--cat-{cid})" x="64" y="{y - 3}" width="38" height="6" rx="3"/></g>')
        out.append(f'<path class="doc-line draw" style="--len:96;--d:{d + .1:.2f}s" d="M50 {y + 14}h92M50 {y + 26}h{70 - 8 * i}"/>')
    # the chart on the right: a scatter that hides its trend (the lens covers the middle)
    pts = [(170, 236), (176, 214), (184, 240), (172, 192), (182, 168), (170, 150), (186, 140), (196, 232), (206, 244),
           (282, 128), (296, 142), (306, 130), (312, 158), (300, 168), (310, 186), (304, 212), (314, 236), (292, 240), (280, 236),
           (226, 196), (248, 172), (260, 200), (232, 160), (214, 214), (270, 166)]
    for n, (x, y) in enumerate(pts):
        out.append(f'<circle class="speck-dot pop" style="--d:{0.7 + 0.025 * n:.2f}s" cx="{x}" cy="{y}" r="3"/>')
    out.append('<path class="chart-axis draw" style="--len:210;--d:.5s" d="M162 126 V248 H318"/>')
    # the magnifying glass: inside the lens the noise falls away and the trend is clear, through the three subjects
    trend = f"M{cx - r} {cy + 30} C {cx - 28} {cy + 26}, {cx - 14} {cy + 14}, {cx} {cy - 2} S {cx + 20} {cy - 28}, {cx + r} {cy - 34}"
    nodes = [(cx - 24, cy + 22, 1.9), (cx, cy - 2, 2.1), (cx + 22, cy - 26, 2.3)]
    out.append('<g class="float"><g class="lens pop" style="--d:1.3s">')
    out.append(f'<g clip-path="url(#pa-lens-clip)"><circle class="lens-bg" cx="{cx}" cy="{cy}" r="{r}"/>'
               + "".join(f'<path class="grid" d="M{cx - r} {y}H{cx + r}"/>' for y in (cy - 26, cy, cy + 26))
               + f'<path class="route draw" style="--len:150;--d:1.7s" d="{trend}"/></g>')
    x, y, _ = nodes[-1]
    out.append(f'<circle class="ring" style="--c:var(--cat-{cats[-1]})" cx="{x}" cy="{y}" r="7"/>')
    for (x, y, d), cid in zip(nodes, cats):
        out.append(f'<circle class="lens-node pop" style="--c:var(--cat-{cid});--d:{d:.2f}s" cx="{x}" cy="{y}" r="6"/>')
    out.append(f'<circle class="lens-rim" cx="{cx}" cy="{cy}" r="{r}"/>')
    out.append(f'<path class="glare" d="M{cx - 36} {cy - 20} A{r - 12} {r - 12} 0 0 1 {cx - 16} {cy - 38}"/>')
    out.append(f'<path class="handle" d="M{cx + 38} {cy + 38} L{cx + 80} {cy + 80}"/>')
    out.append('</g></g></g>')
    return f'<svg class="net art-lens" viewBox="0 0 400 290" role="img" aria-label="A Product+ issue with articles on product strategy, AI agents and AI enablement; a magnifying glass turns its scattered chart into one clear rising line">{"".join(out)}</svg>'
