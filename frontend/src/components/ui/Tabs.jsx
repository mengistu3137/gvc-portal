import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

// --- Tabs Root ---
const Tabs = TabsPrimitive.Root;

// --- Tabs List (The container for triggers) ---
const TabsList = React.forwardRef(
  ({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Brand Surface background with strong border
      "inline-flex h-auto items-center justify-center rounded-lg p-1",
      "bg-brand-surface border border-border-strong shadow-sm",
      className
    )}
    {...props}
  />
)
);
TabsList.displayName = TabsPrimitive.List.displayName;

// --- Tabs Trigger (The clickable buttons) ---
const TabsTrigger = React.forwardRef(
  ({ className, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium ring-offset-brand-surface transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      
      // Default State
      "text-slate-600 hover:bg-surface-muted hover:text-brand-ink",
      
      // Active State (Brand Blue background, White text)
      "data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-sm",
      
      className
    )}
    {...props}
  >
    {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
    {children}
  </TabsPrimitive.Trigger>
)
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// --- Tabs Content (The panel) ---
const TabsContent = React.forwardRef(
  ({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
      // Add a subtle fade-in animation
      "animate-in fade-in-0 zoom-in-95 duration-200",
      className
    )}
    {...props}
  />
)
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };