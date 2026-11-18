# GUI Scheme Audit — autoPlacement system

Audit of which overlays/modals/popups use the shared placement scheme in
`frontend/src/utils/autoPlacement.js` vs. hand-rolled `fixed inset-0` markup.
Use this when deciding what to migrate next.

## The scheme (source of truth: `utils/autoPlacement.js`)

- **`Portal`** — render into `document.body` so `fixed` means the viewport
  (escapes framer-motion transforms). ~90 files already use it.
- **`placeInViewport(x, y, opts)`** — clamp/flip a popup to stay on screen.
- **`useAutoPlacement(x, y, opts)`** — hook; measures real size, re-clamps.
- **`Popup`** — all-in-one anchored popup; bottom-sheet on mobile.
- **`ModalPortal`** — centered modal + panel; bottom-sheet on mobile.
- **`ModalShell`** (`components/ui/ModalShell.js`) — house modal chrome:
  `bg-black/10` backdrop (never 50+), z-[80], spring entrance, `scrollbar-3d`.
- **`useIsMobile`**, **`useCornerStack`/`useCornerOffset`**,
  **`setPanelShift`/`usePanelShift`**, **`useFloatSide`**,
  **`Connector`**, **`ScrollStrip`**.

## Already scheme-aligned

- **`BetaPinLayer`** — `Popup`, `Connector`, corner stacks, panel shift.
- **`NotificationCenter`** — `Portal`, `Popup`.
- **`NextItemSuggestion`** — `Portal`, `Popup`.
- **`MDLProductsPanel`** — `Popup`, `Portal`.
- **`CustomContextMenu`** — `useAutoPlacement`.
- **`CustomPanel`**, **`FloatingButtons`** — corner stack + panel shift.
- **`CustomRadialMenu`**, **`RadialActionMenu`** — `useIsMobile` sheets.
- **`QuickIconPicker`** — `Portal` + own anchor math (kept: it needs
  pointer-flip both above/below; could adopt `Popup` later).
- **`ItemShortcut`** — `Portal` + mobile bottom-sheet + `dvh` cap (this fix).
- **`ModalShell` consumers** — whatever mounts it already follows the modal
  scheme.

## Migration candidates (Portal-only, custom overlay markup)

These portal correctly but hand-roll centering/sizing — prime candidates for
`ModalPortal`/`ModalShell` (modals) or `Popup` (anchored popovers):

- **Modals**: `ItemTrainingModal`, `PriceLearningModal`, `AisleConfigModal`,
  `PantryModal`, `ItemDetailsModal`, `AddItemModal`, `IconPicker`,
  `TemplatesModal`, `HelpModal`, `Onboarding`, `LevelUpModal`,
  `HouseholdMemberModal`, `BetaAccessModal`, `StoreManager`, `ShareList`,
  `SoundSettings`, `RecipeViewModal`, `KeyboardShortcutsPanel`,
  `Beta*Modal`/`CFS` panels, `QuickRecipeTemplates`, `TasteRatingModal`,
  `TastePreferencesSetup`, `InventoryComparisonModal`, `MediaAssetManager`,
  `AssetLibrary`, `AppTemplateMarketplace`, `ChangelogViewer`,
  `ChangelogPanel`, `CommandPalette`, `AdminIconManager`,
  `AdminFeatureFlagsManager`, `GitIntegration`, `PatternDataManager`,
  `PreviewModePanel`, `CategoryRecipeLab`, `LabPantryPicker`,
  `StorageLocationTabs`, `MediaAssetManager`, `ConsoleViewer`.
- **Anchored popovers/panels** (want `Popup`/`useAutoPlacement` clamp+flip):
  `QuickCategoryPicker`, `FavoritePicker`, `CustomKeypad`, `MenuPanel`,
  `QuickAddItem`, `EditorSettingsPanel`, `InlinePropertiesPanel`,
  `PropertiesPanel`, `Notepad`, `Toast` (fixed top-right — slot-managed now).
- **Full-screen/overlay special cases** (leave as-is unless buggy):
  `BarcodeScanner`, `MixingOverlay`, `FlyingItemAnimation`,
  `WidgetAlignmentGuides`, `EditorToolbar`, `MobileBottomNav`, `Sidebar`,
  `VoiceInput`, `UpdateNotification`, `XPNotification`,
  `CustomNotification`, `NotificationSystem`, `OfflineIndicator`,
  `Dashboard` (page-level backdrop), `DynamicLayout`, `AVEContextMenu`.

## Priorities when migrating

1. Anything user-reported as overflowing the viewport (like ItemShortcut was).
2. Popovers that open near screen edges — move them to `Popup`.
3. Modals that dim the whole screen with `bg-black/50` — convert to
   `ModalShell` rules (`bg-black/10`, spring, `scrollbar-3d`, z-[80]).
4. Mobile: every `items-center` modal should get `items-end sm:items-center`
   and `max-h-[92dvh]`/`rounded-t-2xl` sheet behavior (ModalPortal does this).

## Verified in this pass

- `ItemShortcut` — now bottom-sheet on mobile, `max-h-[92dvh]/[85dvh]`,
  can't escape the bottom edge; right-click icon picker layered at z-[140].
- `QuickIconPicker` — anchor math clamps to viewport, falls back centered.
- `Toast` — rewritten: slot-stacked top-right + `ToastStack` container
  export for new consumers.
