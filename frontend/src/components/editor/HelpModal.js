import React from 'react';
import { X, Wand2, MousePointer, Settings, Grid, Maximize2, Save, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * HelpModal - AVE Editor Help Guide
 * Shows keyboard shortcuts, features, and usage tips
 */
const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wand2 className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">AVE Editor Help</h2>
                  <p className="text-purple-100 text-sm">Admin Visual Editor Guide</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Getting Started */}
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-purple-600" />
                Getting Started
              </h3>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p><strong>1. Activate Editor:</strong> Click the AVE button in the toolbar (purple when active)</p>
                <p><strong>2. Select Widget:</strong> Click on any component to select it (blue border appears)</p>
                <p><strong>3. Edit Properties:</strong> Use the Properties Panel on the right to customize</p>
                <p><strong>4. Save Changes:</strong> Click Save to persist your customizations</p>
              </div>
            </section>

            {/* Toolbar Features */}
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Toolbar Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                  icon={<Settings className="w-5 h-5" />}
                  title="Settings"
                  description="Open Properties Panel to edit selected widget"
                />
                <FeatureCard
                  icon={<Grid className="w-5 h-5" />}
                  title="Grid"
                  description="Toggle alignment grid overlay"
                />
                <FeatureCard
                  icon={<Maximize2 className="w-5 h-5" />}
                  title="Resize"
                  description="Enable resize handles on selected widget"
                />
                <FeatureCard
                  icon={<Save className="w-5 h-5" />}
                  title="Save"
                  description="Save all customizations to database"
                />
                <FeatureCard
                  icon={<RotateCcw className="w-5 h-5" />}
                  title="Reset"
                  description="Reset selected widget to default"
                />
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                ⌨️ Keyboard Shortcuts
              </h3>
              <div className="space-y-2">
                <ShortcutRow keys={["Ctrl", "S"]} action="Save changes" />
                <ShortcutRow keys={["Ctrl", "Z"]} action="Undo last change" />
                <ShortcutRow keys={["Ctrl", "Shift", "Z"]} action="Redo" />
                <ShortcutRow keys={["Escape"]} action="Deselect widget" />
                <ShortcutRow keys={["Delete"]} action="Reset selected widget" />
                <ShortcutRow keys={["Ctrl", "G"]} action="Toggle grid" />
              </div>
            </section>

            {/* Tips & Tricks */}
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                💡 Tips & Tricks
              </h3>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <Tip text="Hover over any widget to see a dashed border preview" />
                <Tip text="Changes are saved per-user, so each admin can have their own layout" />
                <Tip text="Use the grid to align widgets perfectly" />
                <Tip text="Double-click a widget to quickly open its properties" />
                <Tip text="Right-click for quick actions menu (coming soon)" />
              </div>
            </section>

            {/* Widget Types */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                🎨 Customizable Widgets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <WidgetBadge name="Budget Tracker" />
                <WidgetBadge name="Item List" />
                <WidgetBadge name="Animated Cart" />
                <WidgetBadge name="Smart Suggestions" />
                <WidgetBadge name="Next Item" />
                <WidgetBadge name="Pantry Quick View" />
                <WidgetBadge name="Leveling System" />
                <WidgetBadge name="Sidebar" />
                <WidgetBadge name="Floating Buttons" />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Need more help? Check the <a href="/docs/AVE_QUICK_GUIDE.md" className="text-purple-600 hover:underline">full documentation</a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper Components
const FeatureCard = ({ icon, title, description }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
    <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
      {icon}
      <h4 className="font-semibold">{title}</h4>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
  </div>
);

const ShortcutRow = ({ keys, action }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <div className="flex items-center gap-2">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-mono">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-gray-400">+</span>}
        </React.Fragment>
      ))}
    </div>
    <span className="text-sm text-gray-600 dark:text-gray-300">{action}</span>
  </div>
);

const Tip = ({ text }) => (
  <div className="flex items-start gap-2">
    <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
    <span className="text-sm">{text}</span>
  </div>
);

const WidgetBadge = ({ name }) => (
  <div className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium text-center">
    {name}
  </div>
);

export default HelpModal;
