import { supabase } from './supabaseClient';

const isUnauthorized = (error) => error?.status === 401 || error?.message?.toLowerCase().includes('row level security') || error?.name === 'AuthSessionMissingError';

const buildEntity = (tableName) => ({
  list: async (sort = '') => {
    try {
      let query = supabase.from(tableName).select('*');
      if (sort) query = query.order(sort.replace(/^-/, ''), { ascending: !sort.startsWith('-') });
      const { data, error } = await query;
      if (error) {
        if (isUnauthorized(error)) return [];
        throw error;
      }
      return data ?? [];
    } catch (error) {
      if (isUnauthorized(error)) return [];
      throw error;
    }
  },
  get: async (id) => {
    try {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
      return data ?? null;
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },
  create: async (payload) => {
    try {
      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
      return data;
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },
  update: async (id, payload) => {
    try {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
      if (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
      return data;
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        if (isUnauthorized(error)) return;
        throw error;
      }
    } catch (error) {
      if (isUnauthorized(error)) return;
      throw error;
    }
  },
});

const getCurrentUserSafe = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      if (error?.status === 401 || error?.name === 'AuthSessionMissingError') return null;
      throw error;
    }

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      ...user,
      full_name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
      role: profile?.role || 'user',
    };
  } catch (error) {
    if (error?.status === 401 || error?.name === 'AuthSessionMissingError') return null;
    throw error;
  }
};

export const base44 = {
  auth: {
    me: async () => getCurrentUserSafe(),
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
      UploadFile: async ({ file, bucket = 'logos' }) => {
        // Validar tipo de arquivo
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!validImageTypes.includes(file.type)) {
          throw new Error(`Tipo de arquivo não permitido. Aceitos: ${validImageTypes.join(', ')}`);
        }

        // Validar tamanho máximo (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`Arquivo muito grande. Máximo permitido: 5MB`);
        }

        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          console.error('Upload error details:', error);
          throw new Error(`Erro ao fazer upload: ${error.message || 'Tente novamente'}`);
        }

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return { file_url: publicUrlData.publicUrl };
      },
      SendEmail: async (payload) => payload,
    },
  },
};
