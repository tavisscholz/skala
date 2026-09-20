# Publishing to Hostinger from GitHub

The site is static: the repository root is the web root, with `index.html`,
`playbook.html`, `merch.html`, `privacy.html` and `terms.html` alongside `plays/`
(one page per play), `css/`, `js/` and `assets/`. Hostinger's Git deployment clones the branch straight into
`public_html`, and the `.htaccess` at the root keeps the tooling folders private
and serves clean URLs: `/`, `/playbook`, `/plays/<slug>`, `/merch`, `/privacy`, `/terms`. Requests for
`index.html` or any `.html` address redirect to the clean form.

## One-time setup in hPanel

1. Open the website in hPanel, then **Advanced → Git**.
2. Add the repository: the GitHub URL of this repo, the branch to deploy, and
   `public_html` as the directory. For a private repository, add the deploy key
   hPanel shows under **GitHub → Settings → Deploy keys** on the repo.
3. Click **Deploy** once and check the site on the temporary Hostinger URL.
4. Copy the webhook URL hPanel shows and add it under
   **GitHub → Settings → Webhooks**, content type
   `application/x-www-form-urlencoded`, push events only. Every push to the
   branch now redeploys automatically.
5. Under **Domains**, attach `buildwithskala.com`. If the nameservers are at
   Hostinger nothing else is needed; otherwise set an A record to the IP hPanel
   shows and a CNAME for `www`. Then enable the free SSL under **Security → SSL**
   and turn on **Force HTTPS**.

## Which branch

Point Hostinger at whichever branch holds the release. If a `main` branch is
created later, switch the deployment to it in the same hPanel screen.

## Before each release

- `python3 tools/build-notes.py` after editing an article in `assets/articles/`,
  then `node tools/build-pdf.mjs` to refresh the playbook PDF.
- `node tools/preview-check.mjs` runs the Playwright checks.
- Commit and push; Hostinger redeploys within a minute.

## Known gap

The contact form builds a draft on screen and does not send anything. Static
hosting has no form backend, so connect a form service (Formspree, Basin,
Web3Forms) or switch the button to a `mailto:` link before launch.
