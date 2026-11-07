# Facility photos

The detail and navigation pages use each facility's `imagePath` in
`src/assets/data/facilities.json`.

To add a building photo:

1. Find the building's `mapNumber` in `src/assets/data/facilities.json`.
2. Copy its photo into this folder, `src/assets/images/facilities/`. Name it
   `N.jpg` for map number `N` (for example, `21.jpg` for the College of
   Information and Communications Technology).
3. Check that its JSON entry has `"imagePath": "assets/images/facilities/N.jpg"`.
   The path starts with `assets/`, not `src/assets/`.
4. If you use another filename or format, change `imagePath` to match it exactly.

Photos should show the named facility, not a campus overview or an unrelated
building. Until a photo exists, the pages say that a photo is unavailable.

`entrance.jpg` shows the NEUST Sumacab entrance provided in the request. Source: [NEUST campus image](https://neust.edu.ph/wp-content/uploads/2022/04/SUMACAB-1.jpg) (official university site).
