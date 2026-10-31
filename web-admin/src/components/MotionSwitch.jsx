import React from 'react';
import { motion } from 'motion/react';

/**
 * Motion LayoutAnimation Spring Toggle Switch
 * Directly adapted from motion.dev LayoutAnimation example with spring physics
 */
export default function MotionSwitch({
  isOn,
  onToggle,
  activeColor = '#00b14f',
  inactiveColor = '#cbd5e1',
  leftIcon = null,
  rightIcon = null,
  size = 'md',
  title = ''
}) {
  const isSm = size === 'sm';
  const width = isSm ? 54 : 64;
  const height = isSm ? 28 : 34;
  const handleSize = isSm ? 22 : 28;

  const containerStyle = {
    width,
    height,
    backgroundColor: isOn ? activeColor : inactiveColor,
    borderRadius: 50,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isOn ? 'flex-end' : 'flex-start',
    padding: 3,
    border: 'none',
    outline: 'none',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
    transition: 'background-color 0.25s ease'
  };

  const handleStyle = {
    width: handleSize,
    height: handleSize,
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
  };

  return (
    <button
      type="button"
      className="toggle-container"
      title={title}
      style={containerStyle}
      onClick={onToggle}
    >
      <motion.div
        className="toggle-handle"
        style={handleStyle}
        layout
        transition={{
          type: 'spring',
          visualDuration: 0.2,
          bounce: 0.2
        }}
      >
        {isOn ? rightIcon : leftIcon}
      </motion.div>
    </button>
  );
}
