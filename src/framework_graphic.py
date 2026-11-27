"""The Training Framework at a glance, for productadvisory.co (Toolkits and Services). The same design as Learning's
framework page (PAAssessment framework-graphic.js): the four levels, the seven domains in two groups with their
competency counts, "Show all 28 competencies" (assets/js/site.js), and a band linking the two sites.

FRAMEWORK below is copied from the Learning repo (content/framework-data.js, competencies-core.js, pa-icons.js).
If the domains, competencies or icons change there, copy them here again."""
from html import escape

FRAMEWORK = {
 "areas": [
  {
   "key": "discovery",
   "label": "Customer & Market Discovery",
   "icon": "<circle cx=\"28\" cy=\"17\" r=\"9\"/><path d=\"m34.5 23.5 7 7\"/><path d=\"M8 42V32M15 42V26M22 42V34\"/><circle class=\"dot\" cx=\"28\" cy=\"17\" r=\"3\"/>",
   "comps": [
    "Problem framing",
    "Customer research",
    "Validation & experiments",
    "Market & competitive insight"
   ]
  },
  {
   "key": "strategy",
   "label": "Product Strategy & Roadmapping",
   "icon": "<circle cx=\"24\" cy=\"24\" r=\"17\"/><circle cx=\"24\" cy=\"24\" r=\"10\"/><circle class=\"dot\" cx=\"24\" cy=\"24\" r=\"4\"/><path d=\"M24 24 38 10M33 10h5v5\"/>",
   "comps": [
    "Vision & narrative",
    "Roadmaps tied to objectives",
    "Business & commercial sense",
    "Go-to-market"
   ]
  },
  {
   "key": "prioritization",
   "label": "Prioritization & Trade-offs",
   "icon": "<path d=\"M24 9v31M15 40h18M9 15h30\"/><path d=\"M9 15 4 28h10zM39 15l-5 13h10z\"/><circle class=\"dot\" cx=\"24\" cy=\"9\" r=\"3.5\"/>",
   "comps": [
    "Trade-off judgment",
    "Value & effort estimation",
    "Saying no with a reason",
    "Decisions from evidence"
   ]
  },
  {
   "key": "execution",
   "label": "Execution & Delivery",
   "icon": "<rect x=\"9\" y=\"6\" width=\"30\" height=\"36\" rx=\"4\"/><path d=\"M22 16h11M22 25h11M22 34h7\"/><path class=\"tick\" d=\"m14 16 2.5 2.5L20 14\"/><path d=\"m14 25 2.5 2.5L20 23\"/><circle cx=\"16\" cy=\"34\" r=\"1.6\"/>",
   "comps": [
    "Delivery planning",
    "Quality & risk",
    "Working with engineering & design",
    "Measuring outcomes"
   ]
  },
  {
   "key": "stakeholder",
   "label": "Stakeholder Communication & Influence",
   "icon": "<path d=\"M8 10h22a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H17l-7 6v-6H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z\"/><path d=\"M33 18h7a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-1v5l-6-5h-8a3 3 0 0 1-3-3v-5\"/><circle class=\"dot\" cx=\"13\" cy=\"19\" r=\"1.8\"/><circle class=\"dot\" cx=\"19\" cy=\"19\" r=\"1.8\"/><circle class=\"dot\" cx=\"25\" cy=\"19\" r=\"1.8\"/>",
   "comps": [
    "Updates people use",
    "Influence without authority",
    "Executive presence",
    "Cross-team alignment"
   ]
  },
  {
   "key": "aiIndividual",
   "label": "AI Fluency — Individual",
   "icon": "<circle cx=\"20\" cy=\"17\" r=\"7\"/><path d=\"M6 41c1.5-8 7-12.5 14-12.5S32.5 33 34 41\"/><path class=\"tick\" d=\"M37 5v10M32 10h10M33.5 6.5l7 7M40.5 6.5l-7 7\"/>",
   "comps": [
    "Everyday AI tools",
    "AI for research & analysis",
    "Checking AI’s work",
    "Designing your AI workflow"
   ]
  },
  {
   "key": "aiOrg",
   "label": "AI Fluency — Organizational",
   "icon": "<circle class=\"dot\" cx=\"24\" cy=\"24\" r=\"5\"/><path d=\"M24 19V9M24 29v10M19.7 21.5 11 16.5M28.3 26.5 37 31.5M19.7 26.5 11 31.5M28.3 21.5 37 16.5\"/><circle cx=\"24\" cy=\"7\" r=\"3\"/><circle cx=\"24\" cy=\"41\" r=\"3\"/><circle cx=\"9\" cy=\"15.5\" r=\"3\"/><circle cx=\"39\" cy=\"32.5\" r=\"3\"/><circle cx=\"9\" cy=\"32.5\" r=\"3\"/><circle cx=\"39\" cy=\"15.5\" r=\"3\"/>",
   "comps": [
    "Finding AI opportunities",
    "Agent & workflow design",
    "Governance & risk",
    "Adoption & change"
   ]
  }
 ]
}

