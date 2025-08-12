
# Project Overview

This project is a typescript application that is an open-source implementation of [OpenRouter](https://openrouter.ai/), aiming to provide feature parity with stronger user experience (UX).

## Folder Structure

- [packages](../../packages/): Contains common packages shared across the application.
- [apps](../../apps/): Contains application-specific codebases, such as the web app, API service, and SDKs.
- [infra](../../infra/): Contains infrastructure-related code, for IaC (Infrastructure as Code).
- [scripts](../../scripts/): Contains scripts for various tasks, such as seeding the database.
- [migrations](../../drizzle/migrations/): Contains database migration files generated and managed by drizzle-orm. These should **NEVER** be modified directly.
- [schema](../../drizzle/schema/): Contains database schema definitions and migrations.
- [schemas](../../packages/core/src/schemas/): Contains Zod schemas for data model validation.

## Libraries & Frameworks

- [Alchemy](https://alchemy.run): Infrastructure as TypeScript - Deploy to Cloudflare, AWS, and more with pure TypeScript. Generate support for any API in minutes with AI.
- [Drizzle](https://orm.drizzle.team/): A TypeScript ORM for PostgreSQL, MySQL, and SQLite.
- [Zod](https://zod.dev/): A TypeScript-first schema declaration and validation library.
  - Always import zod using the syntax:

    ```typescript
    import * as z from 'zod';
    ```

  - When creating schemas for database models, always use `createSelectSchema`, `createInsertSchema`, and `createUpdateSchema` from `drizzle-zod`.

- [Better-Auth](https://better-auth.com/): The most comprehensive authentication framework for TypeScript.
  - Better-Auth generates database schemas **which should never be modified directly** in [auth.ts](../../drizzle/schema/auth.ts).
  - You can use the any `meta` or `metadata` columns on these tables to store custom domain information.

- [Hono](https://hono.dev/): Fast, lightweight, built on Web Standards. Support for any JavaScript runtime.
- [Hono-OpenAPI](https://github.com/rhinobase/hono-openapi): Hono middleware to generate OpenAPI Swagger documentation.

Search package.json files for additional libraries that are used.

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. You can use the following commands:

- `bun run lint`: Lint the codebase.
- `bun run lint:fix`: Fix linting errors.
- `bun run format`: Format the codebase.

## Coding Standards

- Use camelCase for variable and function names.
- Use PascalCase for class names.
- Use kebab-case for file/directory names.
- Prefer named exports over default exports.
- Use `createId` from [id.ts](../../packages/core/src/utils/id.ts) to generate unique identifiers.
- Always examine the codebase for existing patterns and practices.

## Tool usage

- Always use #context7 to get up-to-date documentation on libraries and frameworks used in the project.
