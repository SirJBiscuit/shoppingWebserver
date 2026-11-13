import React from 'react';

/**
 * ItemIcon - renders an item's icon whether it's an emoji/string glyph or a
 * custom uploaded image URL (item_icon values produced by the item_icon
 * upload flow are normalized 128×128 PNGs on Nextcloud).
 *
 * Props:
 *   icon      - item_icon value (emoji string or image URL) or null/undefined
 *   fallback  - what to render when icon is empty (default '📦')
 *   emojiClass - classes for the emoji/text path (default 'text-2xl')
 *   imgClass  - classes for the image path (default sized like a 2xl emoji)
 */
const URLISH = /^(https?:)?\/\//;

export const isImageIcon = (icon) =>
  typeof icon === 'string' && (URLISH.test(icon) || icon.startsWith('/'));

const ItemIcon = ({ icon, fallback = '📦', emojiClass = 'text-2xl', imgClass = 'w-8 h-8 rounded-md object-cover' }) => {
  if (isImageIcon(icon)) {
    return (
      <img
        src={icon}
        alt=""
        draggable={false}
        className={imgClass}
        onError={(e) => {
          // Broken custom icon → swap to the emoji fallback instead of a broken-image glyph
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.parentElement) {
            e.currentTarget.parentElement.dataset.iconFailed = '1';
          }
        }}
      />
    );
  }
  return <span className={emojiClass}>{icon || fallback}</span>;
};

export default ItemIcon;
