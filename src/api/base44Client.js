import { supabase } from './supabaseClient';

const buildEntity = (tableName) => ({
  list: async (sort = '') => {
    let query = supabase.from(tableName).select('*');
    if (sort) query = query.order(sort.replace(/^-/, ''), { ascending: !sort.startsWith('-') });
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
  get: async (id) => {
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from(tableName).insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  },
});

export const base44 = {
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      return {
        ...user,
        full_name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
        role: profile?.role || 'user',
      };
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },
  entities: {
    AppSettings: buildEntity('app_settings'),
    Transaction: buildEntity('transaction'),
    Student: buildEntity('student'),
    Lesson: buildEntity('lesson'),
    Receipt: buildEntity('receipt'),
    User: {
      list: async () => {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data ?? [];
      },
    },
    Quote: buildEntity('quote'),
    Client: buildEntity('client'),
    CompanySettings: buildEntity('company_settings'),
    ServiceOrder: buildEntity('service_order'),
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, bucket = 'public' }) => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return { file_url: publicUrlData.publicUrl };
      },
      SendEmail: async (payload) => payload,
    },
  },
};
