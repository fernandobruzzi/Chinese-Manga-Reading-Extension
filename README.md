# Chinese Manga Reading Extension

A Chrome extension that shows the pinyin of Chinese words when you hover over them.

In March of this year I started learning Chinese by myself, and to increase my
immersion I decided to create a browser extension that gives me the readings of
Chinese characters on demand, on regular websites and, in the future, on
Bilibili Manga.

## Status

This project is under development. I plan to release it on the Chrome Web Store
once it is done.

### Working now
- Hover over a word in regular page text to see its pinyin

### Planned
- Context-aware pinyin correction using the Gemini API
- Tone colouring for each word following tone sandhi rules
- OCR to support manga pages such as Bilibili Manga
- Playback button synced with Forvo

## How to try it

1. Download or clone this repository
2. Open chrome://extensions and turn on Developer mode
3. Click "Load unpacked" and select the project folder

## Credits

Pinyin conversion by [pinyin-pro](https://github.com/zh-lx/pinyin-pro).