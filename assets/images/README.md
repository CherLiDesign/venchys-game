# Images

Placeholder art is currently drawn with **emoji + color gradients** defined in
`js/characters.js` (the `image`, `color`, and `accent` fields).

## Replacing with Venchy's real artwork

1. Drop a picture here, e.g. `bubble_happy.png` (square images look best).
2. In `js/characters.js`, change that creature's `image` field from the emoji
   to the path:

   ```js
   image: "assets/images/bubble_happy.png"
   ```

The renderer (`js/ui.js` → `portraitContent`) auto-detects file paths vs emoji,
so no other code needs to change. Backgrounds still use `color`/`accent`, so you
can keep the gradient behind a transparent PNG or set them to match the drawing.
