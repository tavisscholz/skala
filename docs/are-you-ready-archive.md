# The archived readiness tool, and how to put it back

On 9 October 2026 `/are-you-ready` stopped being the readiness tool (the
SCALE ladder and the workboard) and became the hub for the four free working
sessions. Nothing was deleted.

## Where the old page is

| What | Where |
|---|---|
| Source (the section markup, verbatim) | `tools/partials/are-you-ready-old.html` (renamed from `tools/partials/are-you-ready.html`, contents unchanged) |
| Built page, live but unlisted | `archive/are-you-ready-old.html`, served at `https://buildwithskala.com/archive/are-you-ready-old` with a `noindex` meta tag and no link from the menu |
| Behaviour | `js/site.js` still carries the ladder and workboard code; it runs on whichever page holds the elements |
| Last commit with the tool at `/are-you-ready` | `5ac9833` |

The archive page is rebuilt by `python3 tools/build-notes.py` every time, so it
stays in step with the shared header, footer and stylesheet.

## How to restore it at /are-you-ready

Option A, one word (keeps the sessions code around, swaps the page):

1. In `tools/build-notes.py` change `READY_PAGE = "sessions"` to `READY_PAGE = "tool"`.
2. Run `python3 tools/build-notes.py`.
3. Commit and push. Hostinger redeploys the branch.

`/are-you-ready` then serves the readiness tool again (menu item current, no
`noindex`), and `/archive/are-you-ready-old` keeps serving the same content.
The homepage row lines and the play blocks still point at `/are-you-ready#<card>`;
flip them off by emptying `SESSIONS`' use or revert as in option B.

Option B, full revert of the sessions work:

```
git revert <the sessions commit>
python3 tools/build-notes.py
```

Option C, just look at it: open `/archive/are-you-ready-old` on the live site,
or `archive/are-you-ready-old.html` from a checkout.
