/**
 * portal-codemod.js — wraps every `fixed`-positioned popup/overlay in src/
 * inside the shared <Portal> from utils/autoPlacement so `position: fixed`
 * is always resolved against the viewport (escapes transformed ancestors).
 *
 * Rules:
 *  - finds JSXElements whose className contains the `fixed` utility
 *  - skips elements already inside <Portal>/<Popup>/<ModalPortal>
 *  - lifts the wrap to the highest overlay-ish JSX ancestor (fragments inside
 *    {cond && <>…</>}, parents that are themselves `fixed`, AnimatePresence)
 *  - preserves exit-animation tracking by promoting to <AnimatePresence>
 *  - inserts `import { Portal } from '<rel>/utils/autoPlacement';` if needed
 *  - pure text surgery on node.start/end — no reformatting
 *
 * Skips: src/backburner, src/limbo, node_modules.
 *
 * Usage:
 *   node scripts/portal-codemod.js          # dry run — list proposed wraps
 *   node scripts/portal-codemod.js --apply  # write changes
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const SRC = path.join(__dirname, '..', 'src');
const APPLY = process.argv.includes('--apply');
const SKIP_DIRS = new Set(['backburner', 'limbo', 'node_modules', 'utils']);
const PORTAL_NAMES = new Set(['Portal', 'Popup', 'ModalPortal']);
const HAS_FIXED = /\bfixed\b/;

const isJSXEl = (n) => t.isJSXElement(n);
const jsxName = (n) =>
  isJSXEl(n) && t.isJSXIdentifier(n.openingElement.name)
    ? n.openingElement.name.name
    : null;

function classHasFixed(node, code) {
  const attrs = node.openingElement?.attributes || [];
  const attr = attrs.find((a) => a.type === 'JSXAttribute' && a.name?.name === 'className');
  if (!attr) return false;
  return HAS_FIXED.test(code.slice(attr.start, attr.end));
}

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(path.join(dir, entry.name), out);
    } else if (/\.jsx?$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const PARSE_PLUGINS = [
  'jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties',
  'objectRestSpread', 'asyncGenerators', 'dynamicImport', 'optionalCatchBinding',
  'topLevelAwait', 'importMeta',
];

const results = { wrapped: [], skipped: [], errors: [] };

for (const file of collectFiles(SRC)) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins: PARSE_PLUGINS });
  } catch (e) {
    results.errors.push(`${file}: parse error ${e.message}`);
    continue;
  }

  // If the file already references our autoPlacement module it's partially
  // migrated — elements still needing a wrap are handled, import skipped.
  const alreadyImportsApi = /from\s+['"][^'"]*autoPlacement['"]/.test(code);
  const portalWordUsed = /\bPortal\b/.test(code) && !alreadyImportsApi;

  const anchors = [];

  try {
    traverse(ast, {
      JSXElement(path) {
        const node = path.node;
        if (!classHasFixed(node, code)) return;

        // Skip when already inside a portal component
        let p = path.parentPath;
        let insidePortal = false;
        while (p) {
          if (p.isJSXElement() && PORTAL_NAMES.has(jsxName(p.node))) { insidePortal = true; break; }
          p = p.parentPath;
        }
        if (insidePortal) return;

        // Walk up through overlay-ish JSX ancestors to find the wrap anchor.
        let a = node;
        let ap = path;
        while (ap.parentPath) {
          const pp = ap.parentPath;
          if (pp.isJSXElement()) {
            const name = jsxName(pp.node);
            if (name === 'AnimatePresence' || classHasFixed(pp.node, code)) {
              a = pp.node; ap = pp; continue;
            }
            break; // normal JSX parent — stop
          }
          if (pp.isJSXFragment()) {
            // ascend through a fragment only when it's a conditional group
            // like {isOpen && (<>…</>)} — not the component's root fragment
            const gp = pp.parentPath;
            if (
              gp && (gp.isJSXExpressionContainer() || gp.isLogicalExpression() ||
                     gp.isConditionalExpression())
            ) { a = pp.node; ap = pp; continue; }
            break;
          }
          break; // non-JSX parent — done
        }

        // Promotion: climb non-JSX parents; if the next JSX ancestor is an
        // AnimatePresence, wrap it instead so exit animations keep working.
        {
          let c = ap.parentPath;
          while (c && !c.isJSXElement() && !c.isJSXFragment()) c = c.parentPath;
          if (c && jsxName(c.node) === 'AnimatePresence') { a = c.node; }
        }

        anchors.push({ start: a.start, end: a.end, line: code.slice(0, a.start).split('\n').length });
      },
    });
  } catch (e) {
    results.errors.push(`${file}: traverse error ${e.message}`);
    continue;
  }

  if (!anchors.length) continue;
  if (portalWordUsed) {
    results.skipped.push(`${file}: 'Portal' identifier already in use`);
    continue;
  }

  // Dedupe identical anchors; drop anchors fully contained in another anchor
  const uniq = [];
  const seen = new Set();
  for (const a of anchors.sort((x, y) => x.start - y.start)) {
    if (seen.has(`${a.start}:${a.end}`)) continue;
    seen.add(`${a.start}:${a.end}`);
    if (uniq.some((u) => u.start <= a.start && u.end >= a.end && !(u.start === a.start && u.end === a.end))) continue;
    uniq.push(a);
  }

  // Text edits back-to-front
  const edits = [];
  for (const a of uniq) {
    edits.push({ pos: a.end, text: '</Portal>' });
    edits.push({ pos: a.start, text: '<Portal>' });
  }
  if (!alreadyImportsApi) {
    const rel = path
      .relative(path.dirname(file), path.join(SRC, 'utils', 'autoPlacement'))
      .replace(/\\/g, '/');
    const relPath = rel.startsWith('.') ? rel : `./${rel}`;
    let lastImportEnd = -1;
    for (const stmt of ast.program.body) {
      if (t.isImportDeclaration(stmt)) lastImportEnd = Math.max(lastImportEnd, stmt.end);
    }
    edits.push({ pos: lastImportEnd, text: `\nimport { Portal } from '${relPath}';` });
  }

  if (APPLY) {
    const next = edits
      .sort((x, y) => y.pos - x.pos)
      .reduce((src, e) => src.slice(0, e.pos) + e.text + src.slice(e.pos), code);
    fs.writeFileSync(file, next, 'utf8');
  }

  results.wrapped.push(
    `${file}\n  wrapped ${uniq.length} popup root(s) at line(s): ${uniq.map((u) => u.line).join(', ')}` +
      (alreadyImportsApi ? '' : '  + import')
  );
}

console.log('=== WRAPPED ===');
results.wrapped.forEach((r) => console.log(r));
console.log('\n=== SKIPPED ===');
results.skipped.forEach((r) => console.log(r));
console.log('\n=== ERRORS ===');
results.errors.forEach((r) => console.log(r));
console.log(`\n${results.wrapped.length} file(s) ${APPLY ? 'modified' : 'would be modified'}`);
