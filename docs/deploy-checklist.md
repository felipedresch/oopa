# Checklist de deploy — OOPA

Use este checklist antes de publicar em producao.

## Variaveis de ambiente

### Convex (dashboard ou `npx convex env set`)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `CONVEX_DEPLOYMENT` | Sim (CI) | Identificador do deployment de producao |
| `OCR_SPACE_API_KEY` | Sim (OCR) | Chave OCR.space para leitura de microchip |
| `OCR_SPACE_API_URL` | Não | Endpoint alternativo fornecido em planos PRO do OCR.space |
| `RESEND_API_KEY` | Sim (convites) | Envio de e-mail de convite e reset |
| `RESEND_FROM_EMAIL` | Sim (convites) | Remetente verificado no Resend |
| `SITE_URL` | Sim (convites) | URL pública usada nos links de convite e reset |

### Frontend (build Vite)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_CONVEX_URL` | Sim | URL do deployment Convex usado pelo app |

### Configuração do OCR.space

1. Solicitar uma chave em `https://ocr.space/ocrapi/freekey`.
2. Configurar o segredo no deployment Convex com
   `npx convex env set OCR_SPACE_API_KEY sua-chave`.
3. Manter `OCR_SPACE_API_URL` vazio no plano gratuito. Em um plano PRO,
   preencher com um dos endpoints recebidos por email.

O plano gratuito limita cada arquivo a 1 MB e aplica cotas por IP/dia e por
mês. O frontend converte a foto para JPEG e a reduz para até 700 KB antes de
chamar o action. A chave fica somente no backend Convex e nunca deve usar
prefixo `VITE_`.

## Comandos pre-deploy

```bash
npm run quality
npm run test:e2e
npx convex deploy
```

## Pos-deploy

- [ ] Login com usuario admin de producao
- [ ] **Rodar `seeds:seedAll` em TODO deploy** (nao apenas em ambiente novo).
      Os seeds sao idempotentes por nome: reaplicar so insere o que falta.
      Toda fase que adiciona um tipo de ocorrencia ou bairro depende disso —
      sem reaplicar, a feature vai para producao sem o registro que ela
      procura e quebra em runtime (foi o que aconteceu com "Denuncia Externa"
      da Fase 16 e "Visita de acompanhamento" da Fase 22).
- [ ] Conferir contagem de tipos de ocorrencia com `seeds:getSeedSummary`
- [ ] Testar identificacao por camera/OCR
- [ ] Testar convite de usuario e e-mail
- [ ] Verificar notificacoes e exportacao de auditoria
- [ ] Confirmar HTTPS e dominio do `VITE_CONVEX_URL`

## Seguranca

- [ ] Nenhum segredo commitado no repositorio
- [ ] `seedAll` exige `templates.manage`
- [ ] Admin existente realinhado com o template atual (`bootstrap:ensureDevAdmin`
      sincroniza permissoes de modulos novos)
- [ ] Upload de arquivos exige permissao de escrita relevante
- [ ] Exportacoes operacionais exigem `system.audit_log`
