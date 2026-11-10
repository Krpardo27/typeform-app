export class SearchAuthError extends Error {
  constructor() {
    super("Debes iniciar sesión para usar el buscador");
    this.name = "SearchAuthError";
  }
}
