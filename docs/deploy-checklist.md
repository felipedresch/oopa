# Checklist de deploy — OOPA

Use este checklist antes de publicar em producao.

## Variaveis de ambiente

### Convex (dashboard ou `npx convex env set`)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `CONVEX_DEPLOYMENT` | Sim (CI) | Identificador do deployment de producao |
| `OPENAI_API_KEY` | Sim (OCR) | Chave OpenAI para leitura de microchip |
| `RESEND_API_KEY` | Sim (convites) | Envio de e-mail de convite e reset |
| `R2_ACCOUNT_ID` | Opcional | Cloudflare R2 para midia publica |
| `R2_ACCESS_KEY_ID` | Opcional | Credencial R2 |
| `R2_SECRET_ACCESS_KEY` | Opcional | Credencial R2 |
| `R2_BUCKET_NAME` | Opcional | Bucket R2 |
| `R2_PUBLIC_BASE_URL` | Opcional | URL base publica dos arquivos |

### Frontend (build Vite)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_CONVEX_URL` | Sim | URL do deployment Convex usado pelo app |

## Comandos pre-deploy

```bash
npm run quality
npm run test:e2e
npx convex deploy
```

## Pos-deploy

- [ ] Login com usuario admin de producao
- [ ] Rodar seeds iniciais (`templates.manage`) se ambiente novo
- [ ] Testar identificacao por camera/OCR
- [ ] Testar convite de usuario e e-mail
- [ ] Verificar notificacoes e exportacao de auditoria
- [ ] Confirmar HTTPS e dominio do `VITE_CONVEX_URL`

## Seguranca

- [ ] Nenhum segredo commitado no repositorio
- [ ] `seedAll` exige `templates.manage`
- [ ] Upload de arquivos exige permissao de escrita relevante
- [ ] Exportacoes operacionais exigem `system.audit_log`
