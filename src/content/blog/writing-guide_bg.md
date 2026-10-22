---
title: "Всичко, което една публикация може да съдържа"
description: Жив справочник на всеки блок, който блогът поддържа – секции, формули, диаграми, графики, карти, галерии, видео, вграждания, файлове и карти на връзки.
date: 2026-10-20
tags: [мета, писане, markdown]
---

Това е пищовът, който ползвам, докато пиша. Всеки блок по-долу е обикновен Markdown с няколко shortcode-а; файлът е `src/content/blog/writing-guide_bg.md`.

## Специални секции

::: note
**Бележка**: нещо, което си струва да се запомни.
:::

::: tip
**Съвет**: практически трик.
:::

::: curious
**Любопитно**: интересен факт или странична история.
:::

::: warning
**Внимание**: лесно се бърка.
:::

::: danger
**Опасно**: загуба на данни, пари, безопасност.
:::

::: example Мое заглавие
Всяка секция може да има собствено заглавие след името ѝ.
:::

::: details Кликни, за да се разгъне
Скрито съдържание за дълги таблици или спойлери.
:::

## Формули

В текста $e^{i\pi} + 1 = 0$ и на отделен ред:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## Диаграми и графики

```mermaid
flowchart TD
  A[Markdown файл] --> B(Eleventy)
  B --> C{Има ли диаграма?}
  C -- да --> D[Зарежда Mermaid само тук]
  C -- не --> E[Чист HTML]
```

```chart
{
  "type": "doughnut",
  "data": { "labels": ["Код", "Писане", "Рисуване", "Музика"], "datasets": [{ "data": [40, 25, 20, 15] }] }
}
```

## Код

```python
def greet(name: str) -> str:
    return f"Здравей, {name}!"
```

## Снимки, фигури и галерии

{% figure "images/rila/lake-5.jpg", "Фигура с надпис. Кликни, за да я отвориш на цял екран." %}

{% gallery ["images/rila/lake-1.jpg", "images/rila/lake-2.jpg", "images/rila/lake-3.jpg", "images/rila/lake-4.jpg"], { columns: 4 } %}

## Видео, YouTube и вграждания

{% youtube "dQw4w9WgXcQ", "Видео от YouTube (зарежда се при клик)" %}

{% iframe "https://www.openstreetmap.org/export/embed.html?bbox=23.30%2C42.19%2C23.34%2C42.22&layer=mapnik", { title: "OpenStreetMap", caption: "Произволен iframe в адаптивна рамка" } %}

## Карти

{% repo "11ty/eleventy" %}

{% link "https://lucide.dev/icons/", { description: "Красиви и еднакви иконки. Всяка иконка в сайта е оттук." } %}

{% download "files/seven-rila-lakes.gpx", "Файл за сваляне" %}

{% button "/bg/projects/", "Бутон", { icon: "arrow-right", primary: true } %}

## Таблица със синтаксиса

| Блок | Синтаксис |
| --- | --- |
| Секция | `::: tip` … `:::` |
| Формула | `$…$` и `$$…$$` |
| Диаграма | ` ```mermaid ` |
| Графика | ` ```chart ` с JSON |
| Карта | `{% raw %}{% map { … } %}{% endraw %}` |
| Галерия | `{% raw %}{% gallery "images/папка" %}{% endraw %}` |
