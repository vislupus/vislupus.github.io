---
title: "記事に書けるすべてのもの"
description: このブログが対応しているブロックの一覧。コールアウト、数式、図、グラフ、地図、ギャラリー、動画、埋め込み、ダウンロード、カード。
date: 2026-10-20
tags: [メタ, 執筆, markdown]
---

これは私が記事を書くときに使うチートシートです。以下のブロックはすべて普通のMarkdownといくつかのショートコードで書かれています。

## コールアウト

::: note
**メモ**：覚えておく価値のあること。
:::

::: tip
**ヒント**：実用的なコツ。
:::

::: curious
**豆知識**：面白い事実や脇道の話。
:::

::: warning
**注意**：間違えやすいこと。
:::

::: danger
**危険**：データ損失、お金、安全。
:::

::: details クリックで展開
長い表やネタバレのための隠しコンテンツ。
:::

## 数式

文中の $e^{i\pi} + 1 = 0$ と、独立した行：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 図とグラフ

```mermaid
flowchart LR
  A[Markdown] --> B(Eleventy) --> C[静的HTML]
```

```chart
{
  "type": "radar",
  "data": { "labels": ["コード", "執筆", "絵", "音楽", "旅"], "datasets": [{ "label": "今月", "data": [8, 6, 7, 5, 9] }] }
}
```

## 写真とギャラリー

{% figure "images/rila/lake-5.jpg", "キャプション付きの図。クリックすると全画面で開きます。" %}

{% gallery ["images/rila/lake-1.jpg", "images/rila/lake-2.jpg", "images/rila/lake-3.jpg", "images/rila/lake-4.jpg"], { columns: 4 } %}

## 動画と埋め込み

{% youtube "dQw4w9WgXcQ", "YouTube動画（クリックで読み込み）" %}

## カード

{% repo "11ty/eleventy" %}

{% link "https://lucide.dev/icons/", { description: "美しく統一されたアイコン。このサイトのアイコンはすべてここから。" } %}

{% download "files/seven-rila-lakes.gpx", "ダウンロードできるファイル" %}
