# Newport Elementary Jog-a-Thon 2026

Static fundraising scoreboard for jog day, Friday, November 20, 2026. The page is plain HTML, CSS, and JavaScript. It reads `data.json` in the browser. There is no build step.

The site address will be https://rmy116.github.io/jogathon-dashboard/ once Pages is turned on. It is not live yet. Creating the Pages site from here failed with `Resource not accessible by integration` (the token cannot change repository settings).

Turn it on at Settings → Pages → Build and deployment:

1. Set Source to **GitHub Actions**.
2. Re-run the failed [Deploy GitHub Pages](https://github.com/rmy116/jogathon-dashboard/actions/workflows/pages.yml) workflow.

`.github/workflows/pages.yml` then publishes the repository root on every push to `main`.

To publish from the branch instead, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, and delete `.github/workflows/pages.yml` so the Actions job stops trying to create an Actions site.

Preview locally with a small web server (`fetch` does not work from a `file://` page):

```bash
python3 -m http.server
```

Then open http://localhost:8000/

## How to update the numbers

Replace `data.json` with a new file in the same shape and push to `main`. An external process can overwrite that file. The Pages workflow publishes the new file. Give it a minute, then hard-refresh if the old totals stick around.

This repository is public. Do not commit a full student roster, a per-student export, or any file that lists students beyond the top 15. Names stay first name and last initial. Never add or infer full names. Two student pages can share a name; keep those rows separate and do not merge them.

`totalRaised` is the sum of student pages. That is the big number on the scoreboard. `campaignTotalShown` is the campaign total published by the fundraising site. It is higher when general donations are not tied to a student page.

```json
{
  "updated": "2026-11-13T00:00:00Z",
  "totalRaised": 1000,
  "campaignTotalShown": 1200,
  "topEarners": [
    { "name": "First L.", "grade": "TK", "teacher": "Lastname", "amount": 100 }
  ],
  "classes": [
    { "teacher": "Lastname", "grade": "PS", "total": 500, "studentsWithMoney": 10 }
  ],
  "grades": [
    { "grade": "TK", "total": 800, "studentsWithMoney": 12 }
  ]
}
```

- `updated`: ISO-8601 timestamp, or a `YYYY-MM-DD` date. The page shows that calendar date as “as of” (the date written in the value, not the viewer’s time zone).
- `topEarners`: the highest student pages, plus everyone tied for 15th place. `name` is first name and last initial only. Do not drop a student who matches the 15th-place amount. The page renders every row in this list.
- `grade`: `PS` (preschool), `TK`, `K`, or `1` through `6`.
- `teacher`: last name.
- `classes`: one row per class. `total` is dollars raised. `studentsWithMoney` counts students in that class above $0. Do not include a student list.
- `grades`: one row per grade, same fields, with no student list.

The page ranks classes and grades by total. It does not show per-student averages or week-over-week changes. If `data.json` still contains a `students` roster, the page will not draw it.

Fredoka and Nunito are included under the SIL Open Font License. See `fonts/OFL-Fredoka.txt` and `fonts/OFL-Nunito.txt`.
