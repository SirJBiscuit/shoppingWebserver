# Looking for Next - Enhancement Plan

## Current Issues
- Edit button scrolls to item instead of opening edit modal
- No visual indicator of what the buttons do
- No preview of next item before skipping
- No undo/back button
- Missing "don't need right now" feature
- No quick quantity adjustment

## Planned Enhancements

### 1. **Button Clarity** ✅
- **Edit Item**: Opens modal to edit the current item
- **Go to Item**: NEW button to scroll to item in list
- Add tooltips/labels to all buttons
- Visual guide on first use

### 2. **Next Item Preview** 🎯
- Show icon/name of next item before clicking skip
- Small preview card: "Next: 🥛 Milk"
- Helps user decide whether to skip

### 3. **Undo/Back Button** ⏮️
- Go back to previous item
- Stack of last 5 items
- Keyboard shortcut: Backspace

### 4. **Don't Need Right Now** ❌
- Cross off item for next trip
- Possible scratch sound effect
- Item stays unchecked but marked as "deferred"
- Different visual state (grayed out?)

### 5. **Quick Quantity Adjust** 🔢
- +/- buttons right in the card
- No need to open edit modal
- Fast workflow for adjusting amounts

### 6. **Checkmark Animation** ✨
- Satisfying animation when checking off
- Similar to the one in ItemList
- Bounce + spring effect

## Implementation Priority
1. Fix edit button (open modal instead of scroll)
2. Add "Go to Item" button
3. Add checkmark animation
4. Add next item preview
5. Add undo/back button
6. Add "don't need" feature
7. Add quick quantity controls
8. Add visual guide/tooltips

## Design Notes
- Keep it clean and uncluttered
- Mobile-friendly (large touch targets)
- Smooth animations
- Clear visual hierarchy
- Accessibility (keyboard navigation)
