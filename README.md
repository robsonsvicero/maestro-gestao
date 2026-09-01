# Maestro Gestão

## Deploy de teste no Vercel

O projeto é uma aplicação React/Vite estática. O arquivo `vercel.json` já inclui o fallback necessário para que rotas como `/Schedule`, `/Settings` e `/login` funcionem ao atualizar a página diretamente.

No Vercel, configure as variáveis de ambiente abaixo para os ambientes **Preview** e **Production**:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable-do-supabase
```

Use `.env.example` apenas como referência. Não envie o arquivo `.env.local` ao repositório e nunca adicione `SUPABASE_SERVICE_ROLE_KEY` ao Vercel: ela concede privilégios administrativos ao banco e não deve ser exposta no navegador.

Após receber a URL do Vercel, adicione-a no Supabase em **Authentication → URL Configuration**:

- **Site URL**: URL principal do Vercel;
- **Redirect URLs**: `https://seu-projeto.vercel.app/Settings` e `https://seu-projeto.vercel.app/login`.

Para recuperação de senha, confirme que o provedor SMTP está configurado no Supabase.

## Desenvolvimento

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
