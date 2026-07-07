'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from './utils';

const DEFAULT_BASE_SIZE = 44;
const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 90;

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  magnification?: number;
  spring?: SpringOptions;
};
type DockItemProps = {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
};
type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};
type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DockContextType = {
  mouseY: MotionValue;
  spring: SpringOptions;
  magnification: number;
  distance: number;
  baseSize: number;
};

const DockContext = createContext<DockContextType | undefined>(undefined);

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a Dock');
  }
  return context;
}

/**
 * Vertical, fixed-width dock for an app sidebar rail — adapted from the
 * motion-primitives Dock (https://21st.dev/@motion-primitives/components/dock),
 * which magnifies width along mouseX for a floating horizontal dock.
 * Here items magnify height along mouseY instead, and the rail itself never
 * resizes, since it sits inside a persistent app layout rather than floating
 * over content.
 */
function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
}: DockProps) {
  const mouseY = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={(e) => mouseY.set(e.clientY)}
      onMouseLeave={() => mouseY.set(Infinity)}
      className={cn('flex flex-col items-center gap-2', className)}
      role="toolbar"
      aria-label="Application dock"
      aria-orientation="vertical"
    >
      <DockContext.Provider
        value={{ mouseY, spring, distance, magnification, baseSize: DEFAULT_BASE_SIZE }}
      >
        {children}
      </DockContext.Provider>
    </div>
  );
}

function DockItem({ children, className, style, onClick, title }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, magnification, mouseY, spring, baseSize } = useDock();
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseY, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - domRect.y - domRect.height / 2;
  });

  const sizeTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseSize, magnification, baseSize]
  );

  const size = useSpring(sizeTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size, ...style }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      title={title}
      className={cn('relative inline-flex cursor-pointer items-center justify-center', className)}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement, { size, isHovered })
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number>;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => setIsVisible(latest === 1));
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 10 }}
          exit={{ opacity: 0, x: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute left-full top-1/2 z-50 w-fit -translate-y-1/2 whitespace-pre rounded-md border px-2 py-1 text-xs',
            'border-[var(--sidebar-border)] bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]',
            className
          )}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const size = restProps['size'] as MotionValue<number>;
  const iconSize = useTransform(size, (val) => val * 0.45);

  return (
    <motion.div
      style={{ width: iconSize, height: iconSize }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
