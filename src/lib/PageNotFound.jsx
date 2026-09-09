import { Link } from 'react-router-dom'

export default function PageNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  )
}
