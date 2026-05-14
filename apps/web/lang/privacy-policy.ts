export type LegalSection = {
  title: string
  paragraphs: string[]
}

export type LegalDocument = {
  title: string
  effectiveDate: string
  intro: string[]
  sections: LegalSection[]
}

const EFFECTIVE_DATE_EN = 'April 28, 2026'
const EFFECTIVE_DATE_PT = '28 de abril de 2026'

const COMPANY_EN = 'BERNARDI TECH LTDA'
const COMPANY_PT = 'BERNARDI TECH LTDA'

const CONTACT_EMAIL = 'sergiobernardi.dev@gmail.com'

export const privacyPolicyEn: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE_DATE_EN,
  intro: [
    `MomentoVino ("MomentoVino", "we", "us") is operated by ${COMPANY_EN}, a company registered in Brazil. We respect your privacy and built MomentoVino to give you a private, personal place to log the wines you taste and the moments you share with family and friends.`,
    'This Privacy Policy explains what data we collect, why we collect it, how it is stored, who it is shared with, and the rights you have over your data. By using the MomentoVino mobile app or this website, you agree to the practices described here.',
  ],
  sections: [
    {
      title: '1. Information we collect',
      paragraphs: [
        'Account information: when you create an account, we collect your email address, an optional display name, and an authentication identifier from the provider you choose (Apple ID or Google ID, when applicable). If you sign in with a third-party provider, we receive only the basic profile information that you authorize.',
        'Content you create: wines you save, tasting notes, ratings, dates, locations you optionally attach to a moment, and photos of bottles, labels, or shared moments. This content is the core of the service and remains visible to you (and, when you choose, to family members you invite).',
        'Family information: when you create a family or accept an invitation, we store the relationship between user accounts and the basic family metadata (name, optional cover photo, optional description) so members can share entries.',
        'Purchase information: subscription status, purchase identifiers, renewal dates, and trial state, supplied by Apple and our subscription provider RevenueCat. We do not receive or store your credit card or payment instrument data.',
        'Technical information: device type, operating system version, app version, crash logs, and basic usage events used to keep the app working and diagnose problems. We do not use advertising identifiers and we do not track you across other apps or websites.',
      ],
    },
    {
      title: '2. How we use your information',
      paragraphs: [
        'To provide the core service: store your wine catalog and moments, sync them across your devices, and let you share them with family members you choose.',
        'To process the photo of a wine label using AI when you tap “scan”: the photo is sent to Google’s Gemini Vision API solely to extract structured wine data (name, region, year, type) and is not used by Google to train models, per their API terms.',
        'To send transactional emails such as family invitations and, where applicable, notifications about your subscription status (e.g. trial ending soon).',
        'To process subscriptions, restore previous purchases, and verify entitlements with Apple and RevenueCat.',
        'To detect, investigate, and prevent abuse, fraud, or violations of our Terms of Service.',
        'We do not sell your personal data, we do not share it with advertisers, and we do not use your content to train AI models of our own.',
      ],
    },
    {
      title: '3. Service providers we use',
      paragraphs: [
        'We rely on a small number of trusted infrastructure providers to operate MomentoVino. Each provider only processes the data needed for its specific function:',
        'Supabase, Inc.: hosts the database, authentication system, and image storage. Servers located in the United States.',
        'Google LLC: Google Sign-In (when you choose it) and Gemini Vision API for label scanning.',
        'Apple Inc.: App Store distribution, In-App Purchases, and Sign in with Apple (when you choose it).',
        'RevenueCat, Inc.: manages subscription state and entitlements.',
        'Resend, Inc.: sends transactional emails (family invitations, subscription notifications).',
        'Vercel, Inc.: hosts the website and the application API.',
        'These providers operate under their own privacy policies and contractual data-processing terms. We share only the minimum information each provider needs to deliver its service.',
      ],
    },
    {
      title: '4. Data retention',
      paragraphs: [
        'We keep your account and the content you create for as long as your account is active. You can delete your account at any time from inside the app (Profile → Delete Account). When you delete your account we erase your profile, wines, moments, photos, and family memberships within 30 days, except for records we are legally required to keep (for example, tax and billing records related to subscription purchases, which are retained for the periods mandated by Brazilian law).',
        'Backups are kept for up to 30 days after deletion before being permanently overwritten.',
      ],
    },
    {
      title: '5. Security',
      paragraphs: [
        'All traffic between the app, our API, and our database is encrypted in transit using TLS. Data at rest is encrypted by Supabase. Authentication tokens are stored in the secure local storage of your device. We use Row-Level Security policies in our database to ensure each user can only access their own data and the families they are part of.',
        'No system is completely secure, but we work to apply industry standard practices and to fix vulnerabilities promptly.',
      ],
    },
    {
      title: '6. Your rights',
      paragraphs: [
        'You can: access and edit your data directly inside the app; export your wines and moments by contacting us at the email below; delete your account permanently from Profile → Delete Account; revoke a third-party sign-in (Apple or Google) from that provider’s settings.',
        'If you live in Brazil, you have the rights provided by Lei Geral de Proteção de Dados (LGPD), including the right to confirm processing, request access, request correction, request deletion, request data portability, and to be informed about with whom your data is shared. If you live in the European Economic Area or the United Kingdom, you have analogous rights under GDPR / UK GDPR.',
        'To exercise any of these rights you can write to us at the contact email below. We respond within 15 days.',
      ],
    },
    {
      title: '7. Children',
      paragraphs: [
        'MomentoVino is intended for adult users in jurisdictions where the legal drinking age applies. We do not knowingly collect personal information from children under 17. If you become aware that a child has provided us with personal data, please contact us so we can remove it.',
      ],
    },
    {
      title: '8. International data transfers',
      paragraphs: [
        'Most of our service providers are based in the United States. By using MomentoVino, you understand that your information may be transferred and processed outside Brazil and the country where you live. We rely on the standard contractual safeguards offered by these providers.',
      ],
    },
    {
      title: '9. Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date at the top and, where appropriate, notify you in the app or by email. Continued use of MomentoVino after a change means you accept the updated policy.',
      ],
    },
    {
      title: '10. Contact',
      paragraphs: [
        `For any privacy-related question, exercise of rights, or complaint, write to ${COMPANY_EN} at ${CONTACT_EMAIL}.`,
      ],
    },
  ],
}

