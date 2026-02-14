# API Spec (MVP) — logical endpoints

This document describes required operations; actual framework can be REST or server actions.

## Clients
- listClients()
- getClient(id)
- createClient(payload)
- updateClient(id, payload)
- deleteClient(id)

## Catalog
- listCatalogItems(filters: category, tag, search)
- getCatalogItem(id)
- createCatalogItem(payload)
- updateCatalogItem(id, payload)
- deleteCatalogItem(id)

## Snippets
- listSnippets(type, language)
- createSnippet(payload)
- updateSnippet(id, payload)
- deleteSnippet(id)

## Templates
- listTemplates()
- getTemplate(id)
- createTemplate(payload)
- updateTemplate(id, payload)
- deleteTemplate(id)
- createQuoteFromTemplate(templateId, clientId?)

## Quotes
- listQuotes(filters: status, clientId, date range, currency, search)
- getQuote(id)
- createQuote(payload)
- updateQuote(id, payload) (autosave-friendly)
- duplicateQuote(id)
- setQuoteStatus(id, status)

## Quote export / versions
- exportQuoteToPdf(quoteId) -> creates QuoteVersion + returns pdf url
- listQuoteVersions(quoteId)
- downloadQuoteVersionPdf(versionId)