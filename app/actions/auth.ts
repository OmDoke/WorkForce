"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export async function sendOtpAction(phone: string) {
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });

  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

export async function verifyOtpAction(phone: string, token: string, type: 'customer' | 'worker' = 'customer') {
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token,
    type: 'sms',
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Authentication failed" };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    const adminPhone = process.env.ADMIN_PHONE;
    if (adminPhone && formattedPhone === adminPhone) {
      // Forcefully pass the access token to ensure RLS is bypassed / authenticated properly
      const authenticatedClient = await createClient();
      if (data.session) {
        await authenticatedClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      
      const { error: insertError } = await authenticatedClient.from('profiles').insert({
        id: data.user.id,
        role: 'admin',
        full_name: 'System Admin',
        phone: formattedPhone,
        address: 'HQ'
      });
      if (!insertError) {
        return { redirectUrl: '/admin/dashboard' };
      } else {
        console.error("Failed to auto-create admin profile:", insertError);
      }
    }

    // Check if this phone number was pre-added by an admin
    const { data: preAdded } = await supabase
      .from('admin_pre_added_workers')
      .select('id')
      .eq('phone', formattedPhone)
      .single();

    if (preAdded) {
      return { redirectUrl: '/worker/complete-profile' };
    }

    if (type === 'worker') {
      return { redirectUrl: '/worker/register' };
    }
    return { redirectUrl: '/register' };
  }

  if (profile.role === 'customer') {
    return { redirectUrl: '/dashboard' };
  } else if (profile.role === 'admin') {
    return { redirectUrl: '/admin/dashboard' };
  } else {
    return { redirectUrl: '/worker/dashboard' };
  }
}

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Farm address is required"),
});

export async function registerCustomerAction(data: z.infer<typeof registerSchema>) {
  const validated = registerSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Invalid data" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    role: 'customer',
    full_name: validated.data.fullName,
    phone: validated.data.phone,
    address: validated.data.address
  });

  if (error) {
    return { error: error.message };
  }

  return { redirectUrl: '/dashboard' };
}

const registerWorkerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Home address is required"),
  gender: z.enum(["male", "female", "other"]),
  hasBike: z.boolean().default(false),
});

export async function registerWorkerAction(data: z.infer<typeof registerWorkerSchema>) {
  const validated = registerWorkerSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Invalid data" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // 1. Insert into profiles with role = 'new_worker'
  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    role: 'new_worker',
    full_name: validated.data.fullName,
    phone: validated.data.phone,
    address: validated.data.address
  });

  if (profileError) {
    return { error: profileError.message };
  }

  // 2. Insert into workers
  const { error: workerError } = await supabase.from('workers').insert({
    profile_id: user.id,
    gender: validated.data.gender,
    has_bike: validated.data.hasBike,
    is_on_leave: false
  });

  if (workerError) {
    return { error: workerError.message };
  }

  return { redirectUrl: '/worker/pending-verification' };
}

const completeProfileSchema = z.object({
  address: z.string().min(5, "Home address is required"),
  gender: z.enum(["male", "female", "other"]),
  hasBike: z.boolean().default(false),
});

export async function completePreAddedWorkerAction(data: z.infer<typeof completeProfileSchema>) {
  const validated = completeProfileSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid data" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.phone) return { error: "Not authenticated" };

  const formattedPhone = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;

  // Find the pre-added record
  const { data: preAdded, error: lookupError } = await supabase
    .from('admin_pre_added_workers')
    .select('id, full_name')
    .eq('phone', formattedPhone)
    .single();

  if (lookupError || !preAdded) {
    return { error: "Pre-approved worker record not found." };
  }

  // 1. Create profile with role = 'worker'
  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    role: 'worker',
    full_name: preAdded.full_name,
    phone: formattedPhone,
    address: validated.data.address
  });

  if (profileError) return { error: profileError.message };

  // 2. Create worker record (bypasses pending-verification)
  const { error: workerError } = await supabase.from('workers').insert({
    profile_id: user.id,
    gender: validated.data.gender,
    has_bike: validated.data.hasBike,
    is_on_leave: false,
    verified_at: new Date().toISOString() // Pre-verified!
  });

  if (workerError) return { error: workerError.message };

  // 3. Delete the staging record
  await supabase.from('admin_pre_added_workers').delete().eq('id', preAdded.id);

  return { redirectUrl: '/worker/dashboard' };
}