COLORS = {"discovery": "#3B82F6", "strategy": "#8B5CF6", "prioritization": "#EC4899", "execution": "#F97316",
          "stakeholder": "#10B981", "aiIndividual": "#06B6D4", "aiOrg": "#6366F1"}
GROUPS = [("core", "Core product management", ["discovery", "strategy", "prioritization", "execution", "stakeholder"]),
          ("ai", "AI-focused product", ["aiIndividual", "aiOrg"])]
LEVELS = ["Limited Experience", "Moderate Experience", "Lots of Experience", "Advanced Experience"]


def _icon(paths):
    return ('<svg class="ico fg-svg" viewBox="0 0 48 48" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" '
            'aria-hidden="true">' + paths + '</svg>')


def framework_graphic(uid, assess, ext, sites_band=True):
    """The graphic's HTML. uid keeps ids unique when it appears twice on a site; assess is the Learning address;
    ext the attributes for a link that opens in a new tab."""
    by = {a["key"]: a for a in FRAMEWORK["areas"]}
    total = sum(len(a["comps"]) for a in FRAMEWORK["areas"])
    dots = lambda i: '<span class="fg-dots" aria-hidden="true">' + "".join('<i class="on"></i>' if k <= i else "<i></i>" for k in range(4)) + "</span>"
    levels = '<ol class="fg-levels" aria-label="The four levels">' + "".join(f"<li><span>{l}</span>{dots(i)}</li>" for i, l in enumerate(LEVELS)) + "</ol>"
    groups = ""
    for key, label, areas in GROUPS:
        tiles = ""
        for a in areas:
            d = by[a]
            comps = "".join(f"<li>{escape(c)}</li>" for c in d["comps"])
            tiles += (f'<div class="fg-tile" style="--fg-c:{COLORS[a]};"><a class="fg-tile-a" href="{assess}framework#{a}" {ext}>'
                      f'<span class="fg-ico">{_icon(d["icon"])}</span><span class="fg-name">{escape(d["label"])}</span>'
                      f'<span class="fg-n">{len(d["comps"])} competencies</span></a><ul class="fg-comps">{comps}</ul></div>')
        groups += (f'<div class="fg-group fg-{key}" role="group" aria-labelledby="fg{uid}-{key}"><h3 class="fg-gh" id="fg{uid}-{key}">{label} '
                   f'<span>({len(areas)})</span></h3><div class="fg-tiles">{tiles}</div></div>')
    band = ""
    if sites_band:
        band = f'''<div class="fg-band">
  <h3 class="fg-band-h">One framework, across Product Advisory and Learning</h3>
  <div class="fg-sites">
    <div class="fg-site fg-site-pa"><b>productadvisory.co</b><ul>
      <li><a href="services.html">B2B product consulting</a></li><li><a href="toolkits.html#tools">Interactive toolkits</a></li><li><a href="insights.html">Data-backed insights</a></li></ul></div>
    <div class="fg-site fg-site-learn"><b>assessment.productadvisory.co</b><ul>
      <li><a href="{assess}" {ext}>Skill assessment</a></li><li><a href="{assess}lms-dashboard" {ext}>Personalized course plans</a></li><li><a href="{assess}framework#articles" {ext}>Companion articles</a></li></ul></div>
  </div>
</div>'''
    return (f'<div class="fg" data-fg>{levels}<div class="fg-head"><h3 class="fg-h">The seven skill domains</h3>'
            f'<button type="button" class="fg-toggle" aria-expanded="false" aria-controls="fgGroups{uid}" data-total="{total}">Show all {total} competencies</button></div>'
            f'<div class="fg-groups" id="fgGroups{uid}">{groups}</div>{band}</div>')
