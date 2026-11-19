/* {{NAME}}: child of Meridian. Loaded after every Meridian stylesheet; override tokens, not component rules. */

/* Shape and type. Delete what stays at Meridian's default. */
:root {
    --mr-radius-sm: {{RADIUS_SM}};
    --mr-radius-md: {{RADIUS_MD}};
    --mr-radius-lg: {{RADIUS_LG}};
}

/* Palette: replaces the scheme the site uses (the child's customizer default `color_scheme`).
   Five values per mode, all #rrggbb, light-dark(light, dark). Every other colour is derived from them.
   html:root[...] beats Meridian's inline html[data-scheme] rule whatever the order. */
html:root[data-scheme="{{SCHEME}}"] {
    --mr-bg: light-dark({{BG}}, {{DARK_BG}});
    --mr-ink: light-dark({{INK}}, {{DARK_INK}});
    --mr-accent: light-dark({{ACCENT}}, {{DARK_ACCENT}});
    --mr-signal: light-dark({{SIGNAL}}, {{DARK_SIGNAL}});
    --mr-on-accent: light-dark({{ON_ACCENT}}, {{DARK_ON_ACCENT}});
}
