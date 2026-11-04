/* ============================================================
   SUPORTE — dados, FAQ, tutoriais e base da IA local
   ============================================================ */

/* Categorias de FAQ */
const FAQ_DATA = [
  {
    id: 'compras',
    name: 'Compras',
    icon: 'cart',
    questions: [
      { q: 'Como faço uma compra?', a: 'Acesse o Catálogo, escolha o produto e clique em Comprar. Informe o e-mail de entrega, escolha a forma de pagamento e confirme. Você pode pagar com PIX, cartão de crédito ou saldo da carteira.' },
      { q: 'Em quanto tempo recebo o produto?', a: 'Produtos com entrega automática são liberados em até 5 minutos após a confirmação do pagamento. Produtos com entrega manual podem levar até 2 horas úteis. Você recebe uma notificação por e-mail e pode conferir em Minhas telas.' },
      { q: 'Posso cancelar um pedido?', a: 'Sim, enquanto o pedido estiver pendente ou aprovado você pode solicitar cancelamento em Meus pedidos. Se o produto já tiver sido entregue, o cancelamento fica sujeito às regras de reembolso.' },
      { q: 'Não recebi o produto. O que fazer?', a: 'Verifique em Minhas telas se a entrega já apareceu. Se o pagamento foi confirmado e a tela não aparece após 30 minutos, abra um chamado na categoria "Acesso à tela ou assinatura".' },
    ],
  },
  {
    id: 'pagamentos',
    name: 'Pagamentos',
    icon: 'card',
    questions: [
      { q: 'Quais formas de pagamento vocês aceitam?', a: 'PIX (instantâneo, via Mercado Pago), cartão de crédito (Visa, Master, Elo, Amex) e saldo da carteira STREAMLY.' },
      { q: 'O PIX não caiu. O que fazer?', a: 'O PIX costuma confirmar em até 1 minuto. Se já pagou e o saldo não entrou, aguarde 5 minutos e abra Carteira → verifique se a cobrança está como "pendente". Se continuar pendente por mais de 15 minutos, abra um chamado na categoria "Pagamento / PIX" com o comprovante.' },
      { q: 'Posso pagar com saldo da carteira?', a: 'Sim. No carrinho, escolha "Saldo da carteira". O valor é debitado na hora da confirmação do pedido. Se o saldo for insuficiente, complete com outro método.' },
      { q: 'Como recebo o comprovante?', a: 'Todo pagamento aprovado gera um comprovante em Meus pedidos → [seu pedido] → Comprovante. Também enviamos por e-mail se essa preferência estiver ativa em Configurações.' },
    ],
  },
  {
    id: 'assinaturas',
    name: 'Assinaturas',
    icon: 'refresh',
    questions: [
      { q: 'Como funciona a renovação automática?', a: 'Quando a renovação automática está ativa, sua assinatura é renovada automaticamente ao fim de cada período, com nova cobrança no método cadastrado. Você pode desativar a qualquer momento em Assinaturas → [sua assinatura] → Renovação automática.' },
      { q: 'Posso alterar meu plano?', a: 'Sim. Em Assinaturas → Alterar plano. A alteração vale a partir do próximo ciclo — o valor pago no ciclo atual não é devolvido nem cobrado a diferença imediatamente.' },
      { q: 'Cancelar a assinatura perde o acesso na hora?', a: 'Não. Ao cancelar, você mantém o acesso até o vencimento do período já pago. Depois disso, a assinatura não renova e o acesso é encerrado.' },
      { q: 'O que acontece se eu cancelar a renovação automática?', a: 'A assinatura continua ativa até o vencimento e não renova sozinha. Você precisará renovar manualmente a cada ciclo.' },
    ],
  },
  {
    id: 'carteira',
    name: 'Carteira',
    icon: 'wallet',
    questions: [
      { q: 'Como adiciono saldo?', a: 'Acesse Carteira → Adicionar saldo. Escolha um valor, gere o PIX e pague no app do seu banco. O saldo é creditado em até 1 minuto após a confirmação do Mercado Pago.' },
      { q: 'O saldo não caiu, e agora?', a: 'O PIX via Mercado Pago costuma confirmar em segundos. Se sua cobrança ainda estiver como "pendente" após 15 minutos, abra um chamado na categoria "Carteira / saldo" com o comprovante. O saldo só é creditado após confirmação real da instituição.' },
      { q: 'Posso retirar o saldo?', a: 'Sim, valores acima de R$ 20 podem ser retirados para a chave PIX cadastrada em até 1 dia útil. Acesse Carteira → Retirar.' },
      { q: 'Posso usar o saldo para qualquer compra?', a: 'Sim. Todo produto ou renovação pode ser pago com saldo da carteira. Se o saldo for insuficiente, a diferença é cobrada por outro método.' },
    ],
  },
  {
    id: 'conta',
    name: 'Conta e segurança',
    icon: 'shield',
    questions: [
      { q: 'Como altero minha senha?', a: 'Em Perfil → Segurança → Alterar senha. Você precisa confirmar a senha atual. Recomendamos uma senha com 10+ caracteres, misturando letras, números e símbolos.' },
      { q: 'Esqueci minha senha. O que fazer?', a: 'Na tela de login, clique em "Esqueci minha senha". Enviamos um link de redefinição para o seu e-mail cadastrado. O link vale por 1 hora.' },
      { q: 'Posso alterar meu CPF?', a: 'O CPF é vinculado permanentemente à conta por questões legais e de prevenção a fraudes. Se houve erro de digitação ou determinação judicial, abra um chamado na categoria "Alteração de CPF" com os documentos comprobatórios.' },
      { q: 'Como ativo a autenticação em duas etapas?', a: 'Em Configurações → Privacidade e segurança → Autenticação em duas etapas. Ativada, um código é enviado por e-mail sempre que um dispositivo novo tentar entrar.' },
    ],
  },
  {
    id: 'entrega',
    name: 'Entrega e acesso',
    icon: 'tv',
    questions: [
      { q: 'Onde encontro minhas telas?', a: 'Em Minhas telas. Cada tela mostra plataforma, plano, código de identificação, vencimento e ações (renovar, detalhes, validade).' },
      { q: 'O acesso não funciona na minha TV/celular. E agora?', a: 'Confira se o e-mail e a senha foram copiados corretamente. Se o problema persistir, tente em outro dispositivo. Se ainda assim não funcionar, abra um chamado com a plataforma e o código da tela.' },
      { q: 'Perdi o acesso. Como recuperar?', a: 'Acesse Minhas telas → encontre a tela → Detalhes. As informações de acesso ficam guardadas na sua conta. Se o produto foi entregue por e-mail e você não encontrar, abra um chamado.' },
    ],
  },
];

