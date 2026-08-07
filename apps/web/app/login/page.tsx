'use client';
import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  loginRequestSchema,
  type ExploreProjectResponse,
  type LoginRequest,
} from '@repo/contracts';
import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useExploreProjects } from '@/hooks/use-projects';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

function ProjectThumbnail({
  project,
  index,
}: {
  project: ExploreProjectResponse;
  index: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const coverUrl = project.media[0]?.publicUrl;
  const imageUrl = coverUrl ?? project.logoUrl;

  return (
    <div
      className={`relative flex h-16 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br px-4 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
    >
      {imageUrl && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${project.title} preview`}
          onError={() => setImageFailed(true)}
          className={
            coverUrl
              ? 'absolute inset-0 h-full w-full object-cover'
              : 'h-10 w-10 rounded-md bg-white/90 object-contain p-1 shadow-sm'
          }
        />
      )}
    </div>
  );
}

// Component to handle fetching & randomizing projects
function RandomProjects() {
  // Fetch up to 50 projects for a healthy randomization pool
  const { projects, isLoading } = useExploreProjects({ limit: 50 });
  const [randomProjects, setRandomProjects] = useState<typeof projects>([]);

  useEffect(() => {
    if (projects && projects.length > 0) {
      // Shuffle results from limit: 50 and pick 9 max
      const shuffled = [...projects].sort(() => 0.5 - Math.random());
      setRandomProjects(shuffled.slice(0, 9));
    }
  }, [projects]);

  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        <h3 className="text-xl font-semibold mb-2 lg:mb-6 text-foreground text-center lg:text-left">
          Discover Projects
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (randomProjects.length === 0) {
    return (
      <div className="space-y-4 w-full text-center lg:text-left">
        <h3 className="text-xl font-semibold mb-6 text-foreground">
          Discover Projects
        </h3>
        <p className="text-muted-foreground text-sm">
          No projects to discover yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <h3 className="text-xl font-semibold mb-2 lg:mb-6 text-foreground text-center lg:text-left">
        Discover Projects
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {randomProjects.map((project, index) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug}`}
            className="block h-full"
          >
            <Card className="flex flex-col overflow-hidden py-0 border-white/10 shadow-[0_0_60px_-15px_rgba(47,120,238,0.15)] hover:border-primary/50 transition-colors h-full">
              <ProjectThumbnail project={project} index={index} />

              <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3 pb-4">
                <h4 className="text-sm font-semibold line-clamp-1">
                  {project.title}
                </h4>
                {project.shortDescription && (
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {project.shortDescription}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    setIsSubmitting(true);
    try {
      const { user } = await login(data);
      const rawRedirect = searchParams.get('redirect');
      const redirectPath =
        user.role === 'SUPER_ADMIN'
          ? '/admin'
          : rawRedirect &&
              rawRedirect.startsWith('/') &&
              !rawRedirect.startsWith('//')
            ? rawRedirect
            : '/dashboard';

      router.push(redirectPath);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to log in',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <Link
          href="/forgot-password"
          className="block text-right text-sm text-blue hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Logging in...
          </>
        ) : (
          'Log in'
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Enter your email and password to log in."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
      sideContent={<RandomProjects />}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
