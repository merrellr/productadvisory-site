"""The books, read aloud: which parts of a page are spoken, in what order, and when.

Shared by the narrator (src/books/make_book_audio.py) and the page builder (src/books/pages.py), so the read-along
always matches the text on the page. A page's spoken blocks are its headings, paragraphs and list items, in order,
leaving out figures, tables, footnotes and the "Read the full chapter" links. Each block can be marked with when it
is read (data-t, data-e) and when each of its sentences starts (data-s), for the read-along in assets/js/site.js.
"""
import html as H
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "assets", "books", "playbook", "audio")      # <slug>.mp3, <slug>.json (meta), lines/<slug>.json
WEB = "/assets/books/playbook/audio"

BLOCKS = {"h2", "h3", "p", "li"}
SKIP = {"figure", "table", "aside", "sup", "script", "style", "button", "svg"}   # never spoken (sup: footnote numbers)
VOID = {"br", "hr", "img", "input", "col", "meta", "link", "source", "wbr"}


class _Blocks(HTMLParser):
    """Finds the spoken blocks: for each, where its opening tag ends (to add attributes) and its text."""

    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src, self.stack, self.out, self.cur = src, [], [], []
        # line starts, to turn (line, column) into an offset
        self.starts = [0] + [m.end() for m in re.finditer("\n", src)]

    def _off(self):
        line, col = self.getpos()
        return self.starts[line - 1] + col

    def _skipping(self):
        return any(t in SKIP or c for t, c, _ in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        skip_cls = bool(re.search(r"\b(ess-more|footnotes|book-skip)\b", a.get("class") or ""))
        if tag in VOID:
            return
        inside_block = any(b for _, _, b in self.stack)
        if tag == "table" and not self._skipping() and not inside_block:
            self.out.append({"tag": "table", "at": None, "text": "(table)"})   # not read, but said to be there
        is_block = tag in BLOCKS and not self._skipping() and not skip_cls and not inside_block
        if is_block:
            off = self._off()
            end = self.src.index(">", off)                   # the end of this opening tag
            if self.src[end - 1] == "/":
                end -= 1
            self.out.append({"tag": tag, "at": end, "text": ""})
            self.cur.append(len(self.out) - 1)
        self.stack.append((tag, skip_cls, is_block))

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for t, c, b in self.stack[i:]:
                    if b:
                        self.cur.pop()
                del self.stack[i:]
                return

    def handle_data(self, data):
        if self.cur and not self._skipping():
            self.out[self.cur[-1]]["text"] += data


def squash(s):
    return re.sub(r"\s+", " ", s).strip()


def blocks(body):
    """[{tag, at, text}] for each spoken block of the page body, in reading order. text is the block as the reader sees
    it (footnote numbers left out), with spaces tidied. A table is listed too (tag "table", at None): it isn't read,
    but the listener is told it's there."""
    p = _Blocks(body)
    p.feed(body)
    p.close()
    for b in p.out:
        b["text"] = squash(b["text"])
    return [b for b in p.out if b["text"]]


# Sentences: a full stop, question or exclamation mark (and any closing quote or bracket) followed by a space and a
# capital letter, a digit or an opening quote. Short forms like "e.g." and "a.m." rarely start a new sentence after.
_SENT = re.compile(r"(?<=[.!?])[\"'”’)]*\s+(?=[A-Z0-9“\"‘(])")
_NOT_END = re.compile(r"\b(e\.g|i\.e|vs|etc|Dr|Mr|Ms|Mrs|St|a\.m|p\.m|U\.S|No|Ch|Fig|pp?)\.$")


def sentences(text):
    """[(offset, sentence)] for a block's text."""
    out, start = [], 0
    for m in _SENT.finditer(text):
        piece = text[start:m.start()].rstrip("\"'”’)")
        if _NOT_END.search(piece.rstrip()):
            continue
        out.append((start, text[start:m.end()].strip()))
        start = m.end()
    if start < len(text):
        out.append((start, text[start:].strip()))
    return [(o, s) for o, s in out if s]


def annotate(body, timing):
    """The page body with each spoken block marked with when it's read. timing: [[start, end, [[offset, t], ...]], ...]
    in block order (from lines/<slug>.json). Unchanged if the blocks don't match (the text changed since narration)."""
    bs = blocks(body)
    if not timing or len(timing) != len(bs):
        return body
    out, last = [], 0
    for b, (t, e, ss) in zip(bs, timing):
        if b["at"] is None:
            continue
        s = ",".join(f"{o}:{x:.2f}" for o, x in ss) if len(ss) > 1 else ""
        out.append(body[last:b["at"]])
        out.append(f' data-t="{t:.2f}" data-e="{e:.2f}"' + (f' data-s="{s}"' if s else ""))
        last = b["at"]
    out.append(body[last:])
    return "".join(out)


def meta(slug):
    """The narration's facts for a page ({duration, bytes, chapters, ...}), or None if it hasn't been narrated."""
    path = os.path.join(OUT, slug + ".json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def timing(slug):
    path = os.path.join(OUT, "lines", slug + ".json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)["blocks"]


def text_of(fragment):
    return squash(H.unescape(re.sub(r"<[^>]+>", " ", fragment)))
