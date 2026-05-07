"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside <Tabs>");
  }
  return context;
}

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
};

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  const baseId = React.useId();
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || "");
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue, baseId }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

function TabsTrigger({ className, value, onClick, disabled, ...props }: TabsTriggerProps) {
  const tabs = useTabs();
  const active = tabs.value === value;
  const triggerId = `${tabs.baseId}-trigger-${value}`;
  const contentId = `${tabs.baseId}-content-${value}`;

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      data-active={active ? "" : undefined}
      role="tab"
      id={triggerId}
      aria-controls={contentId}
      aria-selected={active}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          tabs.setValue(value);
        }
      }}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  forceMount?: boolean;
};

function TabsContent({ className, value, forceMount, ...props }: TabsContentProps) {
  const tabs = useTabs();
  const active = tabs.value === value;
  const triggerId = `${tabs.baseId}-trigger-${value}`;
  const contentId = `${tabs.baseId}-content-${value}`;

  if (!forceMount && !active) return null;

  return (
    <div
      data-slot="tabs-content"
      data-state={active ? "active" : "inactive"}
      data-active={active ? "" : undefined}
      role="tabpanel"
      id={contentId}
      aria-labelledby={triggerId}
      hidden={!active}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