/* Tutoriais */
const TUTORIAIS_DATA = [
  { id: 't1', icon: 'plus', title: 'Como adicionar saldo via PIX', desc: 'Passo a passo para recarregar sua carteira com PIX em menos de 1 minuto.' },
  { id: 't2', icon: 'cart', title: 'Como comprar sua primeira tela', desc: 'Encontre, compre e receba seu produto no e-mail automaticamente.' },
  { id: 't3', icon: 'refresh', title: 'Como renovar uma assinatura', desc: 'Renove manualmente ou configure a renovação automática.' },
  { id: 't4', icon: 'shield', title: 'Protegendo sua conta com 2FA', desc: 'Ative a autenticação em duas etapas e veja como funciona o código.' },
  { id: 't5', icon: 'wallet', title: 'Como solicitar retirada de saldo', desc: 'Solicite transferência para a chave PIX cadastrada em até 1 dia útil.' },
  { id: 't6', icon: 'tv', title: 'Acessando suas telas pela TV', desc: 'Dicas para configurar o acesso em Smart TVs e consoles.' },
  { id: 't7', icon: 'file', title: 'Como baixar seus comprovantes', desc: 'Baixe comprovantes de pedidos e movimentações quando precisar.' },
  { id: 't8', icon: 'bell', title: 'Configurando notificações', desc: 'Escolha receber avisos por e-mail e WhatsApp sobre vencimentos.' },
];

/* Categorias de chamado */
const TICKET_CATEGORIES = [
  'Problema com compra',
  'Pagamento / PIX',
  'Acesso à tela ou assinatura',
  'Renovação / cancelamento',
  'Carteira / saldo',
  'Conta / cadastro',
  'Alteração de CPF',
  'Reembolso',
  'Outro',
];

