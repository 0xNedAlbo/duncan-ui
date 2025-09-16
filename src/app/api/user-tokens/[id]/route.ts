import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const UpdateUserTokenSchema = z.object({
  userLabel: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * PUT /api/user-tokens/[id] - Update user token (label, notes)
 * Body: { userLabel?, notes? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id } = params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateUserTokenSchema.parse(body);

    const { tokenResolutionService } = DefaultServiceFactory.getInstance().getServices();
    const updatedToken = await tokenResolutionService.updateUserToken(
      session.user.id,
      id,
      validatedData
    );

    return NextResponse.json({ userToken: updatedToken });

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-tokens/[id] - Remove user token
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id } = params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    const { tokenResolutionService } = DefaultServiceFactory.getInstance().getServices();
    await tokenResolutionService.removeUserToken(session.user.id, id);

    return NextResponse.json({ message: 'Token removed successfully' });

  } catch (error) {
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}