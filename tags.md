---
layout: page
permalink: /tags/
---

<h1 id="Tags" class="title">Tags</h1>
<header>
    <div class="tags-list">
        {% for tag in site.tags %}
            <div class="tag-boxs"><a href="#{{ tag | first }}">{{ tag | first }}</a></div>
        {% endfor %}
    </div>
</header>
<main>
    <div class="tag-container">
        {% for tag in site.tags %}
            <h3 id="{{ tag | first }}"><a href="#Tags">{{ tag | first | capitalize }}</a></h3>
            <ul>
                {% for post in tag.last %} 
                    <li class="tags"><a href="{{ post.url }}">{{ post.title }}</a></li>
                {% endfor %}
            </ul>
        {% endfor %}
    </div>
</main>
