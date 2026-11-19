# create-child-theme skill

Ships inside Renick Meridian so it distributes with the theme. Generates an
OctoberCMS child theme (`parent: <Meridian directory>`) with its own customizer
defaults (scheme, accent, colour mode, sidebar), an optional palette and radii
in `child.css`, and an optional page set without the journal.

- `SKILL.md`: the skill (October 4.x child-theme mechanics, steps, verification).
- `templates/theme.yaml.tpl`: child `theme.yaml` with `parent:` and Meridian's customizer form.
- `templates/child.css.tpl`: radii and light/dark palette token overrides.
- `templates/extra.htm.tpl`: `partials/seo/extra.htm`, loads `child.css` after Meridian's sheets.