/* Pedidos recentes (contexto do chat) */
const RECENT_ORDERS = [
  { id: 'PED-2025-0048', label: 'Netflix Premium 4K · 15/06/2025' },
  { id: 'PED-2025-0047', label: 'Disney+ Premium Anual · 14/06/2025' },
  { id: 'PED-2025-0046', label: 'Spotify Premium Individual · 14/06/2025' },
  { id: 'ASS-2025-0001', label: 'Assinatura Netflix Premium 4K' },
  { id: 'ASS-2025-0002', label: 'Assinatura Disney+ Premium Anual' },
];

/* Sugestões rápidas */
const SUGGESTIONS = [
  'Não recebi o produto que comprei',
  'Meu PIX não caiu na carteira',
  'Como renovo minha assinatura?',
  'Esqueci minha senha',
  'Como abrir um chamado?',
  'Quero falar com um atendente',
];

/* ---- Base local da IA (MOCK MODE) ----
 * Cada intenção tem palavras-chave e uma resposta.
 * Quando o backend real estiver ativo, isso é ignorado.
 * --------------------------------------- */
const AI_KNOWLEDGE = [
  {
    keywords: ['pix', 'pagamento nao caiu', 'não caiu', 'nao caiu', 'carteira', 'saldo', 'recarga'],
    answer: 'Sobre o PIX da carteira: assim que você paga, o Mercado Pago confirma automaticamente em segundos e o saldo é creditado.\n\nSe já se passaram 15 minutos e o status continua como "pendente" em **Carteira → Movimentações**, pode abrir um chamado na categoria **Pagamento / PIX** anexando o comprovante. Nossa equipe confere pelo ID da transação.\n\nImportante: nunca enviamos links de pagamento por e-mail não solicitados. Se receber algo assim, não clique.',
  },
  {
    keywords: ['nao recebi', 'não recebi', 'pedido nao chegou', 'pedido não chegou', 'entrega', 'produto nao chegou'],
    answer: 'Vamos resolver. Primeiro verifica em **Minhas telas**: se o produto já estiver lá, o acesso foi entregue.\n\nSe o pagamento foi aprovado em **Meus pedidos** e a tela não aparece após 30 minutos:\n• Abra um chamado na categoria **Acesso à tela ou assinatura**\n• Anexe um print do pedido\n• Informe o código do pedido\n\nAssim que a equipe confirmar, reenviamos a entrega automaticamente.',
  },
  {
    keywords: ['cancelar assinatura', 'cancelar plano', 'nao quero mais', 'não quero mais', 'cancelar'],
    answer: 'Você pode cancelar a assinatura a qualquer momento em **Assinaturas → [sua assinatura] → Cancelar**.\n\nO acesso continua ativo até o vencimento do período já pago. Depois disso, não renova e o acesso é encerrado.\n\nSe a cobrança foi feita nos últimos 7 dias e você ainda não usou o serviço, pode ter direito a reembolso. Nesse caso, abra um chamado na categoria **Reembolso**.',
  },
  {
    keywords: ['renovar', 'renovacao', 'renovação', 'vencimento', 'vence hoje', 'venceu'],
    answer: 'Para renovar, acesse **Assinaturas**, encontre a que venceu ou está próxima e clique em **Renovar**. Você vê o novo vencimento antes de confirmar.\n\nSe preferir, ative a renovação automática em **Assinaturas → [assinatura] → Renovação automática**. Assim, cada ciclo é cobrado automaticamente — pode desativar quando quiser.',
  },
  {
    keywords: ['senha', 'esqueci', 'login', 'entrar', 'acesso negado'],
    answer: 'Sobre acesso à conta:\n\n• **Esqueci a senha** → na tela de login, clique em "Esqueci minha senha". Enviamos um link por e-mail (vale 1 hora).\n• **Quero trocar a senha** → Perfil → Segurança → Alterar senha (pede a senha atual).\n• **Conta bloqueada por tentativas** → aguarde 15 minutos ou abra chamado.\n\nPor segurança, nunca pedimos sua senha aqui no chat. Se alguém pedir em nosso nome, é golpe.',
  },
  {
    keywords: ['cpf', 'alterar cpf', 'trocar cpf', 'mudar cpf'],
    answer: 'O CPF é vinculado permanentemente à conta por questões legais e de prevenção a fraudes — não pode ser alterado direto no perfil.\n\nSe houve erro de digitação ou determinação judicial, abra um chamado na categoria **Alteração de CPF** com:\n• Documento com foto (RG/CNH)\n• Motivo detalhado\n• Comprovante de residência, se aplicável\n\nNossa equipe analisa em até 5 dias úteis e registra auditoria completa.',
  },
  {
    keywords: ['reembolso', 'estorno', 'devolver', 'devolução', 'dinheiro de volta'],
    answer: 'Sobre reembolso:\n\n• Compras nos últimos **7 dias** com produto não utilizado podem ser reembolsadas.\n• Reembolso para PIX cai na sua chave em até **2 dias úteis**.\n• Reembolso em cartão aparece em até **2 faturas** dependendo do banco.\n\nPara solicitar, abra um chamado na categoria **Reembolso** informando o código do pedido e o motivo. Você acompanha o andamento em **Meus atendimentos**.',
  },
  {
    keywords: ['humano', 'atendente', 'pessoa', 'falar com alguem', 'falar com alguém', 'suporte humano'],
    answer: 'Claro! Vou transferir você para um atendente humano.\n\n**Horário de atendimento:** segunda a sexta, 9h às 18h.\n\nFora desse horário, sua conversa fica na fila e o atendente responde no próximo dia útil. Você receberá uma notificação por e-mail quando ele começar a responder.\n\nMantive todo o histórico para ele já saber do contexto.',
    action: 'TRANSFER',
  },
  {
    keywords: ['obrigado', 'obrigada', 'valeu', 'resolveu', 'ajudou'],
    answer: 'Fico feliz em ajudar! 😊\n\nSe precisar de mais alguma coisa, é só abrir um novo chat. Você também pode consultar as **Perguntas frequentes** aqui na Central de suporte.\n\nPosso ajudar em algo mais?',
  },
  {
    keywords: ['chamado', 'ticket', 'abrir chamado', 'protocolo'],
    answer: 'Para abrir um chamado formal:\n\n1. Vá até a aba **Abrir chamado** aqui em cima\n2. Escolha a categoria (Compra, Pagamento, Conta, etc)\n3. Descreva com detalhes e anexe prints, se possível\n4. Clique em **Enviar chamado**\n\nVocê recebe um código tipo `SUP-XXXXXX` e pode acompanhar tudo em **Meus atendimentos**. Prazo de resposta: até 24h úteis.',
  },
];

