'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/hooks/use-auth';
import { useSidebar } from '@/components/ui/sidebar';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserResponse } from '@repo/contracts';

interface TourStep {
  id: string;
  title: string;
  content: string;
}

// Generates dynamic steps based on the user's role
function getTourSteps(user: UserResponse | undefined): TourStep[] {
  const steps: TourStep[] = [];
  const isDev = user?.accountType === 'DEVELOPER';
  const isRecruiter = user?.accountType === 'HIRING';

  // 1. Dashboard
  steps.push({
    id: 'tour-nav-dashboard',
    title: 'Dashboard Workspace',
    content: 'Your central dashboard showing key stats and action cards.',
  });

  // 2. Explore
  steps.push({
    id: 'tour-nav-explore',
    title: 'Explore Platform',
    content: isDev
      ? 'Browse public projects built by other engineers in the ecosystem.'
      : 'Find verified software engineering projects of prospective talent.',
  });

  // 3. Developer Specific Items
  if (isDev) {
    steps.push(
      {
        id: 'tour-nav-projects',
        title: 'Project Showcases',
        content:
          'Create, import, and configure your public portfolio repositories.',
      },
      {
        id: 'tour-nav-invitations',
        title: 'Collaborator Invitations',
        content:
          'Manage incoming requests to collaborate and contribute to other repositories.',
      },
      {
        id: 'tour-nav-analytics',
        title: 'Visitor Analytics',
        content:
          'Track visits, views, and popularity trends on your projects over time.',
      },
    );
  }

  // 4. Recruiter Specific Items
  if (isRecruiter) {
    steps.push(
      {
        id: 'tour-nav-browse-profiles',
        title: 'Discover Developers',
        content:
          'Browse developer profiles and search for candidates using robust skill filters.',
      },
      {
        id: 'tour-nav-saved-candidates',
        title: 'Saved Pipelines',
        content:
          'Organize candidate shortlists and follow developer updates here.',
      },
      {
        id: 'tour-nav-saved-projects',
        title: 'Bookmarked Repositories',
        content:
          'Review and leave custom notes on showcase projects you bookmarked while exploring.',
      },
    );
  }

  // 5. Shared Core items
  steps.push(
    {
      id: 'tour-nav-profile',
      title: 'Your Public Profile',
      content:
        'Configure how your public profile, bio, and social links appear to other users.',
    },
    {
      id: 'tour-nav-settings',
      title: 'Settings & Security',
      content:
        'Manage your credentials, notification preferences, and link connected accounts.',
    },
    {
      id: 'tour-dashboard-main',
      title: 'Active Workspace Overview',
      content:
        'And finally, your main hub workspace where stats, checklists, and projects sit!',
    },
  );

  return steps;
}

