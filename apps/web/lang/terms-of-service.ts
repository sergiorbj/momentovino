import type { LegalDocument } from './privacy-policy'

const EFFECTIVE_DATE_EN = 'April 28, 2026'
const EFFECTIVE_DATE_PT = '28 de abril de 2026'

const COMPANY_EN = 'BERNARDI TECH LTDA'
const COMPANY_PT = 'BERNARDI TECH LTDA'

const CONTACT_EMAIL = 'sergiobernardi.dev@gmail.com'

export const termsOfServiceEn: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate: EFFECTIVE_DATE_EN,
  intro: [
    `These Terms of Service ("Terms") govern your use of the MomentoVino mobile application and the website at momentovino.vercel.app (collectively, the "Service"), operated by ${COMPANY_EN}.`,
    'By creating an account, downloading the app, or otherwise using the Service, you agree to these Terms. If you do not agree, please do not use the Service.',
  ],
  sections: [
    {
      title: '1. The Service',
      paragraphs: [
        'MomentoVino lets you catalog wines you taste, log moments around them, attach photos, and optionally share entries with family members you invite. Some features rely on artificial intelligence to extract data from a photograph of a wine label; AI-derived information is best effort and may be inaccurate or incomplete.',
        'We provide the Service "as is" and may add, change, or remove features at any time to improve quality, fix bugs, or comply with applicable law.',
      ],
    },
    {
      title: '2. Eligibility',
      paragraphs: [
        'To use MomentoVino, you must be at least 17 years old and legally able to enter into a binding contract in your jurisdiction. The Service deals with content related to alcoholic beverages and is not intended for users below the legal drinking age in their country.',
      ],
    },
    {
      title: '3. Your account',
      paragraphs: [
        'You are responsible for keeping your account credentials secure and for all activity that occurs under your account. If you sign in with a third-party provider (Apple or Google), you must comply with that provider\'s terms in addition to these Terms. Notify us immediately if you suspect unauthorized access at the contact email below.',
      ],
    },
    {
      title: '4. Your content',
      paragraphs: [
        'You retain ownership of all content you create in MomentoVino, including wine entries, tasting notes, ratings, photos, and family information ("Your Content").',
        'By using the Service, you grant us a limited, worldwide, royalty-free license to host, store, process, transmit, and display Your Content solely for the purpose of operating and improving the Service for you and the family members you choose to share with. We do not use Your Content to train AI models, sell advertising, or share it with third parties for marketing.',
        'You are solely responsible for Your Content and for ensuring you have the right to upload any photos or text you add. You must not upload content that is illegal, infringing, defamatory, sexually explicit, hateful, or otherwise harmful.',
      ],
    },
    {
      title: '5. Subscriptions, trials, and billing',
      paragraphs: [
        'Some features of MomentoVino require a paid subscription. Subscriptions are sold and billed by Apple through the App Store. Subscription length, price, and renewal terms are presented before purchase and remain visible in your Apple subscription management page.',
        'If your plan includes a free trial, the trial begins when you start it and converts automatically to a paid subscription at the end of the trial unless canceled at least 24 hours before the trial ends. You manage and cancel your subscription in iOS Settings → [your name] → Subscriptions.',
        'Subscriptions auto-renew at the end of each billing period unless canceled. Refunds are handled by Apple under their standard refund policy; we do not have the ability to issue refunds directly for App Store purchases.',
        'Prices may change with notice. Any change takes effect on the next renewal cycle, and you may cancel before that to avoid the new price.',
      ],
    },
    {
      title: '6. Family sharing inside MomentoVino',
      paragraphs: [
        'You may invite other people to a family within MomentoVino. When someone joins your family, members can see and contribute entries within that family. Be considerate when inviting people: only invite individuals who consent to participate. You can remove members or leave a family at any time.',
        'Subscriptions are tied to the Apple ID that purchased them and are not automatically shared across family members in MomentoVino. Apple Family Sharing of subscriptions, if enabled in your Apple ID, follows Apple\'s rules.',
      ],
    },
    {
      title: '7. Acceptable use',
      paragraphs: [
        'You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to bypass authentication, rate limits, or other technical restrictions; (c) reverse engineer the app or interfere with its operation; (d) upload malware or content that violates third-party rights; (e) use the AI scan feature to process content that is not yours; (f) impersonate another person; (g) use automated means to scrape, replicate, or extract data from the Service.',
        'We may suspend or terminate accounts that violate these rules.',
      ],
    },
    {
      title: '8. Third-party services',
      paragraphs: [
        'The Service depends on third-party providers (Apple, Google, Supabase, RevenueCat, Resend, Vercel) as described in our Privacy Policy. Their availability, terms, and policies may affect features of MomentoVino. We do not control these providers and are not responsible for outages or changes outside our reasonable control.',
      ],
    },
    {
      title: '9. Disclaimers',
      paragraphs: [
        'The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. Information returned by the AI label-scanning feature is provided for convenience and is not guaranteed to be correct, complete, or current.',
        'MomentoVino is a personal journaling tool. It is not a sommelier, a medical resource, or financial advice. We do not promote the consumption of alcohol; please consume responsibly and follow local laws.',
      ],
    },
    {
      title: '10. Limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by applicable law, in no event will MomentoVino, its officers, employees, or service providers be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill arising out of or related to your use of the Service.',
        'Our total aggregate liability for any claim arising out of or related to the Service is limited to the amount you paid us for the Service in the twelve (12) months preceding the event giving rise to the claim, or BRL 100, whichever is greater.',
        'Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, the limitations above apply to the maximum extent permitted.',
      ],
    },
    {
      title: '11. Termination',
      paragraphs: [
        'You may stop using the Service at any time and delete your account from inside the app (Profile → Delete Account). We may suspend or terminate your access if you violate these Terms or if continuing to provide the Service would expose us or other users to legal or security risk.',
        'Upon termination, the license you grant us in Section 4 also terminates, except as needed to comply with legal obligations or to remove content from caches and backups in the ordinary course.',
      ],
    },
    {
      title: '12. Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. When we make material changes we will update the effective date at the top and, where appropriate, notify you in the app or by email. Continued use of the Service after a change means you accept the updated Terms.',
      ],
    },
    {
      title: '13. Governing law and jurisdiction',
      paragraphs: [
        'These Terms are governed by the laws of the Federative Republic of Brazil, without regard to its conflict-of-laws rules. Any dispute that cannot be resolved amicably will be decided exclusively by the competent courts of the State of São Paulo, Brazil, except where mandatory consumer protection law requires otherwise.',
      ],
    },
    {
      title: '14. Contact',
      paragraphs: [
        `Questions about these Terms can be sent to ${COMPANY_EN} at ${CONTACT_EMAIL}.`,
      ],
    },
  ],
}

