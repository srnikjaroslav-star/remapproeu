import { useState, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SmartTooltipProps {
  content: string;
  children: ReactNode;
  maxWidth?: string;
}

const SmartTooltip = ({ content, children, maxWidth = '300px' }: SmartTooltipProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-secondary border border-border/50 text-foreground p-3 rounded-lg shadow-xl z-[100]"
          style={{ maxWidth }}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SmartTooltip;
