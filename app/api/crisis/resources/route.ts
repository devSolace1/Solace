import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { CrisisResourcesService } from '../../../../lib/services/crisisResourcesService';
import { SecurityService } from '../../../../lib/services/securityService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const tags = searchParams.get('tags')?.split(',');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const search = searchParams.get('search');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let query = supabase
      .from('crisis_resources_v4')
      .select(`
        id,
        title,
        description,
        category,
        tags,
        content_type,
        content_url,
        is_featured,
        helpfulness_score,
        view_count,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .order('helpfulness_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: resources, error } = await query;

    if (error) {
      console.error('Error fetching crisis resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json({ resources: resources || [] });
  } catch (error) {
    console.error('Error in crisis resources fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, tags, contentType, contentUrl, isFeatured } = body as {
    title: string;
    description: string;
    category: string;
    tags?: string[];
    contentType: string;
    contentUrl?: string;
    isFeatured?: boolean;
  };

  if (!title || !description || !category || !contentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user and check admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or verified counselor
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: counselorProfile } = await supabase
      .from('counselor_profiles')
      .select('verification_status')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    const isVerifiedCounselor = counselorProfile?.verification_status === 'verified';

    if (!isAdmin && !isVerifiedCounselor) {
      return NextResponse.json({ error: 'Admin or verified counselor access required' }, { status: 403 });
    }

    // Sanitize input
    const sanitizedTitle = SecurityService.sanitizeInput(title);
    const sanitizedDescription = SecurityService.sanitizeInput(description);

    // Create resource
    const { data: resource, error: resourceError } = await supabase
      .from('crisis_resources_v4')
      .insert({
        title: sanitizedTitle,
        description: sanitizedDescription,
        category,
        tags: tags || [],
        content_type: contentType,
        content_url: contentUrl,
        is_featured: isFeatured || false,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (resourceError) {
      console.error('Error creating crisis resource:', resourceError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        tags: resource.tags,
        contentType: resource.content_type,
        contentUrl: resource.content_url,
        isFeatured: resource.is_featured,
        createdAt: resource.created_at
      }
    });
  } catch (error) {
    console.error('Error in crisis resource creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { resourceId, title, description, category, tags, contentType, contentUrl, isFeatured, isActive } = body as {
    resourceId: string;
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    contentType?: string;
    contentUrl?: string;
    isFeatured?: boolean;
    isActive?: boolean;
  };

  if (!resourceId) {
    return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user and check permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required for updates' }, { status: 403 });
    }

    const updateData: any = {};

    if (title) updateData.title = SecurityService.sanitizeInput(title);
    if (description) updateData.description = SecurityService.sanitizeInput(description);
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (contentType) updateData.content_type = contentType;
    if (contentUrl !== undefined) updateData.content_url = contentUrl;
    if (isFeatured !== undefined) updateData.is_featured = isFeatured;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: resource, error } = await supabase
      .from('crisis_resources_v4')
      .update(updateData)
      .eq('id', resourceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating crisis resource:', error);
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    console.error('Error in crisis resource update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}