import postgres from 'postgres';

// Lazy singleton — avoids throwing at module-load time during Vercel build
let _client: ReturnType<typeof postgres> | null = null;

function getClient() {
    if (!_client) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined. Set it in your environment variables.');
        }
        _client = postgres(process.env.DATABASE_URL);
    }
    return _client;
}

// Proxy keeps the tagged-template API (sql`SELECT ...`) working transparently
export const sql = new Proxy(
    (() => {}) as unknown as ReturnType<typeof postgres>,
    {
        apply(_target, _thisArg, args) {
            return (getClient() as any)(...args);
        },
        get(_target, prop) {
            return (getClient() as any)[prop];
        },
    }
);
