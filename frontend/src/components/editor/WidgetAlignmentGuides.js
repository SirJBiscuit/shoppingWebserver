import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WidgetAlignmentGuides - Smart alignment guides for widget positioning
 * 
 * Features:
 * - Shows alignment with other widgets
 * - Distance measurements
 * - Snap-to-align functionality
 * - Center alignment guides
 * - Edge alignment guides
 * - Like Figma's smart guides
 */
const WidgetAlignmentGuides = ({
  isActive = false,
  activeWidgetId,
  activeWidgetBounds,
  allWidgetBounds = [],
  snapThreshold = 5,
  onSnap,
}) => {
  const [guides, setGuides] = useState([]);
  const [distances, setDistances] = useState([]);

  const calculateGuides = useCallback(() => {
    if (!isActive || !activeWidgetBounds || allWidgetBounds.length === 0) {
      setGuides([]);
      setDistances([]);
      return;
    }

    const newGuides = [];
    const newDistances = [];
    const active = activeWidgetBounds;

    // Calculate center points
    const activeCenterX = active.left + active.width / 2;
    const activeCenterY = active.top + active.height / 2;

    allWidgetBounds.forEach((widget) => {
      if (widget.id === activeWidgetId) return;

      const widgetCenterX = widget.left + widget.width / 2;
      const widgetCenterY = widget.top + widget.height / 2;

      // Vertical alignment guides
      // Left edges align
      if (Math.abs(active.left - widget.left) < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: widget.left,
          start: Math.min(active.top, widget.top),
          end: Math.max(active.bottom, widget.bottom),
          color: '#6366f1',
        });
      }

      // Right edges align
      if (Math.abs(active.right - widget.right) < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: widget.right,
          start: Math.min(active.top, widget.top),
          end: Math.max(active.bottom, widget.bottom),
          color: '#6366f1',
        });
      }

      // Centers align (vertical)
      if (Math.abs(activeCenterX - widgetCenterX) < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: widgetCenterX,
          start: Math.min(active.top, widget.top),
          end: Math.max(active.bottom, widget.bottom),
          color: '#ec4899',
        });
      }

      // Horizontal alignment guides
      // Top edges align
      if (Math.abs(active.top - widget.top) < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: widget.top,
          start: Math.min(active.left, widget.left),
          end: Math.max(active.right, widget.right),
          color: '#6366f1',
        });
      }

      // Bottom edges align
      if (Math.abs(active.bottom - widget.bottom) < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: widget.bottom,
          start: Math.min(active.left, widget.left),
          end: Math.max(active.right, widget.right),
          color: '#6366f1',
        });
      }

      // Centers align (horizontal)
      if (Math.abs(activeCenterY - widgetCenterY) < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: widgetCenterY,
          start: Math.min(active.left, widget.left),
          end: Math.max(active.right, widget.right),
          color: '#ec4899',
        });
      }

      // Distance measurements
      // Horizontal distance (when vertically aligned)
      if (Math.abs(active.top - widget.top) < snapThreshold || 
          Math.abs(active.bottom - widget.bottom) < snapThreshold ||
          Math.abs(activeCenterY - widgetCenterY) < snapThreshold) {
        
        if (active.right < widget.left) {
          // Active is to the left
          const distance = widget.left - active.right;
          newDistances.push({
            type: 'horizontal',
            start: active.right,
            end: widget.left,
            distance,
            y: activeCenterY,
          });
        } else if (widget.right < active.left) {
          // Active is to the right
          const distance = active.left - widget.right;
          newDistances.push({
            type: 'horizontal',
            start: widget.right,
            end: active.left,
            distance,
            y: activeCenterY,
          });
        }
      }

      // Vertical distance (when horizontally aligned)
      if (Math.abs(active.left - widget.left) < snapThreshold || 
          Math.abs(active.right - widget.right) < snapThreshold ||
          Math.abs(activeCenterX - widgetCenterX) < snapThreshold) {
        
        if (active.bottom < widget.top) {
          // Active is above
          const distance = widget.top - active.bottom;
          newDistances.push({
            type: 'vertical',
            start: active.bottom,
            end: widget.top,
            distance,
            x: activeCenterX,
          });
        } else if (widget.bottom < active.top) {
          // Active is below
          const distance = active.top - widget.bottom;
          newDistances.push({
            type: 'vertical',
            start: widget.bottom,
            end: active.top,
            distance,
            x: activeCenterX,
          });
        }
      }
    });

    setGuides(newGuides);
    setDistances(newDistances);
  }, [isActive, activeWidgetId, activeWidgetBounds, allWidgetBounds, snapThreshold]);

  useEffect(() => {
    calculateGuides();
  }, [calculateGuides]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999]">
      <AnimatePresence>
        {/* Alignment Guides */}
        {guides.map((guide, index) => (
          <motion.div
            key={`guide-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute"
            style={{
              backgroundColor: guide.color,
              ...(guide.type === 'vertical' ? {
                left: `${guide.position}px`,
                top: `${guide.start}px`,
                width: '1px',
                height: `${guide.end - guide.start}px`,
              } : {
                top: `${guide.position}px`,
                left: `${guide.start}px`,
                height: '1px',
                width: `${guide.end - guide.start}px`,
              }),
            }}
          />
        ))}

        {/* Distance Measurements */}
        {distances.map((distance, index) => (
          <motion.div
            key={`distance-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute"
            style={
              distance.type === 'horizontal'
                ? {
                    left: `${distance.start}px`,
                    top: `${distance.y}px`,
                    width: `${distance.end - distance.start}px`,
                    transform: 'translateY(-50%)',
                  }
                : {
                    top: `${distance.start}px`,
                    left: `${distance.x}px`,
                    height: `${distance.end - distance.start}px`,
                    transform: 'translateX(-50%)',
                  }
            }
          >
            {/* Distance Line */}
            <div
              className="absolute bg-orange-500"
              style={
                distance.type === 'horizontal'
                  ? {
                      left: 0,
                      top: '50%',
                      width: '100%',
                      height: '1px',
                      transform: 'translateY(-50%)',
                    }
                  : {
                      top: 0,
                      left: '50%',
                      height: '100%',
                      width: '1px',
                      transform: 'translateX(-50%)',
                    }
              }
            />

            {/* Distance Label */}
            <div
              className="absolute px-2 py-0.5 bg-orange-500 text-white text-xs font-mono rounded shadow-lg whitespace-nowrap"
              style={
                distance.type === 'horizontal'
                  ? {
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }
                  : {
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%) rotate(-90deg)',
                    }
              }
            >
              {Math.round(distance.distance)}px
            </div>

            {/* End Caps */}
            <div
              className="absolute w-1 h-3 bg-orange-500"
              style={
                distance.type === 'horizontal'
                  ? {
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }
                  : {
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }
              }
            />
            <div
              className="absolute w-1 h-3 bg-orange-500"
              style={
                distance.type === 'horizontal'
                  ? {
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }
                  : {
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default WidgetAlignmentGuides;
