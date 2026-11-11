// Membuat dist-types/package.json: paket tipe MINIMAL (hanya .d.ts + peer dep elysia),
// supaya frontend tidak ikut menginstal drizzle/zod/dll milik backend.
import pkg from '../package.json'

const elysiaRange = (pkg.dependencies as Record<string, string>).elysia

await Bun.write(
  'dist-types/package.json',
  JSON.stringify(
    {
      name: pkg.typesPackage,
      version: pkg.version,
      description: 'Kontrak tipe API (Eden Treaty). Hanya tipe, tanpa kode runtime.',
      types: './types.d.ts',
      exports: { '.': { types: './types.d.ts' } },
      peerDependencies: { elysia: elysiaRange },
      publishConfig: { registry: 'https://npm.pkg.github.com' },
    },
    null,
    2,
  ) + '\n',
)
console.log(`types package: ${pkg.typesPackage}@${pkg.version} (peer elysia ${elysiaRange})`)
