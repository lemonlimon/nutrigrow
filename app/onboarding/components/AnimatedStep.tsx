'use client'

/**
 * AnimatedStep — wraps each onboarding step in a framer-motion slide.
 * direction: +1 = forward (enter from right, exit to left)
 *            -1 = backward (enter from left, exit to right)
 * RTL reverses the enter/exit directions.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedStepProps {
  stepKey:   string | number
  direction: 1 | -1
  isRTL?:    boolean
  children:  ReactNode
}

export default function AnimatedStep({
  stepKey,
  direction,
  isRTL = false,
  children,
}: AnimatedStepProps) {
  // In RTL, forward slides from left; backward slides from right
  const sign = isRTL ? -direction : direction

  const variants = {
    enter: { x: `${sign * 100}%`, opacity: 0   },
    center:{ x: 0,                opacity: 1   },
    exit:  { x: `${-sign * 100}%`,opacity: 0   },
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
