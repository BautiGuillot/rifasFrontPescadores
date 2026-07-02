# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.3.

## Configuracion API

La URL de la API se configura por ambiente:

- Desarrollo: `src/environments/environment.development.ts`
- Produccion: `src/environments/environment.ts`

En desarrollo apunta a:

```ts
http://localhost:8080/api
```

En produccion usa:

```ts
/api
```

## Funcionalidad actual

- Home publica de rifas activas.
- Rifas finalizadas con ganadores.
- Detalle de rifa con grilla de numeros y compra publica.
- Login admin con JWT y refresh token.
- Panel super admin para crear clientes y activar/inactivar suscripciones.
- Panel cliente admin con dashboard, rifas, compras y carga de ganadores.
- Edicion de rifas en borrador.
- Confirmaciones antes de publicar, finalizar, cancelar, aprobar compras y cancelar compras.
- Links publicos de rifa por slug: `/r/{slug}`.

Pendiente para proxima etapa:

- Branding visual especifico de Pescadores Argentinos: logo, colores finales, imagenes o identidad del cliente.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
