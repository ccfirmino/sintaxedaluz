import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Configurações (A Vercel vai pegar isso das Variáveis de Ambiente)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Impede que a Vercel modifique o corpo da mensagem (necessário para segurança do Stripe)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;

    // 1. Verificar se o aviso veio realmente do Stripe
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error(`Erro no Webhook: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Se o pagamento foi aprovado (Checkout completo)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.customer_details.email; 
      
      console.log(`💰 Pagamento recebido de: ${userEmail}`);

      // Calcula data de expiração (1 ano a partir de hoje)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // 3. Atualizar o Supabase
      // Procura na tabela 'profiles' alguém com esse email e marca como PRO
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
            is_pro: true,
            license_expiry: oneYearFromNow.toISOString()
        })
        .eq('email', userEmail);

      if (error) {
        console.error('Erro ao atualizar Supabase:', error);
        return res.status(500).json({ error: 'Falha ao atualizar banco de dados' });
      }

      console.log('✅ Usuário atualizado para PRO!');
    }

    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}