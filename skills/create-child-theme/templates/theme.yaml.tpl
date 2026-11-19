name: '{{NAME}}'
description: '{{DESCRIPTION}}'
author: '{{AUTHOR}}'
homepage: '{{HOMEPAGE}}'
code: {{SLUG}}
# Meridian's DIRECTORY name (meridian here, renick-meridian on a Marketplace install), never its code.
parent: {{MERIDIAN_DIR}}

require:
    - 'Renick.Content'
    - 'RainLab.Translate'

# Frontend strings are RainLab.Translate messages the parent's seed imports, and the
# meridian.* label keys resolve because October boots the parent's lang/ path too: ship neither.
# Customizer fields are NOT inherited. This is Meridian's form; only the defaults are the child's.
form:
    tabs:
        fields:
            brand_name:
                tab: meridian.theme.form.tab_branding
                label: meridian.theme.form.brand_name.label
                comment: meridian.theme.form.brand_name.comment
                type: text
                span: left
                default: '{{NAME}}'
            brand_tagline:
                tab: meridian.theme.form.tab_branding
                label: meridian.theme.form.brand_tagline.label
                comment: meridian.theme.form.brand_tagline.comment
                type: text
                span: right
            brand_logo:
                tab: meridian.theme.form.tab_branding
                label: meridian.theme.form.brand_logo.label
                comment: meridian.theme.form.brand_logo.comment
                type: mediafinder
                mode: image
                span: left
            footer_note:
                tab: meridian.theme.form.tab_branding
                label: meridian.theme.form.footer_note.label
                comment: meridian.theme.form.footer_note.comment
                type: text
                span: right
            color_scheme:
                tab: meridian.theme.form.tab_look
                label: meridian.theme.form.color_scheme.label
                comment: meridian.theme.form.color_scheme.comment
                type: balloon-selector
                span: left
                default: {{SCHEME}}
                options:
                    teal: meridian.theme.form.color_scheme.teal
                    ember: meridian.theme.form.color_scheme.ember
                    ultramarine: meridian.theme.form.color_scheme.ultramarine
            color_mode:
                tab: meridian.theme.form.tab_look
                label: meridian.theme.form.color_mode.label
                comment: meridian.theme.form.color_mode.comment
                type: balloon-selector
                span: right
                default: {{MODE}}
                options:
                    system: meridian.theme.form.color_mode.system
                    light: meridian.theme.form.color_mode.light
                    dark: meridian.theme.form.color_mode.dark
            accent_override:
                tab: meridian.theme.form.tab_look
                label: meridian.theme.form.accent_override.label
                commentAbove: meridian.theme.form.accent_override.comment
                type: colorpicker
                default: '{{ACCENT}}'
                allowEmpty: true
                span: left
            sidebar_mode:
                tab: meridian.theme.form.tab_sidebar
                label: meridian.theme.form.sidebar_mode.label
                comment: meridian.theme.form.sidebar_mode.comment
                type: dropdown
                span: left
                default: {{SIDEBAR_MODE}}
                options:
                    auto: meridian.theme.form.sidebar_mode.auto
                    fixed: meridian.theme.form.sidebar_mode.fixed
                    offcanvas: meridian.theme.form.sidebar_mode.offcanvas
            sidebar_position:
                tab: meridian.theme.form.tab_sidebar
                label: meridian.theme.form.sidebar_position.label
                comment: meridian.theme.form.sidebar_position.comment
                type: balloon-selector
                span: right
                default: {{SIDEBAR_POSITION}}
                options:
                    left: meridian.theme.form.sidebar_position.left
                    right: meridian.theme.form.sidebar_position.right
            view_transitions:
                tab: meridian.theme.form.tab_behavior
                label: meridian.theme.form.view_transitions.label
                comment: meridian.theme.form.view_transitions.comment
                type: checkbox
                default: true
            turbo_prefetch:
                tab: meridian.theme.form.tab_behavior
                label: meridian.theme.form.turbo_prefetch.label
                comment: meridian.theme.form.turbo_prefetch.comment
                type: checkbox
                default: true
            custom_css:
                tab: meridian.theme.form.tab_advanced
                label: meridian.theme.form.custom_css.label
                comment: meridian.theme.form.custom_css.comment
                type: codeeditor
                language: css
                size: huge
                span: full
