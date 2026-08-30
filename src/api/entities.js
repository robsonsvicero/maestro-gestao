import { supabase } from './supabaseClient';

// Exemplo: entidade "Query" (ajuste o nome da tabela conforme seu schema)
export const Query = {
  list: async () => {
    const { data, error } = await supabase.from('query').select('*');
    if (error) throw error;
    return data;
  },
  get: async (id) => {
    const { data, error } = await supabase.from('query').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('query').insert(payload).select();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('query').update(payload).eq('id', id).select();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('query').delete().eq('id', id);
    if (error) throw error;
  },
};

// auth (substitui base44.auth)
export const User = supabase.auth;