export function DashboardTour() {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: false });
  const { updateProfile } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const [boxRect, setBoxRect] = useState<DOMRect | null>(null);

  // 1. MEMOIZE TOUR STEPS
  const tourSteps = useMemo(() => {
    return getTourSteps(user);
  }, [user]);

  // 2. HYBRID PERSISTENCE CHECK (Database status + LocalStorage fallback)
  useEffect(() => {
    if (isLoading || !user) return;

    const tourKey = `hasSeenDashboardTour-${user.id}`;
    const hasSeenTourLocal = localStorage.getItem(tourKey);
    const hasSeenTourDb = user.hasSeenDashboardTour;
    const isTourComplete = hasSeenTourDb || hasSeenTourLocal === 'true';

    if (!isTourComplete) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  // 3. PREVENT RADIX MOBILE SHEET FROM CLOSING WHEN CLICKING TOUR CARD
  useEffect(() => {
    if (!isActive || !isMobile) return;

    const handlePointerDownCapture = (e: PointerEvent) => {
      // Intercept clicks on the Tour box before Radix Sheet sees them as "outside clicks"
      if (boxRef.current && boxRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };

    window.addEventListener('pointerdown', handlePointerDownCapture, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownCapture, true);
    };
  }, [isActive, isMobile]);

  // 4. AUTO-MANAGE MOBILE SIDEBAR DRAWER STABILITY
  useEffect(() => {
    if (!isActive || tourSteps.length === 0) return;

    const step = tourSteps[currentStep];
    if (!step) return;

    if (isMobile) {
      const isSidebarItem = step.id.startsWith('tour-nav-');
      if (isSidebarItem) {
        setOpenMobile(true);
      } else {
        setOpenMobile(false);
      }
    }
  }, [currentStep, isActive, isMobile, setOpenMobile, tourSteps]);

  // 5. COORDINATE POSITION UPDATES
  const updateRects = useCallback(() => {
    if (!isActive || tourSteps.length === 0) return;

    // Update Text Box Coordinates
    if (boxRef.current) {
      const newBoxRect = boxRef.current.getBoundingClientRect();
      setBoxRect((prev) => {
        if (
          prev &&
          prev.top === newBoxRect.top &&
          prev.left === newBoxRect.left &&
          prev.width === newBoxRect.width &&
          prev.height === newBoxRect.height
        ) {
          return prev;
        }
        return newBoxRect;
      });
    }

    const step = tourSteps[currentStep];
    if (!step) return;

    // Update Target Element Coordinates
    const el = document.getElementById(step.id);
    if (el) {
      const newTargetRect = el.getBoundingClientRect();
      setTargetRect((prev) => {
        if (
          prev &&
          prev.top === newTargetRect.top &&
          prev.left === newTargetRect.left &&
          prev.width === newTargetRect.width &&
          prev.height === newTargetRect.height
        ) {
          return prev;
        }
        return newTargetRect;
      });
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep, tourSteps]);

  // HIGH-PERFORMANCE 60FPS TRACKING (Zero idle CPU load)
  useEffect(() => {
    if (!isActive) return;

    updateRects();

    const handleUpdate = () => updateRects();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Track smoothly during drawer slide transitions (350ms)
    let animationFrameId: number;
    const startTime = performance.now();

    const animateTracking = (now: number) => {
      updateRects();
      if (now - startTime < 350) {
        animationFrameId = requestAnimationFrame(animateTracking);
      }
    };

    animationFrameId = requestAnimationFrame(animateTracking);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, currentStep, updateRects]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismissTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  // 6. DISMISS TOUR
  const dismissTour = async () => {
    setIsActive(false);

    if (isMobile) {
      setOpenMobile(false);
    }

    if (user) {
      const tourKey = `hasSeenDashboardTour-${user.id}`;
      localStorage.setItem(tourKey, 'true');

      try {
        await updateProfile({ hasSeenDashboardTour: true });
      } catch (error) {
        console.error(
          'Failed to sync tour completion state to database:',
          error,
        );
      }
    }
  };

  const step = tourSteps[currentStep];

  if (!isActive || isLoading || tourSteps.length === 0 || !step) return null;

  let pathD = '';
  if (boxRect && targetRect) {
    const startX = boxRect.left + boxRect.width / 2;
    const startY = boxRect.top - 10;
    const endX = targetRect.left + targetRect.width / 1.1;

    let endY = targetRect.bottom + 10;
    if (targetRect.top > boxRect.bottom) {
      endY = targetRect.top - 10;
    } else if (Math.abs(targetRect.top - boxRect.top) < 300) {
      endY = targetRect.top + targetRect.height / 2;
    }

    const cpX = startX;
    const cpY = (startY + endY) / 2;

    pathD = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  }

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Target Spotlight Highlight */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg transition-all duration-200"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
          }}
        />
      )}

      {/* SVG Arrow Layer */}
      <svg className="absolute inset-0 w-full h-full z-[95] overflow-visible">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" className="fill-primary" />
          </marker>
        </defs>
        {pathD && (
          <path
            d={pathD}
            fill="none"
            strokeWidth="3"
            strokeDasharray="6,6"
            markerEnd="url(#arrowhead)"
            className="stroke-primary transition-all duration-200"
          />
        )}
      </svg>

      {/* Text Box Card (Elevated to z-[100] above the mobile drawer Sheet backdrop) */}
      <div
        ref={boxRef}
        className={cn(
          'pointer-events-auto absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2',
          'w-[calc(100%-2rem)] max-w-md bg-card border shadow-2xl rounded-xl p-4 sm:p-5 z-[100] transition-all duration-300',
        )}
      >
        <button
          onClick={dismissTour}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-semibold text-base sm:text-lg mb-1.5 sm:mb-2 pr-6">
          {step.title}
        </h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 max-w-[50%] flex-wrap">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all mt-1 ${
                  i === currentStep
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              Prev
            </Button>
            <Button size="sm" onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
