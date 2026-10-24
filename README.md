# Chinese Manga Reading Extension

A Chrome extension that shows the pinyin of Chinese words when you hover over them,
on regular websites and inside manga images, including the real pronunciation after
tone sandhi.

In March of this year I started learning Chinese by myself, and to increase my
immersion I decided to create a browser extension that gives me the readings of
Chinese characters on demand, on regular websites and on Bilibili Manga.

<!-- Demo GIF goes here -->

## Features

- **Hover over Chinese text** on any page to see each word's pinyin.
- **Two readings per word:** the dictionary pinyin and the pinyin after tone sandhi
  (不 before a 4th tone, 一 in its different contexts, and 3rd tone + 3rd tone).
- **Read text inside images**, such as manga speech balloons: select a region of the
  screen, and the text is recognized with Gemini and shown in a panel where the
  hover pinyin also works.

## How to use

| Action | How |
|---|---|
| See the pinyin of a word | Hover over it |
| Read text inside an image | Press **Ctrl+R**, click one corner of the region, move the mouse, click the opposite corner |
| Cancel a selection | Press **Esc** (or Ctrl+R again) |
| Close the text panel | Click **×** |

## How it works

- Words are split with `Intl.Segmenter`, and the readings come from
  [pinyin-pro](https://github.com/zh-lx/pinyin-pro), calculated over the whole
  sentence so the tone sandhi rules can see the neighbouring words.
- For images, the service worker takes a screenshot of the visible tab, crops the
  selected region (taking the screen's pixel ratio and zoom into account) and sends
  it to the Gemini API. The recognized text is sent back to the page and shown in
  the panel.

## How to try it

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. To read text inside images, you need a Gemini API key:
   1. Create one in [Google AI Studio](https://aistudio.google.com/) and restrict it
      to the Gemini API.
   2. In `chrome://extensions`, open the extension's **Details** and then
      **Extension options**.
   3. Paste the key and click **Save**.

Hovering over regular page text works without a key.

## Good to know

- **Privacy:** when you read text inside an image, the selected region is sent to
  Google's Gemini API. Nothing is sent for regular page text. Your API key is stored
  only in your browser.
- **Recognition is not perfect:** the model can occasionally swap a character for a
  more common one.
- **Ctrl+R:** on Windows and Linux this shortcut also reloads the page. A
  configurable shortcut is planned.

## Status

This is a personal project under development. I plan to release it on the Chrome
Web Store once it is done.

### Planned

- Editable text in the panel, to fix recognition mistakes
- Re-reading a region with a larger model
- Comparing Gemini with local OCR models
- Correct readings for characters with multiple pronunciations (多音字)
- Playback button synced with Forvo
- Configurable keyboard shortcut

## Credits

Pinyin conversion by [pinyin-pro](https://github.com/zh-lx/pinyin-pro).
Text recognition by the [Gemini API](https://ai.google.dev/).
