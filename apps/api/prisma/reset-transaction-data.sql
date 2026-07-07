-- Apaga transações e jogadores, preservando User, Pelada, PeladaMember, Config e CourtIdentifier.
TRUNCATE TABLE
  "Share",
  "Transaction",
  "Import",
  "PayerAlias",
  "PayerTypeChange",
  "PayerHistoryEntry",
  "PayerAbono",
  "Payer"
CASCADE;
