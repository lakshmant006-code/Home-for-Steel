# Home Plans for Steel

Static front end. Open `index.html` through any static server (the page loads its assets by relative path).

## Layout
- `index.html` — the whole site (home, shop plans, modify a plan, upload a plan are views inside it, switched by the URL hash).
- `assets/audio/` — plotter sound used by the hero.
- `assets/plan/` — plan-to-model section: `plan.webp` (plan lines, transparent), `house.webp`, and `house3d.json` (point cloud of the 3D house, 4 values per point: x, y, z in tenths of a foot, then a tone).
- `assets/types`, `assets/plans`, `assets/hero`, `assets/frames`, `assets/logos`, `assets/brand` — images and logos.
- `iso/` — isometric house scenes (SVG) and `iso/sprites/` furniture, cars and trees as WebP sprites. `iso/f/` holds the section-cut frames of the 3D viewer.
- `tools/gen_house_pointcloud.py` — generates `assets/plan/house3d.json`. Run from `tools/`: `python3 gen_house_pointcloud.py`.

## Not included
The SketchUp source files and the isometric scene generator were removed with the working session. Re-export them from the original models if the scenes need regenerating.
