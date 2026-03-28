export default function handler(request, response) {
    // Busca as chaves seguras do cofre da Vercel
    response.status(200).json({
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY
    });
}