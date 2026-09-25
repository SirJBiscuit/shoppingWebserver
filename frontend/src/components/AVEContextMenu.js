/**
 * CFS AVE Context Menu
 * 
 * Right-click context menu for AVE widgets with all editing actions
 */

import React from 'react';
import { 
  Copy, 
  Scissors, 
  Clipboard, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignJustify,
  Layers,
  Unlink,
  RotateCw,
  Settings,
} from 'lucide-react';

const AVEContextMenu = ({ 
  menuState, 
  menuRef, 
  closeMenu,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onAlignLeft,
  onAlignRight,
  onAlignTop,
  onAlignBottom,
  onAlignCenterH,
  onAlignCenterV,
  onGroup,
  onUngroup,
  onProperties,
  canPaste,
  canGroup,
  canUngroup,
}) => {
  if (!menuState.isOpen) return null;

  const handleAction = (action) => {
    action();
    closeMenu();
  };

  const menuItems = [
    {
      label: 'Copy',
      icon: Copy,
      action: onCopy,
      shortcut: 'Ctrl+C',
    },
    {
      label: 'Cut',
      icon: Scissors,
      action: onCut,
      shortcut: 'Ctrl+X',
    },
    {
      label: 'Paste',
      icon: Clipboard,
      action: onPaste,
      shortcut: 'Ctrl+V',
      disabled: !canPaste,
    },
    {
      label: 'Duplicate',
      icon: Copy,
      action: onDuplicate,
      shortcut: 'Ctrl+D',
    },
    { divider: true },
    {
      label: 'Delete',
      icon: Trash2,
      action: onDelete,
      shortcut: 'Del',
      danger: true,
    },
    { divider: true },
    {
      label: 'Bring to Front',
      icon: ArrowUp,
      action: onBringToFront,
      shortcut: 'Ctrl+]',
    },
    {
      label: 'Send to Back',
      icon: ArrowDown,
      action: onSendToBack,
      shortcut: 'Ctrl+[',
    },
    { divider: true },
    {
      label: 'Align',
      icon: AlignLeft,
      submenu: [
        {
          label: 'Align Left',
          icon: AlignLeft,
          action: onAlignLeft,
        },
        {
          label: 'Align Right',
          icon: AlignRight,
          action: onAlignRight,
        },
        {
          label: 'Align Top',
          icon: AlignJustify,
          action: onAlignTop,
        },
        {
          label: 'Align Bottom',
          icon: AlignJustify,
          action: onAlignBottom,
        },
        { divider: true },
        {
          label: 'Center Horizontal',
          icon: AlignCenter,
          action: onAlignCenterH,
        },
        {
          label: 'Center Vertical',
          icon: AlignCenter,
          action: onAlignCenterV,
        },
      ],
    },
    { divider: true },
    {
      label: 'Group',
      icon: Layers,
      action: onGroup,
      shortcut: 'Ctrl+G',
      disabled: !canGroup,
    },
    {
      label: 'Ungroup',
      icon: Unlink,
      action: onUngroup,
      shortcut: 'Ctrl+Shift+G',
      disabled: !canUngroup,
    },
    { divider: true },
    {
      label: 'Properties',
      icon: Settings,
      action: onProperties,
      shortcut: 'Ctrl+I',
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2"
      style={{
        left: `${menuState.position.x}px`,
        top: `${menuState.position.y}px`,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="h-px bg-gray-200 dark:bg-gray-700 my-1"
            />
          );
        }

        if (item.submenu) {
          return (
            <div key={index} className="relative group">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="absolute left-full top-0 ml-1 hidden group-hover:block min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2">
                {item.submenu.map((subItem, subIndex) => {
                  if (subItem.divider) {
                    return (
                      <div
                        key={`sub-divider-${subIndex}`}
                        className="h-px bg-gray-200 dark:bg-gray-700 my-1"
                      />
                    );
                  }

                  return (
                    <button
                      key={subIndex}
                      onClick={() => handleAction(subItem.action)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                    >
                      {subItem.icon && <subItem.icon className="w-4 h-4" />}
                      <span>{subItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <button
            key={index}
            onClick={() => handleAction(item.action)}
            disabled={item.disabled}
            className={`
              w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors
              ${item.disabled 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : item.danger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AVEContextMenu;
