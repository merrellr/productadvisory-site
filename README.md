# productadvisory.co

The Product Advisory website, replacing the Google Sites version at https://www.productadvisory.co.

Plain HTML, CSS and JavaScript, with no build step and no dependencies. To change the content, edit the page.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Services and service packages | `services.html` |
| Toolkits & Learning (the old Toolkits and Learning pages, merged) | `toolkits.html` |
| About Us | `about.html` |
| Contact Us | `contact.html` |
| Make it yours (preferences) | `preferences.html` |
| Privacy Policy, Terms of Use | `privacy-policy.html`, `terms-of-use.html` |
| Not found, and redirects for old Google Sites paths | `404.html` |

## How things work

- **Styles:** `assets/css/site.css`. Brand colours are tokens at the top (navy `#1c4587`, cyan `#35c2e8`, grey band,
  pale blue cards), and dark mode redefines them. Fonts: Lato for text, Comfortaa for the logo.
- **Icons:** `assets/img/favicon.svg` is the boxed PΛ monogram drawn as a vector; the PNG icons are rendered from it.
- **Toolkit files:** `assets/toolkits/` holds PDFs served from the site and their first-page thumbnails (640px JPG).
  A tool card shows the thumbnail when one is given, otherwise a drawn placeholder.
- **Logo:** the boxed "Product" + "Λdvisory" wordmark is HTML text in every header and footer (`.wm`). To use the
  original logo file instead, replace those `<a class="wm">` contents with an `<img>` or inline SVG.
- **Behaviour:** `assets/js/site.js`: theme toggle, mobile menu, reveal on scroll, the **Ask** search, the
  **⌘K command menu**, the home page "Sound familiar?" picker, the services engagement finder, the toolkit level
  filter and the contact form. Links and settings (email, Calendly, newsletter, `ASK_ENDPOINT`) are at the top.
- **Ask / ⌘K content:** any element with `data-ask="Title"` is searchable, on any page listed in `PAGES` in
  `site.js`. `data-kind="Service"`, `"Package"`, `"Toolkit"` or `"Learning"` also lists it in the command menu, and
  `data-keywords` adds search words that aren't in the visible text. When the question sounds like a project ("can
  you help our team…"), Ask offers to send it to the contact form, pre-filled, or to book a call.

## Make it yours

`assets/js/prefs.js` runs in the `<head>` of every page, before anything is drawn. It reads the visitor's choices
from local storage and sets attributes on `<html>`: `data-style` (classic, editorial, boardroom, lab),
`data-accent` (cyan, green, blue, plum, coral, gold), `data-lens` (starter, practitioner, leader, executive),
`data-depth` (brief), `data-text`, `data-density`, `data-motion` and `data-theme`. `site.css` does the rest with
custom properties, with light and dark values for every style and accent. New pages must include
`<script src="assets/js/prefs.js"></script>` right after the stylesheet.

- **Style:** Classic is the Product Advisory look and the default. Editorial (warm paper, serif headlines),
  Boardroom (navy and gold, squared off) and Lab (monospace on a grid) load their extra fonts only when chosen.
- **Accent:** changes the cyan role only (the dot, highlights, eyebrows, focus). "Auto" uses the style's own.

- **Where are you today?** uses the same four levels as the toolkits. It shows a "Start here" card on the home page
  and highlights the toolkits that fit. Mark a toolkit with `data-levels="leader executive"`.
- **Reading depth:** anything with `class="deep"` is hidden in Brief mode; `class="brief-only"` shows only there.

### Links that carry a view

| Link | What it does |
| --- | --- |
| `/?lens=executive` | Opens with the executive "Start here" card (also `starter`, `practitioner`, `leader`) |
| `/?style=boardroom&accent=gold&mode=dark` | A shared look. The visitor can keep it or go back to their own |
| `/services.html?depth=brief` | Opens Services with the one-line summaries only |
| `/?ask=What is a Fractional CPO` | Opens the home page and asks that question |
| `/contact.html?topic=Market validation#message` | Opens the contact form with the message started |

## To fill in before going live

- [ ] In Google Tag Manager (container `GTM-N854VT4C`), add a **Google Analytics: GA4 Configuration** (Google tag)
      firing on All Pages, then **Submit / Publish** the container. Optional: GA4 event tags for the site's own
      events (below).
