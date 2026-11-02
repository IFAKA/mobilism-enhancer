# Mobilism Enhancer

A browser extension that sorts and filters topic lists on the Mobilism forum so the most popular topics come first.

## Features

- Sorts topics in forum listing pages by a weighted score of views (70%) and replies (30%).
- Highlights "hot" and "very hot" topics.
- Filter controls for minimum views and minimum replies, with a live "Showing X of Y topics" count.
- Toggle visibility of the Topics, Stats and Last Post columns.
- Remembers your filter and column settings (browser local storage).

## Install

No build step. Load it as an unpacked extension:

1. Clone or download this repo.
2. Open `chrome://extensions` in a Chromium-based browser and enable Developer mode.
3. Click "Load unpacked" and select the repo folder.
4. Open any forum listing page (`https://forum.mobilism.me/viewforum.php...`).

## Tech

Manifest V3 extension with a content script (`content/content.js`) and stylesheet (`content/content.css`), plain JavaScript, `chrome.storage.local`. It runs only on `forum.mobilism.me/viewforum.php*`. `mobilism-topic-page.html` is a saved page sample.

## Support

If this project is useful to you, you can support my work:

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zfaka)
