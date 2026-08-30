import { supabase } from './supabaseClient';

// UploadFile — Supabase Storage cobre nativamente
export const UploadFile = async (file, bucket = 'uploads') => {
  const filePath = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { path: data.path, url: publicUrlData.publicUrl };
};

// As integrações abaixo precisam de serviços externos + Edge Functions do Supabase.
// Deixe-as como placeholders até implementarmos cada uma:

export const InvokeLLM = async (params) => {
  // Ex: chamar uma Edge Function que fala com a API da OpenAI/Anthropic
  throw new Error('InvokeLLM ainda não implementado — requer integração com LLM externo');
};

export const SendEmail = async (params) => {
  // Ex: Edge Function usando Resend, SendGrid ou Postmark
  throw new Error('SendEmail ainda não implementado — requer serviço de e-mail externo');
};

export const SendSMS = async (params) => {
  // Ex: Edge Function usando Twilio
  throw new Error('SendSMS ainda não implementado — requer serviço de SMS externo');
};

export const GenerateImage = async (params) => {
  // Ex: Edge Function chamando DALL-E, Stability AI, etc.
  throw new Error('GenerateImage ainda não implementado — requer serviço de geração de imagem');
};

export const ExtractDataFromUploadedFile = async (params) => {
  // Ex: Edge Function com OCR/parsing (ex: OpenAI Vision, AWS Textract)
  throw new Error('ExtractDataFromUploadedFile ainda não implementado — requer serviço de extração');
};

export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};