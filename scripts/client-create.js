require('../lib/relative_absolute.js');
const { db } = require('#/configs/database.js');
const { ClientsUpsertService } = require('~/services/clients/upsert_service.js');
const { ProductsUpsertService } = require('~/services/products/upsert_service.js');
const { ClientsAssistantsUpsertService } = require('~/services/clients_assistants/upsert_service.js');

const Workflows = require('~/models/workflow.js');

(async () => {
  console.info('Inserting seeds...');

  await db().transaction(async (trx) => {
    const ecommerceDemo = await Workflows().select('id').findOne({ slug: 'ecommerce-demo' });

    const client = await ClientsUpsertService({
      name: 'Moda da MIMI',
      findable_message: 'Eu quero me mimizar!',
      first_workflow_id: ecommerceDemo.id,
    });

    const products = await Promise.all([
      ProductsUpsertService({
        client_id: client.id,
        code: 'miados-e-mordidas',
        name: 'Miados e Mordidas',
        price: 3999,
        description: 'Gato: Mestre da preguiça, criador: Discípulo dedicado.',
        visual_description: 'Blusa com estampa de gato laranja e preto deitado em um sofá com um controle remoto na pata e um humano no chão tentando pegar o controle.',
        photo_url: 'tmp/miados-e-mordidas.webp',
        metadata: {
          tags: ['funny', 'sarcastic']
        }
      }),
      ProductsUpsertService({
        client_id: client.id,
        code: 'purrfessional',
        name: 'Purrfessional',
        price: 4999,
        description: 'Nossa blusa "Purrfessional" é perfeita para você que leva a parceria com seu gato a sério!',
        visual_description: 'Blusa com estampa de gato preto e branco com óculos escuros e gravata borboleta, e um humano ao lado com óculos de leitura e uma gravata.',
        photo_url: 'tmp/purrfessional.webp',
        metadata: {
          tags: ['dark humor']
        }
      }),
      ProductsUpsertService({
        client_id: client.id,
        code: 'ronaldo-das-patinhas',
        name: 'Ronaldo das Patinhas',
        price: 4499,
        description: 'Meu gato joga bola? Só se for pra tirar o pó da casa!',
        visual_description: 'Blusa com estampa de um gato preto e branco com uma bola de futebol na boca e um humano atrás dele tentando pegar a bola.',
        photo_url: 'tmp/ronaldo-das-patinhas.webp',
        metadata: {
          tags: ['funny']
        }
      }),
      ProductsUpsertService({
        client_id: client.id,
        code: 'cacadores-de-caixas',
        name: 'Caçadores de Caixas',
        price: 3499,
        description: 'Gato feliz é aquele que cabe na caixa, e criador feliz é aquele que tem várias caixas.',
        visual_description: 'Blusa com estampa de um gato cinza dentro de uma caixa de papelão e um humano olhando para ele.',
        photo_url: 'tmp/cacadores-de-caixas.webp',
        metadata: {
          tags: ['funny']
        }
      }),
      ProductsUpsertService({
        client_id: client.id,
        code: 'senhor-dos-arranhoes',	
        name: 'Senhor dos Arranhões',
        price: 5499,
        description: 'Cuidado com o sofá, ou ele vira território do gato!',
        visual_description: 'Blusa com estampa de um gato preto e branco arranhando um sofá e um humano tentando impedir. O gato está com uma expressão de felicidade.',
        photo_url: 'tmp/senhor-dos-arranhoes.webp',
        metadata: {
          tags: ['dark humor']
        }
      }),
      ProductsUpsertService({
        client_id: client.id,
        code: 'gato-espacial',
        name: 'Gato Espacial',
        price: 5999,
        description: 'Gato: "Eu sou o gato espacial, o gato mais espacial do mundo!"',
        visual_description: 'Blusa com estampa de um gato preto e branco com um capacete de astronauta e uma nave espacial ao fundo.',
        photo_url: 'tmp/gato-espacial.webp',
        metadata: {
          tags: ['funny']
        }
      }),
    ]);
    
    const assistantName = 'John';
    const instructions = `
    You are ${assistantName}, a customer service representative for Moda da MIMI, a company that sells unique, self-created T-shirts with cat themes and cat jokes.
    Your role is to assist customers in choosing the perfect T-shirt, providing information about the products, and guiding them through the ordering process.
    
    ${assistantName} characteristics:
      - Write short sentences like a instant message chat.
      - Use a playful and fun tone.
      - Be engaging, light-hearted, and personable.
      - Use colloquial language to create a friendly and approachable atmosphere.
      - Use humor and cat-related jokes where appropriate.
      - Ensure responses are quick to maintain a fast-paced interaction.
    **Customer Interaction**:
      - **Greeting**: Start with a friendly greeting and an engaging question.
        - Example: "Olá! Bem-vindo à Moda da MIMI! Como posso ajudar a tornar seu dia mais felino hoje?"
      - **Product Information**: Offer detailed and enthusiastic descriptions of the T-shirts.
        - Example: "Nossa blusa 'Purrfessional' é perfeita para você que leva a parceria com seu gato a sério! 😺 'Gato e criador, uma parceria de MIAU sucesso.'"
      - **Humor Integration**: Incorporate jokes naturally into the conversation.
        - Example: "Procurando uma blusa divertida? Que tal a 'Ronaldo das Patinhas'? 'Meu gato joga bola? Só se for pra tirar o pó da casa!' 😂"
    
    **Main products**:
      - **${products[0].name}**: ${products[0].description}
      - **${products[1].name}**: ${products[1].description}
      - **${products[2].name}**: ${products[2].description}

    **Messages localization:**
    portuguese (pt-BR)

    **Common Questions and Answers**:
      - Qual o prazo de entrega? Normalmente, nossos pedidos chegam em 5-7 dias úteis.
      - Como faço para trocar um produto? Você pode solicitar a troca em até 30 dias após a compra.
      - Vocês têm tamanhos maiores? Sim, temos tamanhos do P ao GG.
      - Como faço para rastrear meu pedido? Assim que o pedido for enviado, você receberá um e-mail com o código de rastreamento.
      - Posso personalizar uma blusa? No momento, não oferecemos personalização, mas estamos sempre lançando novos designs
      - Vocês têm loja física? No momento, operamos exclusivamente online.
      - Como faço para pagar? Aceitamos cartões de crédito, débito e boleto bancário.
      - Vocês entregam para todo o Brasil? Sim, entregamos para todo o Brasil.
      - Qual a política de devolução? Você pode devolver o produto em até 7 dias após o recebimento.
      - Como faço para entrar em contato com o suporte? Você pode nos enviar um e-mail para suporte@mimi.com
    
    **Goal**:
    ${assistantName} salary is based on the number of successful sales he makes. Your goal is to assist customers in choosing the perfect T-shirt and guide them through the ordering process to increase sales.
    `;
    await ClientsAssistantsUpsertService({
      client_id: client.id,
      assistant_name: assistantName,
      instructions,
      first_message: 'Olá! Bem-vindo à Moda da MIMI! Como posso ajudar a tornar seu dia mais felino hoje?',
      last_message: 'Obrigado por escolher a Moda da MIMI! Se precisar de mais alguma coisa, estou aqui para ajudar. 😺',
      locale_iso2: 'pt-BR',
    });
  });

  console.info('Seeds inserted.');
  process.exit(0);
})();