/* ---------- Atendimentos mockados ---------- */
const ATENDIMENTOS_MOCK = [
  {
    id: 'SUP-A1B2C3',
    type: 'chat',
    with: 'ai',
    title: 'Dúvida sobre PIX da carteira',
    preview: 'O PIX que fiz ontem ainda não apareceu na carteira...',
    status: 'finalizado',
    createdAt: '2025-06-14T10:22:00',
    updatedAt: '2025-06-14T10:41:00',
    messages: [
      { from: 'user', text: 'O PIX que fiz ontem ainda não apareceu na carteira', ts: '2025-06-14T10:22:00' },
      { from: 'ai', text: 'Vou verificar. O valor foi pago em qual banco?', ts: '2025-06-14T10:22:15' },
      { from: 'user', text: 'Nubank, R$ 100', ts: '2025-06-14T10:23:10' },
      { from: 'ai', text: 'Encontrei a cobrança como **pendente**. O comprovante bancário mostra a transferência? Se sim, posso abrir um chamado para conferência manual.', ts: '2025-06-14T10:24:00' },
    ],
  },
  {
    id: 'SUP-X9Y8Z7',
    type: 'ticket',
    with: 'human',
    title: 'Erro ao ativar tela na Smart TV',
    preview: 'Não consigo logar na Samsung. Já tentei reiniciar.',
    status: 'em_andamento',
    createdAt: '2025-06-15T08:10:00',
    updatedAt: '2025-06-15T09:30:00',
    messages: [],
  },
];