- [ ] Review the Privacy Policy hosting lines (marked `HOSTING` in the source): Google Sites was replaced with
      GitHub Pages. Update the effective date if you change it.

## Turning on AI answers for Ask (and the contact form)

Ask always searches the site in the visitor's browser. When `ASK_ENDPOINT` at the top of `assets/js/site.js` is set,
it also sends the question and the five best-matching sections to `apps-script/ask.gs`, which asks Groq to write a
two-to-four-sentence answer using only those sections, with numbered citations. If the script is unavailable or over
its daily limit, Ask quietly falls back to search results. The same endpoint receives the contact form: each message
is saved to a **Messages** tab, emailed to `info@productadvisory.co` with Reply-To set to the sender, and the sender
gets a short thank-you. Without an endpoint, the form opens a pre-filled email instead.

**Which address sends the emails.** Apps Script sends as the Google account that owns the script. If that account
has `info@productadvisory.co` as a "Send mail as" address (Gmail → Settings → See all settings → Accounts →
Send mail as), or the script is owned by info@ itself, emails go out from info@ (`SENDER_EMAIL_` in `ask.gs`).
Otherwise they come from the owner's address with Reply-To set to info@. `testContactEmail` reports which one
it used. The live endpoint is set in `ASK_ENDPOINT` in `assets/js/site.js`.

One-time setup:
1. Create a Google Sheet named **Product Advisory site log**, then open **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with `apps-script/ask.gs` and save.
3. **Project Settings** (gear icon) → **Script properties** → add `GROQ_API_KEY` (the same key as the portfolio is fine).
4. Run `testContactEmail` once from the editor so Google asks for permission to send email.
5. **Deploy → New deployment** → type **Web app** → Execute as **Me**, Who has access **Anyone** → **Deploy**. Copy
   the **Web app URL** (ends in `/exec`).
6. Paste that URL into `ASK_ENDPOINT` in `assets/js/site.js` and push.

Every question is logged to the sheet's **Questions** tab (time, question, sections used, outcome). Limits are 60
answers a day overall and 8 per visitor (top of `ask.gs`). To change the script later: paste the new version, then
**Deploy → Manage deployments → pencil → Version: New version → Deploy**. The URL stays the same.

## Analytics

Google Tag Manager (`GTM-N854VT4C`) is in every page: the script at the top of `<head>` and the `<noscript>` frame
right after `<body>`. New pages need both. `site.js` pushes these events to `dataLayer`, so a GTM trigger of type
**Custom Event** with the same name can forward them to GA4: `ask_question`, `ask_answer`, `command_menu_open`,
`problem_pick`, `finder_result`, `pref_change`, `theme` and `contact_submit`. Question text is never sent.

## Cookie consent

`assets/js/consent.js` loads in `<head>` before Google Tag Manager and sets Google Consent Mode v2 defaults:
analytics cookies are **off until Accept** for visitors in the EEA, UK and Switzerland (Google applies this by IP),
and **on** everywhere else. Advertising storage is always denied. The banner (in `site.js`) appears only when the
visitor has no saved choice and their device time zone is in Europe. Accept or Decline is saved in `localStorage`
(`pa_consent`), so the banner is never shown again; **Cookie settings** in the footer reopens it. New pages need the
`consent.js` script tag above the GTM snippet.

## Preview locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Ask needs to run over http so it can read the other pages.

## Deploy (GitHub Pages)

1. Settings → Pages → Deploy from a branch → `main` / root. Preview at `https://<user>.github.io/<repo>/`.
2. When ready to switch from Google Sites: in Settings → Pages → Custom domain enter `www.productadvisory.co`
   (GitHub commits a `CNAME` file). At your DNS provider, point `www` to `<user>.github.io` with a CNAME record, and
   point the bare `productadvisory.co` at GitHub Pages' A records so it redirects to `www`. Then remove the custom
   domain from Google Sites.
3. Once the certificate is issued, tick **Enforce HTTPS**.
4. Submit `sitemap.xml` in Google Search Console. `llms.txt` gives AI assistants a plain summary of the firm.

Old Google Sites paths `/services`, `/toolkits`, `/about` and `/contact` keep working because GitHub Pages serves
`services.html` for `/services`. `404.html` sends `/home`, `/learning`, `/privacy`, `/terms` and similar to their
new pages.