export const termsOfServicePtBr: LegalDocument = {
  title: 'Termos de Serviço',
  effectiveDate: EFFECTIVE_DATE_PT,
  intro: [
    `Estes Termos de Serviço ("Termos") regem o uso do aplicativo móvel MomentoVino e do site em momentovino.vercel.app (em conjunto, o "Serviço"), operado pela ${COMPANY_PT}.`,
    'Ao criar uma conta, baixar o aplicativo ou de qualquer forma utilizar o Serviço, você concorda com estes Termos. Se não concorda, por favor, não utilize o Serviço.',
  ],
  sections: [
    {
      title: '1. O Serviço',
      paragraphs: [
        'O MomentoVino permite que você catalogue vinhos que prova, registre momentos relacionados a eles, anexe fotos e, opcionalmente, compartilhe registros com familiares que você convidar. Alguns recursos utilizam inteligência artificial para extrair dados de uma fotografia do rótulo de um vinho; as informações geradas pela IA são fornecidas como melhor esforço e podem ser imprecisas ou incompletas.',
        'Fornecemos o Serviço "como está" e podemos adicionar, alterar ou remover funcionalidades a qualquer momento para melhorar a qualidade, corrigir falhas ou cumprir a legislação aplicável.',
      ],
    },
    {
      title: '2. Elegibilidade',
      paragraphs: [
        'Para usar o MomentoVino, você deve ter pelo menos 17 anos e capacidade legal para celebrar um contrato vinculante na sua jurisdição. O Serviço lida com conteúdo relacionado a bebidas alcoólicas e não é destinado a usuários abaixo da idade legal para consumo de álcool no seu país.',
      ],
    },
    {
      title: '3. Sua conta',
      paragraphs: [
        'Você é responsável por manter as credenciais da sua conta seguras e por toda atividade ocorrida sob sua conta. Se você entrar com um provedor terceiro (Apple ou Google), deve cumprir os termos desse provedor além destes Termos. Notifique-nos imediatamente caso suspeite de acesso não autorizado, pelo email de contato abaixo.',
      ],
    },
    {
      title: '4. Seu conteúdo',
      paragraphs: [
        'Você mantém a titularidade de todo o conteúdo que cria no MomentoVino, incluindo registros de vinhos, anotações de degustação, avaliações, fotos e informações de família ("Seu Conteúdo").',
        'Ao usar o Serviço, você nos concede uma licença limitada, mundial e isenta de royalties para hospedar, armazenar, processar, transmitir e exibir Seu Conteúdo exclusivamente com a finalidade de operar e melhorar o Serviço para você e para os familiares com quem você optou por compartilhar. Não usamos Seu Conteúdo para treinar modelos de IA, vender publicidade ou compartilhar com terceiros para marketing.',
        'Você é o único responsável por Seu Conteúdo e por garantir que tem o direito de fazer upload de qualquer foto ou texto que adicionar. Você não pode publicar conteúdo ilegal, infrator, difamatório, sexualmente explícito, de ódio ou de qualquer outra forma prejudicial.',
      ],
    },
    {
      title: '5. Assinaturas, períodos de avaliação e cobrança',
      paragraphs: [
        'Alguns recursos do MomentoVino exigem assinatura paga. As assinaturas são vendidas e cobradas pela Apple através da App Store. Duração, preço e termos de renovação são apresentados antes da compra e ficam visíveis na sua página de gerenciamento de assinaturas da Apple.',
        'Se seu plano inclui período gratuito, o período começa quando você inicia e converte automaticamente em assinatura paga ao final, exceto se cancelado pelo menos 24 horas antes do término. Você gerencia e cancela sua assinatura em Ajustes do iOS → [seu nome] → Assinaturas.',
        'As assinaturas são renovadas automaticamente ao final de cada ciclo, exceto se canceladas. Reembolsos são tratados pela Apple conforme sua política padrão; não temos a capacidade de emitir reembolsos diretos para compras feitas na App Store.',
        'Os preços podem mudar mediante aviso. Qualquer alteração entra em vigor no próximo ciclo de renovação, e você pode cancelar antes para evitar o novo preço.',
      ],
    },
    {
      title: '6. Compartilhamento familiar dentro do MomentoVino',
      paragraphs: [
        'Você pode convidar outras pessoas para uma família dentro do MomentoVino. Quando alguém entra na sua família, os membros podem ver e contribuir com registros dentro daquela família. Seja respeitoso ao convidar pessoas: convide apenas quem consente em participar. Você pode remover membros ou sair de uma família a qualquer momento.',
        'As assinaturas estão vinculadas ao ID Apple que efetuou a compra e não são automaticamente compartilhadas entre membros da família dentro do MomentoVino. O Compartilhamento Familiar de assinaturas pela Apple, se habilitado no seu ID Apple, segue as regras da Apple.',
      ],
    },
    {
      title: '7. Uso aceitável',
      paragraphs: [
        'Você concorda em não: (a) usar o Serviço para qualquer finalidade ilícita; (b) tentar contornar autenticação, limites de uso ou outras restrições técnicas; (c) fazer engenharia reversa do app ou interferir em seu funcionamento; (d) enviar malware ou conteúdo que viole direitos de terceiros; (e) usar o recurso de escaneamento por IA com conteúdo que não seja seu; (f) personificar outra pessoa; (g) usar meios automatizados para coletar, replicar ou extrair dados do Serviço.',
        'Podemos suspender ou encerrar contas que violem estas regras.',
      ],
    },
    {
      title: '8. Serviços de terceiros',
      paragraphs: [
        'O Serviço depende de provedores terceiros (Apple, Google, Supabase, RevenueCat, Resend, Vercel) conforme descrito em nossa Política de Privacidade. A disponibilidade, termos e políticas desses provedores podem afetar recursos do MomentoVino. Não controlamos esses provedores e não somos responsáveis por interrupções ou alterações fora de nosso controle razoável.',
      ],
    },
    {
      title: '9. Isenções de garantia',
      paragraphs: [
        'O Serviço é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas, incluindo garantias de comercialização, adequação a uma finalidade específica, exatidão e não violação. As informações retornadas pelo recurso de escaneamento de rótulo por IA são fornecidas por conveniência e não há garantia de que estejam corretas, completas ou atualizadas.',
        'O MomentoVino é uma ferramenta pessoal de registro. Não é sommelier, recurso médico nem aconselhamento financeiro. Não promovemos o consumo de álcool; consuma de forma responsável e respeite a legislação local.',
      ],
    },
    {
      title: '10. Limitação de responsabilidade',
      paragraphs: [
        'Na máxima extensão permitida pela legislação aplicável, em nenhuma hipótese o MomentoVino, seus administradores, funcionários ou prestadores de serviço serão responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, nem por perda de lucros, receitas, dados ou reputação decorrentes ou relacionados ao uso do Serviço.',
        'Nossa responsabilidade agregada total por qualquer reivindicação decorrente ou relacionada ao Serviço fica limitada ao valor pago por você pelo Serviço nos doze (12) meses anteriores ao evento que deu origem à reivindicação, ou R$ 100, o que for maior.',
        'Algumas jurisdições não permitem a exclusão ou limitação de determinados danos. Nessas jurisdições, as limitações acima se aplicam na máxima extensão permitida.',
      ],
    },
    {
      title: '11. Encerramento',
      paragraphs: [
        'Você pode parar de usar o Serviço a qualquer momento e excluir sua conta no app (Perfil → Excluir conta). Podemos suspender ou encerrar seu acesso se você violar estes Termos ou se continuar oferecendo o Serviço expuser a nós ou a outros usuários a risco legal ou de segurança.',
        'Após o encerramento, a licença concedida na Cláusula 4 também é encerrada, exceto no necessário para cumprir obrigações legais ou para remover conteúdo de caches e backups no curso normal das operações.',
      ],
    },
    {
      title: '12. Alterações nestes Termos',
      paragraphs: [
        'Podemos atualizar estes Termos periodicamente. Quando fizermos alterações materiais, atualizaremos a data de vigência no topo e, quando apropriado, notificaremos você no app ou por email. O uso continuado do Serviço após uma alteração significa que você aceita os Termos atualizados.',
      ],
    },
    {
      title: '13. Lei aplicável e foro',
      paragraphs: [
        'Estes Termos são regidos pelas leis da República Federativa do Brasil, sem consideração às suas regras de conflito de leis. Qualquer disputa que não puder ser resolvida amigavelmente será decidida exclusivamente pelos tribunais competentes do Estado de São Paulo, Brasil, exceto quando normas obrigatórias de proteção ao consumidor exigirem foro diverso.',
      ],
    },
    {
      title: '14. Contato',
      paragraphs: [
        `Dúvidas sobre estes Termos podem ser enviadas para a ${COMPANY_PT} pelo email ${CONTACT_EMAIL}.`,
      ],
    },
  ],
}
