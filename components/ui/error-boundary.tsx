"use client";

import { Component, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * Error boundary component for graceful error handling
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ ERROR BOUNDARY CAUGHT");
    console.error(error);
    console.error(error?.stack);
    console.error(errorInfo);
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-surface/50 border-red-500/20 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-white/60">
              This component encountered an error. You can try refreshing or
              contact support if the problem persists.
            </p>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={this.toggleDetails}
                className="text-white/40 hover:text-white/60"
              >
                {this.state.showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </div>

            {this.state.showDetails && this.state.error && (
              <div className="rounded border border-red-500/10 bg-red-500/5 p-2">
                <p className="text-[10px] font-mono text-red-400">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-1 text-[9px] text-white/40 overflow-x-auto max-h-32 overflow-y-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error message for non-critical errors
 */
export function InlineError({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 ${className}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
      <p className="text-xs text-red-400 flex-1">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 text-center ${className}`}
    >
      {Icon && <Icon className="h-10 w-10 text-white/20 mb-3" />}
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description && (
        <p className="text-xs text-white/40 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