export const privacyPolicyPtBr: LegalDocument = {
  title: 'Política de Privacidade',
  effectiveDate: EFFECTIVE_DATE_PT,
  intro: [
    `O MomentoVino ("MomentoVino", "nós") é operado pela ${COMPANY_PT}, sociedade limitada registrada no Brasil. Respeitamos sua privacidade e criamos o MomentoVino como um espaço pessoal e privado para você registrar os vinhos que prova e os momentos que compartilha com família e amigos.`,
    'Esta Política de Privacidade explica quais dados coletamos, por que coletamos, como armazenamos, com quem compartilhamos e quais direitos você tem sobre seus dados. Ao usar o aplicativo móvel MomentoVino ou este site, você concorda com as práticas descritas aqui.',
  ],
  sections: [
    {
      title: '1. Informações que coletamos',
      paragraphs: [
        'Informações de conta: ao criar uma conta, coletamos seu endereço de email, um nome de exibição opcional e um identificador de autenticação do provedor que você escolher (Apple ID ou conta Google, quando aplicável). Se você entrar com um provedor terceiro, recebemos apenas as informações básicas de perfil que você autorizar.',
        'Conteúdo criado por você: vinhos salvos, anotações de degustação, avaliações, datas, locais que você opcionalmente associa a um momento e fotos de garrafas, rótulos ou momentos compartilhados. Esse conteúdo é o núcleo do serviço e permanece visível para você (e, quando você escolher, para os membros da família que você convidar).',
        'Informações de família: quando você cria uma família ou aceita um convite, armazenamos a relação entre as contas e os metadados básicos da família (nome, foto de capa opcional, descrição opcional) para que os membros possam compartilhar registros.',
        'Informações de compra: status de assinatura, identificadores de compra, datas de renovação e estado do período de avaliação, fornecidos pela Apple e pelo nosso provedor de assinaturas RevenueCat. Não recebemos nem armazenamos dados do seu cartão de crédito ou meio de pagamento.',
        'Informações técnicas: tipo de dispositivo, versão do sistema operacional, versão do aplicativo, registros de falhas e eventos básicos de uso utilizados para manter o app funcionando e diagnosticar problemas. Não usamos identificadores de publicidade e não rastreamos você em outros aplicativos ou sites.',
      ],
    },
    {
      title: '2. Como usamos suas informações',
      paragraphs: [
        'Para oferecer o serviço principal: armazenar seu catálogo de vinhos e seus momentos, sincronizá-los entre seus dispositivos e permitir que você os compartilhe com os familiares que escolher.',
        'Para processar a foto do rótulo de um vinho usando IA quando você toca em "escanear": a foto é enviada à API Gemini Vision do Google exclusivamente para extrair dados estruturados do vinho (nome, região, ano, tipo) e não é usada pelo Google para treinar modelos, conforme os termos da API.',
        'Para enviar emails transacionais, como convites de família e, quando aplicável, notificações sobre o status da sua assinatura (por exemplo, fim do período de avaliação).',
        'Para processar assinaturas, restaurar compras anteriores e verificar direitos junto à Apple e ao RevenueCat.',
        'Para detectar, investigar e prevenir abusos, fraudes ou violações dos nossos Termos de Serviço.',
        'Não vendemos seus dados pessoais, não os compartilhamos com anunciantes e não usamos seu conteúdo para treinar nossos próprios modelos de IA.',
      ],
    },
    {
      title: '3. Provedores de serviço que utilizamos',
      paragraphs: [
        'Contamos com um pequeno número de provedores de infraestrutura de confiança para operar o MomentoVino. Cada provedor processa apenas os dados necessários para sua função específica:',
        'Supabase, Inc.: hospeda o banco de dados, o sistema de autenticação e o armazenamento de imagens. Servidores localizados nos Estados Unidos.',
        'Google LLC: Login com Google (quando você escolhe) e API Gemini Vision para escanear rótulos.',
        'Apple Inc.: distribuição via App Store, compras dentro do app e Sign in with Apple (quando você escolhe).',
        'RevenueCat, Inc.: gerencia o estado das assinaturas e direitos.',
        'Resend, Inc.: envia emails transacionais (convites de família, notificações de assinatura).',
        'Vercel, Inc.: hospeda o site e a API do aplicativo.',
        'Esses provedores operam sob suas próprias políticas de privacidade e termos contratuais de tratamento de dados. Compartilhamos apenas o mínimo de informação que cada provedor precisa para entregar seu serviço.',
      ],
    },
    {
      title: '4. Retenção de dados',
      paragraphs: [
        'Mantemos sua conta e o conteúdo que você cria enquanto a conta estiver ativa. Você pode excluir sua conta a qualquer momento dentro do app (Perfil → Excluir conta). Ao excluir a conta, apagamos seu perfil, vinhos, momentos, fotos e participações em famílias em até 30 dias, exceto registros que somos legalmente obrigados a manter (por exemplo, registros fiscais e de cobrança relacionados a compras de assinatura, retidos pelos prazos exigidos pela legislação brasileira).',
        'Backups são mantidos por até 30 dias após a exclusão antes de serem sobrescritos permanentemente.',
      ],
    },
    {
      title: '5. Segurança',
      paragraphs: [
        'Todo o tráfego entre o app, nossa API e nosso banco de dados é criptografado em trânsito por TLS. Dados em repouso são criptografados pelo Supabase. Tokens de autenticação são armazenados na área segura do seu dispositivo. Usamos políticas de Row-Level Security no banco para garantir que cada usuário acesse apenas seus próprios dados e as famílias das quais participa.',
        'Nenhum sistema é completamente seguro, mas trabalhamos para aplicar práticas de mercado e corrigir vulnerabilidades com agilidade.',
      ],
    },
    {
      title: '6. Seus direitos',
      paragraphs: [
        'Você pode: acessar e editar seus dados diretamente no app; exportar seus vinhos e momentos solicitando pelo email abaixo; excluir sua conta permanentemente em Perfil → Excluir conta; revogar um login de terceiro (Apple ou Google) nas configurações do próprio provedor.',
        'Se você reside no Brasil, você possui os direitos previstos na Lei Geral de Proteção de Dados (LGPD), incluindo confirmar o tratamento, solicitar acesso, correção, exclusão, portabilidade e ser informado sobre com quem seus dados são compartilhados. Se você reside no Espaço Econômico Europeu ou no Reino Unido, você possui direitos análogos sob o GDPR / UK GDPR.',
        'Para exercer qualquer um desses direitos, escreva para o email de contato abaixo. Respondemos em até 15 dias.',
      ],
    },
    {
      title: '7. Crianças',
      paragraphs: [
        'O MomentoVino é destinado a usuários adultos em jurisdições onde se aplica a idade legal para consumo de bebidas alcoólicas. Não coletamos intencionalmente informações pessoais de menores de 17 anos. Se você tomar conhecimento de que uma criança nos forneceu dados pessoais, entre em contato para que possamos removê-los.',
      ],
    },
    {
      title: '8. Transferências internacionais de dados',
      paragraphs: [
        'A maioria dos nossos provedores de serviço está sediada nos Estados Unidos. Ao usar o MomentoVino, você compreende que suas informações podem ser transferidas e processadas fora do Brasil e do país onde você reside. Apoiamo-nos nas salvaguardas contratuais padrão oferecidas por esses provedores.',
      ],
    },
    {
      title: '9. Alterações nesta política',
      paragraphs: [
        'Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos alterações materiais, atualizaremos a data de vigência no topo e, quando apropriado, notificaremos você no app ou por email. O uso continuado do MomentoVino após uma alteração significa que você aceita a política atualizada.',
      ],
    },
    {
      title: '10. Contato',
      paragraphs: [
        `Para qualquer dúvida relacionada a privacidade, exercício de direitos ou reclamação, escreva para a ${COMPANY_PT} pelo email ${CONTACT_EMAIL}.`,
      ],
    },
  ],
}
