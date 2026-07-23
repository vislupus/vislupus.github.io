---
layout: page
title: Tags
permalink: /tags/
---

<div id="tags-head">
    <div class="tags-list">
        {% for tag in site.tags %}
            <a class="tag-chip" href="#{{ tag | first | slugify }}">{{ tag | first }} ({{ tag | last | size }})</a>
        {% endfor %}
    </div>
</div>

{% for tag in site.tags %}
<section class="tag-section" id="{{ tag | first | slugify }}">
    <h3><a href="#{{ tag | first | slugify }}">#{{ tag | first }}</a> <span class="count">× {{ tag | last | size }}</span></h3>
    <ul>
        {% for post in tag.last %}
            <li>
                <a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a>
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
            </li>
        {% endfor %}
    </ul>
</section>
{% endfor %}
