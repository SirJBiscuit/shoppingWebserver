/**
 * Shared custom-icon upload helpers — used by QuickIconPicker (anchored
 * popover) and the inventory IconPicker (modal). Uploads become
 * `item_icon` image rows served from /api/images.
 */
export const MAX_ICON_DIM = 128;

/** True when the "icon" is an uploaded image rather than an emoji. */
export const isImageIcon = (ic) =>
  typeof ic === 'string' && /^(https?:|\/|data:|blob:)/.test(ic.trim());

/**
 * Normalize an upload for the item_icon slot: images already ≤128×128 pass
 * through untouched; larger images are cover-cropped/downscaled to 128×128
 * PNG so the server never rejects a size and the bytes stay tiny.
 */
export const normalizeIconFile = (file) => new Promise((resolve, reject) => {
  if (!file.type?.startsWith('image/')) {
    reject(new Error('That file is not an image'));
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const { width: w, height: h } = img;
    if (w <= MAX_ICON_DIM && h <= MAX_ICON_DIM) {
      resolve(file); // already icon-sized — no re-encode needed
      return;
    }
    const scale = MAX_ICON_DIM / Math.max(w, h);
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    // cover-crop to square like the server does (fit: 'cover')
    const side = Math.min(cw, ch);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (cw - side) / 2, (ch - side) / 2, side, side, 0, 0, side, side);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))),
      'image/png'
    );
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read that image'));
  };
  img.src = url;
});

/**
 * POST the icon with real upload progress (fetch has none).
 * Resolves with the created image row, rejects with a user-facing message.
 */
export const uploadIcon = (payload, fileName, onProgress, share = false) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append('image', payload, fileName);
  fd.append('image_type', 'item_icon');
  if (share) fd.append('share', '1');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/images/upload');
  xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
  };
  xhr.onload = () => {
    let body = null;
    try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
    if (xhr.status >= 200 && xhr.status < 300 && body?.image_url) {
      resolve(body);
    } else {
      reject(new Error(body?.error || `Upload failed (HTTP ${xhr.status})`));
    }
  };
  xhr.onerror = () => reject(new Error('Network error — check your connection'));
  xhr.send(fd);
});

/** Fetch the user's uploaded item_icon images (custom icons row). */
export const fetchCustomIcons = async () => {
  try {
    const res = await fetch('/api/images?image_type=item_icon', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
};
