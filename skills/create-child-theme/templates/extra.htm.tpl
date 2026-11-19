{# {{NAME}}: child stylesheet. {% put styles %} lands after every Meridian sheet, so equal specificity wins. |theme resolves this child's own assets/. #}
{% put styles %}<link rel="stylesheet" href="{{ 'assets/css/child.css'|theme }}">{% endput %}
